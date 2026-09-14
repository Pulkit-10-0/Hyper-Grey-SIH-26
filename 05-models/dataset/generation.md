# generation

How `adaptive_sonar_waveform_selection.csv` was produced, and how to produce it
again.

---

## It regenerates bit for bit

```
seed 20260829

published    sha256  7d5d50dce7b92d3b083f80b5b52510589e6372d6ab87e78e8686e56cfb126053
regenerated  sha256  7d5d50dce7b92d3b083f80b5b52510589e6372d6ab87e78e8686e56cfb126053
                                                                          identical
```

Verified on 10 September 2026 by running `../notebook/notebook.py` end to end in
a clean directory and hashing the output against the published file. Not "the
same statistics" — the same bytes.

```powershell
cd ..\notebook
python run_local.py          # writes the CSV, the figures and run-metrics.json
```

Runtime **14 s** on a laptop, CPU only. The acceptance target was five minutes.

To verify a copy yourself:

```powershell
Get-FileHash .\adaptive_sonar_waveform_selection.csv -Algorithm SHA256
```

---

## The generator

Each row is produced by:

1. **Sample an environment and a mission requirement** from one of four strata.
2. **Solve.** Evaluate all 468 candidate parameter sets against the active sonar
   equation and take the widest bandwidth that clears the detection threshold
   plus a design margin, breaking ties on energy.
3. **Simulate the outcome.** The correlator result is the prediction minus a
   sediment-dependent bias plus noise.
4. **Record everything**, including the quantities evaluated at the band midpoint
   that a model is allowed to see.

There is no lookup table anywhere in this. Every row's answer is the result of a
search.

### The candidate grid

```
centres      13 values,  148.0 - 452.0 kHz   (12 % to 88 % of the 100-500 kHz band)
             148.0  173.3  198.7  224.0  249.3  274.7  300.0
             325.3  350.7  376.0  401.3  426.7  452.0
bandwidths    6 fractions of centre          (0.90, 0.70, 0.50, 0.32, 0.18, 0.08)
durations     6 values,  0.5 - 12.0 ms
amplitudes    tied to duration, 0.42 - 0.92
                                              13 x 6 x 6 = 468 candidates
```

Bandwidth is clipped so the sweep stays inside the 100–500 kHz transducer band:
`bw ≤ 2 · min(fc − 100 kHz, 500 kHz − fc)`, and separately `bw ≤ 0.9 · fc`.
Together those make the achievable bandwidth peak at 350.7 kHz and fall away on
both sides:

```
148.0 kHz ->  96.0 kHz      325.3 kHz -> 292.8 kHz
173.3     -> 146.7          350.7     -> 298.7   <- peak
198.7     -> 178.8          376.0     -> 248.0
224.0     -> 201.6          401.3     -> 197.3
249.3     -> 224.4          426.7     -> 146.7
274.7     -> 247.2          452.0     ->  96.0
300.0     -> 270.0
```

So **only the lowest 9 of the 13 centres ever win.** The top four — 376.0, 401.3,
426.7 and 452.0 kHz — appear in zero rows, because each offers *less* bandwidth
than 350.7 kHz *and* suffers more absorption. They are strictly dominated: there
is no water in which choosing one of them is correct. They stay in the grid
because the same grid construction is used for the air configuration, where the
band edges differ and the peak sits elsewhere.

### Selection rule

```
margin(ntu) = 3 + min(12, ntu / 70)          design headroom, grows with sediment
noise(ntu)  = 52 + min(8, ntu / 140)         ambient rises in disturbed water

feasible    = snr >= threshold + margin  AND  energy <= 46 mJ
if none feasible:  relax to  snr >= threshold
if still none:     take argmax(snr) and mark the row infeasible
tie-break:         widest bandwidth, then lowest energy
```

The margin grows with turbidity on purpose. Scattering media are exactly where a
propagation model is least trustworthy, so the payload demands more headroom
there. Without that term the solver does not move off the top of the band at all
— that was a real bug, caught by an assertion that rising turbidity must lower
the chosen frequency.

### The measurement model

```python
path = (range_m / 220.0) ** 0.7                  # multiple scattering accumulates
floc = 1.0 + 0.6 * (1.0 - salinity_ppt / 40.0)   # flocculation in fresh water
bias = (turbidity_ntu / 190.0) * path * floc
measured = predicted - bias + N(0, 0.9)
```

The propagation model **under-predicts loss in sediment**. That is deliberate,
and it is the honest expectation for any analytic scattering term. Two
mechanisms the single-scatter expression in section 2 of the notebook does not
carry:

- **Path length.** A single-scatter model neglects multiple scattering, so its
  shortfall accumulates faster than linearly along the path. The exponent 0.7 is
  a plausible sub-linear accumulation, not a fitted value.
- **Flocculation.** In fresh and brackish water, suspended clay aggregates into
  larger flocs that scatter more than the same mass of dispersed particles. This
  is why estuarine rows are the worst case and not merely the dirtiest.

The resulting `error_db` averages **+3.90 dB** with a standard deviation of
**3.64 dB**, against a measurement noise floor of 0.9 dB.

