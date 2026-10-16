#pragma once
#include <stdint.h>
#include "adc_sensors.h"
#include "window.h"

enum class sonar_mode_t : uint8_t { AUTO = 0, RANGE = 1, BALANCED = 2, DETAIL = 3 };
struct solver_plan_t {
    sonar_mode_t mode;
    window_type_t window;
    uint32_t frequency_hz;
    uint32_t sample_rate_hz;
    uint32_t sample_count;
    uint16_t amplitude_q15;
    int16_t margin_db_x10;
    int32_t sound_speed_mm_s;
};

void solver_init();
void solver_force_mode(sonar_mode_t mode);
void solver_update(const sensor_snapshot_t &sample, uint16_t battery_mv, solver_plan_t *out);
uint16_t solver_last_latency_ms();
