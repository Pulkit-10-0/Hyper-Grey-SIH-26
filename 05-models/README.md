# Models and reproducible numerical studies

[Project overview](../README.md) · [Parent folder](../README.md)

This section contains a generated transmit-decision dataset, the notebook that produces it, and model evaluations. The data and DSP plots are numerical studies; they do not establish measured acoustic range, power consumption, or target resolution.

## Start here

| Folder | Purpose |
|---|---|
| [Dataset](dataset/README.md) | 20,000 rows × 27 columns, provenance, schema, and licence |
| [Notebook](notebook/README.md) | Physics relations, 468-candidate search, waveform synthesis, and dataset generation |
| [Evaluation](evaluation/README.md) | Surrogate accuracy, host latency, constraint checks, and a synthetic residual-correction study |

The search evaluates 13 centre frequencies × 6 bandwidth fractions × 6 pulse durations. It prefers the widest feasible bandwidth, breaks ties using energy, and exposes infeasibility rather than assuming every mission can be completed. The 100–500 kHz study band is separate from the approximately 40 kHz physical bench prototype.

## Results and interpretation

The committed [evaluation metrics](evaluation/metrics.json) report:

| Quantity | Stored result | Meaning |
|---|---:|---|
| Frequency MAE | 3,584 Hz versus 69,567 Hz baseline | Surrogate agreement with generated solver labels |
| Bandwidth MAE | 3,995 Hz versus 61,298 Hz baseline | Same numerical test split |
| Pulse-duration MAE | 1.666 ms versus 2.404 ms baseline | Duration prediction remains the weaker output |
| Precomputed solver median | 40.3 µs | Python/NumPy host benchmark |
| Single-row surrogate median | 7.445 ms | Python host benchmark, approximately 185× slower in this setup |
| Residual-model MAE | 0.729 dB | Prediction of an injected synthetic shortfall law |

The surrogate was rejected as the primary decision path in this study. The residual model demonstrates a possible correction mechanism; its coefficients require calibration against physical measurements before deployment. The latest host timings are not ESP32 timings, and the 19,337 stored surrogate tree nodes are a model-size count, not the number visited by every prediction.

The residual study models a margin change from 9.13 to 5.47 dB and a resolution change from 7.81 to 5.11 mm at 1000 NTU and 220 m. These are computed outcomes under the study assumptions. The reported 99.88% coverage uses a residual spread estimated on the test set and is not an independent field guarantee.

## Reproduce locally

From this directory:

```sh
cd notebook
python -m pip install -r requirements.txt
python run_local.py
cd ../evaluation
python evaluate.py
cd ..
python qa.py
```

The first two scripts regenerate data, figures, logs, and metrics. `qa.py` checks stored-document consistency; it does not independently validate the physics or hardware. CSV byte hashes can differ across LF/CRLF line endings, so distinguish numerical reproducibility from byte identity.

## Related work

- [Research library](../03-research/README.md): sources and topic indexes.
- [Validation dossier](../06-validation/README.md): test plans and explicitly labelled final-configuration projections.
- [Current firmware](../02-firmware/README.md): the separate TX and RX implementations and their present limits.
