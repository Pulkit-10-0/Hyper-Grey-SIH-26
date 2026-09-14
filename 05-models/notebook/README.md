# notebook

**Adaptive Sonar Waveform Selection** — physics, an original dataset, and two
models: one that fails and one that does not.

| | |
|---|---|
| Source | `notebook.py` (jupytext) and `adaptive-sonar-waveform-selection.ipynb` |
| Cells | 47 total, 24 code |
| Runtime | **27 s**, CPU only. Acceptance target was five minutes. |
| Figures | 9 |
| Kaggle URL | <https://www.kaggle.com/code/prakhar1803/adaptive-sonar-waveform-selection> |

The narrative arc is the point. The notebook asks the obvious machine learning
question, measures the answer, finds it is no — and then asks a better question
that the same measurement makes visible.

---

## Publishing

Published at <https://www.kaggle.com/code/prakhar1803/adaptive-sonar-waveform-selection>.

The steps below are the procedure that was followed, kept so the dataset and notebook can be reissued together.

Pre-publication checklist:

### What to upload

| Kaggle object | File | From |
|---|---|---|
| **Dataset** | `adaptive_sonar_waveform_selection.csv` | [`../dataset/`](../dataset/) |
| **Notebook** | `adaptive-sonar-waveform-selection.ipynb` | this folder |

Nothing else. `notebook.py`, `run_local.py`, `requirements.txt` and `figures/`
are repository files — the notebook regenerates the figures itself and Kaggle
supplies the environment.

### The notebook does not consume the dataset, it produces it

This is the thing that catches people. The notebook contains no `read_csv`, no
file input and no network call. Section 7 **generates** the dataset and writes it
with `to_csv`, so the notebook runs correctly on Kaggle with **no dataset
attached at all**.

The Dataset is published separately because it is a citable artefact in its own
right, under CC BY 4.0. Attaching it to the notebook as an input is optional and
harmless — Kaggle mounts inputs read-only under `/kaggle/input/` while the
notebook writes to `/kaggle/working/`, so the two copies never collide — and it
is worth doing purely so the two objects visibly link to each other.

### Order

1. Publish the **Dataset** first: upload the CSV, set the licence to CC BY 4.0,
   paste the attribution line from [`../dataset/licence.md`](../dataset/licence.md).
2. Publish the **Notebook** second: upload the `.ipynb`, Run All, Save Version.
   The run should regenerate the CSV as notebook output — which is the public
   demonstration that the dataset reproduces.
3. Add the dataset as an input to the notebook so the two link, then link back to
   the notebook from the dataset description.

### Checklist

- [ ] Dataset uploaded with the CC BY 4.0 licence set
- [ ] Attribution line from `../dataset/licence.md` in the dataset description
- [ ] Notebook runs top to bottom on a fresh session, CPU only, **internet off**
- [ ] Notebook output CSV hashes to `7d5d50dc...` — the same file as the Dataset
- [ ] Both URLs recorded here and in the root README

Internet must be off in the Kaggle session. The notebook has no network
dependency, and enabling internet would let one appear unnoticed.

---

## Section order

| § | Section | Carries |
|---|---|---|
| — | Problem | Why a fixed waveform is the wrong answer |
| 1 | Sound speed | Mackenzie nine-term equation |
| 2 | Absorption | Thorp, with **Figure 1** |
| 3 | Resolution and the sonar equation | `c/2B` against `cτ/2` |
| 4 | Waveform synthesis | **Figures 2 and 3** |
| 5 | Pulse compression | Matched filter, **Figure 4** |
| 6 | The decision | The 468-candidate search, **Figure 5** |
| 7 | Dataset generation | Four strata, 20,000 rows, **Figure 6** |
| 8 | Learning the decision | The surrogate and its metrics |
| 9 | Where the model must not be trusted | Safety bound, **Figure 7** |
| 10 | What a decision actually costs | The latency measurement that rejects the surrogate |
| 11 | Learning what the physics gets wrong | The residual model, **Figure 8** |
| 12 | What the correction buys | Margin and resolution, **Figure 9** |
| — | Conclusion and references | Six references |

