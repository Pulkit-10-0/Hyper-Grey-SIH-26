# Adaptive sonar notebook

[Project overview](../../README.md) · [Parent folder](../README.md)

The notebook implements propagation models, waveform families, candidate search, generated-dataset creation, and two model studies. It produces reproducible calculations, simulated DSP plots, and a synthetic residual-correction experiment.

## Entry points

| File | Purpose |
|---|---|
| [Notebook](adaptive-sonar-waveform-selection.ipynb) | Interactive narrative and executable cells |
| [Jupytext source](notebook.py) | Text source for notebook development |
| [Headless runner](run_local.py) | Executes locally and checks generated outputs |
| [Requirements](requirements.txt) | Python dependency versions |
| [Stored run metrics](run-metrics.json) | Dataset dimensions, physics checks, and reproduction record |
| [Figures](figures/README.md) | Nine generated plot families |

Published notebook: [Adaptive Sonar Waveform Selection on Kaggle](https://www.kaggle.com/code/prakhar1803/adaptive-sonar-waveform-selection).

## What it covers

1. Mackenzie sound speed, Thorp absorption, and parameterized sediment loss.
2. CW, LFM, geometric sweeps, Barker-13, and window envelopes.
3. Matched filtering, time-bandwidth product, and range-resolution calculations.
4. A 468-candidate constrained waveform search in the 100–500 kHz numerical band.
5. A four-stratum, 20,000-row generated dataset with seed `20260829`.
6. A surrogate accuracy/leakage evaluation and host latency comparison.
7. An injected residual-error law and an illustrative correction model.

Selected inline checks include Thorp absorption of 34.07, 51.02, and 87.01 dB/km at 100, 200, and 400 kHz, and sound speed of 1534.29 m/s at 25 °C, 35 ppt, and the surface. The stored run records these numerical consistency checks.

The idealized comparison `cτ/2` versus `c/(2B)` gives 3.75 m and 7.5 mm for a 5 ms pulse, 100 kHz bandwidth, and 1500 m/s sound speed. Actual resolution also depends on the transducer, signal chain, window, noise, and geometry.

## Run locally

From this directory:

```sh
python -m pip install -r requirements.txt
python run_local.py
```

The runner writes a local generated CSV, figures, metrics, and log. The local CSV is ignored; the canonical tracked copy is in [dataset](../dataset/README.md). The notebook generates data without downloading an input dataset. Recorded byte hashes depend on CSV line endings, so check parsed numerical content as well as the runner's hash report.

To open interactively:

```sh
jupyter lab adaptive-sonar-waveform-selection.ipynb
```

If editing `notebook.py`, regenerate its notebook representation with Jupytext installed:

```sh
jupytext --to notebook notebook.py -o adaptive-sonar-waveform-selection.ipynb
```

## Evaluation results

Use the latest [evaluation metrics](../evaluation/metrics.json) and [evaluation guide](../evaluation/README.md) for the stored 40.3 µs / 7.445 ms host comparison. The numerical comparison selected the deterministic solver as its primary decision path and evaluated the residual model against an injected synthetic shortfall law.

The approximately 40 kHz bench output and embedded operating profiles are documented in [firmware](../../02-firmware/README.md).
