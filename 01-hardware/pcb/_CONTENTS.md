# pcb

## Purpose
Everything a fabricator needs, plus the evidence that the layout was thought
about rather than auto-routed.

## Files that must exist
- `seanergy.kicad_pcb` and the project
- `gerbers/` — zipped, exactly as sent to the fab
- `drill/` — drill files
- `pick-and-place.csv`
- `pcb-render-top.png` and `pcb-render-bottom.png` — 3D
- `stackup.md` — layer stack with dielectric and copper weights
- `layout-notes.md` — the reasoning
- `fab-order.txt` — vendor, process, date, cost, board revision

## Layout decisions that must be written down
- Four layers, and why two is not enough for a multi-megasample bus beside an
  analog front end
- Analog and digital ground pours, joined at one point, and where that point is
- R-2R ladder placement and return path length
- Switching regulator kept away from the converter and preamp
- Test point locations and what each one exposes
- Protection: reverse polarity, fuse, TVS, T/R limiter

## Facts and figures this must carry
- Board dimensions, layer count, copper weight, minimum trace and via
- Impedance target on the parallel bus if controlled
- Component count and board cost per unit at quantity 5

## Acceptance
DRC clean. Gerbers open correctly in an independent viewer. Silkscreen carries
the revision, the date and a block diagram with signal-flow arrows.
