#pragma once
#include "driver/i2c_master.h"
#include "esp_check.h"
#include "esp_err.h"

constexpr int PIN_DS18B20 = 4;
constexpr int PIN_I2S_BCLK = 5;
constexpr int PIN_I2S_WS = 6;
constexpr int PIN_I2S_DATA = 7;
constexpr int PIN_I2C_SDA = 8;
constexpr int PIN_I2C_SCL = 9;
constexpr int PIN_TRIGGER = 0;
constexpr int PIN_IDLE_MARKER = 2;
constexpr int PIN_ENVELOPE_MARKER = 3;
constexpr int PIN_INA_ALERT = 16;
constexpr int PIN_POT_RAIL = 17;
constexpr int PIN_TX_ENABLE = 18;
constexpr int PIN_STATUS_LED = 21;
constexpr int PIN_DAC_DATA[8] = {35, 36, 37, 38, 39, 40, 41, 42};
constexpr int PIN_DAC_WR = 47;
constexpr int PIN_DAC_CS = 48;

esp_err_t board_init();
i2c_master_bus_handle_t board_i2c_bus();
void board_set_tx_enabled(bool enabled);
void board_set_pot_rail(bool enabled);
void board_set_envelope_marker(bool enabled);
void board_toggle_idle_marker();
