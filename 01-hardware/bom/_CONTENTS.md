# bom

## Purpose
Procurement truth. What is on the board, what it costs, what is in hand and
what is still missing.

## Files that must exist
- `bom.csv` — machine readable, one line per line item
- `bom.pdf` — **2 pages**, grouped by subsystem, for the report
- `procurement-log.md` — what was ordered, when, from whom, what arrived
- `cost-model.md` — unit cost at 1, 10 and 100 boards

## Required columns
Reference designators, quantity, manufacturer part number, description, value,
tolerance, package, supplier, supplier part number, unit cost INR, extended
cost, lead time, status (in hand / ordered / needed), substitute part.

## Facts and figures this must carry
- Total board cost at quantity 1 and at quantity 100
- Long-lead items flagged with their lead time
- Every part marked in hand, ordered or needed, with no blanks
- The parts deliberately not bought, with the reason and what they would buy

## Acceptance
Every reference designator on the PCB appears exactly once. No "TBD" values.
Cost figures traceable to a supplier quote or listing captured in
`procurement-log.md`.

## What went wrong last year
There was no BOM in the repository at all. Cost claims had nothing behind them.
