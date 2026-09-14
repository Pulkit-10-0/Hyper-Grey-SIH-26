#pragma once
#include <stdint.h>
#include "esp_err.h"
esp_err_t power_init();
void power_sample();
void power_begin_ping();
uint32_t power_end_ping();
uint16_t power_battery_mv();
uint16_t power_current_ma_x10();
void power_light_sleep_ms(uint32_t duration_ms);
