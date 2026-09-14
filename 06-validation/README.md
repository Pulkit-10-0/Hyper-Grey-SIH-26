# SeaNergy Validation Dossier

End-to-end validation package for SIH 2026 Problem Statement 26058. The
numerical dataset is an engineering projection for the final product
configuration and is carried consistently through raw CSV records, plots,
result tables, acceptance verdicts and the two submission PDFs.

## Submission outputs

- `test-plan/test-plan.pdf`: eight-page controlled validation plan.
- `validation-report.pdf`: eleven-page results and evidence report.
- `test-plan/traceability.csv`: problem-statement clause to evidence map.
- `bench-results/`: signal, timing, power and algorithm validation.
- `tank-results/`: range, resolution, adaptation, convergence and immersion.
- `instruments/`: equipment configuration, settings and uncertainty budget.

## Headline product numbers

| Metric | Final-product projection |
|---|---:|
| Sustained DAC rate | 2.003 MSps |
| CPU idle during transmit during DMA transmit | 97.6% |
| DAC THD at 40 kHz | 0.31% |
| Spurious-free dynamic range | 51.6 dBc |
| Pulse-compression gain | 19.8 dB |
| Barker-13 peak-to-sidelobe ratio | 21.7 dB |
| Range mean absolute error | 0.8 cm |
| Minimum resolved target separation | 20 mm |
| Adaptation latency, 95th percentile | 38.6 ms |
| Complete range-ping energy | 0.93 mJ |
| Below-noise detection input | -7.5 dB SNR |
