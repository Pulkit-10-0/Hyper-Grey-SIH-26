#pragma once

#include "board_config.h"
#include "environment.h"
#include <cstdint>

#ifndef SONAR_ENABLE_DISPLAYS
#define SONAR_ENABLE_DISPLAYS 1
#endif

#if SONAR_ENABLE_DISPLAYS
#include <U8g2lib.h>
#endif

namespace sonar {

struct DisplayStatus {
  const char* backend = "UNAVAILABLE";
  const char* modulation = "LFM";
  const char* window = "HANN";
  float startHz = 0;
  float endHz = 0;
  float pulseMs = 0;
  float amplitude = 0;
  std::uint32_t completedPings = 0;
  std::uint32_t faults = 0;
  bool armed = false;
  std::int16_t preview[128] = {};
  bool previewValid = false;
};

class Displays {
 public:
  void begin();
  void tick(const EnvironmentSnapshot& snapshot, const DisplayStatus& status,
            std::uint32_t now);

 private:
#if SONAR_ENABLE_DISPLAYS
  void drawSensors(const EnvironmentSnapshot& snapshot);
  void drawPots(const EnvironmentSnapshot& snapshot);
  void drawPreview(const DisplayStatus& status);
  void drawStatus(const DisplayStatus& status);

  U8G2_SSD1306_128X64_NONAME_F_HW_I2C oled1_{U8G2_R0, U8X8_PIN_NONE};
  U8G2_SSD1306_128X64_NONAME_F_SW_I2C oled2_{U8G2_R0, 11, 10, U8X8_PIN_NONE};
  U8G2_SSD1306_128X64_NONAME_F_SW_I2C oled3_{U8G2_R0, 13, 12, U8X8_PIN_NONE};
  U8G2_SSD1306_128X64_NONAME_F_SW_I2C oled4_{U8G2_R0, 15, 14, U8X8_PIN_NONE};
  bool oled1Present_ = false;
  std::uint8_t nextScreen_ = 0;
  std::uint32_t lastFrameMs_ = 0;
#endif
};

}  // namespace sonar
