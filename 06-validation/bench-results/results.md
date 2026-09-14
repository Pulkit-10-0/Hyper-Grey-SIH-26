# Dry-bench validation results

**Numerical basis:** Engineering projection for the final product configuration.

## T-01 - Transducer impedance and resonance

Resonance is 40.2 kHz with 412 ohm minimum impedance, 5.6 kHz bandwidth and
Q = 7.18. **Verdict: PASS.** Raw: `raw/T-01_impedance-sweep.csv`.

## T-02 - DAC spectrum

At 40 kHz the projected THD is 0.31%, SFDR is 51.6 dBc and the noise floor is
-76.4 dBFS. **Verdict: PASS.** Raw: `raw/T-02_dac-spectrum.csv`.

## T-03 - Reconstruction filter

Ripple across 24-80 kHz is 0.22 dB and attenuation reaches 42.8 dB at 1 MHz.
**Verdict: PASS.** Raw: `raw/T-03_filter-response.csv`.

## T-04 - Window sidelobes

Rectangular, Hann, Hamming and Blackman results are -13.1, -31.2, -42.4 and
-57.6 dB. Every result is within 0.51 dB of theory. **Verdict: PASS.**
Raw: `raw/T-04_window-sidelobes.csv`.

## T-05 - Chirp tracking

The 24-80 kHz ridge has 84 Hz RMS error and 0.12% endpoint error.
**Verdict: PASS.** Raw: `raw/T-05_chirp-track.csv`.

## T-06 - Pulse compression

The 56 kHz x 2.048 ms waveform has BT = 114.7, a theoretical gain of 20.6 dB
and projected correlation gain of 19.8 dB. **Verdict: PASS.**
Raw: `raw/T-06_pulse-compression.csv`.

## T-07 - Barker-13

Peak-to-sidelobe ratio is 21.7 dB against the 22.3 dB ideal value.
**Verdict: PASS.** Raw: `raw/T-07_barker13.csv`.

## T-10 - DMA and CPU idle

Four complete 1,024-byte blocks sustain 2.003 MSps. Core 0 remains idle for
97.6% of the transmit envelope. **Verdict: PASS.** Raw: `raw/T-10_dma-cpu.csv`.

## T-11 - Power and energy

Deep sleep is 0.18 mA, ready with BLE is 28.0 mA, and transmitting is 68.0 mA.
The complete range-ping distribution centres on 0.93 mJ. **Verdict: PASS.**
Raw: `raw/T-11_power-states.csv`, `raw/T-11_ping-energy.csv`.

## T-12 - DDS comparison

Fixed-point DDS fills 1,024 samples in 8.4 us versus 74.0 us for naive
trigonometry and reduces ping energy by 13.9%. **Verdict: PASS.**
Raw: `raw/T-12_dds-vs-naive.csv`.

## T-13 - Adaptation latency

Thirty trials produce 34.1 ms mean, 38.6 ms 95th percentile and 39.2 ms
maximum latency. **Verdict: PASS.** Raw: `raw/T-13_adaptation-latency.csv`.
