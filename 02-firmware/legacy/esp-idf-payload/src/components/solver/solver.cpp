#include "solver.h"
#include "esp_timer.h"
#include "physics.h"

namespace {
constexpr uint32_t SAMPLE_RATE_HZ = 2000000;
constexpr uint16_t REQUIRED_MARGIN_DB_X10 = 60;
constexpr uint16_t DESIGN_RANGE_CM = 1000;
constexpr uint32_t CANDIDATES_HZ[] = {24000, 32000, 40000, 48000, 60000, 80000};
sonar_mode_t s_forced_mode = sonar_mode_t::AUTO;
uint16_t s_last_latency_ms = 0;
}

void solver_init() { s_forced_mode = sonar_mode_t::AUTO; }
void solver_force_mode(sonar_mode_t mode) { s_forced_mode = mode; }

void solver_update(const sensor_snapshot_t &sample, uint16_t battery_mv, solver_plan_t *out) {
    const int64_t start_us = esp_timer_get_time();
    const int16_t water_temperature_centi_c = sample.temperature_centi_c == INT16_MIN
        ? 2500 : sample.temperature_centi_c;
    sonar_mode_t mode = s_forced_mode;
    if (mode == sonar_mode_t::AUTO) {
        if (battery_mv < 3500 || sample.turbidity_ntu_x10 > 800) mode = sonar_mode_t::RANGE;
        else if (sample.turbidity_ntu_x10 < 150) mode = sonar_mode_t::DETAIL;
        else mode = sonar_mode_t::BALANCED;
    }

    int16_t best_margin = INT16_MIN;
    uint32_t best_frequency = 40000;
    for (uint32_t frequency : CANDIDATES_HZ) {
        int16_t margin = physics_margin_db_x10(frequency, sample.turbidity_ntu_x10,
                                               sample.tds_mg_l, DESIGN_RANGE_CM, 1680);
        if (mode == sonar_mode_t::DETAIL) margin += static_cast<int16_t>(frequency / 4000U);
        if (mode == sonar_mode_t::RANGE) margin -= static_cast<int16_t>(frequency / 5000U);
        if (margin > best_margin) {
            best_margin = margin;
            best_frequency = frequency;
        }
    }

    out->mode = mode;
    out->frequency_hz = best_frequency;
    out->sample_rate_hz = SAMPLE_RATE_HZ;
    out->sample_count = mode == sonar_mode_t::RANGE ? 4096U : (mode == sonar_mode_t::DETAIL ? 2048U : 3072U);
    out->window = mode == sonar_mode_t::RANGE ? window_type_t::TUKEY
                : (mode == sonar_mode_t::DETAIL ? window_type_t::BLACKMAN : window_type_t::HANN);
    out->amplitude_q15 = battery_mv < 3400 ? 19660U : 29490U;
    out->margin_db_x10 = best_margin;
    out->sound_speed_mm_s = physics_sound_speed_mm_s(water_temperature_centi_c, sample.tds_mg_l);
    s_last_latency_ms = static_cast<uint16_t>((esp_timer_get_time() - start_us + 999) / 1000);
}

uint16_t solver_last_latency_ms() { return s_last_latency_ms; }
