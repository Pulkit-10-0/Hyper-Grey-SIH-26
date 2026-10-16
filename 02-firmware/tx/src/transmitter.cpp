#include "transmitter.h"

#include <driver/ledc.h>
#include <esp_timer.h>
#include <hal/ledc_ll.h>
#include <soc/ledc_struct.h>
#include <cstring>

#if !CONFIG_IDF_TARGET_ESP32S3
#error This board profile requires an ESP32-S3.
#endif

namespace sonar {
namespace {
constexpr std::uint32_t kPeriod = 1;
constexpr std::uint32_t kDmaDone = 2;
constexpr std::uint32_t kGateDone = 4;
constexpr std::uint32_t kCommand = 8;
constexpr std::uint32_t kGateError = 16;

bool sameWave(const Config& a, const Config& b) {
  return a.sampleRateHz == b.sampleRateHz && a.startHz == b.startHz &&
      a.endHz == b.endHz && a.durationMs == b.durationMs &&
      a.amplitude == b.amplitude && a.modulation == b.modulation &&
      a.window == b.window;
}
}

void IRAM_ATTR Transmitter::setPwmDuty(std::uint32_t duty) {
  // This channel is owned exclusively here; the ISR never calls a locking driver.
  ledc_ll_set_duty_int_part(&LEDC, LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, duty);
  ledc_ll_set_duty_start(&LEDC, LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0);
  ledc_ll_ls_channel_update(&LEDC, LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0);
}

bool IRAM_ATTR Transmitter::onPeriod(gptimer_handle_t,
    const gptimer_alarm_event_data_t*, void* context) {
  auto* self = static_cast<Transmitter*>(context);
  portENTER_CRITICAL_ISR(&self->eventMux_);
  self->alarmTimestampUs_ = static_cast<std::uint32_t>(esp_timer_get_time());
  portEXIT_CRITICAL_ISR(&self->eventMux_);
  BaseType_t wake = pdFALSE;
  xTaskNotifyFromISR(self->task_, kPeriod, eSetBits, &wake);
  return wake == pdTRUE;
}

bool IRAM_ATTR Transmitter::onGate(gptimer_handle_t timer,
    const gptimer_alarm_event_data_t* data, void* context) {
  auto* self = static_cast<Transmitter*>(context);
  std::uint32_t event = 0;
  portENTER_CRITICAL_ISR(&self->gateMux_);
  if (self->gateArmed_ && self->gateStarting_) {
    self->gateStarting_ = false;
    gptimer_alarm_config_t alarm = {};
    alarm.alarm_count = self->gateStopTick_;
    if (data->count_value >= self->gateStopTick_ ||
        gptimer_set_alarm_action(timer, &alarm) != ESP_OK) {
      setPwmDuty(0);
      self->gateArmed_ = false;
      event = kGateError;
    } else {
      setPwmDuty(self->gateDuty_);
    }
  } else if (self->gateArmed_) {
    setPwmDuty(0);
    self->gateArmed_ = false;
    event = kGateDone;
  }
  portEXIT_CRITICAL_ISR(&self->gateMux_);
  BaseType_t wake = pdFALSE;
  if (event) xTaskNotifyFromISR(self->task_, event, eSetBits, &wake);
  return wake == pdTRUE;
}

bool IRAM_ATTR Transmitter::onDma(i2s_chan_handle_t, i2s_event_data_t*,
                                 void* context) {
  auto* self = static_cast<Transmitter*>(context);
  BaseType_t wake = pdFALSE;
  bool completed = false;
  portENTER_CRITICAL_ISR(&self->eventMux_);
  if (self->dmaCounting_) {
    self->dmaBlocksSent_ = self->dmaBlocksSent_ + 1;
  }
  if (self->dmaCounting_ && self->dmaBlocksSent_ == board::kDmaBlocks) {
    self->dmaCounting_ = false;
    completed = true;
  }
  portEXIT_CRITICAL_ISR(&self->eventMux_);
  if (completed) xTaskNotifyFromISR(self->task_, kDmaDone, eSetBits, &wake);
  return wake == pdTRUE;
}

bool Transmitter::begin() {
  pinMode(board::kPwmTx, OUTPUT);
  digitalWrite(board::kPwmTx, LOW);
  ledc_timer_config_t timer = {};
  timer.speed_mode = LEDC_LOW_SPEED_MODE;
  timer.duty_resolution = LEDC_TIMER_8_BIT;
  timer.timer_num = LEDC_TIMER_0;
  timer.freq_hz = 40000;
  timer.clk_cfg = LEDC_AUTO_CLK;
  if (ledc_timer_config(&timer) != ESP_OK) return false;
  ledc_channel_config_t pwm = {};
  pwm.gpio_num = board::kPwmTx;
  pwm.speed_mode = LEDC_LOW_SPEED_MODE;
  pwm.channel = LEDC_CHANNEL_0;
  pwm.timer_sel = LEDC_TIMER_0;
  if (ledc_channel_config(&pwm) != ESP_OK) return false;

  i2s_chan_config_t channel = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);
  channel.dma_desc_num = board::kDmaBlocks;
  channel.dma_frame_num = board::kDmaBlockFrames;
  channel.auto_clear = true;
  if (i2s_new_channel(&channel, &i2s_, nullptr) != ESP_OK) return false;
  i2s_std_config_t standard = {};
  standard.clk_cfg = I2S_STD_CLK_DEFAULT_CONFIG(board::kSampleRate);
  standard.clk_cfg.mclk_multiple = I2S_MCLK_MULTIPLE_128;
  standard.slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(
      I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_STEREO);
  // 32-bit slots provide 64 BCLKs/frame, including the optional PCM5102A profile.
  standard.slot_cfg.slot_bit_width = I2S_SLOT_BIT_WIDTH_32BIT;
  standard.slot_cfg.ws_width = 32;
  standard.gpio_cfg.mclk = I2S_GPIO_UNUSED;
  standard.gpio_cfg.bclk = static_cast<gpio_num_t>(board::kBclk);
  standard.gpio_cfg.ws = static_cast<gpio_num_t>(board::kWordSelect);
  standard.gpio_cfg.dout = static_cast<gpio_num_t>(board::kDataOut);
  standard.gpio_cfg.din = I2S_GPIO_UNUSED;
  if (i2s_channel_init_std_mode(i2s_, &standard) != ESP_OK) return false;
  i2s_event_callbacks_t dmaCallbacks = {};
  dmaCallbacks.on_sent = onDma;
  if (i2s_channel_register_event_callback(i2s_, &dmaCallbacks, this) != ESP_OK)
    return false;

