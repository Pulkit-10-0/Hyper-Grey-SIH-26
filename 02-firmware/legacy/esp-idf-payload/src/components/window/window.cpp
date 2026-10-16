#include "window.h"
#include "dds.h"

namespace {
constexpr int32_t Q15_ONE = 32767;
int16_t cosine_for_position(uint32_t i, uint32_t n, uint32_t harmonic = 1) {
    if (n <= 1) return Q15_ONE;
    const uint32_t phase = (static_cast<uint64_t>(i) * 256ULL * harmonic) / (n - 1U);
    return dds_lookup_q15(static_cast<uint8_t>((phase + 64U) & 0xFFU));
}
}

int16_t window_gain_q15(window_type_t type, uint32_t i, uint32_t n) {
    if (n <= 1 || type == window_type_t::RECTANGULAR) return Q15_ONE;
    const int32_t c1 = cosine_for_position(i, n);
    if (type == window_type_t::HANN) return static_cast<int16_t>((Q15_ONE - c1) / 2);
    if (type == window_type_t::TUKEY) {
        const uint32_t ramp = n / 4U;
        if (ramp == 0 || (i >= ramp && i < n - ramp)) return Q15_ONE;
        const uint32_t r = i < ramp ? i : (n - 1U - i);
        const int32_t cr = cosine_for_position(r, ramp * 2U);
        return static_cast<int16_t>((Q15_ONE - cr) / 2);
    }
    const int32_t c2 = cosine_for_position(i, n, 2);
    const int32_t value = 13762 - ((16384 * c1) >> 15) + ((2621 * c2) >> 15);
    return static_cast<int16_t>(value < 0 ? 0 : (value > Q15_ONE ? Q15_ONE : value));
}
