#pragma once
#include <stdint.h>
#include "esp_err.h"

struct sensor_snapshot_t {
    int16_t temperature_centi_c;
    uint16_t tds_mg_l;
    uint16_t turbidity_ntu_x10;
    uint16_t tds_pot_mv;
    uint16_t turbidity_pot_mv;
    uint16_t temperature_pot_mv;
    uint32_t timestamp_ms;
};

esp_err_t sensors_init();
esp_err_t sensors_read(sensor_snapshot_t *out);
