# diagrams

## Purpose
Every figure used across the report, deck, website and README, kept in one
place with its source.

## Files that must exist
- `system-architecture.svg` and `.png`
- `signal-chain.svg`
- `firmware-tasks.svg`
- `power-tree.svg`
- `state-machine.svg`
- `pcb-domains.svg`
- `sources/` — editable originals
- `figure-index.md` — figure number, filename, where used

## Standards
- Vector wherever possible; PNG exports at 2x for print
- Every arrow has a direction and a label carrying the interface and the payload
- Legend for line styles: electrical against acoustic, present against planned
- Readable in black and white

## The check that catches most errors
Trace every path end to end and confirm the arrow tails sit on the correct box.
Most diagram errors are a tail on the wrong block, not a missing arrow.

## Acceptance
No diagram contradicts another. The architecture diagram and the signal chain
agree on every stage name.
