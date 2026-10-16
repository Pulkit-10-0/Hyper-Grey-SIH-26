#pragma once

#include <Adafruit_ADS1X15.h>
#include <DallasTemperature.h>
#include <OneWire.h>
#include <cstdint>

namespace sonar {

enum class InputSource : std::uint8_t { Potentiometers };

struct EnvironmentSnapshot {
  InputSource source = InputSource::Potentiometers;
  float realVolts[4] = {};
  std::int16_t realRaw[4] = {};
  float potVolts[4] = {};
  std::int16_t potRaw[4] = {};
  bool realValid[4] = {};
  bool potValid[4] = {};
  std::uint32_t realUpdatedMs[4] = {};
  std::uint32_t potUpdatedMs[4] = {};
  bool realAdcPresent = false;
  bool potAdcPresent = false;
  bool realAdcStale = true;
  bool potAdcStale = true;
  int depthRaw = 0;
  float depthVoltage = 0;
  bool depthValid = false;
  std::uint32_t depthUpdatedMs = 0;
  float tempC = DEVICE_DISCONNECTED_C;
  bool tempValid = false;
  std::uint32_t tempUpdatedMs = 0;
  float pressureMPa = 0;
  bool pressureValid = false;
  float tdsLevel = 0;
  float turbidityLevel = 0;
  float tempLevel = 0;
  float phLevel = 0;
  float depthLevel = 0;
  bool inputsValid = false;
};

class Environment {
 public:
  Environment();
  void begin();
  void tick(std::uint32_t now);
  const EnvironmentSnapshot& snapshot() const { return snapshot_; }

 private:
  struct AdcScan {
    std::uint8_t address;
    std::uint8_t channel = 0;
    bool present = false;
    bool waiting = false;
    std::uint32_t startedMs = 0;
    std::uint32_t retryMs = 0;
  };

  void scanAdc(Adafruit_ADS1115& adc, AdcScan& scan, bool real,
               std::uint32_t now);
  void updateValidity(std::uint32_t now);
  void readDepth(std::uint32_t now);
  void readTemperature(std::uint32_t now);
  void invalidateAdc(AdcScan& scan, bool real, std::uint32_t now);

  Adafruit_ADS1115 realAdc_;
  Adafruit_ADS1115 potAdc_;
  OneWire oneWire_;
  DallasTemperature temperature_;
  DeviceAddress temperatureAddress_ = {};
  EnvironmentSnapshot snapshot_;
  AdcScan realScan_{0x48};
  AdcScan potScan_{0x49};
  bool temperaturePresent_ = false;
  bool temperaturePending_ = false;
  std::uint32_t temperatureRequestedMs_ = 0;
  std::uint32_t depthReadMs_ = 0;
};

}  // namespace sonar
