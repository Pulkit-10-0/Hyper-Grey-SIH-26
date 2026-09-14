# 07-documentation

The written record: the main report, the interfaces another program talks to,
the failure analysis, the operator guide, and the literature the design rests on.

---

## Contents

| Folder | Deliverable | State |
|---|---|---|
| [`technical-report/`](technical-report/) | `technical-report.pdf`, **26 pages**, plus a 5-page appendix | Built, 0 errors |
| [`api/`](api/) | Link protocol, CSV schema, core module surface, worked examples | 6 documents |
| [`safety/`](safety/) | FMEA, electrical safety, acoustic exposure, demonstration safety | 4 documents |
| [`user-guide/`](user-guide/) | Operator guide, quick start, troubleshooting | 3 documents |
| [`references/`](references/) | 145 bibliography entries, reference list, reading notes | 3 documents |

## The technical report

| | |
|---|---|
| Pages | **26**, against a 25 to 30 budget excluding appendices |
| Sections | 16 |
| Figures | 17 of 18 in the folder, all referenced from the body |
| Tables | 25 |
| Build | `pdflatex` x3, 0 errors, 0 overfull boxes, 0 undefined references |

Five figures are drawn here by `make-figures.py` from the raw validation CSVs
rather than reused. The originals plotted incompatible quantities on a shared
axis, so one series was invisible at print size, and two carried axis labels
clipped by the export. Details in
[`technical-report/README.md`](technical-report/README.md).

## Rules the whole section follows

- **No claim without a citation or a test identifier.** Sixteen identifiers,
  `T-01` to `T-16`, each resolving to a result entry and a raw data file under
  `06-validation/`.
- **The two configurations are never mixed.** Bench and tank figures belong to
  the 24 to 80 kHz air demonstrator; design constants belong to the 100 to
  500 kHz underwater payload. Every quoted number says which.
- **Every mitigation names what implements it.** The FMEA cites reference
  designators and code paths, not intentions: `Q1` DMP3010LK3-13, `F1`
  MF-MSMF200X-2, `D3-D6` BAT54S, `sonar_dma_transmit()`, `board_set_tx_enabled()`.
- **Every reading note names the equation and the function.** Not a reading
  list: each entry says what was taken from the source and where it appears,
  down to `soundSpeedWater()`, `thorpDbPerKm()`, `WINDOW_PSL_DB`, `BARKER_13`.
- **Units on every displayed quantity.**

## Verifying it

```powershell
python verify-docs.py
```

Checks that every required file exists, the report is inside its page budget,
every figure is present and referenced, every test identifier resolves to a real
result, the headline numbers match their source files, the two configurations
stay distinct, every relative link resolves, and no placeholder text survives.

Current result: **all checks passing.**

Cross-checks that hold independently:

| Claim | Verified against |
|---|---|
| 145 bibliography entries, none orphaned | Every key appears in `references.md` or `reading-notes.md` |
| 132 research PDFs referenced | Every PDF in `03-research/` is named |
| FMEA designators are real | `01-hardware/bom/bom.csv`, 36 line items |
| Cited functions exist | `04-software/mobile-android/src/` and `02-firmware/` |

## Consistency with the rest of the submission

The results table reproduces `06-validation/` exactly, and the compliance matrix
in `00-submission/` carries the same clause-to-evidence mapping. **If the three
disagree, the compliance matrix is authoritative.**

Numbers quoted from `05-models/` are separately checked by `python qa.py` in
that folder, which cross-references every figure in its documentation against
the generated metrics files.

## Rebuilding the report

```powershell
cd technical-report
python make-figures.py                                  # validation figures
pdflatex -interaction=nonstopmode technical-report.tex  # x3: aux, contents, refs
cd appendices
pdflatex -interaction=nonstopmode appendices.tex        # x2
```

`latexmk` is not used: it needs a Perl interpreter that a MiKTeX installation
does not provide.
