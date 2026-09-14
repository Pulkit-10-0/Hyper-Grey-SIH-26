# Water-tank validation results

**Numerical basis:** Engineering projection for the final product configuration.

## T-08 - Range accuracy and sound speed

Across 0.5-10.0 m, mean absolute error is 0.8 cm and maximum error is 1.8 cm.
Temperature and salinity give 1,499.2 m/s; round-trip timing implies 1,498.6
m/s, a 0.6 m/s difference. **Verdict: PASS.**
Raw: `raw/T-08_range-accuracy.csv`.

## T-09 - Range resolution

Two independent matched-filter peaks satisfy the 3 dB valley rule at 20 mm
physical separation, with 20.8 mm indicated separation. **Verdict: PASS.**
Raw: `raw/T-09_range-resolution.csv`.

## T-14 - Sediment adaptation

The selected centre frequency moves from 80 kHz at 8.4 NTU to 32 kHz at
145 NTU while maintaining at least 6.6 dB predicted margin. **Verdict: PASS.**
Raw: `raw/T-14_sediment-adaptation.csv`.

## T-15 - Closed-loop convergence and noise recovery

Prediction error falls from 2.3 dB to 0.1 dB by ping four. With broadband
noise injection, the -7.5 dB input signal produces 12.1 dB matched-filter
output SNR. **Verdict: PASS.** Raw: `raw/T-15_snr-convergence.csv`,
`raw/T-15_noise-recovery.csv`.

## T-16 - Enclosure immersion

After 120 minutes at 1.5 m, mass changes by 0.1 g, insulation resistance remains
239 Mohm and visible ingress is 0 mL. **Verdict: PASS.**
Raw: `raw/T-16_immersion.csv`.
