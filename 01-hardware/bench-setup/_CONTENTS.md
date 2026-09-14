# bench-setup

## Purpose
The physical test rig, documented so a result can be reproduced.

## Files that must exist
- `bench-setup.md` — the rig, with a labelled photograph
- `water-tank.md` — tank dimensions, fill, salinity preparation, target plate
- `instrument-settings.md` — scope, generator and meter settings per test
- `transducer-characterisation.md` — impedance sweep and resonance measurement
- `photos/`

## Facts and figures this must carry
- Tank internal dimensions and water volume
- Salinity recipe: grams of salt per litre, and the measured conductivity
- Turbidity recipe: grams of kaolin per litre, and the measured NTU
- Transducer resonant frequency, clamped capacitance, and the matching inductor
  value calculated from it
- Target plate material, size and standoff distance
- Ambient acoustic noise floor measured in the room

## Acceptance
Somebody in another lab could rebuild this rig from the document and expect the
same numbers. Every reagent is by mass, not by eye.

## Why this matters
Every claim in `05-validation` traces back to a setup described here. Without
it the results are anecdotes.