Sections 8 to 10 are the case against the obvious model. Sections 11 and 12 are
the one that survives.

---

## Physics checked inline against published values

The notebook asserts, it does not claim. Every one of these is a live `assert`
that fails the run if it stops holding:

| Quantity | Computed | Published |
|---|---:|---:|
| Thorp absorption at 100 kHz | 34.07 dB/km | ≈ 34 |
| Thorp absorption at 200 kHz | 51.02 dB/km | ≈ 51 |
| Thorp absorption at 400 kHz | 87.01 dB/km | ≈ 87 |
| Sound speed, 25 °C, 35 ppt, surface | 1534.29 m/s | ≈ 1534 |
| Unmodulated resolution, 5 ms pulse | 3.750 m | `cτ/2` |
| Compressed resolution, 100 kHz sweep | 0.0075 m | `c/2B` |
| Compression gain, TBP 500 | 26.99 dB | `10·log₁₀(500)` |

**A 5 ms pulse resolving 3.75 m unmodulated resolves 7.5 mm compressed — a
factor of 500 — at identical transmitted energy.** That single line is the
technical argument of the whole project.

---

## Results

### The dataset

20,000 rows × 27 columns across four strata, feasible in 77.0 % of rows and in
**0.00 %** of the adversarial stratum. Full description in
[`../dataset/`](../dataset/).

### The surrogate

| Target | Baseline MAE | Model MAE | Reduction |
|---|---:|---:|---:|
| `f_centre_hz` | 69,567 Hz | 3,584 Hz | **94.8 %** |
| `bandwidth_hz` | 61,298 Hz | 3,995 Hz | **93.5 %** |
| `pulse_s` | 2.404 ms | 1.666 ms | 30.7 % |

Using only quantities known **before** a frequency is chosen. Pulse duration is
the weak output because it trades against amplitude and several combinations are
near-equivalent — the target is close to multi-valued.

### Where the surrogate fails

| | |
|---|---|
| Routine conditions, held out | **2.35 %** of predictions violate the detection threshold |
| Adversarial regime, never seen | **100 %** violate — but the solver is also infeasible in 100 % of those rows |

The deployment rule follows directly: **the model proposes, the physics
disposes.** Full analysis, including the decomposition that isolates the
model-induced failure rate at **0.31 %**, in
[`../evaluation/safety-analysis.md`](../evaluation/safety-analysis.md).

### Why the surrogate is rejected — section 10

The obvious motivation for a surrogate is that 468 candidates per decision looks
expensive for a duty-cycled microcontroller. **Measurement contradicts that.**

| Path | Median, one decision |
|---|---:|
| Solver, 468 candidates | **41.5 µs** |
| Surrogate, three ensembles | **9.0 ms** |

Roughly 200× the wrong way. Every frequency-dependent term in the search — Thorp
absorption at a candidate frequency, compression gain of a candidate pulse, drive
level of a candidate amplitude — is a property of the *candidate*, not of the
water, and precomputes into a boot-time table. Even the scattering term factors,
because turbidity enters it as a scalar multiplier. What is left per decision is
one logarithm and 468 multiply-adds. The surrogate has to walk 19,337 tree nodes
and cannot beat that.

This also settles something about the payload: if a transmit decision costs tens
of microseconds, **the decision is not the power problem.** The transmit stage is
— 340 mA into the driver against single-digit milliamps for the processor. That
redirects optimisation effort to the analogue path, which is worth more than a
working surrogate would have been.

### The model that ships — sections 11 and 12

The sonar equation cannot predict its own error. If it could, it would not have
one. That error is systematic, depends on turbidity, path length and salinity at
once, and is currently covered by a safety margin somebody picked by hand.

| Predicting the shortfall | MAE | Residual sd |
|---|---:|---:|
| Constant (training mean) | 1.963 dB | 2.376 dB |
| Linear in turbidity — fitted by eye | 1.005 dB | 1.306 dB |
| **Gradient boosting, all environment columns** | **0.729 dB** | **0.916 dB** |
| *Irreducible noise floor* | *0.718 dB* | *0.900 dB* |

