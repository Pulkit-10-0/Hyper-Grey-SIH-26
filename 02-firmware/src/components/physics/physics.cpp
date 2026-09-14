#include "physics.h"

int32_t physics_sound_speed_mm_s(int16_t temperature_centi_c, uint16_t tds_mg_l) {
    const int32_t delta_centi = static_cast<int32_t>(temperature_centi_c) - 2000;
    const int32_t thermal = (4000 * delta_centi) / 100;
    const int32_t dissolved = static_cast<int32_t>(tds_mg_l) / 2;
    return 1482000 + thermal + dissolved;
}

uint32_t physics_absorption_db_km_x1000(uint32_t frequency_hz, int16_t temperature_centi_c) {
    const uint32_t f_khz_x10 = frequency_hz / 100U;
    const uint64_t square = static_cast<uint64_t>(f_khz_x10) * f_khz_x10;
    const uint32_t base = static_cast<uint32_t>((square * 11ULL) / (1000ULL + square / 100ULL));
    const int32_t correction = (temperature_centi_c - 2000) / 20;
    const int32_t result = static_cast<int32_t>(base) - correction;
    return result < 50 ? 50U : static_cast<uint32_t>(result);
}

int16_t physics_margin_db_x10(uint32_t frequency_hz, uint16_t turbidity_ntu_x10,
                              uint16_t tds_mg_l, uint16_t range_cm, uint16_t source_level_db_x10) {
    const uint32_t spreading_db_x10 = range_cm <= 100 ? 0U : (range_cm - 100U) / 5U;
    const uint32_t absorption = (physics_absorption_db_km_x1000(frequency_hz, 2500) * range_cm) / 100000U;
    const uint32_t water_penalty = turbidity_ntu_x10 / 25U + tds_mg_l / 250U;
    const int32_t noise_and_threshold = 720;
    const int32_t margin = static_cast<int32_t>(source_level_db_x10) - spreading_db_x10 - absorption - water_penalty - noise_and_threshold;
    return static_cast<int16_t>(margin);
}
