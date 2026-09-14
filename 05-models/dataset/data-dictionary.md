# data-dictionary

`adaptive_sonar_waveform_selection.csv` — **20,000 rows × 27 columns**, 8,291,931 bytes.

One row is one transmit decision: the water the payload was in, the mission it
was asked to perform, the pulse the solver chose, and what came back.

Read the four groups below in order. They are the causal chain: **environment →
derived physics → decision → outcome.**

---

## Group 1 — identity and provenance

| Column | Type | Unit | Range | Meaning |
|---|---|---|---|---|
| `ping_id` | int | — | 1 … 20000 | Row index. Stable across regeneration. |
| `stratum` | string | — | 4 values | Which sampling scheme produced this row: `sweep` (8000), `fill` (5000), `scenario` (4000), `adversarial` (3000). See [generation.md](generation.md). |

---

## Group 2 — environment and mission, the model inputs

These are the only quantities known **before** a frequency is chosen. They are
measured by the payload's sensors or set by the mission plan. Everything a model
is allowed to use lives in this group.

| Column | Type | Unit | Range | Derived? | Meaning |
|---|---|---|---|---|---|
| `temp_c` | float | °C | 2.00 … 31.99 | sampled | Water temperature. |
| `salinity_ppt` | float | ppt | 0.0005 … 40.00 | sampled | Salinity, parts per thousand. Estuary rows go near fresh. |
| `turbidity_ntu` | float | NTU | 0.00 … 999.94 | sampled | Suspended sediment load. **The driving variable of the whole dataset.** |
| `depth_m` | float | m | 0.04 … 250.00 | sampled | Operating depth. Affects sound speed and selects the sweep mode above 90 m. |
| `mission_range_m` | float | m | 80.01 … 559.99 | sampled | **The range the mission requires.** Not a property of the water. This is what makes a condition satisfiable or not, and it is why the dataset has a failure region at all. |
| `sound_speed_ms` | float | m/s | 1414.53 … 1557.46 | derived | Mackenzie nine-term equation from `temp_c`, `salinity_ppt`, `depth_m`. |
| `absorption_ref_db_km` | float | dB/km | 66.9459 (constant) | derived | Thorp absorption evaluated at the **band midpoint**, 300 kHz. Frequency-independent by construction, therefore safe to use as a feature. |
| `scatter_ref_db_km` | float | dB/km | 0.00 … 143.54 | derived | Sediment scattering at the band midpoint. Varies only with `turbidity_ntu`. Safe to use as a feature. |

> **`absorption_ref_db_km` is constant across all 20,000 rows.** The band midpoint
> never moves, so Thorp's expression returns the same value every time. It is
> included as a model feature in the notebook and it carries **zero information** —
> a zero-variance column. It does no harm, but it is not doing any work either.
> See [../evaluation/results.md](../evaluation/results.md).

---

## Group 3 — the decision, the model targets

What the 468-candidate solver chose. These are the outputs a surrogate tries to
reproduce.

| Column | Type | Unit | Range | Distinct | Meaning |
|---|---|---|---|---|---|
| `f_centre_hz` | float | Hz | 148,000 … 350,667 | 9 | Chosen centre frequency. **Primary target.** Discrete because the candidate grid is discrete. |
| `bandwidth_hz` | float | Hz | 96,000 … 298,667 | 9 | Chosen sweep width. **Target.** |
| `pulse_s` | float | s | 0.0005 … 0.0120 | 6 | Chosen pulse duration. **Target.** Hardest of the three to predict. |
| `amplitude` | float | — | 0.42 … 0.92 | 6 | Drive amplitude, fraction of full scale. Tied to `pulse_s` by the candidate grid. |
| `mode` | string | — | 3 values | — | Waveform family: `lfm` (12227), `barker13` (3973), `geometric` (3800). Barker when SNR margin < 2 dB, geometric when deeper than 90 m, otherwise LFM. |
| `window` | string | — | 3 values | — | Transmit envelope: `hamming` (8154), `blackman` (7702), `hann` (4144). Hann when margin < 3 dB, Blackman above 400 NTU, otherwise Hamming. |

The chosen frequency takes only **9 distinct values** and the pulse only **6**.
That is not a defect — it is the candidate grid, which is deliberately discrete
because the firmware has to store it. It does mean regression metrics on these
targets should be read alongside the parity plot, not on their own.

---

## Group 4 — consequences of the decision

Computed **after** a frequency is chosen. Every column here is a function of the
target.

> **These columns leak the target. Do not use them as model features.**
> `absorption_db_km` is Thorp's expression evaluated *at the chosen frequency*.
> A model given it can invert Thorp and recover `f_centre_hz` exactly, producing
> a near-zero error that means nothing. This happened during development: MAE
> came out at 0.0002 Hz. That number was the bug, not the result.

