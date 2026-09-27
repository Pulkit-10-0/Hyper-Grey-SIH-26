# Layer stack — AUV V3 Compact Revision B

Two copper layers. **Two is the right number for this board**, and the reasoning
is worth writing down because the earlier Rev A study specified four.

| Layer | Name | Copper | Purpose |
|---|---|---|---|
| 1 | F.Cu | 35 µm / 1 oz | Signal routing, front ground zone |
| — | FR-4 core | 1.6 mm nominal finished thickness | |
| 2 | B.Cu | 35 µm / 1 oz | Signal routing, back ground zone |

Non-copper layers: F.Mask, B.Mask, F.Silkscreen, B.Silkscreen, F.Paste,
Edge.Cuts. **Mask, paste and silkscreen add no copper.**

## Why two layers, not four

Four layers buy a continuous reference plane and controlled impedance. This
board needs neither.

- **Nothing here is a transmission line.** The fastest edges on the board are
  I²C at standard speed, I²S at audio rates and a 40 kHz gate drive. At those
  frequencies a 100 mm trace is an electrically short lump of copper, not a
  line with a characteristic impedance worth controlling. The manufacturing
  notes state controlled impedance as **not required** for exactly this reason.
- **There is no high-speed parallel bus.** The parallel converter bus that made
  four layers necessary in the Rev A study is not on this board; conversion
  happens in two ADS1115 modules over I²C.
- **The ground is still solid.** Each copper layer carries a filled GND zone, so
  every signal has a return path directly beneath or above it. Six vias in the
  entire board means the return path is almost never interrupted.
- **Two layers halve the fabrication cost** and, at the 100 × 100 mm tier, put
  the board inside the cheapest bracket most vendors offer.

The cost of the choice is routing density, and that is what the 66.7 % area
reduction from Rev A was spent on: 483 track segments and 6 vias fit into
10,000 mm² without a single DRC violation.

## Trace widths as routed

| Net class | Width |
|---|---|
| External 5 V (`EXT5V`, `EXT5V_IN`) | 1.00 mm |
| Speaker pair (`SPK_P`, `SPK_N`) | 0.80 mm |
| 3.3 V distribution (`RX3V3`, `TDS_VCC`, `TURB_VCC`, `MAIN3V3` bulk) | 0.60 mm |
| Signals, and the fine-pitch U3 supply escapes | 0.30 mm |
| Ground | 0.30 mm spokes into 1.00 mm and the zones |

Design clearance 0.25 mm throughout. Vias 0.80 mm copper on a 0.40 mm drill.

Wiring pads for the external modules: 1.00 mm plated drill, 2.00 mm copper pad,
2.54 mm pitch.

## Ground

Two zones, one per layer, both GND. There is no split analog/digital pour and
therefore no star point to specify: the sensor front end sits behind 2:1
dividers, TMUX1511 isolation and series 1 kΩ limiting, and the converters are
modules with their own local decoupling.

`J17` pad 3 connects **directly** to its ground plane rather than through the
usual thermal relief. Nearby routing left room for only one spoke, so the direct
connection was used and verified by DRC. It needs a little extra heating time
during hand soldering; the assembly guide says so at the step.

## Mounting

Four 3.20 mm **non-plated** holes, centres at (4, 4), (96, 4), (96, 96) and
(4, 96) mm from the top-left corner. They are mechanical and are not connected
to ground. M3 screws, with heads and washers no larger than 7 mm outside
diameter — anything wider approaches the J5 pads.
