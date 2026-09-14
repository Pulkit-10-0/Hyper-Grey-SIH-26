# notebook

## Purpose
The published Kaggle notebook. Physics, dataset generation, and the learned
surrogate with its failure rate.

## Files that must exist
- `adaptive-sonar-waveform-selection.ipynb`
- `notebook.py` — the jupytext source
- `README.md` — the Kaggle URL and a summary of results
- `figures/` — exported PNGs for use in the report and deck

## Section order
Problem, sound speed, absorption, resolution and the sonar equation, waveform
synthesis, pulse compression, the decision and the feasible region, dataset
generation, learning the decision, and where the model must not be trusted.

## Facts and figures this must carry
- Physics assertions inline, checked against published values
- Thorp at 100, 200 and 400 kHz
- Compression: uncompressed against compressed resolution, with the ratio
- Surrogate MAE against a mean baseline, per output
- Safety-bound violation rate on routine conditions
- Behaviour on the held-out adversarial regime

## Acceptance
Runs top to bottom on a fresh Kaggle session in under five minutes, CPU only.
No cell relies on a manual step. No feature leaks the target: anything derived
from the chosen frequency is excluded from the model inputs.

## The trap to avoid
An accuracy that looks perfect is almost always leakage. If MAE approaches
zero, find the leaking feature before celebrating.