| Column | Type | Unit | Range | Meaning |
|---|---|---|---|---|
| `absorption_db_km` | float | dB/km | 43.20 … 76.51 | Thorp absorption at `f_centre_hz`. **Leaks.** |
| `scatter_db_km` | float | dB/km | 0.00 … 181.40 | Sediment scattering at `f_centre_hz`. **Leaks.** |
| `noise_level_db` | float | dB | 52.00 … 59.14 | Ambient noise, `52 + min(8, ntu/140)`. Rises in disturbed water. |
| `tbp` | float | — | 149.33 … 3584.00 | Time–bandwidth product, `pulse_s × bandwidth_hz`. |
| `compression_gain_db` | float | dB | 21.74 … 35.54 | Matched-filter gain, `10·log₁₀(tbp)`. |
| `resolution_m` | float | m | 0.00238 … 0.00809 | Range resolution after compression, `c / 2B`. 2.4 mm to 8.1 mm. |
| `predicted_snr_db` | float | dB | −46.30 … 82.07 | Echo SNR from the active sonar equation for the chosen candidate. Negative values are the infeasible rows. |
| `energy_mj` | float | mJ | 1.78 … 11.95 | Transmit energy for this ping. Budget is 46 mJ, never binding in practice. |
| `feasible` | bool | — | True 15399 / False 4601 | Whether any candidate cleared threshold **plus design margin**. **77.0 % overall.** |

---

## Group 5 — the closed loop

| Column | Type | Unit | Range | Meaning |
|---|---|---|---|---|
| `measured_snr_db` | float | dB | −61.37 … 83.11 | What the correlator reported. |
| `error_db` | float | dB | −3.12 … 16.76 | `predicted_snr_db − measured_snr_db`. Mean **+3.90 dB**, sd **3.64**. |

**`error_db` is the target of the one model in this project that ships.**

It is positive on average by construction: the propagation model
**under-predicts loss in sediment**, which is the honest expectation for any
analytic scattering model. The simulated correlator applies two mechanisms the
single-scatter model in the notebook does not carry:

```python
path = (range_m / 220) ** 0.7                    # multiple scattering accumulates
floc = 1 + 0.6 * (1 - salinity_ppt / 40)         # flocculation in fresh water
bias = (turbidity_ntu / 190) * path * floc
measured = predicted - bias + N(0, 0.9)
```

Both mechanisms are real. Multiple scattering means the shortfall of a
single-scatter model grows faster than linearly along the path. Flocculation
means suspended clay in brackish water aggregates into larger particles that
scatter more than the same mass dispersed.

The **exact law is not claimed to be correct** — nobody knows the true error law
of their own propagation model, because if they did it would not be an error.
What matters is that the shortfall depends on **three variables at once** and is
not something a person recovers by eye from a single scatter plot. A rule fitted
by eye to turbidity alone leaves 1.31 dB of unexplained spread; a model given
all the environment columns leaves 0.92 dB against a noise floor of 0.90.

That gap is what the payload's design margin exists to cover, and covering it
with a measurement instead of a guess returns **3.66 dB** to the solver. See
[`../evaluation/residual-model.md`](../evaluation/residual-model.md).

A dataset where prediction matched measurement exactly would have nothing to
learn from, and the margin would have nothing to be calibrated against.

---

## Feasibility by stratum

| Stratum | Rows | Share | Feasible |
|---|---:|---:|---:|
| `sweep` | 8,000 | 40 % | 94.00 % |
| `fill` | 5,000 | 25 % | 81.52 % |
| `scenario` | 4,000 | 20 % | 95.08 % |
| `adversarial` | 3,000 | 15 % | **0.00 %** |
| **All** | **20,000** | 100 % | **77.00 %** |

The adversarial stratum is feasible in **zero** rows. That is the point of it. A
dataset in which everything is solvable teaches a model that everything is
solvable, and a payload that has never met an impossible request will
confidently answer one.

---

## Reading the file

```python
import pandas as pd
df = pd.read_csv("adaptive_sonar_waveform_selection.csv")

FEATURES = ["temp_c", "salinity_ppt", "turbidity_ntu", "depth_m",
            "mission_range_m", "sound_speed_ms",
            "absorption_ref_db_km", "scatter_ref_db_km"]
TARGETS  = ["f_centre_hz", "bandwidth_hz", "pulse_s"]
```

Those two lists are the whole contract. Anything outside `FEATURES` that is not
in Group 1 or Group 2 is downstream of the answer.

## Units, stated once

Hertz for frequency, seconds for time, metres for distance, decibels for every
level and every loss, dB/km for attenuation coefficients, millijoules for
energy, NTU for turbidity, ppt for salinity, °C for temperature. No column mixes
units and no column is unitless except `amplitude`, `tbp` and `ping_id`.
