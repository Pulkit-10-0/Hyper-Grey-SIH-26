#include <Arduino.h>
#include "board_config.h"
#include "displays.h"
#include "environment.h"
#include "transmitter.h"
#include <cmath>
#include <cstdio>
#include <cstring>
#include <cerrno>
#include <cstdlib>

namespace {
sonar::Environment environment;
sonar::Displays displays;
sonar::Transmitter transmitter;
sonar::TxCommand command;
bool autoAdapt = true;
bool transmitterReady = false;
bool telemetryEnabled = true;
char inputLine[96] = {};
std::size_t inputLength = 0;
bool inputOverflow = false;

float quantize(float value, float step) {
  return roundf(value / step) * step;
}

void adapt(const sonar::EnvironmentSnapshot& inputs) {
  const float loss = 0.50f * inputs.turbidityLevel + 0.35f * inputs.depthLevel +
                     0.15f * inputs.tdsLevel;
  const float center = SONAR_PCM5102A ? 41000.0f - loss * 2000.0f :
                                      6500.0f - loss * 4500.0f;
  const float bandwidth = SONAR_PCM5102A ? 1000.0f + 1000.0f * (1.0f - loss) :
                                         1000.0f + 2000.0f * (1.0f - loss);
  command.wave.startHz = quantize(center - bandwidth * 0.5f, 10.0f);
  command.wave.endHz = quantize(center + bandwidth * 0.5f, 10.0f);
  command.wave.durationMs = quantize(4.0f + 24.0f *
      (0.7f * inputs.depthLevel + 0.3f * inputs.tempLevel), 0.1f);
  // Potentiometers are controls, not calibrated salinity/pH physics.
  command.wave.amplitude = quantize(0.15f + 0.45f * inputs.phLevel + 0.20f * loss, 0.01f);
  command.wave.amplitude = fminf(sonar::kMaxAmplitude, command.wave.amplitude);
  command.pwmHz = static_cast<std::uint32_t>(quantize(42000.0f - 4000.0f * loss, 10.0f));
  command.pwmDuty = static_cast<std::uint8_t>(128.0f * command.wave.amplitude);
}

bool inOutputBand(const sonar::Config& wave) {
  const float minimum = SONAR_PCM5102A ? 38000.0f : 1000.0f;
  const float maximum = SONAR_PCM5102A ? 42000.0f : 8000.0f;
  return sonar::validate(wave) == sonar::Error::Ok &&
      wave.durationMs >= 4.0f &&
      wave.startHz >= minimum && wave.startHz <= maximum &&
      wave.endHz >= minimum && wave.endHz <= maximum;
}

void help() {
  Serial.println("ARM | STOP | CLEAR | STATUS | HELP");
  Serial.println("MODE LFM|GEO|BPSK | WINDOW HANN|HAMMING|BLACKMAN");
  Serial.println("AUTO ON|OFF | SET <startHz> <endHz> <ms> <amplitude0..0.8>");
  Serial.println("PERIOD <150..5000 ms> | TELEMETRY ON|OFF");
}

void printStatus() {
  const auto status = transmitter.status();
  const auto& inputs = environment.snapshot();
  Serial.printf("FW=%s BACKEND=%s FS=%lu SOURCE=%s ARMED=%u ACTIVE=%u FAULT=%u REASON=%s\n",
      sonar::board::kVersion, sonar::board::kBackend,
      static_cast<unsigned long>(sonar::board::kSampleRate),
      autoAdapt ? "POTS" : "MANUAL", status.armed, status.active, status.faultLatched,
      status.faultReason);
  if (status.previewValid) Serial.printf("PCM_APPLIED=%s,%s,%.0f,%.0f,%.1f,%.2f PWM_APPLIED=%luHz,%u/256 PERIOD=%lums\n",
      sonar::modulationName(status.wave.modulation), sonar::windowName(status.wave.window),
      status.wave.startHz, status.wave.endHz, status.wave.durationMs, status.wave.amplitude,
      static_cast<unsigned long>(status.pwmHz), status.pwmDuty,
      static_cast<unsigned long>(status.periodMs));
  else Serial.println("PCM_APPLIED=NONE PWM_APPLIED=IDLE");
  Serial.printf("PCM_REQUESTED=%s,%s,%.0f,%.0f,%.1f,%.2f\n",
      sonar::modulationName(command.wave.modulation), sonar::windowName(command.wave.window),
      command.wave.startHz, command.wave.endHz, command.wave.durationMs, command.wave.amplitude);
  Serial.printf("COMPLETED=%lu FAULTS=%lu MISSED=%lu PREPARE_US=%lu START_DELAY_US=%lu INPUTS_OK=%u ADS1=%u ADS2=%u\n",
      static_cast<unsigned long>(status.completedPings), static_cast<unsigned long>(status.faults),
      static_cast<unsigned long>(status.missedPeriods), static_cast<unsigned long>(status.buildUs),
      static_cast<unsigned long>(status.startDelayUs), inputs.inputsValid,
      inputs.realAdcPresent, inputs.potAdcPresent);
  Serial.println("PWM_MODULATION=CARRIER_BURST PWM_WINDOW=NONE FILTER_FEEDBACK=UNAVAILABLE");
  if (status.wave.modulation == sonar::Modulation::Barker13) {
    Serial.printf("BPSK_CARRIER_HZ=%.1f CHIPS=13 CHIP_RATE_HZ=%.1f\n",
        (status.wave.startHz + status.wave.endHz) * 0.5f,
        13.0 * status.wave.sampleRateHz / sonar::sampleCount(status.wave));
  }
}

void executeCommand(char* text) {
  char first[16] = {}, second[20] = {}, extra = 0;
  if (sscanf(text, "%15s %19s %c", first, second, &extra) < 1) return;
  if (strcmp(text, "STOP") == 0) {
    command.armed = false;
  } else if (strcmp(text, "ARM") == 0) {
    const auto state = transmitter.status();
    if (!transmitterReady || !state.ready || state.faultLatched ||
        (autoAdapt && !environment.snapshot().inputsValid)) {
      Serial.println("ERR: transmitter unavailable, fault latched, or inputs stale");
      return;
    }
    command.armed = true;
  } else if (strcmp(text, "CLEAR") == 0) {
    command.armed = false;
    command.clearFault = true;
  } else if (strcmp(text, "STATUS") == 0) {
    printStatus();
    return;
  } else if (strcmp(text, "HELP") == 0) {
    help();
    return;
  } else if (strcmp(first, "MODE") == 0 && second[0] && !extra) {
    if (strcmp(second, "LFM") == 0) command.wave.modulation = sonar::Modulation::Lfm;
    else if (strcmp(second, "GEO") == 0) command.wave.modulation = sonar::Modulation::Geometric;
    else if (strcmp(second, "BPSK") == 0) command.wave.modulation = sonar::Modulation::Barker13;
    else { Serial.println("ERR: unknown modulation"); return; }
  } else if (strcmp(first, "WINDOW") == 0 && second[0] && !extra) {
    if (strcmp(second, "HANN") == 0) command.wave.window = sonar::Window::Hann;
    else if (strcmp(second, "HAMMING") == 0) command.wave.window = sonar::Window::Hamming;
    else if (strcmp(second, "BLACKMAN") == 0) command.wave.window = sonar::Window::Blackman;
    else { Serial.println("ERR: unknown window"); return; }
  } else if (strcmp(first, "AUTO") == 0 && !extra &&
             (strcmp(second, "ON") == 0 || strcmp(second, "OFF") == 0)) {
    autoAdapt = strcmp(second, "ON") == 0;
    command.armed = false;
  } else if (strcmp(first, "TELEMETRY") == 0 && !extra &&
             (strcmp(second, "ON") == 0 || strcmp(second, "OFF") == 0)) {
    telemetryEnabled = strcmp(second, "ON") == 0;
  } else if (strcmp(first, "SET") == 0) {
    sonar::Config next = command.wave;
    if (autoAdapt || sscanf(text, "SET %f %f %f %f %c", &next.startHz,
        &next.endHz, &next.durationMs, &next.amplitude, &extra) != 4 ||
        !inOutputBand(next)) {
      Serial.println("ERR: use AUTO OFF; SET must fit output band, 4..28ms, amplitude0..0.8");
      return;
    }
    command.wave = next;
    command.pwmDuty = static_cast<std::uint8_t>(next.amplitude * 128.0f);
  } else if (strcmp(first, "PERIOD") == 0) {
    char* end = nullptr;
    const char* argument = text + 6;
    while (*argument == ' ') ++argument;
    errno = 0;
    const unsigned long value = strtoul(argument, &end, 10);
    while (end && *end == ' ') ++end;
    if (*argument < '0' || *argument > '9' || errno == ERANGE || !end || *end ||
        value < sonar::board::kMinPeriodMs || value > sonar::board::kMaxPeriodMs) {
      Serial.println("ERR: period must be150..5000ms");
      return;
    }
    command.periodMs = static_cast<std::uint32_t>(value);
  } else {
    Serial.println("ERR: unknown command; HELP lists commands (uppercase)");
    return;
  }
  if (transmitter.submit(command)) Serial.println("OK: command queued");
  else Serial.println("ERR: transmitter command queue unavailable");
}

void readConsole() {
  for (unsigned count = 0; count < 64 && Serial.available(); ++count) {
    const char value = static_cast<char>(Serial.read());
    if (value == '\r') continue;
    if (value == '\n') {
      inputLine[inputLength] = '\0';
      if (inputOverflow) Serial.println("ERR: command too long");
      else executeCommand(inputLine);
      inputLength = 0;
      inputOverflow = false;
    } else if (value >= 32 && value <= 126) {
      if (inputLength < sizeof(inputLine) - 1) inputLine[inputLength++] = value;
      else inputOverflow = true;
    }
  }
}

void printVolts(const char* label, float value, bool valid) {
  Serial.print(label);
  if (valid) { Serial.print(value, 4); Serial.println(" V"); }
  else Serial.println("ERROR");
}

void telemetry(const sonar::EnvironmentSnapshot& inputs) {
  Serial.print("REAL Temperature : ");
  if (inputs.tempValid) { Serial.print(inputs.tempC, 2); Serial.println(" C"); }
  else Serial.println("ERROR");
  Serial.print("REAL TDS ADC     : ");
  if (inputs.realValid[0]) Serial.println(inputs.realRaw[0]); else Serial.println("ERROR");
  printVolts("REAL TDS Voltage : ", inputs.realVolts[0], inputs.realValid[0]);
  Serial.print("REAL Turb ADC    : ");
  if (inputs.realValid[1]) Serial.println(inputs.realRaw[1]); else Serial.println("ERROR");
  printVolts("REAL Turb Voltage: ", inputs.realVolts[1], inputs.realValid[1]);
  printVolts("REAL pH Voltage  : ", inputs.realVolts[2], inputs.realValid[2]);
  Serial.print("REAL Pressure MPa : ");
  if (inputs.pressureValid) { Serial.print(inputs.pressureMPa, 4); Serial.println(" MPa"); }
  else Serial.println("ERROR");
  const char* rawLabels[] = {"TDS POT ADC      : ", "TURB POT ADC     : ",
                            "TEMP POT ADC     : ", "PH POT ADC       : "};
  const char* voltageLabels[] = {"TDS POT Voltage  : ", "TURB POT Voltage : ",
                                "TEMP POT Voltage : ", "PH POT Voltage   : "};
  for (unsigned i = 0; i < 4; ++i) {
    Serial.print(rawLabels[i]);
    if (inputs.potValid[i]) Serial.println(inputs.potRaw[i]); else Serial.println("ERROR");
    printVolts(voltageLabels[i], inputs.potVolts[i], inputs.potValid[i]);
  }
  Serial.print("DEPTH POT ADC    : "); Serial.println(inputs.depthRaw);
  printVolts("DEPTH POT Voltage: ", inputs.depthVoltage, inputs.depthValid);
  printStatus();
}
}

