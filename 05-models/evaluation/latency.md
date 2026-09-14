# latency

What each decision path costs, and the reason the surrogate does not ship.

The obvious motivation for a surrogate is that 468 candidates per decision looks
expensive for a duty-cycled microcontroller, so a small model might be worth
having. **That assumption did not survive measurement**, and section 10 of the
notebook now carries the measurement rather than the assumption.

All numbers from [`evaluate.py`](evaluate.py) → [`metrics.json`](metrics.json).

---

## Measured, one decision at a time

Medians over 1,500 calls after a 50-call warm-up, on the development host.

| Path | Median | p95 |
|---|---:|---:|
| Solver, reference form | 76.0 µs | 138.7 µs |
| **Solver, precomputed form** | **41.5 µs** | 62.7 µs |
| **Surrogate, one row** | **8,995.9 µs** | 18,320.2 µs |
| Surrogate, batched 4,096 rows | 14.5 µs per row | — |

**The solver is roughly 200× faster than the surrogate**, not slower.

Across four repeat runs the solver held 34–42 µs and the surrogate 6.9–9.0 ms,
giving ratios of 184× to 217×. The exact figure moves with system load; the order
of magnitude does not.

---

## Why the solver is so cheap

The naive reading of "468 candidates" is 468 evaluations of Thorp's expression, a
`pow`, a `log10` and a sonar equation — expensive on a microcontroller with no
hardware transcendentals.

Almost none of that depends on the environment.

| Term | Depends on | When it can be computed |
|---|---|---|
| `thorp(f_c)` | candidate only | **boot** |
| `(f_c / f_ref) ^ 1.5` | candidate only | **boot** |
| `10·log₁₀(τ·B)` | candidate only | **boot** |
| `20·log₁₀(amplitude)` | candidate only | **boot** |
| `energy` | candidate only | **boot** |
| `scatter = k · ntu · shape[i]` | turbidity | per decision, one multiply |
| `20·log₁₀(range)` | mission | per decision, **one** log |
| `snr[i]` | all of it | per decision, multiply–add |

Every frequency-dependent term is constant per candidate. The whole frequency
dependence of the scattering law collapses into a 468-entry table computed once
at boot, because only turbidity varies at runtime and it enters as a scalar
multiplier.

What is left per decision is **one logarithm, 468 multiply–adds, 468 compares and
a selection.** No transcendental function inside the loop.

`evaluate.py` implements both forms and asserts they agree:

```
solver_forms_agree: true
```

The precomputed form returns identical parameters to the reference form on every
probe condition. It is 1.8× faster on the host and the gap would be far wider on
a target without a fast `pow`.

## Why the surrogate is so expensive

| | |
|---|---|
| Tree ensembles | 3, one per output |
| Boosting iterations | 111 + 176 + 30 = 317 trees |
| **Total tree nodes** | **19,337** |

Predicting one row means walking three ensembles. Beyond the arithmetic, calling
`predict()` on a single row carries scikit-learn's per-call Python overhead:

```
single row   8,995.9 µs
batched         14.5 µs per row
overhead ratio    621x
```

Batching removes 99.8 % of the cost — but **a payload cannot batch.** It decides
one ping, transmits it, listens, and decides the next one from what came back.
The single-row number is the operational one.

Even granting the batched figure as a floor for a hand-written C implementation
with no Python in the way, 14.5 µs per row beats the solver's 41.5 µs by only
2.9× — and that is before the 19,337 tree nodes have to be stored. At a
deliberately generous 8 bytes per node (float32 threshold, uint8 feature index,
two uint16 child pointers) that is **roughly 155 kB of flash**, against 468 × 5
float32 ≈ **9 kB** for the candidate table. A realistic node layout is closer to
12 bytes and the gap widens.

**Three times the speed at seventeen times the flash, for a component that still
needs the solver resident to check its work.**

---

## Host, and what transfers

| | |
|---|---|
| Host | Development laptop, x86-64, Windows, CPython 3.12 |
| Solver implementation | NumPy, vectorised over 468 candidates, float64 |
| Surrogate implementation | scikit-learn `HistGradientBoostingRegressor.predict` |

These are **not payload timings.** The ESP32-S3 has no NumPy, no float64 SIMD and
a much slower clock; both paths cost more there, probably by one to two orders of
magnitude.

What transfers is not the microseconds. It is:

1. **The operation count.** One log, 468 multiply–adds and a selection, against
   19,337 tree-node visits. That ratio is platform-independent.
2. **The memory.** 9 kB of candidate table against ~155 kB of tree structure.
3. **The direction of the result.** No plausible reimplementation of either path
   closes a 200× gap in the surrogate's favour.

A fair measurement on the target hardware belongs in
[`../../02-firmware/measurements/`](../../02-firmware/measurements/) and has not
been made. It would not change the conclusion, and it is listed there as
outstanding rather than quietly omitted.

---

## What this changes

The intuition that the solver is too expensive for a duty-cycled budget is
**wrong**, and it is wrong because the search was mentally costed as 468
transcendental evaluations rather than as 468 multiply–adds against a boot-time
table. The notebook was rewritten to measure this rather than assume it.

Two things follow.

**The surrogate does not ship.** It is slower, larger, and cannot report
infeasibility. The 468-candidate search runs on the payload as the primary and
only decision path.

**The transmit decision is not the bottleneck.** At 41.5 µs on a host, even a
hundredfold penalty on the target puts the decision at a few milliseconds against
a ping period measured in hundreds. The energy budget is dominated by the
transmit stage — 340 mA into the driver — not by deciding what to transmit. The
place to spend optimisation effort is the analogue path, not the solver.

That second point is worth more to the project than the surrogate would have been.

---

## The surrogate's remaining value

Not zero, but not as a deployed component.

- It **validates the dataset.** A model reaching 94.8 % error reduction confirms
  the environment-to-waveform mapping is real, learnable structure rather than
  noise.
- It **quantifies the decision's complexity.** The mapping needs 317 trees to
  approximate and still fails on 0.31 % of feasible rows. That is a measurement of
  how non-trivial the solver's job is, and it belongs in the report.
- It **located the place where a model does belong.** Measuring why this one
  failed is what made the distinction visible: a model competing with the physics
  loses, a model supplying what the physics cannot does not. That is the finding
  in [`residual-model.md`](residual-model.md), and it would not have been found
  without first building the wrong thing and measuring it.

## Where the effort went instead

The same measurement that rejects the surrogate points at a model that survives
it. The sonar equation cannot predict its own error, and the safety margin
covering that error was picked by hand and never fitted. Learning it returns
**3.66 dB** to the solver — which becomes **34.5 % finer range resolution** at
1000 NTU — from a model **one fifth the size** of the one rejected here.

Full analysis: [`residual-model.md`](residual-model.md).

## Reproducing

```powershell
cd 05-models\evaluation
python evaluate.py
```

Roughly 30 s. Rewrites `metrics.json` and all five figures. Timings will differ
by a few percent between runs and by more on a loaded machine; the accuracy and
safety numbers are deterministic and will not move at all.
