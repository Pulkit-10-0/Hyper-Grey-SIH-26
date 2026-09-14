# 05-models

The dataset, the notebook, and two models — one rejected on measurement, one that
ships.

---

## Contents

| Folder | What is in it | State |
|---|---|---|
| [`dataset/`](dataset/) | 20,000 × 27 CSV, data dictionary, generation method, licence | **Published artefact.** Reproduces byte-for-byte from its seed |
| [`notebook/`](notebook/) | Kaggle notebook, jupytext source, headless runner, 9 figures | **Published.** Runs in 27 s, CPU only |
| [`evaluation/`](evaluation/) | Accuracy, safety, latency, the residual model, 5 figures | **Complete.** Rejects one model, ships another |

---

## What this section contributes

**An original transmit-side dataset.** Every underwater-acoustics dataset in open
circulation is receive-side: recorded returns labelled for classification. This
one maps a measured environment to the pulse that should be transmitted into it.
Nothing could be downloaded to build it, because on a conventional payload that
mapping is a constant.

**A model that was tested and rejected on evidence.** The surrogate reproduces the
solver's choices to within a few kilohertz. It is still not deployed, because
measurement showed it is slower than the thing it replaces and it fails silently
on a small fraction of solvable cases.

**And a model that earns its place.** The sonar equation cannot predict its own
error. Learning that error instead of guessing it returns 3.66 dB to the solver,
which becomes 34.5 % finer range resolution in heavy sediment.

---

## The numbers

### Dataset

| | |
|---|---|
| Rows × columns | 20,000 × 27 |
| Strata | sweep 40 %, fill 25 %, scenario 20 %, adversarial 15 % |
| Feasible overall | **77.0 %** |
| Feasible in the adversarial stratum | **0.00 %** |
| Chosen centre frequency | 148.0 – 350.7 kHz, 9 distinct values |
| Range resolution | 2.38 – 8.09 mm |
| Seed | 20260829 — reproduces to an identical SHA-256 |

### Surrogate

| Target | Baseline MAE | Model MAE | Reduction |
|---|---:|---:|---:|
| `f_centre_hz` | 69,567 Hz | 3,584 Hz | **94.8 %** |
| `bandwidth_hz` | 61,298 Hz | 3,995 Hz | **93.5 %** |
| `pulse_s` | 2.404 ms | 1.666 ms | 30.7 % |

### The correction — the model that ships

| Predicting the physics' shortfall | MAE | Residual sd |
|---|---:|---:|
| Constant (training mean) | 1.963 dB | 2.376 dB |
| Linear in turbidity — fitted by eye | 1.005 dB | 1.306 dB |
| **Gradient boosting, all environment columns** | **0.729 dB** | **0.916 dB** |
| *Irreducible noise floor* | *0.718 dB* | *0.900 dB* |

| | Hand-picked margin | Learned margin |
|---|---:|---:|
| Mean demanded | 9.13 dB | **5.47 dB** |
| Coverage | 100.00 % | 99.88 % |
| Resolution at 1000 NTU | 7.81 mm | **5.11 mm** |
| Tree nodes to store | — | **3,965** (surrogate: 19,337) |

### The four findings that matter

**1. Leakage nearly produced a fake result.** An early run reported 0.0002 Hz
mean absolute error. `absorption_db_km` is Thorp's expression evaluated at the
*chosen* frequency, and Thorp is monotonic across the band — the model was
inverting it and reading the answer off. Fixed by splitting every
frequency-dependent quantity into a band-midpoint version, which is safe and is a
feature, and a chosen-frequency version, which is not.

**2. The model fails silently on 0.31 % of solvable rows.** Of 4,250 held-out
rows, 100 violate the detection threshold — but 87 of those are missions no
waveform could have completed. Thirteen rows are the model's own fault: the
solver found a working answer and the surrogate did not. On the unseen
adversarial regime it violates on 100 % of rows, and it has no way to say so —
the solver sets `feasible = False`, the surrogate just emits three numbers.

**3. The surrogate is slower than the solver.** Measured: **41.5 µs** for the full
468-candidate search, **9.0 ms** for one surrogate prediction. Roughly 200×. Every
frequency-dependent term in the solver precomputes into a boot-time table,
leaving one logarithm and 468 multiply–adds per decision with no transcendental
calls inside the loop. The surrogate has to walk 19,337 tree nodes.

**4. The margin was guessing, and it did not have to be.** `3 + min(12, ntu/70)`
was picked to be conservative and nothing fitted it. The shortfall it covers
depends on turbidity, path length and salinity together — a rule fitted by eye to
turbidity alone leaves 1.31 dB of spread, a model given the whole environment
leaves 0.92 dB against a 0.90 dB noise floor. Measuring the margin instead of
guessing it returns 3.66 dB, and at 1000 NTU that is 7.81 mm of range resolution
becoming 5.11 mm.

---

## Where the ML earns its place

The two models look superficially alike — same features, same library, same
split — and they are not alike at all.

| | Surrogate | Correction |
|---|---|---|
| Learns | the solver's **answer** | the solver's **error** |
| Ground truth | our own equations | measurement |
| Could the physics do it itself? | yes, and faster | **no, by construction** |
| Outputs | 3 | 1 scalar |
| Size | 19,337 nodes | **3,965** |
| If wrong | a pulse that hears nothing | margin off, threshold still guards |
| Verdict | **rejected** | **ships** |

A model that competes with the physics loses. A model that supplies what the
physics structurally cannot earns its place. That distinction is the result of
this section, and it was reached by measurement rather than by preference.

Two further things follow from the latency finding, and the second is worth more
than a working surrogate would have been:

- **The surrogate does not ship.** The 468-candidate search is the payload's
  primary and only decision path.
- **The transmit decision is not the bottleneck.** Even a hundredfold penalty on
  the target puts a decision at a few milliseconds against a ping period of
  hundreds. The energy budget is dominated by the transmit stage — 340 mA into
  the driver — not by deciding what to transmit. Optimisation effort belongs in
  the analogue path.

---

## The rule the payload follows

> **The model proposes, the physics disposes.**

The active sonar equation stays resident and vetoes any proposal that would not
clear the detection threshold at the required range. Since the guard has to be
there anyway, and is faster than what it guards, the guard is simply the whole
system.

---

## Reproducing all of it

```powershell
cd notebook
pip install -r requirements.txt
python run_local.py        # 27 s - dataset, 9 figures, run-metrics.json

cd ..\evaluation
python evaluate.py         # 30 s - metrics.json, 5 figures

cd ..
python qa.py               # checks every number the documents quote
```

`qa.py` is the guard against the failure mode these folders are most prone to:
a document quoting a number that nothing produced. It cross-checks every figure
in the markdown against `run-metrics.json` and `metrics.json`, confirms all
fourteen images exist and are referenced, resolves every relative link, and fails
on leftover placeholder text. **58 checks, all passing.**

`run_local.py` hashes what it generates against the published copy and reports
whether the reproduction is exact. Last verified 10 September 2026:

```
sha256       7d5d50dce7b92d3b083f80b5b52510589e6372d6ab87e78e8686e56cfb126053
published    IDENTICAL - byte-for-byte reproduction confirmed
```

## Provenance, stated plainly

This is **generated data**. The environment is sampled, the physics is computed
from published relations, and the correlator outcome is simulated. It supports
method development and it validates the decision logic. It is not measurement and
must never be cited as measurement.

Measured results live in [`../06-validation/`](../06-validation/), which is a
different folder on purpose. The papers behind the equations are in
[`../03-research/`](../03-research/).
