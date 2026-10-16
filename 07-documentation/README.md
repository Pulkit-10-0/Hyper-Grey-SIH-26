# Documentation

[Project overview](../README.md) · [Parent folder](../README.md)

Reports, interface contracts, references, operating guides, and safety analysis. Several deliverables preserve the earlier integrated ESP-IDF design; the current bench firmware is the separate [TX/RX pair](../02-firmware/README.md).

## Start here

| Folder | Contents and status |
|---|---|
| [Research manuscript](research-paper/README.md) | Project research manuscript, LaTeX sources, and figure provenance |
| [Technical report](technical-report/README.md) | DOC-TR-001, LaTeX source, figures, and appendices; earlier firmware architecture |
| [API](api/README.md) | App-side NDJSON, historical binary BLE, CSV schema, and core API snapshot |
| [User guide](user-guide/README.md) | Retained operator workflow plus pointers to current bench instructions |
| [Safety](safety/README.md) | Risk and demonstration guidance tied to documented revisions |
| [References](references/README.md) | Bibliography, reference list, and reading notes |

## Results and implementation references

- [Numerical studies](../05-models/README.md) contain generated data, simulated DSP, and host benchmarks.
- [Validation](../06-validation/README.md) contains final-configuration engineering projections. Its T-series `PASS` entries are projected acceptance verdicts.
- [Media](../08-media/README.md) documents physical prototype activity and software displays, with captions and source records in the media register.
- The [hardware guide](../01-hardware/README.md) and [TX/RX guides](../02-firmware/README.md) document current build profiles and implemented behavior.

The research manuscript presents team-reported bench intervals alongside regenerated numerical studies and final-configuration projections, with the basis identified in the relevant sections.

## Verification and rebuilding

The [documentation checker](verify-docs.py) checks file, citation, figure, and numeric consistency:

```sh
python verify-docs.py
```

The checker supports the report snapshot’s file, citation, figure, and numerical cross-references. Use each component’s current guide for implementation and build details.

See the [technical-report guide](technical-report/README.md) for its `pdflatex` build steps and the [manuscript guide](research-paper/README.md) for its separate generation and font requirements.
