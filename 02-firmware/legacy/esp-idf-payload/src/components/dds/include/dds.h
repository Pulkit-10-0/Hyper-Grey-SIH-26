#pragma once
#include <stdint.h>

struct dds_oscillator_t {
    uint32_t phase_q16;
    uint32_t step_q16;
};

void dds_configure(dds_oscillator_t *osc, uint32_t frequency_hz, uint32_t sample_rate_hz);
int16_t dds_next_q15(dds_oscillator_t *osc);
int16_t dds_lookup_q15(uint8_t index);