**Why the law is deliberately multi-variable.** An earlier version made the
shortfall a straight function of turbidity. That was the wrong choice for the
purpose this dataset serves: a one-variable bias is recoverable by eye from a
scatter plot, so a model that learns it demonstrates nothing a ruler could not
do. With three variables interacting, a line fitted to the turbidity scatter
leaves 1.31 dB of unexplained spread while a model given the whole environment
reaches 0.92 dB — within 0.02 dB of the noise floor.

**What this does and does not prove.** The law above is one this notebook put
there, so recovering it is not evidence that the coefficients are right. It is
evidence that the *mechanism* works, and a measurement of the size of the prize.
The real law is unknown and is measured in a tank, against a target at a known
range, with sediment stirred in. The model is refit against that data and the
margin rule follows. Nothing in the structure changes.

That gap is what the payload's closed loop corrects for in flight, and what
[`../evaluation/residual-model.md`](../evaluation/residual-model.md) learns
instead of guessing.

---

## Composition

Four strata, chosen so the file teaches four different things.

| Stratum | Rows | Share | What it is for |
|---|---:|---:|---|
| `sweep` | 8,000 | 40 % | Turbidity swept 0–1000 NTU with everything else held near constant. Isolates the scattering effect so the frequency response to sediment is visible without confounds. |
| `fill` | 5,000 | 25 % | Independent uniform draws across the full envelope. Fills the space without clustering, so the model is not trained only on a line through it. |
| `scenario` | 4,000 | 20 % | Perturbations around four named operating conditions. Reproduces what a real mission actually visits. |
| `adversarial` | 3,000 | 15 % | Cold, near-fresh, heavily laden water with a long required range. **The failure region.** |

### Sampling ranges per stratum

| | temp °C | salinity ppt | turbidity NTU | depth m | range m |
|---|---|---|---|---|---|
| `sweep` | 26 ± 0.4 | 34 ± 0.3 | U(0, 1000) | 25 ± 2 | U(120, 300) |
| `fill` | U(2, 32) | U(5, 40) | U(0, 1000) | U(0, 250) | U(80, 400) |
| `scenario` | base ± 0.6 | base ± 0.5 | base ± 25 | base ± 1.5 | U(150, 320) |
| `adversarial` | U(2, 10) | U(0, 15) | U(600, 1000) | U(120, 250) | **U(380, 560)** |

All values are then clipped to the physical envelope: temperature 0–35 °C,
salinity 0–40 ppt, turbidity 0–1000 NTU, depth 0–250 m, range 50–600 m.

### The four scenarios

| Name | temp °C | salinity ppt | turbidity NTU | depth m |
|---|---:|---:|---:|---:|
| `reef` | 28.5 | 34.8 | 12 | 8 |
| `coastal` | 26.0 | 33.1 | 180 | 25 |
| `estuary` | 24.2 | 12.4 | 740 | 6 |
| `deep` | 6.8 | 34.9 | 5 | 220 |

---

## How the failure region was actually built

The first version of this stratum did not work, and recording why is more useful
than only recording the fix.

**First attempt — bad water alone.** Cold, near-fresh, 600–1000 NTU, deep. The
`feasible` column came back **True in every row**. Water conditions alone do not
defeat the solver: it drops frequency, lengthens the pulse to buy compression
gain, and still clears the threshold. The adaptation is genuinely good at its
job, which is the entire point of the project and was extremely inconvenient
here.

**The fix — add a mission requirement.** `mission_range_m` was introduced as a
column: the range the payload is *asked* to achieve, which is set by the survey
plan and is independent of the water it finds. Push that to 380–560 m in heavy
sediment and the link budget cannot be met by any of the 468 candidates.

Result: `adversarial` is feasible in **0.00 %** of its 3,000 rows.

The lesson, which is worth stating in the report: *infeasibility is a property of
the request, not of the water.* A payload that has only ever been asked for
achievable things will answer an impossible request with the same confidence it
answers an easy one.

---

## Regenerating with different parameters

`N_ROWS`, `SEED` and the stratum shares are constants at the top of the
generation section in `../notebook/notebook.py`. Changing any of them changes
the SHA-256, so:

- record the new seed and the new hash here,
- rerun `../evaluation/evaluate.py`, because every number in
  `../evaluation/` is derived from this file,
- and do both in the same commit.

The 40/25/20/15 split is not arbitrary. Sweep dominates because the
turbidity-to-frequency relationship is the thing being demonstrated; adversarial
is capped at 15 % because a dataset that is mostly failure teaches a model to
predict failure.

## Environment it was generated in

| | |
|---|---|
| Python | 3.12.3 |
| NumPy | 2.0.0 |
| pandas | 3.0.2 |
| SciPy | present, used only for `signal.correlate` in the compression figure |
| scikit-learn | 1.4.2 |
| matplotlib | 3.10.9 |

The generator uses `numpy.random.default_rng(SEED)` — the PCG64 bit generator,
which is stable across NumPy versions. That is what makes the byte-identical
reproduction above possible; the legacy `numpy.random.seed` global state is not
guaranteed in the same way and is not used.
