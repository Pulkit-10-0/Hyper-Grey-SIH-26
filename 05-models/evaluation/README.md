# Model evaluation

[Project overview](../../README.md) · [Parent folder](../README.md)

This generated-data evaluation compares a learned waveform-selection surrogate with the numerical solver, then evaluates correction of an injected synthetic SNR shortfall.

## Read in this order

| Item | Purpose |
|---|---|
| [Metrics](metrics.json) | Machine-readable source for stored results |
| [Accuracy](results.md) | Baselines, target errors, and leakage analysis |
| [Constraint analysis](safety-analysis.md) | Detection-threshold checks under the evaluation assumptions |
| [Latency discussion](latency.md) | Host benchmark methodology and implementation tradeoffs |
| [Residual study](residual-model.md) | Simulated shortfall, margin, and resolution experiment |
| [Figures](figures/README.md) | Indexed generated plots |

## Current numerical record

The split is 12,750 training rows and 4,250 routine test rows, with 3,000 adversarial rows kept separately.

| Target | Baseline MAE | Surrogate MAE | Reduction |
|---|---:|---:|---:|
| Centre frequency | 69,567 Hz | 3,584 Hz | 94.8 % |
| Bandwidth | 61,298 Hz | 3,995 Hz | 93.5 % |
| Pulse duration | 2.404 ms | 1.666 ms | 30.7 % |

The latest stored medians are **40.3 µs** for the precomputed solver and **7.445 ms** for one surrogate prediction, approximately 185× slower on this Python/NumPy host. The surrogate stores 19,337 tree nodes; a prediction follows paths through those trees rather than visiting every stored node.

The routine evaluation reports 100 of 4,250 surrogate predictions below its detection threshold (2.35 %), including 13 of 4,250 cases (0.31 %) where the comparison solver passed. The two paths share 87 below-threshold rows. These algorithm checks use fixed amplitude 0.7, while dataset generation varies amplitude; the rates apply to this evaluation configuration.

## Synthetic residual-correction results

The shortfall target is injected by the generator. Gradient boosting reaches 0.729 dB MAE, versus 1.963 dB for a constant and 1.005 dB for the fitted turbidity rule. The model stores 3,965 nodes. It produces a computed margin reduction from 9.13 to 5.47 dB and a 7.81 to 5.11 mm resolution change in one 1000 NTU, 220 m scenario.

The study reports 99.88% coverage using an uncertainty spread estimated from its test residuals. The [residual-study guide](residual-model.md) documents the synthetic law, margin calculation, and calibration method.

## Reproduce

Install [notebook requirements](../notebook/requirements.txt), then run here:

```sh
python evaluate.py
```

This reads the canonical CSV, refits models, checks agreement between the reference and precomputed solver, and rewrites metrics and five figures. Accuracy is tied to the committed dataset, seed, library versions, and configuration; host timings vary.

Current embedded behavior is documented in [TX/RX firmware](../../02-firmware/README.md). Acoustic and power test methods and engineering projections are documented in [validation](../../06-validation/README.md).
