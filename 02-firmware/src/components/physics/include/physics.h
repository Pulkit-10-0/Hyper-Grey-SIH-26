#pragma once
#include <stdint.h>

int32_t physics_sound_speed_mm_s(int16_t temperature_centi_c, uint16_t tds_mg_l);
uint32_t physics_absorption_db_km_x1000(uint32_t frequency_hz, int16_t temperature_centi_c);
int16_t physics_margin_db_x10(uint32_t frequency_hz, uint16_t turbidity_ntu_x10,
                              uint16_t tds_mg_l, uint16_t range_cm, uint16_t source_level_db_x10);
