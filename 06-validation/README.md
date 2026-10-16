# Validation dossier

[Project overview](../README.md) · [Parent folder](../README.md)

This package brings together sixteen test methods, equipment protocols, requirement traceability, and a numerical dossier for the documented final configuration. The CSV records, plots, acceptance tables, and report use **engineering projections**; their `PASS` entries are projected acceptance verdicts.

## Navigate

| Folder or file | Purpose |
|---|---|
| [Test plan](test-plan/README.md) | T-01–T-16 methods, acceptance criteria, and requirement mapping |
| [Bench results](bench-results/README.md) | Projected signal, timing, power, and synthesis results |
| [Tank results](tank-results/README.md) | Projected range, adaptation, convergence, and immersion results |
| [Instruments](instruments/README.md) | Equipment specifications, settings, and uncertainty treatment |
| [Validation report](validation-report.pdf) | Compiled dossier |

## Dossier contents

The dossier includes projections such as 2.003 MSps sustained DAC output, 97.6% CPU idle, 0.93 mJ per ping, 0.8 cm range MAE, and 20 mm target separation. Each value is tied to the dossier’s configuration assumptions and test identifier.

The current [TX and RX projects](../02-firmware/README.md) have their own build and implementation records. [Prototype photos and scope captures](../08-media/README.md) document physical bench activity; captions and source records accompany the media. [Model evaluations](../05-models/evaluation/README.md) provide generated-data and host-benchmark results, with their reproducibility records.

The test methods define traceable run records: test ID, board and firmware revision, instrument settings and calibration, capture files, units, conditions, and uncertainty. Results, figures, report tables, and compliance references share the same identifiers.
