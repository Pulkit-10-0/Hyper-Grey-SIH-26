# SeaNergy validation test plan

**Problem statement:** SIH 2026-26058  
**Numerical basis:** Engineering projection for the final product configuration  
**Configuration:** ESP32-S3, 2 MSps 8-bit parallel DAC, adaptive 24-80 kHz waveform generation

## Test matrix

| ID | Verification | Primary criterion | Result location |
|---|---|---|---|
| T-01 | Transducer impedance sweep and resonance | Resonance 36-44 kHz; impedance 250-750 ohm; Q 4-12. | `bench-results/raw/T-01_impedance-sweep.csv` |
| T-02 | DAC output spectrum, THD and SFDR | THD below 1.0%; SFDR above 45 dBc. | `bench-results/raw/T-02_dac-spectrum.csv` |
| T-03 | Reconstruction-filter response | Ripple below 0.5 dB; attenuation above 35 dB at 1 MHz. | `bench-results/raw/T-03_filter-response.csv` |
| T-04 | Window peak sidelobe level | Within 1.0 dB of theoretical value. | `bench-results/raw/T-04_window-sidelobes.csv` |
| T-05 | Commanded chirp spectrogram | RMS error below 250 Hz; endpoint error below 0.5%. | `bench-results/raw/T-05_chirp-track.csv` |
| T-06 | Pulse-compression gain | Within 1.5 dB of 10 log10(BT). | `bench-results/raw/T-06_pulse-compression.csv` |
| T-07 | Barker-13 peak-to-sidelobe ratio | At least 20 dB. | `bench-results/raw/T-07_barker13.csv` |
| T-08 | Range accuracy | Error below max(2 cm, 1% of range). | `tank-results/raw/T-08_range-accuracy.csv` |
| T-09 | Two-target range resolution | Resolve 25 mm or closer. | `tank-results/raw/T-09_range-resolution.csv` |
| T-10 | Parallel-bus rate and CPU idle | At least 2 MSps and above 95% idle. | `bench-results/raw/T-10_dma-cpu.csv` |
| T-11 | Power states and ping energy | Sleep below 1.5 mA; ping energy below 1.2 mJ. | `bench-results/raw/T-11_power-states.csv` |
| T-12 | DDS versus naive trigonometry | DDS faster and at least 8% lower energy. | `bench-results/raw/T-12_dds-vs-naive.csv` |
| T-13 | Adaptation latency | Below 100 ms maximum. | `bench-results/raw/T-13_adaptation-latency.csv` |
| T-14 | Sediment-driven adaptation | Monotonic non-increasing frequency above 30 NTU. | `tank-results/raw/T-14_sediment-adaptation.csv` |
| T-15 | Closed-loop SNR and below-noise recovery | Within 1 dB after five pings; detection probability above 0.95. | `tank-results/raw/T-15_snr-convergence.csv` |
| T-16 | Enclosure immersion | Mass shift at most 0.5 g; resistance above 100 Mohm. | `tank-results/raw/T-16_immersion.csv` |

## T-01 - Transducer impedance sweep and resonance

- **Trace:** PS-ACOUSTIC-01
- **Equipment:** Impedance analyser, fixture, reference resistor
- **Procedure:** Sweep 20-90 kHz in 100 Hz steps at 1 Vrms; record magnitude and phase.
- **Expected result:** Resonance 40.2 kHz; minimum impedance 412 ohm; Q 7.18.
- **Pass criterion:** Resonance 36-44 kHz; impedance 250-750 ohm; Q 4-12.
- **Result record:** `bench-results/raw/T-01_impedance-sweep.csv`

## T-02 - DAC output spectrum, THD and SFDR

- **Trace:** PS-DDS-02
- **Equipment:** 100 MHz DSO, FFT, 10x probe, 50 ohm load
- **Procedure:** Capture 40 kHz output at 2 MSps; analyse fundamental through fifth harmonic.
- **Expected result:** THD 0.31%; SFDR 51.6 dBc; noise floor -76.4 dBFS.
- **Pass criterion:** THD below 1.0%; SFDR above 45 dBc.
- **Result record:** `bench-results/raw/T-02_dac-spectrum.csv`

## T-03 - Reconstruction-filter response

- **Trace:** PS-ANALOG-03
- **Equipment:** Generator, DSO, dual-channel transfer function
- **Procedure:** Sweep 10 kHz-1 MHz at fixed 200 mV input and compute gain.
- **Expected result:** Passband ripple 0.22 dB; attenuation 42.8 dB at 1 MHz.
- **Pass criterion:** Ripple below 0.5 dB; attenuation above 35 dB at 1 MHz.
- **Result record:** `bench-results/raw/T-03_filter-response.csv`

## T-04 - Window peak sidelobe level

- **Trace:** PS-WAVEFORM-04
- **Equipment:** Captured DAC samples and 262,144-point FFT
- **Procedure:** Generate four equal-length 40 kHz bursts; normalise main-lobe peak and measure first sidelobe.
- **Expected result:** Rectangular -13.1, Hann -31.2, Hamming -42.4, Blackman -57.6 dB.
- **Pass criterion:** Within 1.0 dB of theoretical value.
- **Result record:** `bench-results/raw/T-04_window-sidelobes.csv`

## T-05 - Commanded chirp spectrogram

- **Trace:** PS-WAVEFORM-05
- **Equipment:** DSO segmented memory and FFT spectrogram
- **Procedure:** Capture a 24-80 kHz linear chirp over 2.048 ms and track ridge frequency.
- **Expected result:** RMS ridge error 84 Hz; endpoint error 0.12%.
- **Pass criterion:** RMS error below 250 Hz; endpoint error below 0.5%.
- **Result record:** `bench-results/raw/T-05_chirp-track.csv`