  gptimer_config_t config = {};
  config.clk_src = GPTIMER_CLK_SRC_DEFAULT;
  config.direction = GPTIMER_COUNT_UP;
  config.resolution_hz = 1000000;
  if (gptimer_new_timer(&config, &periodTimer_) != ESP_OK ||
      gptimer_new_timer(&config, &gateTimer_) != ESP_OK) return false;
  gptimer_event_callbacks_t periodCallbacks = {};
  periodCallbacks.on_alarm = onPeriod;
  gptimer_event_callbacks_t gateCallbacks = {};
  gateCallbacks.on_alarm = onGate;
  if (gptimer_register_event_callbacks(periodTimer_, &periodCallbacks, this) != ESP_OK ||
      gptimer_register_event_callbacks(gateTimer_, &gateCallbacks, this) != ESP_OK ||
      gptimer_enable(periodTimer_) != ESP_OK ||
      gptimer_enable(gateTimer_) != ESP_OK) return false;
  queue_ = xQueueCreate(1, sizeof(TxCommand));
  if (!queue_ || xTaskCreatePinnedToCore(taskEntry, "sonar-tx", 6144,
      this, 4, &task_, 0) != pdPASS) return false;
  return true;
}

bool Transmitter::submit(const TxCommand& command) {
  if (!queue_) return false;
  if (xQueueOverwrite(queue_, &command) != pdPASS) return false;
  xTaskNotify(task_, kCommand, eSetBits);
  return true;
}

TxStatus Transmitter::status() {
  portENTER_CRITICAL(&statusMux_);
  const TxStatus copy = status_;
  portEXIT_CRITICAL(&statusMux_);
  return copy;
}

void Transmitter::taskEntry(void* context) {
  static_cast<Transmitter*>(context)->run();
}

void Transmitter::latchFault(const char* reason) {
  stopPulse();
  portENTER_CRITICAL(&statusMux_);
  ++status_.faults;
  status_.faultLatched = true;
  status_.armed = false;
  status_.faultReason = reason;
  portEXIT_CRITICAL(&statusMux_);
}

