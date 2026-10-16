#include "environment.h"

#include <Arduino.h>
#include <Wire.h>
#include <cmath>

namespace sonar {
namespace {
constexpr int kSdaPin = 8;
constexpr int kSclPin = 9;
constexpr int kTemperaturePin = 4;
constexpr int kDepthPin = 1;
constexpr std::uint32_t kAdcStaleMs = 500;
constexpr std::uint32_t kAdcTimeoutMs = 100;
constexpr std::uint32_t kAdcRetryMs = 1000;
constexpr std::uint32_t kDepthIntervalMs = 50;
constexpr std::uint32_t kTemperatureIntervalMs = 1000;
constexpr std::uint32_t kTemperatureConversionMs = 188;
constexpr float kPotFullScaleV = 3.2f;

bool responds(std::uint8_t address) {
  Wire.beginTransmission(address);
  return Wire.endTransmission() == 0;
}

float normalized(float voltage) {
  return fmaxf(0.0f, fminf(1.0f, voltage / kPotFullScaleV));
}

float smoothLevel(float old, float target, bool initialized,
                  std::uint32_t elapsedMs) {
  if (!initialized) return target;
  const float alpha = 1.0f - expf(-static_cast<float>(elapsedMs) / 150.0f);
  return old + alpha * (target - old);
}

constexpr std::uint16_t kMux[4] = {
    ADS1X15_REG_CONFIG_MUX_SINGLE_0, ADS1X15_REG_CONFIG_MUX_SINGLE_1,
    ADS1X15_REG_CONFIG_MUX_SINGLE_2, ADS1X15_REG_CONFIG_MUX_SINGLE_3};
}  // namespace

Environment::Environment()
    : oneWire_(kTemperaturePin), temperature_(&oneWire_) {}

void Environment::begin() {
  snapshot_ = EnvironmentSnapshot{};
  Wire.begin(kSdaPin, kSclPin);
  Wire.setClock(400000);
  Wire.setTimeOut(10);
  realScan_.present = realAdc_.begin(realScan_.address, &Wire);
  potScan_.present = potAdc_.begin(potScan_.address, &Wire);
  realAdc_.setGain(GAIN_ONE);
  potAdc_.setGain(GAIN_ONE);
  realAdc_.setDataRate(RATE_ADS1115_128SPS);
  potAdc_.setDataRate(RATE_ADS1115_128SPS);
  pinMode(kDepthPin, INPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(kDepthPin, ADC_11db);

  temperature_.begin();
  temperature_.setWaitForConversion(false);
  temperature_.setCheckForConversion(false);
  temperaturePresent_ = temperature_.getAddress(temperatureAddress_, 0) &&
                        temperatureAddress_[0] == 0x28;
  if (temperaturePresent_) {
    temperaturePresent_ = temperature_.setResolution(temperatureAddress_, 10) &&
                          temperature_.getResolution(temperatureAddress_) == 10;
    if (temperaturePresent_) {
      temperature_.requestTemperatures();
      temperaturePending_ = true;
      temperatureRequestedMs_ = millis();
    }
  }
  snapshot_.realAdcPresent = realScan_.present;
  snapshot_.potAdcPresent = potScan_.present;
}

void Environment::invalidateAdc(AdcScan& scan, bool real,
                                std::uint32_t now) {
  scan.present = false;
  scan.waiting = false;
  scan.retryMs = now;
  bool* valid = real ? snapshot_.realValid : snapshot_.potValid;
  for (std::uint8_t channel = 0; channel < 4; ++channel) valid[channel] = false;
}

void Environment::scanAdc(Adafruit_ADS1115& adc, AdcScan& scan, bool real,
                          std::uint32_t now) {
  if (!scan.present) {
    if (now - scan.retryMs < kAdcRetryMs) return;
    scan.retryMs = now;
    if (!responds(scan.address)) return;
    scan.present = true;
    scan.channel = 0;
    scan.waiting = false;
  }
  if (!scan.waiting) {
    adc.startADCReading(kMux[scan.channel], false);
    scan.startedMs = now;
    scan.waiting = true;
    return;
  }
  if (now - scan.startedMs < 8) return;
  if (!responds(scan.address)) {
    invalidateAdc(scan, real, now);
    return;
  }
  if (!adc.conversionComplete()) {
    if (now - scan.startedMs > kAdcTimeoutMs) invalidateAdc(scan, real, now);
    return;
  }

  const std::uint8_t channel = scan.channel;
  std::int16_t* raw = real ? snapshot_.realRaw : snapshot_.potRaw;
  float* volts = real ? snapshot_.realVolts : snapshot_.potVolts;
  bool* valid = real ? snapshot_.realValid : snapshot_.potValid;
  std::uint32_t* updated = real ? snapshot_.realUpdatedMs : snapshot_.potUpdatedMs;
  const bool initialized = valid[channel];
  const std::uint32_t elapsed = now - updated[channel];
  raw[channel] = adc.getLastConversionResults();
  volts[channel] = adc.computeVolts(raw[channel]);
  valid[channel] = std::isfinite(volts[channel]);
  updated[channel] = now;
  if (!real && valid[channel]) {
    float* levels[4] = {&snapshot_.tdsLevel, &snapshot_.turbidityLevel,
                       &snapshot_.tempLevel, &snapshot_.phLevel};
    *levels[channel] = smoothLevel(*levels[channel], normalized(volts[channel]),
                                   initialized, elapsed);
  }
  if (real && channel == 3 && valid[channel]) {
    const float sensorVoltage = volts[channel] * (32.0f / 22.0f);
    snapshot_.pressureValid = sensorVoltage >= 0.5f && sensorVoltage <= 4.5f;
    if (snapshot_.pressureValid)
      snapshot_.pressureMPa = (sensorVoltage - 0.5f) * 0.4f;
  }
  scan.channel = (channel + 1) % 4;
  adc.startADCReading(kMux[scan.channel], false);
  scan.startedMs = now;
}

void Environment::readDepth(std::uint32_t now) {
  if (snapshot_.depthValid && now - depthReadMs_ < kDepthIntervalMs) return;
  const bool initialized = snapshot_.depthValid;
  const std::uint32_t elapsed = now - snapshot_.depthUpdatedMs;
  depthReadMs_ = now;
  snapshot_.depthRaw = analogRead(kDepthPin);
  snapshot_.depthVoltage = analogReadMilliVolts(kDepthPin) / 1000.0f;
  snapshot_.depthValid = std::isfinite(snapshot_.depthVoltage) &&
                         snapshot_.depthRaw >= 0 && snapshot_.depthRaw <= 4095;
  snapshot_.depthUpdatedMs = now;
  if (snapshot_.depthValid) {
    snapshot_.depthLevel = smoothLevel(snapshot_.depthLevel,
                                      normalized(snapshot_.depthVoltage),
                                      initialized, elapsed);
  }
}

void Environment::readTemperature(std::uint32_t now) {
  if (!temperaturePresent_) return;
  if (temperaturePending_ &&
      now - temperatureRequestedMs_ >= kTemperatureConversionMs) {
    const float value = temperature_.getTempC(temperatureAddress_);
    snapshot_.tempValid = std::isfinite(value) && value != DEVICE_DISCONNECTED_C &&
                          value >= -55.0f && value <= 125.0f;
    snapshot_.tempC = snapshot_.tempValid ? value : DEVICE_DISCONNECTED_C;
    if (snapshot_.tempValid) snapshot_.tempUpdatedMs = now;
    temperaturePending_ = false;
  }
  if (!temperaturePending_ &&
      now - temperatureRequestedMs_ >= kTemperatureIntervalMs) {
    temperature_.requestTemperatures();
    temperatureRequestedMs_ = now;
    temperaturePending_ = true;
  }
}

void Environment::updateValidity(std::uint32_t now) {
  snapshot_.realAdcPresent = realScan_.present;
  snapshot_.potAdcPresent = potScan_.present;
  snapshot_.realAdcStale = !realScan_.present;
  snapshot_.potAdcStale = !potScan_.present;
  for (std::uint8_t channel = 0; channel < 4; ++channel) {
    if (now - snapshot_.realUpdatedMs[channel] > kAdcStaleMs)
      snapshot_.realValid[channel] = false;
    if (now - snapshot_.potUpdatedMs[channel] > kAdcStaleMs)
      snapshot_.potValid[channel] = false;
    snapshot_.realAdcStale |= !snapshot_.realValid[channel];
    snapshot_.potAdcStale |= !snapshot_.potValid[channel];
  }
  if (now - snapshot_.depthUpdatedMs > kAdcStaleMs) snapshot_.depthValid = false;
  if (now - snapshot_.tempUpdatedMs > 2500) snapshot_.tempValid = false;
  if (!snapshot_.realValid[3]) snapshot_.pressureValid = false;
  snapshot_.inputsValid = !snapshot_.potAdcStale && snapshot_.depthValid;
}

void Environment::tick(std::uint32_t now) {
  scanAdc(realAdc_, realScan_, true, now);
  scanAdc(potAdc_, potScan_, false, now);
  readDepth(now);
  readTemperature(now);
  updateValidity(now);
}

}  // namespace sonar
