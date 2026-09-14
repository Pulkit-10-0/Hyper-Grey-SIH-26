#pragma once
#include <stdint.h>

enum class window_type_t : uint8_t { RECTANGULAR = 0, HANN = 1, TUKEY = 2, BLACKMAN = 3 };
int16_t window_gain_q15(window_type_t type, uint32_t sample_index, uint32_t sample_count);
