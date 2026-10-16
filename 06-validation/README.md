# Validation dossier

[Project overview](../README.md) · [Parent folder](../README.md)

This package contains test plans, equipment protocols, traceability, and a numerical dossier for a proposed final configuration. The CSV records, plotted results, acceptance tables, and report are explicitly based on **engineering projections**. A `PASS` in those records is a projected acceptance verdict, not proof that a physical tank or bench test occurred.

## Navigate

| Folder or file | Purpose |
|---|---|
| [Test plan](test-plan/README.md) | T-01–T-16 methods, acceptance criteria, and requirement mapping |
| [Bench results](bench-results/README.md) | Projected signal, timing, power, and synthesis results |
| [Tank results](tank-results/README.md) | Projected range, adaptation, convergence, and immersion results |
| [Instruments](instruments/README.md) | Proposed equipment, settings, uncertainty, and limitations |
| [Validation report](validation-report.pdf) | Compiled dossier |

## Evidence boundaries

The dossier includes projections such as 2.003 MSps sustained DAC output, 97.6% CPU idle, 0.93 mJ per ping, 0.8 cm range MAE, and 20 mm target separation. These describe its assumed configuration and must not be reused as measured performance of the current TX/RX firmware or the photographed prototype.

The current [TX and RX projects](../02-firmware/README.md) have their own build and implementation records. [Prototype photos and scope captures](../08-media/README.md) document physical bench activity; their provenance and limits are recorded with the media. [Model evaluations](../05-models/evaluation/README.md) provide generated-data and host-benchmark results, a third evidence class.

Before replacing any projected row with a measured result, retain its test ID, record the actual board/firmware revision, instrument settings and calibration, raw capture, units, conditions, and uncertainty. Update the result, figure, report, and compliance reference together so the evidence remains traceable.
