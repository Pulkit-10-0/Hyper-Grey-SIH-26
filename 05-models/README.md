# Models and reproducible numerical studies

[Project overview](../README.md) · [Parent folder](../README.md)

This section delivers a generated transmit-decision dataset, its reproducible notebook, and model evaluations. The numerical studies cover propagation, waveform selection, DSP, and synthetic residual correction.

## Start here

| Folder | Purpose |
|---|---|
| [Dataset](dataset/README.md) | 20,000 rows × 27 columns, provenance, schema, and licence |
| [Notebook](notebook/README.md) | Physics relations, 468-candidate search, waveform synthesis, and dataset generation |
| [Evaluation](evaluation/README.md) | Surrogate accuracy, host latency, constraint checks, and a synthetic residual-correction study |

The search evaluates 13 centre frequencies × 6 bandwidth fractions × 6 pulse durations. It selects the widest feasible bandwidth, breaks ties using energy, and reports feasibility under the study criteria. The 100–500 kHz study band is separate from the approximately 40 kHz physical bench prototype.

## Numerical results

The committed [evaluation metrics](evaluation/metrics.json) report:

| Quantity | Stored result | Meaning |
|---|---:|---|
| Frequency MAE | 3,584 Hz versus 69,567 Hz baseline | Surrogate agreement with generated solver labels |
| Bandwidth MAE | 3,995 Hz versus 61,298 Hz baseline | Same numerical test split |
| Pulse-duration MAE | 1.666 ms versus 2.404 ms baseline | Pulse-duration prediction on the numerical test split |
| Precomputed solver median | 40.3 µs | Python/NumPy host benchmark |
| Single-row surrogate median | 7.445 ms | Python host benchmark, approximately 185× slower in this setup |
| Residual-model MAE | 0.729 dB | Prediction of an injected synthetic shortfall law |

The comparison selected the deterministic solver as the primary numerical decision path, with the learned surrogate providing a reference for accuracy and computational cost. The surrogate stores 19,337 tree nodes; each prediction traverses paths through those trees. The residual model evaluates correction of an injected synthetic shortfall law.

The synthetic residual study computes a margin change from 9.13 to 5.47 dB and a resolution change from 7.81 to 5.11 mm at 1000 NTU and 220 m. Its 99.88% coverage statistic uses the residual spread estimated on that test set.

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

The first two scripts regenerate data, figures, logs, and metrics. `qa.py` checks stored-document consistency. CSV byte hashes can differ across LF/CRLF line endings, so distinguish numerical reproducibility from byte identity.

## Related work

- [Research library](../03-research/README.md): sources and topic indexes.
- [Validation dossier](../06-validation/README.md): test plans and explicitly labelled final-configuration projections.
- [Current firmware](../02-firmware/README.md): the TX and RX implementations, operating profiles, and build records.