The model lands 0.011 dB above the floor, using **3,965 tree nodes** — one fifth
of the rejected surrogate.

Replacing the hand-picked margin with `predicted shortfall + 3σ`:

| | Hand-picked | Learned |
|---|---:|---:|
| Mean margin demanded | 9.13 dB | **5.47 dB** |
| Coverage | 100.00 % | 99.88 % |

**3.66 dB returned to the solver.** Those decibels become bandwidth, and
bandwidth becomes range resolution — at 1000 NTU, **7.81 mm → 5.11 mm, 34.5 %
finer**, in exactly the turbid water where a survey payload is otherwise worst
served.

Full analysis in
[`../evaluation/residual-model.md`](../evaluation/residual-model.md), including
the limits: the shortfall law is one the notebook put there, so this sizes the
prize and demonstrates the mechanism — it does not authorise shipping a
coefficient fitted to simulated data.

---

## Running it

### Locally

```powershell
pip install -r requirements.txt
python run_local.py
```

27 s. Writes the dataset, all nine figures in PNG and SVG, `run-metrics.json`,
and `run.log`. It also hashes the regenerated CSV against the published copy in
`../dataset/` and tells you whether the reproduction is exact:

```
sha256       7d5d50dce7b92d3b083f80b5b52510589e6372d6ab87e78e8686e56cfb126053
published    IDENTICAL - byte-for-byte reproduction confirmed
```

Last verified 10 September 2026.

### As a notebook

```powershell
jupyter lab adaptive-sonar-waveform-selection.ipynb
```

`notebook.py` is the jupytext source and is the file to edit. Regenerate the
`.ipynb` from it rather than editing the JSON:

```powershell
jupytext --to notebook notebook.py -o adaptive-sonar-waveform-selection.ipynb
```

---

## Figures

Nine figures, PNG at 160 dpi for the report and the deck, SVG where the file
stays under 400 kB.

| File | Notebook label | Shows |
|---|---|---|
| `fig1-absorption-and-range.png` | Figure 1 | Absorption against frequency, and the range it buys |
| `fig2-waveform-families.png` | Figure 2 | CW, LFM, geometric and Barker-13 |
| `fig3-window-sidelobes.png` | Figure 3 | Rectangular, Hann, Hamming, Blackman sidelobe floors |
| `fig4-pulse-compression.png` | § 5, unnumbered | An echo invisible in noise, recovered by correlation |
| `fig5-feasible-region.png` | Figure 4 | The feasible region moving with turbidity |
| `fig6-dataset-behaviour.png` | Figure 5 | Chosen frequency and resolution against sediment |
| `fig7-surrogate-parity.png` | § 9, unnumbered | Predicted against solver, routine and adversarial |
| `fig8-residual-structure.png` | Figure 8 | The shortfall is not a function of turbidity alone |
| `fig9-margin-and-resolution.png` | Figure 9 | Margin recovered, and the resolution it buys |

Two of the nine are unnumbered in the notebook text and are named by content here
so the report can cite them unambiguously.

For presentation, prefer
[`../evaluation/figures/eval-2-downband-walk.png`](../evaluation/figures/) over
`fig6`. The notebook's raw scatter of 20,000 points shows the discrete candidate
grid rather than the trend; the binned version is legible on a projector.

---

## Files

```
notebook.py                              jupytext source - edit this
adaptive-sonar-waveform-selection.ipynb  the published notebook
run_local.py                             headless runner and reproducibility check
requirements.txt                         pinned versions it was verified against
run-metrics.json                         generated - every number this README quotes
figures/                                 generated
run.log                                  generated
adaptive_sonar_waveform_selection.csv    generated, gitignored
```

The CSV is regenerated here when you run `run_local.py`, and is **gitignored in
this folder**. The canonical copy lives in [`../dataset/`](../dataset/); two
tracked copies of the same 8 MB file is how they drift apart.
