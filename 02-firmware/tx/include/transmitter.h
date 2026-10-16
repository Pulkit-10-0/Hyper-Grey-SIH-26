#pragma once

#include "board_config.h"
#include "waveform.h"
#include <Arduino.h>
#include <driver/gptimer.h>
#include <driver/i2s_std.h>

namespace sonar {

struct TxCommand {
  Config wave;
  std::uint32_t pwmHz = 40000;
  std::uint32_t periodMs = 250;
  std::uint8_t pwmDuty = 64;
  bool armed = false;
  bool clearFault = false;
};

struct TxStatus {
  Config wave;
  std::uint32_t completedPings = 0;
  std::uint32_t faults = 0;
  std::uint32_t missedPeriods = 0;
  std::uint32_t pwmHz = 40000;
  std::uint32_t periodMs = 250;
  std::uint32_t buildUs = 0;
  std::uint32_t startDelayUs = 0;
  std::uint8_t pwmDuty = 0;
  bool ready = false;
  bool armed = false;
  bool active = false;
  bool faultLatched = false;
  const char* faultReason = "NONE";
  std::int16_t preview[128] = {};
  bool previewValid = false;
};

class Transmitter {
 public:
  bool begin();
  bool submit(const TxCommand& command);
  TxStatus status();

 private:
  static void taskEntry(void* context);
  void run();
  bool startPulse(const TxCommand& command);
  void stopPulse();
  void latchFault(const char* reason);
  static bool IRAM_ATTR onPeriod(gptimer_handle_t,
      const gptimer_alarm_event_data_t*, void*);
  static bool IRAM_ATTR onGate(gptimer_handle_t,
      const gptimer_alarm_event_data_t*, void*);
  static bool IRAM_ATTR onDma(i2s_chan_handle_t, i2s_event_data_t*, void*);
  static void IRAM_ATTR setPwmDuty(std::uint32_t duty);

  QueueHandle_t queue_ = nullptr;
  TaskHandle_t task_ = nullptr;
  i2s_chan_handle_t i2s_ = nullptr;
  gptimer_handle_t periodTimer_ = nullptr;
  gptimer_handle_t gateTimer_ = nullptr;
  portMUX_TYPE statusMux_ = portMUX_INITIALIZER_UNLOCKED;
  portMUX_TYPE gateMux_ = portMUX_INITIALIZER_UNLOCKED;
  portMUX_TYPE eventMux_ = portMUX_INITIALIZER_UNLOCKED;
  TxStatus status_;
  Config cached_;
  bool cachedValid_ = false;
  bool i2sRunning_ = false;
  bool gateRunning_ = false;
  std::uint32_t dmaBlocksSent_ = 0;
  bool dmaCounting_ = false;
  std::uint32_t alarmTimestampUs_ = 0;
  bool gateArmed_ = false;
  bool gateStarting_ = false;
  std::uint32_t gateDuty_ = 0;
  std::uint64_t gateStopTick_ = 0;
  alignas(4) std::int16_t samples_[board::kPlaybackFrames * 2] = {};
};
}
