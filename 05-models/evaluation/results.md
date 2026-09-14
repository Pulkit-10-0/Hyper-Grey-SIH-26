# results

What the surrogate is worth. Every number here is produced by
[`evaluate.py`](evaluate.py) from the published CSV and written to
[`metrics.json`](metrics.json). Nothing is typed in by hand.

Reproduce with `python evaluate.py`.

---

## Setup

| | |
|---|---|
| Model | `HistGradientBoostingRegressor`, 300 max iterations, learning rate 0.08 |
| One model per output | 3 independent regressors, not a multi-output head |
| Features | 8 columns, all known **before** a frequency is chosen |
| Targets | `f_centre_hz`, `bandwidth_hz`, `pulse_s` |
| Train / test | 12,750 / 4,250, random split of the routine strata |
| Held out entirely | 3,000 adversarial rows, never seen in training |
| Seed | 20260829 |
| Fit time | 1.7 s total for all three models |

The adversarial stratum is not in the training set and not in the test split. It
is a separate population the model has never met, which is the only kind of
generalisation test worth reporting.

---

## Accuracy against a mean baseline

Accuracy alone means nothing — a model that predicts the training mean would look
respectable on a target with a narrow range. The comparison that establishes
skill is against that baseline.

| Target | Baseline MAE | Model MAE | Reduction | Median error | p95 error |
|---|---:|---:|---:|---:|---:|
| `f_centre_hz` | 69,567 Hz | **3,584 Hz** | **94.8 %** | 1,083 Hz | 12,811 Hz |
| `bandwidth_hz` | 61,298 Hz | **3,995 Hz** | **93.5 %** | 939 Hz | 16,298 Hz |
| `pulse_s` | 2.404 ms | **1.666 ms** | **30.7 %** | 1.276 ms | 5.519 ms |

Read the median and p95 columns together with the MAE. On centre frequency the
median error is 1.1 kHz — a third of the mean — which means the error
distribution is dominated by a small number of large misses at candidate-grid
boundaries rather than by uniform imprecision. The parity plot in
[`figures/`](figures/) shows this directly: the predictions form tight vertical
bands at each of the 9 valid frequencies, and the misses are rows that landed on
the wrong band.

Prediction bias is negligible on all three outputs: −97 Hz on centre frequency,
−84 Hz on bandwidth, −0.04 ms on pulse. The model is not systematically low or
high, it is occasionally wrong.

### Pulse duration is the weak output, and that is expected

30.7 % is a poor showing next to 94.8 %, and it is not a defect in the model. The
solver picks pulse duration jointly with amplitude, and several combinations
produce near-identical link budgets — the same energy delivered as a long quiet
pulse or a short loud one. The target is genuinely close to multi-valued, so
there is a floor on how well any function of the environment can predict it.

If pulse duration mattered as much as frequency does, the fix would be to predict
`tbp` or delivered energy instead — quantities that are single-valued given the
environment. It does not matter as much, so it was not done.

---

## Generalisation to the unseen regime

| Target | Test MAE (routine) | Adversarial MAE (never trained on) |
|---|---:|---:|
| `f_centre_hz` | 3,584 Hz | **1,847 Hz** |
| `bandwidth_hz` | 3,995 Hz | **2,805 Hz** |
| `pulse_s` | 1.666 ms | **0.704 ms** |

The adversarial error is **lower** than the test error on all three outputs.

This looks like the model generalising superbly. It is not. In the adversarial
regime nothing is feasible, so the solver always falls back to the maximum-SNR
candidate, which is always the bottom of the band — 148.0 kHz, every row. The
target has collapsed to a constant and the model has learned that low-frequency
conditions produce low-frequency answers.

**A low error number here is not evidence of competence.** It is evidence that
the question got easier. The number that actually matters in this regime is in
[`safety-analysis.md`](safety-analysis.md), and it is 100 %.

Reporting this the other way round — "the surrogate generalises better to unseen
adversarial conditions than to its own test set" — would be technically true and
completely misleading.

---

## One feature does nothing

`absorption_ref_db_km` is Thorp's absorption evaluated at the band midpoint. The
band midpoint never moves, so the column holds **66.9459 dB/km in all 20,000
rows**. It is a zero-variance feature and contributes no information.

It is left in the feature list because removing it changes nothing and because
its presence documents the leakage fix: it exists precisely to be the *safe*
counterpart of `absorption_db_km`, which does vary and does leak. But it should
be described accurately, and in a paper it would be dropped.

The features carrying the signal are `turbidity_ntu`, `mission_range_m` and
`scatter_ref_db_km` — and the last is a deterministic function of the first, so
in practice the decision is driven by **two** independent inputs.

---

## The leakage that had to be removed first

An earlier version of this evaluation reported a mean absolute error of
**0.0002 Hz** on centre frequency. That is not a good result; it is a bug.

`absorption_db_km` is Thorp's expression evaluated at the *chosen* frequency, and
Thorp is monotonic across 100–500 kHz. Given that column, the model does not have
to learn anything about sonar — it inverts a smooth one-dimensional function and
reads the answer straight off.

The fix was to split every frequency-dependent quantity into two columns: one
evaluated at the fixed band midpoint, which is safe and is a feature, and one
evaluated at the chosen frequency, which is downstream of the answer and is not.

**Rule of thumb worth keeping:** on a physics-derived dataset, an error that
approaches zero is a leak until proven otherwise. The physics is not that easy.

---

## Figures

| File | Shows |
|---|---|
| `figures/eval-1-error-distribution.png` | Prediction error per output, centred on zero |
| `figures/eval-2-downband-walk.png` | Median chosen frequency and resolution against turbidity, with a 10–90 percentile band |
| `figures/eval-3-violation-by-condition.png` | Safety violations by turbidity and by required range, split into model-induced and impossible-mission |
| `figures/eval-4-feasibility-by-stratum.png` | Feasibility per stratum, showing the adversarial stratum at 0 % |
| `figures/eval-5-residual-model.png` | The correction: the structure it finds, its accuracy against two baselines, and the resolution it recovers |

`eval-2` exists because the notebook's raw scatter of 20,000 points shows the
discrete candidate grid rather than the trend. Binning it makes the downband walk
legible at presentation size.

---

## The conclusion this folder reaches

The surrogate reproduces the solver's frequency and bandwidth choices to within a
few kilohertz, which is well inside the spacing of the candidate grid. As a
statistical result it works.

It is still **not deployed**, for two reasons measured in the documents beside
this one:

- it is slower than the solver it replaces — [`latency.md`](latency.md)
- it fails silently on 0.31 % of routine rows — [`safety-analysis.md`](safety-analysis.md)

The physics solver runs on the payload as the only decision path. Reaching that
conclusion by measurement, and saying so rather than shipping the model because
it was built, is the first result of this folder.

**The second result is that measuring the failure located the model that works.**
The surrogate loses because it competes with the physics on ground the physics
already owns. A model predicting what the physics *gets wrong* has no such
competition — the sonar equation cannot estimate its own error by construction.
That model returns 3.66 dB to the solver from one fifth the storage, and it is
in [`residual-model.md`](residual-model.md).
