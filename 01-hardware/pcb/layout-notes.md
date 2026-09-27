# Layout notes — AUV V3 Compact Revision B

Why the board is arranged the way it is. The checks in `drc-report.txt` say the
layout is legal; this file says it was thought about.

## The brief

Rev A was 200 × 150 mm with generous spacing for hand assembly and large
labels. It worked, and it was twice the size it needed to be. Rev B keeps
**every one of the 91 references, the same circuit, the same external
connections and the same firmware**, and fits them into 100 × 100 mm — a 66.7 %
reduction in area.

Nothing was removed to achieve that. The parts were placed closer together and
the copper was routed again.

## Placement

- **Two controllers, two supplies.** The ESP32-S3 main/TX controller and the
  classic ESP32 receiver keep separate MAIN3V3 and RX3V3 rails with a shared
  ground, each powered through its own USB. They are placed on opposite sides of
  the board so neither USB cable crosses the other's analogue section.
- **Transmit away from receive.** The IRLZ44N, its AO3400A level translator and
  the TC4426AEPA gate driver are grouped together and kept away from the MCP6002
  receive amplifier. The transmitter switches amps into a piezo at 40 kHz; the
  receiver is looking for microvolts at the same frequency. Physical distance is
  the cheapest isolation available on a two-layer board.
- **Sensor front end behind its protection.** Each sensor input passes its 2:1
  divider, filter and TMUX1511 isolation switch before it reaches a converter
  pad, and the series 1 kΩ limiting resistors sit at the pad rather than at the
  connector, so a transient has the whole divider in front of it.
- **Wiring pads on the edges.** The external modules — displays, ADCs, audio,
  sensors — connect through labelled plated pads at 2.54 mm pitch, placed on the
  board edges so their wire bundles exit outward instead of crossing the board.

## Routing

483 track segments, **6 vias**, two ground-plane zones.

Six vias on a two-layer board of this density is the number worth noting. Every
via is a break in the return path under a signal, and keeping the count this low
means almost every trace runs over an uninterrupted plane on the other layer.
That is what makes two layers sufficient here; the reasoning is in
[`stackup.md`](stackup.md).

Supply traces are sized for their current rather than uniformly: 1.00 mm for the
external 5 V rails, 0.80 mm for the speaker pair, 0.60 mm for 3.3 V
distribution, 0.30 mm for signals. The only sub-0.30 mm copper is the fine-pitch
supply and ground escape from U3, which is short and immediately widens.

## The one deliberate irregularity

`J17` pad 3 connects **directly** to its ground plane instead of through a
thermal relief. Routing nearby left room for only one thermal spoke, and one
spoke is worse than none: it concentrates the heat path instead of spreading it.
The direct connection was chosen, checked by DRC, and flagged in the assembly
guide and the manufacturing notes so whoever solders it knows to give it extra
time.

## Test and rework

Most of the board is through-hole and hand-solderable. **Q2, U3 and F1 are
surface-mount**, and the BOM says so at the line item. Because the layout is
compact, the BOM also specifies body dimensions rather than just values: a part
with the right value and the wrong package will not fit.

The sensor supply selectors J14 and J15 are 1×3 headers that ship **with no
shunt fitted**. Choosing 3.3 V or 5 V before checking the module in hand is the
one mistake on this board that damages a sensor, so the default is
disconnected.

## Not included

No panelization, no V-scoring, no assembly order in the fabrication package.
There is no pick-and-place file: the board is hand-assembled, and the three
surface-mount parts do not justify a stencil run. `previews/Assembly.pdf`, in
[`../assembly/assembly-drawing.pdf`](../assembly/assembly-drawing.pdf), is the
top-view placement reference — print it at 100 % and verify the scale against
the board before using it as a template.
