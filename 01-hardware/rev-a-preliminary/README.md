# Rev A — preliminary study

**Superseded. Not for fabrication. Kept for the record.**

This folder holds the earlier 200 × 150 mm board study. It is here because it is
the work that produced the compact board, and it is *separate* because mixing
two revisions' copper is how the wrong board gets manufactured.

## What it was

A four-layer concept for a different architecture: a parallel R-2R converter
bus, an MCP4921, an OPA1652 analogue front end and an INA226 monitor. The
schematic was a labelled logical container rather than a wired design, and its
own files say so:

- `schematics/seanergy.kicad_sch` — carries the text
  `PRELIMINARY LOGICAL CONTAINER` and `NOT FOR FABRICATION`
- `schematics/erc-report.txt` — `STATUS: NOT RUN`
- `pcb/drc-report.txt` — `STATUS: NOT RUN`
- `pcb/fab-order.txt` — `STATUS: HOLD - NOT ORDERED`
- `pcb/gerbers/FABRICATION-STATUS.md` — the exports are mechanical previews,
  deliberately named so they cannot be mistaken for a production release

None of that was dishonest when it was written. It was an accurate statement
that the design was not finished.

## What replaced it

[`../`](../) — AUV V3 Compact Revision B. Two layers, 100 × 100 mm, seven wired
schematic sheets, **zero ERC violations, zero DRC violations, zero unconnected
items, zero parity differences, no exclusions**, and a fabrication package
exported from the checked board.

| | Rev A | Rev B |
|---|---|---|
| Area | 30,000 mm² | 10,000 mm² |
| Layers | 4 planned | 2, routed |
| Schematic | container | 7 sheets, wired |
| ERC / DRC | not run | 0 / 0 |
| Converters | MCP4921 + R-2R ladder on a parallel bus | two ADS1115 modules on I²C |
| Status | superseded | current |

The architecture change is the reason the layer count dropped. The parallel bus
that needed four layers is not on the compact board; see
[`../pcb/stackup.md`](../pcb/stackup.md).

## Do not

Do not send anything in this folder to a fabricator. Do not combine these files
with Rev B Gerbers or drills. Do not read the BOM here as the parts list — the
current one is [`../bom/bom-purchase.csv`](../bom/bom-purchase.csv).