## T-06 - Pulse-compression gain

- **Trace:** PS-DETECTION-06
- **Equipment:** Waveform capture, offline matched-filter reference
- **Procedure:** Correlate the 56 kHz by 2.048 ms chirp against its transmit reference.
- **Expected result:** 19.8 dB measured-equivalent gain against 20.6 dB time-bandwidth theory.
- **Pass criterion:** Within 1.5 dB of 10 log10(BT).
- **Result record:** `bench-results/raw/T-06_pulse-compression.csv`

## T-07 - Barker-13 peak-to-sidelobe ratio

- **Trace:** PS-DETECTION-07
- **Equipment:** DAC capture and correlation processor
- **Procedure:** Transmit Barker-13 BPSK sequence and normalise correlation peak.
- **Expected result:** 21.7 dB peak-to-sidelobe ratio against 22.3 dB ideal.
- **Pass criterion:** At least 20 dB.
- **Result record:** `bench-results/raw/T-07_barker13.csv`

## T-08 - Range accuracy

- **Trace:** PS-RANGE-08
- **Equipment:** 450 L tank, tape, rail, target, temperature sensor
- **Procedure:** Place plate at seven surveyed ranges; acquire three pings per location.
- **Expected result:** 0.8 cm MAE; 1.8 cm maximum error; R-squared 0.99999.
- **Pass criterion:** Error below max(2 cm, 1% of range).
- **Result record:** `tank-results/raw/T-08_range-accuracy.csv`

## T-09 - Two-target range resolution

- **Trace:** PS-RANGE-09
- **Equipment:** Two 300 mm plates, precision rail, matched filter
- **Procedure:** Set separations from 10-30 mm and apply a 3 dB valley resolution rule.
- **Expected result:** Minimum resolved separation 20 mm; indicated separation 20.8 mm.
- **Pass criterion:** Resolve 25 mm or closer.
- **Result record:** `tank-results/raw/T-09_range-resolution.csv`

## T-10 - Parallel-bus rate and CPU idle

- **Trace:** PS-LOWPOWER-10
- **Equipment:** Logic analyser, DSO, GPIO 2 and GPIO 3
- **Procedure:** Capture write strobe over four complete DMA blocks and integrate idle-marker duty.
- **Expected result:** 2.003 MSps sustained; 97.6% Core 0 idle during envelope.
- **Pass criterion:** At least 2 MSps and above 95% idle.
- **Result record:** `bench-results/raw/T-10_dma-cpu.csv`

## T-11 - Power states and ping energy

- **Trace:** PS-POWER-11
- **Equipment:** INA226, DMM, 0.1 ohm shunt
- **Procedure:** Log voltage/current by state; integrate 30 complete range pings.
- **Expected result:** 0.18 mA deep sleep; 28.0 mA ready; 0.93 mJ per complete range ping.
- **Pass criterion:** Sleep below 1.5 mA; ping energy below 1.2 mJ.
- **Result record:** `bench-results/raw/T-11_power-states.csv`

## T-12 - DDS versus naive trigonometry

- **Trace:** PS-LOWPOWER-12
- **Equipment:** Same board, INA226, GPIO timing markers
- **Procedure:** Run ten fixed-DDS and ten sinf builds with identical 40 kHz ping configuration.
- **Expected result:** 8.4 us versus 74.0 us fill; 13.9% lower complete-ping energy.
- **Pass criterion:** DDS faster and at least 8% lower energy.
- **Result record:** `bench-results/raw/T-12_dds-vs-naive.csv`

## T-13 - Adaptation latency

- **Trace:** PS-ADAPT-13
- **Equipment:** DSO, ADC marker, first-DMA marker
- **Procedure:** Step sensor input and measure final ADC edge to first adapted DAC sample for 30 trials.
- **Expected result:** 34.1 ms mean; 38.6 ms 95th percentile; 39.2 ms maximum.
- **Pass criterion:** Below 100 ms maximum.
- **Result record:** `bench-results/raw/T-13_adaptation-latency.csv`

## T-14 - Sediment-driven adaptation

- **Trace:** PS-ADAPT-14
- **Equipment:** Tank, turbidity sensor, prepared sediment slurry
- **Procedure:** Increase turbidity through seven verified levels and record solver selection.
- **Expected result:** Centre frequency moves from 80 kHz at 8.4 NTU to 32 kHz at 145 NTU.
- **Pass criterion:** Monotonic non-increasing frequency above 30 NTU.
- **Result record:** `tank-results/raw/T-14_sediment-adaptation.csv`

## T-15 - Closed-loop SNR and below-noise recovery

- **Trace:** PS-CLOSEDLOOP-15
- **Equipment:** Tank, target, calibrated injection path, matched filter
- **Procedure:** Run five adaptation iterations and inject reproducible broadband noise.
- **Expected result:** Prediction error converges to 0.1 dB; -7.5 dB input becomes 12.1 dB output SNR.
- **Pass criterion:** Within 1 dB after five pings; detection probability above 0.95.
- **Result record:** `tank-results/raw/T-15_snr-convergence.csv`

## T-16 - Enclosure immersion

- **Trace:** PS-ENCLOSURE-16
- **Equipment:** Tank, scale, insulation meter, absorbent witness
- **Procedure:** Record mass and insulation resistance during 120 minutes at 1.5 m depth.
- **Expected result:** Mass shift 0.1 g; resistance above 200 Mohm; zero visible ingress.
- **Pass criterion:** Mass shift at most 0.5 g; resistance above 100 Mohm.
- **Result record:** `tank-results/raw/T-16_immersion.csv`
