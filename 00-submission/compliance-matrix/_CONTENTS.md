# compliance-matrix

## Purpose
The single highest-return artefact in the whole submission. Every clause of the
problem statement, mapped to where it is implemented, how it was verified, and
the number that came out. Judges score against the PS. Hand them the scoring
sheet already filled in.

## Files that must exist
- `compliance-matrix.pdf` — **2 to 3 pages, landscape**. Print ten copies.
- `compliance-matrix.xlsx` — the working source
- `evidence/` — one screenshot, scope capture or log excerpt per row, named by row ID

## Required columns
| Column | Content |
|---|---|
| ID | C-01, C-02, ... |
| PS clause | Verbatim quote from PS 26058 |
| Where implemented | File path, board reference, or screen name |
| Verification method | Bench measurement, scope capture, unit test, inspection |
| Result | The measured number, with units |
| Evidence | Filename in `evidence/` |
| Status | Met / Partially met / Not met |

## Facts and figures this must carry
- CPU idle fraction during transmit, percent
- Peak sidelobe level, rectangular against the selected window, dB
- Range resolution, unmodulated against compressed, with the ratio
- Time-bandwidth product and compression gain, dB
- Barker-13 peak-to-sidelobe ratio, dB
- Energy per ping, mJ, and endurance at a stated battery capacity
- Adaptation latency, sensor change to first DMA sample, ms
- THD and spurious-free dynamic range at the centre frequency

## Acceptance
Every row has a number, not an adjective. Any row marked "Partially met" states
plainly what is missing and why. A matrix with no partial rows reads as
unexamined, not as perfect.

## What went wrong last year
This artefact did not exist. The technical PDF carried the same information but
a judge had to hunt for it.
