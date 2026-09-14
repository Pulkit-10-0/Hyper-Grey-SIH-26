# technical-report

The main written deliverable. **DOC-TR-001, revision 1.0.**

| | |
|---|---|
| `technical-report.pdf` | **26 pages**, 16 sections, 17 figures, 25 tables |
| `appendices/appendices.pdf` | **5 pages**, 7 appendices, outside the page budget |
| Page budget | 25 to 30 pages excluding appendices |

---

## Building it

MiKTeX or TeX Live with `pdflatex`. `latexmk` is not used because it requires a
Perl interpreter that is not part of a MiKTeX installation.

```powershell
pdflatex -interaction=nonstopmode technical-report.tex   # three passes:
pdflatex -interaction=nonstopmode technical-report.tex   # contents, then
pdflatex -interaction=nonstopmode technical-report.tex   # cross-references
```

Three passes are required. The first writes the auxiliary file, the second
resolves the table of contents, the third settles the figure and table numbers
that the contents page shifted.

The appendices build the same way from `appendices/`, and share `preamble.tex`
through a relative include, so the two documents cannot drift apart in styling.

### Current build state

```
technical-report.pdf   26 pages   0 errors   0 overfull boxes   0 undefined references
appendices.pdf          5 pages   0 errors   0 overfull boxes
```

## Figures

```
figures/f01  architecture            02-firmware/docs/figures/
figures/f02  absorption              05-models/notebook/figures/
figures/f03  waveform families       05-models/notebook/figures/
figures/f04  window sidelobes        05-models/notebook/figures/
figures/f05  pulse compression       05-models/notebook/figures/
figures/f06  feasible region         05-models/notebook/figures/
figures/f07  downband walk           05-models/evaluation/figures/
figures/f08  state machine           02-firmware/docs/figures/
figures/f09  timing budget           02-firmware/docs/figures/
figures/f10  T-01 impedance          make-figures.py
figures/f11  T-04 windows            06-validation/bench-results/figures/
figures/f12  T-06 compression        06-validation/bench-results/figures/
figures/f13  T-10 DMA and CPU        make-figures.py
figures/f14  T-12 synthesis          make-figures.py
figures/f15  T-11 power              make-figures.py
figures/f16  T-13 latency            make-figures.py
figures/f17  residual model          05-models/evaluation/figures/
figures/f18  C-05 adaptation sweep   00-submission/compliance-matrix/evidence/
```

Five of the eighteen are drawn here by `make-figures.py` directly from the raw
validation CSVs:

```powershell
python make-figures.py
```

Those five were regenerated rather than reused because the originals plotted
incompatible quantities on a shared axis, which made one series invisible at
print size, and two carried axis labels clipped by the export. Each replacement
plots one physical quantity per axis.

The T-01 figure interpolates the resonance rather than taking the sample
minimum. The sweep steps in 500 Hz, so the raw minimum lands at 40.0 kHz and
421 ohm; parabolic interpolation through the three points at the dip gives
40.20 kHz and 412.7 ohm, which is the pair reported for that test.

## Rules the document follows

- **No claim without a citation or a test identifier.** Equations carry a
  numbered reference; measured quantities carry `T-01` through `T-16`.
- **The two configurations are never mixed.** Bench and tank figures belong to
  the 24 to 80 kHz air demonstrator; design constants belong to the 100 to
  500 kHz underwater payload. Table 3 sets them side by side and every later
  number is attributed to one of them.
- **Units on every axis and every quantity.** `siunitx` throughout, so units are
  typeset consistently rather than by hand.
- **Every figure is referenced from the body text.** A figure nobody points at
  does not belong in the document.
- **Numerical basis stated once**, where the validation data is first
  introduced, matching the wording in the source result files.

## Consistency with the rest of the submission

The results table reproduces `06-validation/` exactly, and the compliance
matrix in `00-submission/` carries the same mapping of problem statement
clauses to evidence. If any of the three disagree, the compliance matrix is
authoritative and the others are wrong.

Numbers quoted from `05-models/` are checked by `python qa.py` in that folder,
which cross-references every figure in its documentation against the generated
metrics files.

## Source layout

```
technical-report.tex     the document
preamble.tex             shared styling, also used by the appendices
make-figures.py          regenerates the validation figures from raw data
figures/                 18 figures
appendices/              appendices.tex and its PDF
```

`preamble.tex` is separate so the appendices compile against identical styling.
It defines the palette, the `siunitx` configuration, the `\tid{}` test-identifier
badge and the `\keyresult{}` callout used for the headline findings.
