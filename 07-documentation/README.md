# Documentation

[Project overview](../README.md) · [Parent folder](../README.md)

Reports, interface contracts, references, operating guides, and safety analysis. Several deliverables preserve the earlier integrated ESP-IDF design; the current bench firmware is the separate [TX/RX pair](../02-firmware/README.md).

## Start here

| Folder | Contents and status |
|---|---|
| [Research manuscript](research-paper/README.md) | Project manuscript, sources, and figure provenance; no publication or peer-review status asserted |
| [Technical report](technical-report/README.md) | DOC-TR-001, LaTeX source, figures, and appendices; earlier firmware architecture |
| [API](api/README.md) | App-side NDJSON, historical binary BLE, CSV schema, and core API snapshot |
| [User guide](user-guide/README.md) | Retained operator workflow plus pointers to current bench instructions |
| [Safety](safety/README.md) | Risk and demonstration guidance tied to documented revisions |
| [References](references/README.md) | Bibliography, reference list, and reading notes |

## How to interpret the evidence

- [Numerical studies](../05-models/README.md) contain generated data, simulated DSP, and host benchmarks.
- [Validation](../06-validation/README.md) contains final-configuration engineering projections. Its T-series `PASS` entries are projected acceptance verdicts.
- [Media](../08-media/README.md) documents physical prototype activity and software displays, with limits in the media register.
- Current hardware and firmware behavior comes from the [hardware guide](../01-hardware/README.md) and [TX/RX guides](../02-firmware/README.md), not from an older architecture figure.

The research manuscript additionally separates team-reported bench intervals from regenerated studies and projections. Keep those categories distinct when citing results. If sources disagree, resolve the implementation revision and evidence basis before quoting a number; a compliance table cannot overrule an underlying capture or source record.

## Verification and rebuilding

The [documentation checker](verify-docs.py) checks file, citation, figure, and numeric consistency:

```sh
python verify-docs.py
```

It is a consistency tool, not independent validation of acoustic measurements, safety, or current firmware integration. Some checks target historical layouts and may need revision after reorganizing the project.

See the [technical-report guide](technical-report/README.md) for its `pdflatex` build steps and the [manuscript guide](research-paper/README.md) for its separate generation and font requirements.