void setup() {
  Serial.begin(115200);
  command.wave.sampleRateHz = sonar::board::kSampleRate;
  if (SONAR_PCM5102A) {
    command.wave.startHz = 39000;
    command.wave.endHz = 41000;
  }
  transmitterReady = transmitter.begin();
  environment.begin();
  displays.begin();
  Serial.printf("SEANERGY %s: %s; outputs disarmed\n", sonar::board::kVersion,
                sonar::board::kBackend);
  if (!transmitterReady) Serial.println("FAULT: output initialization failed; reset required");
  help();
}

void loop() {
  const std::uint32_t now = millis();
  environment.tick(now);
  readConsole();
  const auto& inputs = environment.snapshot();
  static std::uint32_t lastControl = 0;
  if (now - lastControl >= 50) {
    lastControl = now;
    if (autoAdapt) {
      if (inputs.inputsValid) adapt(inputs);
      else if (command.armed) {
        command.armed = false;
        Serial.println("FAULT: stale control inputs; disarmed");
      }
    }
    transmitter.submit(command);
  }
  const auto state = transmitter.status();
  if (command.clearFault && !state.faultLatched) command.clearFault = false;
  sonar::DisplayStatus display;
  display.backend = sonar::board::kBackend;
  display.modulation = sonar::modulationName(state.wave.modulation);
  display.window = sonar::windowName(state.wave.window);
  display.startHz = state.wave.startHz;
  display.endHz = state.wave.endHz;
  display.pulseMs = state.wave.durationMs;
  display.amplitude = state.wave.amplitude;
  display.completedPings = state.completedPings;
  display.faults = state.faults;
  display.armed = state.armed;
  display.previewValid = state.previewValid;
  memcpy(display.preview, state.preview, sizeof(display.preview));
  displays.tick(inputs, display, now);
  static std::uint32_t lastTelemetry = 0;
  if (telemetryEnabled && now - lastTelemetry >= 1000) {
    lastTelemetry = now;
    telemetry(inputs);
  }
  delay(2);
}
