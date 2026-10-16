#include "displays.h"

#if SONAR_ENABLE_DISPLAYS
#include <Wire.h>
#include <cmath>
#include <cstring>

namespace sonar {
namespace {
constexpr std::uint32_t kFrameIntervalMs = 200;

void header(U8G2& display, const char* title, const char* state) {
  display.clearBuffer();
  display.setFont(u8g2_font_5x8_tf);
  display.drawStr(0, 9, title);
  if (state) display.drawStr(128 - display.getStrWidth(state), 9, state);
  display.drawHLine(0, 12, 128);
}

void voltage(U8G2& display, int y, const char* name, float volts, bool valid) {
  display.drawStr(0, y, name);
  display.setCursor(76, y);
  if (valid) {
    display.print(volts, 3);
    display.print(" V");
  } else {
    display.print("--");
  }
}

void pot(U8G2& display, int y, const char* name, float volts, float level,
         bool valid) {
  display.drawStr(0, y, name);
  display.drawFrame(28, y - 6, 48, 7);
  if (valid) {
    const int width = static_cast<int>(fmaxf(0, fminf(1, level)) * 44 + 0.5f);
    if (width) display.drawBox(30, y - 4, width, 3);
  }
  display.setCursor(82, y);
  if (valid) {
    display.print(volts, 2);
    display.print("V");
  } else {
    display.print("--");
  }
}
}  // namespace

void Displays::begin() {
  Wire.beginTransmission(0x3c);
  oled1Present_ = Wire.endTransmission() == 0;
  U8G2* displays[4] = {&oled1_, &oled2_, &oled3_, &oled4_};
  for (std::uint8_t index = 0; index < 4; ++index) {
    if (index == 0 && !oled1Present_) continue;
    displays[index]->setI2CAddress(0x3c << 1);
    displays[index]->setBusClock(400000);
    displays[index]->begin();
    displays[index]->clearBuffer();
    displays[index]->setFont(u8g2_font_6x10_tf);
    displays[index]->drawStr(16, 26, "SEANERGY");
    displays[index]->drawStr(16, 43, "INITIALIZING");
    displays[index]->sendBuffer();
  }
  Wire.setClock(400000);
  Wire.setTimeOut(10);
}

void Displays::drawSensors(const EnvironmentSnapshot& snapshot) {
  if (!oled1Present_) return;
  header(oled1_, "REAL SENSORS", snapshot.realAdcStale ? "STALE" : "ADC1");
  oled1_.drawStr(0, 22, "TEMP");
  oled1_.setCursor(76, 22);
  if (snapshot.tempValid) {
    oled1_.print(snapshot.tempC, 1);
    oled1_.print(" C");
  } else {
    oled1_.print("--");
  }
  voltage(oled1_, 32, "TDS", snapshot.realVolts[0], snapshot.realValid[0]);
  voltage(oled1_, 42, "TURB", snapshot.realVolts[1], snapshot.realValid[1]);
  voltage(oled1_, 52, "pH", snapshot.realVolts[2], snapshot.realValid[2]);
  oled1_.drawStr(0, 62, "PRESS");
  oled1_.setCursor(76, 62);
  if (snapshot.pressureValid) {
    oled1_.print(snapshot.pressureMPa, 2);
    oled1_.print("MPa");
  } else {
    oled1_.print("--");
  }
  oled1_.sendBuffer();
}

void Displays::drawPots(const EnvironmentSnapshot& snapshot) {
  header(oled2_, "POT INPUTS", snapshot.inputsValid ? "ACTIVE" : "STALE");
  oled2_.setFont(u8g2_font_4x6_tf);
  pot(oled2_, 21, "TDS", snapshot.potVolts[0], snapshot.tdsLevel,
      snapshot.potValid[0]);
  pot(oled2_, 31, "TURB", snapshot.potVolts[1], snapshot.turbidityLevel,
      snapshot.potValid[1]);
  pot(oled2_, 41, "TEMP", snapshot.potVolts[2], snapshot.tempLevel,
      snapshot.potValid[2]);
  pot(oled2_, 51, "pH", snapshot.potVolts[3], snapshot.phLevel,
      snapshot.potValid[3]);
  pot(oled2_, 61, "DEPTH", snapshot.depthVoltage, snapshot.depthLevel,
      snapshot.depthValid);
  oled2_.sendBuffer();
}

void Displays::drawPreview(const DisplayStatus& status) {
  header(oled3_, "PCM PREVIEW", status.armed ? "ARMED" : "IDLE");
  oled3_.setCursor(0, 22);
  oled3_.print(status.modulation);
  oled3_.print(" / ");
  oled3_.print(status.window);
  oled3_.drawHLine(0, 44, 128);
  if (status.previewValid) {
    int previous = 44;
    for (int x = 0; x < 128; ++x) {
      const int y = 44 - (static_cast<int>(status.preview[x]) * 19) / 32768;
      if (x) oled3_.drawLine(x - 1, previous, x, y);
      previous = y;
    }
  } else {
    oled3_.drawStr(25, 38, "NO PCM BUFFER");
  }
  oled3_.sendBuffer();
}

void Displays::drawStatus(const DisplayStatus& status) {
  const bool phaseCoded = strcmp(status.modulation, "barker13") == 0;
  header(oled4_, "TX STATUS", status.armed ? "ARMED" : "IDLE");
  oled4_.setCursor(0, 22);
  if (phaseCoded) {
    oled4_.print("CARRIER ");
    oled4_.print((status.startHz + status.endHz) / 2000.0f, 1);
  } else {
    oled4_.print(status.startHz / 1000.0f, 1);
    oled4_.print("-");
    oled4_.print(status.endHz / 1000.0f, 1);
  }
  oled4_.print(" kHz");
  oled4_.setCursor(0, 32);
  oled4_.print(status.pulseMs, 1);
  oled4_.print("ms  ");
  oled4_.print(status.amplitude * 100.0f, 0);
  oled4_.print("% FS");
  oled4_.setCursor(0, 42);
  oled4_.print(phaseCoded ? "13 CHIP" : status.modulation);
  oled4_.print(" ");
  oled4_.print(status.window);
  oled4_.setCursor(0, 52);
  oled4_.print("P:");
  oled4_.print(status.completedPings);
  oled4_.print(" F:");
  oled4_.print(status.faults);
  oled4_.setCursor(0, 62);
  oled4_.print(status.backend);
  oled4_.sendBuffer();
}

void Displays::tick(const EnvironmentSnapshot& snapshot,
                    const DisplayStatus& status, std::uint32_t now) {
  if (now - lastFrameMs_ < kFrameIntervalMs) return;
  lastFrameMs_ = now;
  switch (nextScreen_) {
    case 0: drawSensors(snapshot); break;
    case 1: drawPots(snapshot); break;
    case 2: drawPreview(status); break;
    default: drawStatus(status); break;
  }
  nextScreen_ = (nextScreen_ + 1) % 4;
}

}  // namespace sonar
#else
namespace sonar {
void Displays::begin() {}
void Displays::tick(const EnvironmentSnapshot&, const DisplayStatus&,
                    std::uint32_t) {}
}  // namespace sonar
#endif
