# technical-report

## Purpose
The main written deliverable. The document a research institute would read.

## Files that must exist
- `technical-report.pdf` — **25 to 30 pages** including figures, excluding appendices
- Source (LaTeX or DOCX)
- `figures/`
- `appendices/` — unlimited length, but genuinely appendices

## Section plan with page budget
| Section | Pages |
|---|---|
| Abstract and problem statement | 1 |
| Background: why a fixed ping is wrong | 2 |
| System architecture | 2 |
| Ocean acoustic models used, with the equations | 3 |
| Waveform synthesis and windowing | 3 |
| Pulse compression and the matched filter | 3 |
| The adaptation solver and the closed loop | 3 |
| Hardware design and domain partitioning | 3 |
| Power architecture and measured budget | 2 |
| The learned surrogate and its safety bound | 2 |
| Validation results | 3 |
| Limitations and what is not yet real | 1 |
| Path to deployment | 1 |
| References | 1 |

## Facts and figures this must carry
Every equation with its source cited. Every measured number with its test ID.
A results table that matches the compliance matrix exactly. A limitations
section that names the uncalibrated source level and the untested items.

## Acceptance
No claim without either a citation or a test ID. Figures numbered and
referenced in the text. Units on every axis.