void Transmitter::stopPulse() {
  portENTER_CRITICAL(&eventMux_);
  dmaCounting_ = false;
  portEXIT_CRITICAL(&eventMux_);
  if (gateRunning_) {
    gptimer_stop(gateTimer_);
    gateRunning_ = false;
  }
  portENTER_CRITICAL(&gateMux_);
  gateArmed_ = false;
  setPwmDuty(0);
  portEXIT_CRITICAL(&gateMux_);
  if (i2sRunning_) {
    i2s_channel_disable(i2s_);
    i2sRunning_ = false;
  }
  portENTER_CRITICAL(&statusMux_);
  status_.active = false;
  portEXIT_CRITICAL(&statusMux_);
}

bool Transmitter::startPulse(const TxCommand& command) {
  const Config& wave = command.wave;
  const float lowLimit = SONAR_PCM5102A ? 38000.0f : 1000.0f;
  const float highLimit = SONAR_PCM5102A ? 42000.0f : 8000.0f;
  if (validate(wave) != Error::Ok || wave.durationMs < 4.0f ||
      wave.sampleRateHz != board::kSampleRate ||
      wave.startHz < lowLimit || wave.endHz < lowLimit ||
      wave.startHz > highLimit || wave.endHz > highLimit ||
      command.pwmHz < 38000 || command.pwmHz > 42000 ||
      command.pwmDuty > 102 || command.periodMs < board::kMinPeriodMs ||
      command.periodMs > board::kMaxPeriodMs) return false;

  const auto buildStart = esp_timer_get_time();
  if (!cachedValid_ || !sameWave(cached_, wave)) {
    memset(samples_, 0, sizeof(samples_));
    if (synthesize(wave, samples_ + 2 * board::kWarmupFrames,
                   board::kPlaybackFrames - board::kWarmupFrames) != Error::Ok)
      return false;
    cached_ = wave;
    cachedValid_ = true;
  }
  if (ledc_set_freq(LEDC_LOW_SPEED_MODE, LEDC_TIMER_0, command.pwmHz) != ESP_OK)
    return false;
  std::size_t loaded = 0;
  if (i2s_channel_preload_data(i2s_, samples_, sizeof(samples_), &loaded) != ESP_OK ||
      loaded != sizeof(samples_)) return false;
  gptimer_alarm_config_t gate = {};
  gate.alarm_count = board::kWarmupUs;
  if (gptimer_set_raw_count(gateTimer_, 0) != ESP_OK ||
      gptimer_set_alarm_action(gateTimer_, &gate) != ESP_OK) return false;

  portENTER_CRITICAL(&eventMux_);
  dmaBlocksSent_ = 0;
  dmaCounting_ = true;
  portEXIT_CRITICAL(&eventMux_);
  portENTER_CRITICAL(&gateMux_);
  gateArmed_ = true;
  gateStarting_ = true;
  gateDuty_ = command.pwmDuty;
  gateStopTick_ = board::kWarmupUs +
      static_cast<std::uint64_t>(wave.durationMs * 1000.0f + 0.5f);
  portEXIT_CRITICAL(&gateMux_);
  if (i2s_channel_enable(i2s_) != ESP_OK) return false;
  i2sRunning_ = true;
  if (gptimer_start(gateTimer_) != ESP_OK) return false;
  gateRunning_ = true;
  const auto count = sampleCount(wave);
  const auto actualPwmHz = ledc_get_freq(LEDC_LOW_SPEED_MODE, LEDC_TIMER_0);
  const auto preparedUs = static_cast<std::uint32_t>(esp_timer_get_time() - buildStart);
  portENTER_CRITICAL(&eventMux_);
  const auto alarmTimestamp = alarmTimestampUs_;
  portEXIT_CRITICAL(&eventMux_);
  const auto delayUs = static_cast<std::uint32_t>(esp_timer_get_time()) - alarmTimestamp;
  portENTER_CRITICAL(&statusMux_);
  status_.wave = wave;
  status_.pwmHz = actualPwmHz;
  status_.pwmDuty = command.pwmDuty;
  status_.buildUs = preparedUs;
  status_.startDelayUs = delayUs;
  status_.active = true;
  for (std::size_t i = 0; i < 128; ++i)
    status_.preview[i] = samples_[2 * board::kWarmupFrames + 2 * (i * (count - 1) / 127)];
  status_.previewValid = true;
  portEXIT_CRITICAL(&statusMux_);
  return true;
}

