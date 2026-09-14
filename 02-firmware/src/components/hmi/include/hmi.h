#pragma once
#include <stdint.h>
#include "esp_err.h"
#include "link.h"
esp_err_t hmi_init();
bool hmi_trigger_pressed();
void hmi_update(firmware_state_t state, uint32_t frequency_hz, uint16_t battery_mv, int16_t margin_db_x10);
