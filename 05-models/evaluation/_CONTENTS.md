# evaluation

## Purpose
What the model is worth, and where it fails. The failure number is the point.

## Files that must exist
- `results.md` — the metric table
- `safety-analysis.md` — violation rate, method, and the deployment rule
- `latency.md` — solver candidate count against surrogate evaluation count
- `residual-model.md` — the model that ships: what it learns, what it buys, and
  what it does not prove
- `evaluate.py` — produces every number in the four documents above
- `metrics.json` — generated; what those documents quote
- `figures/`

## Metrics that must be reported
| Metric | Why |
|---|---|
| MAE per output against a mean baseline | Establishes skill, not just accuracy |
| Performance on held-out adversarial rows | Generalisation, not interpolation |
| Safety-bound violation rate | The number that decides whether it can ship |
| Evaluation cost, both paths | Whether a surrogate is worth having at all |
| Residual MAE against a fitted-by-eye baseline | Whether the model beats what a person would do |
| Margin returned, and the resolution it buys | What the correction is actually worth |

## The rule this folder must state
The model proposes, the physics disposes. The sonar equation stays resident on
the device and vetoes any prediction that would not clear the detection
threshold. A rejected prediction falls back to the full candidate search.

## Acceptance
The violation rate is reported even though it is unflattering. A model
presented without one reads as untested.

A model is only described as shipping if a measurement says it should. Two models
are evaluated here; one is rejected on latency and silent-failure grounds and the
other is kept. Both verdicts are reached by measurement and both are stated.
