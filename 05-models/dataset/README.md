# Generated transmit-decision dataset

[Project overview](../../README.md) · [Parent folder](../README.md)

The canonical [CSV](adaptive_sonar_waveform_selection.csv) contains 20,000 rows × 27 columns. Each row contains a sampled environment, mission requirements, the pulse selected by the numerical solver, and simulated outcomes. It is generated data, not a recorded sonar or tank dataset.

## Files

| File | Use |
|---|---|
| [Data dictionary](data-dictionary.md) | Column names, units, ranges, and derived quantities |
| [Generation method](generation.md) | Sampling, candidate search, seed, and provenance |
| [Licence](licence.md) | Dataset attribution and reuse terms |
| [CSV](adaptive_sonar_waveform_selection.csv) | Canonical generated table |

## Composition

| Stratum | Rows | Share | Feasible under the study criterion |
|---|---:|---:|---:|
| Sweep | 8,000 | 40% | 94.00% |
| Fill | 5,000 | 25% | 81.52% |
| Scenario | 4,000 | 20% | 95.08% |
| Adversarial | 3,000 | 15% | 0.00% |
| Total | 20,000 | 100% | Approximately 77.0% |

Feasibility refers to the stated candidate grid, detection threshold, margin, and energy model. It does not prove that a physical mission is possible or impossible.

## Prevent target leakage

Use only features available before choosing a pulse:

```python
FEATURES = ["temp_c", "salinity_ppt", "turbidity_ntu", "depth_m",
            "mission_range_m", "sound_speed_ms",
            "absorption_ref_db_km", "scatter_ref_db_km"]
TARGETS = ["f_centre_hz", "bandwidth_hz", "pulse_s"]
```

The `_ref_` quantities use a fixed band midpoint. Chosen-frequency absorption, scattering, bandwidth-time product, compression gain, resolution, and predicted SNR are downstream quantities. Feeding them into a model can reveal the answer; an early leakage experiment produced an apparent 0.0002 Hz frequency error.

## Regenerate and compare

From this directory:

```sh
cd ../notebook
python -m pip install -r requirements.txt
python run_local.py
```

The generator uses seed `20260829`; its generated local CSV is ignored, while the canonical copy remains here. Read [run-metrics.json](../notebook/run-metrics.json) for the stored reproduction record. Compare parsed values when crossing platforms: LF and CRLF line endings change a byte-level SHA-256 without changing the table.

See [evaluation](../evaluation/README.md) for the held-out split, leakage controls, and limits of the models trained on this dataset.