void Transmitter::run() {
  TxCommand desired;
  desired.wave.sampleRateHz = board::kSampleRate;
  bool timerRunning = false;
  bool pulseActive = false;
  bool dmaDone = false;
  bool gateDone = false;
  std::int64_t deadlineUs = 0;
  std::uint32_t currentPeriod = 0;
  std::int64_t lastCommandUs = esp_timer_get_time();
  portENTER_CRITICAL(&statusMux_);
  status_.ready = true;
  portEXIT_CRITICAL(&statusMux_);
  for (;;) {
    std::uint32_t events = 0;
    xTaskNotifyWait(0, UINT32_MAX, &events,
                   pulseActive ? pdMS_TO_TICKS(10) : portMAX_DELAY);
    TxCommand incoming;
    if (xQueueReceive(queue_, &incoming, 0) == pdTRUE) {
      desired = incoming;
      lastCommandUs = esp_timer_get_time();
      if (incoming.clearFault && !incoming.armed) {
        portENTER_CRITICAL(&statusMux_);
        status_.faultLatched = false;
        status_.faultReason = "NONE";
        portEXIT_CRITICAL(&statusMux_);
      }
    }
    const bool allowed = desired.armed && !status().faultLatched;
    if (!allowed) {
      stopPulse();
      pulseActive = false;
      if (timerRunning) {
        gptimer_stop(periodTimer_);
        timerRunning = false;
      }
    }
    if (allowed && !pulseActive &&
        (!timerRunning || currentPeriod != desired.periodMs)) {
      if (timerRunning) gptimer_stop(periodTimer_);
      gptimer_alarm_config_t alarm = {};
      alarm.alarm_count = static_cast<std::uint64_t>(desired.periodMs) * 1000;
      alarm.flags.auto_reload_on_alarm = true;
      if (desired.periodMs < board::kMinPeriodMs ||
          desired.periodMs > board::kMaxPeriodMs ||
          gptimer_set_raw_count(periodTimer_, 0) != ESP_OK ||
          gptimer_set_alarm_action(periodTimer_, &alarm) != ESP_OK ||
          gptimer_start(periodTimer_) != ESP_OK) {
        latchFault("PERIOD_TIMER");
        desired.armed = false;
        continue;
      }
      currentPeriod = desired.periodMs;
      timerRunning = true;
      events &= ~kPeriod;
    }
    if (pulseActive) {
      if (events & kGateError) {
        latchFault("BURST_GATE_TIMER");
        desired.armed = false;
        pulseActive = false;
        continue;
      }
      dmaDone |= (events & kDmaDone) != 0;
      gateDone |= (events & kGateDone) != 0;
      if (dmaDone && gateDone) {
        stopPulse();
        pulseActive = false;
        portENTER_CRITICAL(&statusMux_);
        ++status_.completedPings;
        portEXIT_CRITICAL(&statusMux_);
      } else if (esp_timer_get_time() > deadlineUs) {
        latchFault("PLAYBACK_TIMEOUT");
        desired.armed = false;
        pulseActive = false;
      }
    }
    if ((events & kPeriod) && allowed && desired.armed) {
      if (esp_timer_get_time() - lastCommandUs > 500000) {
        latchFault("CONTROL_TIMEOUT");
        desired.armed = false;
        pulseActive = false;
      } else if (pulseActive) {
        portENTER_CRITICAL(&statusMux_);
        ++status_.missedPeriods;
        portEXIT_CRITICAL(&statusMux_);
        latchFault("MISSED_PERIOD");
        desired.armed = false;
        pulseActive = false;
      } else if (startPulse(desired)) {
        pulseActive = true;
        dmaDone = gateDone = false;
        deadlineUs = esp_timer_get_time() +
            board::kPlaybackFrames * 1000000ULL / board::kSampleRate + 20000;
      } else {
        latchFault("PLAYBACK_CONFIG_OR_DRIVER");
        desired.armed = false;
      }
    }
    portENTER_CRITICAL(&statusMux_);
    status_.armed = desired.armed && !status_.faultLatched;
    status_.periodMs = currentPeriod ? currentPeriod : desired.periodMs;
    portEXIT_CRITICAL(&statusMux_);
  }
}
}
