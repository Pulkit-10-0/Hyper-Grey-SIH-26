# Adaptive sonar project manuscript

[Project overview](../../README.md) · [Parent folder](../README.md)

The project manuscript brings together the physical rationale, generated studies, architecture, and explicitly separated team-reported intervals and final-configuration projections. It is a project research manuscript; no publication or peer-review status is asserted.

## Read and rebuild

- [PDF manuscript](SeaNergy_Adaptive_Sonar_Research_Paper.pdf)
- [LaTeX source](SeaNergy_Adaptive_Sonar_Research_Paper.tex) and [preamble](preamble.tex)
- [Figure guide](figures/README.md)
- [Source generator](build_paper.py)

`build_paper.py` derives the manuscript source from the technical report and writes the `.tex` and preamble; it does not itself compile the PDF. Inspect it before regenerating because it overwrites those sources. The preamble uses `fontspec` and Times New Roman, requiring a Unicode-capable TeX engine and that font.

Firmware diagrams and some implementation descriptions reflect the earlier ESP-IDF design. For current behavior use the [TX/RX documentation](../../02-firmware/README.md). Keep generated results, reported bench intervals, and projection records distinct when citing the manuscript.

## Files

- [SeaNergy_Adaptive_Sonar_Research_Paper.pdf](SeaNergy_Adaptive_Sonar_Research_Paper.pdf)
- [SeaNergy_Adaptive_Sonar_Research_Paper.tex](SeaNergy_Adaptive_Sonar_Research_Paper.tex)
- [build_paper.py](build_paper.py)
- [preamble.tex](preamble.tex)
