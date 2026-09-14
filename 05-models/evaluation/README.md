# evaluation

Two models were built. One of them ships.

| | Surrogate | Correction |
|---|---|---|
| Predicts | the solver's **answer** | the solver's **error** |
| Verdict | **rejected** — slower than what it replaces, and fails silently | **ships** — returns 3.66 dB the physics was giving away |

---

## Read in this order

| Document | Answers |
|---|---|
| [`results.md`](results.md) | Does the surrogate work? — **yes**, 94.8 % error reduction |
| [`safety-analysis.md`](safety-analysis.md) | How does it fail? — **0.31 %** of feasible rows, silently |
| [`latency.md`](latency.md) | Is it worth it? — **no**, the solver is ~200× faster |
| [`residual-model.md`](residual-model.md) | **So where does the ML earn its place?** — predicting what the physics gets wrong |

The first three are the case against the obvious model. The fourth is the one
that survived.

## Headline numbers

### The surrogate — rejected

| | |
|---|---|
| Error reduction against a mean baseline, centre frequency | 94.8 % |
| Safety-bound violations, routine held-out rows | 2.35 % (100 of 4,250) |
| **Model-induced** violations — solver found an answer, model did not | 0.31 % (13 of 4,250) |
| Solver, one decision | **41.5 µs** |
| Surrogate, one decision | **9.0 ms** |
| Storage | 19,337 tree nodes (~155 kB) against ~9 kB for the candidate table |

### The correction — ships

| | |
|---|---|
| Shortfall prediction, MAE | **0.729 dB** against a 0.718 dB noise floor |
| Best rule a person would fit by eye | 1.005 dB |
| Margin demanded, hand-picked rule | 9.13 dB |
| Margin demanded, learned rule | **5.47 dB** |
| Coverage | 100.00 % against 99.88 % |
| Resolution recovered at 1000 NTU | **7.81 → 5.11 mm, 34.5 % finer** |
| Storage | **3,965 tree nodes** — one fifth of the surrogate |

## The rule this folder states

> **The model proposes, the physics disposes.**

The active sonar equation stays resident on the payload and vetoes any proposal
that would not clear the detection threshold at the required range.

That rule is what killed the surrogate: given the guard must be resident anyway,
and is faster than the thing it guards, the surrogate had no remaining role. The
same rule is what makes the correction safe — it supplies the *margin*, and the
threshold underneath it is untouched.

## Reproducing everything here

```powershell
python evaluate.py
```

About 30 s. Reads `../dataset/adaptive_sonar_waveform_selection.csv`, refits both
models with the notebook's exact split and seed, measures both decision paths,
and rewrites `metrics.json` and all five figures.

Accuracy, safety and margin numbers are deterministic and will not move. Timings
vary a few percent between runs and more on a loaded machine; across four runs
the solver held 34–42 µs and the surrogate 6.9–9.0 ms.

`evaluate.py` restates the physics rather than importing the notebook, so it
stands alone — and it asserts that its optimised solver returns identical
parameters to the reference form (`solver_forms_agree: true`), which is what
makes the latency comparison fair.

## Files

```
results.md            surrogate accuracy, the leakage story, the useless feature
safety-analysis.md    violation rates, the decomposition, the deployment rule
latency.md            both decision paths measured, and why the surrogate loses
residual-model.md     the model that ships, and what it is worth
evaluate.py           produces every number and figure here
metrics.json          generated - what the documents quote
figures/              generated
```

## Figures

| File | Shows |
|---|---|
| `eval-1-error-distribution.png` | Surrogate prediction error per output, centred on zero |
| `eval-2-downband-walk.png` | Chosen frequency and resolution against turbidity, binned |
| `eval-3-violation-by-condition.png` | Violations split into model-induced and impossible-mission |
| `eval-4-feasibility-by-stratum.png` | Feasibility per stratum, adversarial at 0 % |
| `eval-5-residual-model.png` | **The correction**: the structure it finds, its accuracy against two baselines, and the resolution it recovers |

`eval-2` and `eval-5` are the two to put on slides.

## What has not been done

- **No measurement on the target hardware.** All timings are host timings. What
  transfers is the operation count and the ratio, not the microseconds.
  Belongs in [`../../02-firmware/measurements/`](../../02-firmware/measurements/).
- **No validation against a physical echo.** Both the safety bound and the
  shortfall law are our own physics. The correction demonstrates a mechanism and
  sizes a prize; it is not authorised to ship a coefficient fitted to simulated
  data. Settled at
  [`../../06-validation/tank-results/`](../../06-validation/tank-results/).
- **No hyperparameter search** on either model. The surrogate was rejected on
  latency, so tuning it would not change the decision; the correction already
  sits 0.011 dB above the noise floor, so there is nothing left to tune for.
- **No conformal prediction.** The `+3σ` margin rule assumes the residual is
  roughly Gaussian. A conformal interval would give a distribution-free coverage
  guarantee instead, and is the obvious next refinement.
