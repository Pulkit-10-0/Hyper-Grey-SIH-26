# dataset

**`adaptive_sonar_waveform_selection.csv`** — 20,000 rows × 27 columns, 7.9 MB.

One row is one transmit decision: the water the payload was in, the mission it
was asked to perform, the pulse the 468-candidate solver chose, and what came
back.

---

## Why this is a contribution

Every underwater-acoustics dataset in open circulation is **receive-side**:
recorded returns, labelled for classification. Sonar images with seabed types,
hydrophone recordings with species labels, echo traces with target/no-target
flags.

This one is **transmit-side**. The label is not what came back — it is *what the
payload should have sent in the first place*.

That distinction is the reason the file exists. It is also why nothing could be
downloaded to build it: the mapping from measured environment to chosen waveform
is not a thing anyone publishes, because on a conventional payload that mapping
is a constant.

## Read this first

| File | What it gives you |
|---|---|
| [`data-dictionary.md`](data-dictionary.md) | Every column: unit, range, meaning, and whether it is derived. **Read before modelling.** |
| [`generation.md`](generation.md) | How it was made, the seed, the strata, and the reproduction proof |
| [`licence.md`](licence.md) | CC BY 4.0, the attribution line, and what is not being licensed |

## The one thing that will catch you

Four columns are computed **after** a frequency is chosen — `absorption_db_km`,
`scatter_db_km`, `tbp`, `compression_gain_db`, and downstream of those,
`resolution_m` and `predicted_snr_db`.

**Feed any of them to a model and it will recover the target exactly.** Thorp's
expression is monotonic in frequency across this band, so `absorption_db_km` is
an invertible encoding of `f_centre_hz`. During development this produced a mean
absolute error of **0.0002 Hz**, which looked like a triumph for about ten
minutes.

The legal feature set is fixed and small:

```python
FEATURES = ["temp_c", "salinity_ppt", "turbidity_ntu", "depth_m",
            "mission_range_m", "sound_speed_ms",
            "absorption_ref_db_km", "scatter_ref_db_km"]
TARGETS  = ["f_centre_hz", "bandwidth_hz", "pulse_s"]
```

The two `_ref_` columns are evaluated at the fixed band midpoint, not at the
chosen frequency, which is what makes them safe.

## Composition

| Stratum | Rows | Share | Feasible | Purpose |
|---|---:|---:|---:|---|
| `sweep` | 8,000 | 40 % | 94.00 % | Isolates the turbidity effect |
| `fill` | 5,000 | 25 % | 81.52 % | Fills the envelope without clustering |
| `scenario` | 4,000 | 20 % | 95.08 % | Reproduces realistic missions |
| `adversarial` | 3,000 | 15 % | **0.00 %** | The failure region |
| **All** | **20,000** | | **77.00 %** | |

The adversarial stratum is solvable in **zero** rows. A dataset where everything
is solvable teaches a model that everything is solvable.

## What the data shows

Median chosen parameters, binned by sediment load:

| Turbidity | Rows | Median centre | Median resolution | Feasible |
|---|---:|---:|---:|---:|
| 0 – 50 NTU | 2,622 | 350.7 kHz | 2.57 mm | 100.0 % |
| 400 – 600 NTU | 2,638 | 287.3 kHz | 2.90 mm | 94.3 % |
| 900 – 1000 NTU | 2,045 | 148.0 kHz | 7.45 mm | 41.7 % |

Frequency more than halves, resolution degrades by roughly 3×, and the mission
stops being achievable in more than half of the dirtiest rows. That progression
is the entire thesis of the project, expressed as data.

The chosen frequency takes 9 distinct values and the pulse duration 6, because
the candidate grid is discrete — the firmware has to store it. Read regression
metrics on these targets alongside the parity plot in
[`../evaluation/`](../evaluation/), not on their own.

## Reproducing it

```powershell
cd ..\notebook
python run_local.py
```

Runtime 14 s, CPU only. The output is **byte-identical** to the published file:

```
sha256  7d5d50dce7b92d3b083f80b5b52510589e6372d6ab87e78e8686e56cfb126053
```

Verified 10 September 2026. Not "the same distribution" — the same bytes.

## Provenance, stated plainly

This is **generated data, not observed data.** The environment is sampled, the
physics is computed from published relations, and the correlator outcome is
simulated. It is suitable for method development and benchmarking. It must not
be cited as measurement, and it cannot calibrate real hardware.

Measured results, when they exist, go in
[`../../06-validation/`](../../06-validation/) — a different folder, on purpose.
