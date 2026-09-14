# assembly

## Purpose
So somebody who is not you can build a second unit.

## Files that must exist
- `assembly-guide.pdf` — **6 to 8 pages**, photographed, step numbered
- `photos/` — one per step, in order, named `step-01.jpg` upward
- `soldering-notes.md` — fine-pitch parts, order of assembly, rework notes
- `bring-up-procedure.md` — the power-on sequence that avoids destroying parts
- `test-points.md` — every test point, expected voltage or waveform, tolerance

## Bring-up order that must be documented
1. Bare board continuity and short check before any part is fitted
2. Power section only, current-limited supply, verify each rail
3. MCU fitted, blink test, USB enumeration
4. Converters fitted, DAC loopback to the scope
5. Analog front end, filter response swept
6. Transducer connected last, through the limiter

## Facts and figures this must carry
- Expected current draw at each bring-up stage
- Expected voltage at every test point, with tolerance
- Soldering iron temperature and any reflow profile used
- Torque or fastener detail for the enclosure

## Acceptance
A person with a soldering iron and this document can build and bring up a unit
without asking a question. Every step has a photograph.

## What went wrong last year
`assembly/` contained a single readme with no photographs and no procedure.
