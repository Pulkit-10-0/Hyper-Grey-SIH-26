# 01-hardware

The payload electronics: schematics, board, bill of materials, assembly, the
enclosure and the planned characterisation bench.

**Current board: AUV V3 Compact Revision B.** 100 × 100 mm, two copper layers,
91 components, KiCad 9.0.7. **Zero ERC violations, zero DRC violations, zero
unconnected items, zero schematic/PCB parity differences, no DRC exclusions.**
Design verification is complete; manufacturing files are included.

---

## Contents

| Folder | What is in it |
|---|---|
| [`kicad/`](kicad/) | **The design itself.** Complete KiCad project: seven schematic sheets, the board, local symbol and footprint libraries, 3D models, fabrication exports, verification reports and the firmware patch |
| [`schematics/`](schematics/) | The seven-sheet PDF, the exported netlist, the ERC result |
| [`pcb/`](pcb/) | Gerbers, drills, manufacturing notes, copper and silkscreen views, 3D render, the DRC result |
| [`bom/`](bom/) | Purchase BOM, per-reference BOM, the external modules list, cost model, procurement log |
| [`assembly/`](assembly/) | Current assembly and wiring guide, drawings and pin tables; older wideband procedures labelled separately |
| [`enclosure/`](enclosure/) | Hull section, seal design, print settings, dunk test |
| [`bench-setup/`](bench-setup/) | Planned tank, instrument settings and transducer characterisation; renders and diagrams |
| [`rev-a-preliminary/`](rev-a-preliminary/) | Earlier 100 × 80 mm, four-layer concept; superseded and not for fabrication |

Verification record: [`verification-summary.md`](verification-summary.md).
Release hashes: [`release-sha256.json`](release-sha256.json).

---

## Two revisions, and why both are here

| | Rev A preliminary | **Compact Rev B** |
|---|---|---|
| Board | 100 × 80 mm concept, 8,000 mm² | **100 × 100 mm, 10,000 mm²** |
| Copper layers | 4 planned | 2 routed |
| Schematic | A labelled container, not a wired design | Seven sheets, fully wired |
| ERC | **Not run** | **0 violations** |
| DRC | **Not run** | **0 violations** |
| Fabrication files | Mechanical preview only, explicitly not production | Fourteen files exported from the checked board |
| Status | Superseded | **Current** |

The archived preliminary concept is distinct from the preceding **AUV V3**
200 × 150 mm, two-layer layout. Compact Rev B reduces that AUV V3 layout
by 66.7% in area while retaining its circuit; the
[stored equivalence check](kicad/verification/compact_equivalence.json) records
that comparison. It is not a size comparison against the 100 × 80 mm concept.

Rev A's own files say `PRELIMINARY`, `NOT FOR FABRICATION` and `STATUS: NOT RUN`.
The files remain in [`rev-a-preliminary/`](rev-a-preliminary/) to document
the early architecture, with their unfinished status intact. Keep this archive
separate from the current manufacturing release. **Do not mix their files.**

---

## The board

One PCB carrying the ESP32-S3 main and transmit controller, a classic ESP32
receiver, two ADS1115 converters, four OLED displays, a DS18B20, the TDS and
turbidity modules, three potentiometers, a MAX98357A audio module, a speaker and
the 40 kHz transmit and receive elements.

| | |
|---|---|
| Outline | 100.00 × 100.00 mm, four 3.20 mm non-plated mounting holes |
| Stack | 2 copper layers, FR-4, 1.6 mm, 1 oz each side |
| Routing | 483 track segments, 6 vias, 2 ground-plane zones |
| Clearance | 0.25 mm design clearance, 0.30 mm nominal signal trace |
| Supplies | 1.00 mm external 5 V, 0.60 mm 3.3 V distribution, 0.80 mm speaker pair |
| Vias | 0.80 mm copper / 0.40 mm drill |
| Components | 91 footprints, 236 physical pins, 3 explicitly unconnected |
| 3D models | 56 references, all resolving to packaged local files |
| Impedance | Not controlled; nothing on this board needs it |

**The two controllers keep separate MAIN3V3 and RX3V3 supplies with a shared
ground**, each powered through its own USB. External regulated 5 V feeds the
transmitter, the audio module and optionally the sensor modules.

The transmit chain is an IRLZ44N driven through an AO3400A level translator and
a TC4426AEPA gate driver. The two inversions cancel, so GPIO HIGH still means
transmitter ON, retaining the historical companion sketch's output polarity. A 1 kΩ resistor
across the piezo gives it a discharge path.

Sensor inputs take the documented 0–5 V module range through 2:1 dividers, with
filtering, TMUX1511 powered-off isolation and MCP100 supply supervision. Series
1 kΩ resistors limit transient current into the ADC inputs.

The receiver keeps the MCP6002 reference follower and its nominal gain-23
amplifier, with a 100 Ω resistor separating the output from GPIO34.

---

## What the firmware has to know

The notes below describe the historical board companion sketch. Current firmware lives in [TX](../02-firmware/tx/) and [RX](../02-firmware/rx/). The imported TX expects five potentiometer inputs and reports the ADS1115 node voltages without the old TDS/turbidity divider compensation. See [current compatibility notes](../02-firmware/docs/architecture.md) before using it with this PCB.

The historical companion sketch retains the preceding AUV V3 circuit's
control assignments, with **one divider-compensation change**: the TDS and turbidity ADC voltages are multiplied by two to undo the
new 2:1 input dividers. Potentiometer voltages and the transmit GPIO phase are
untouched.

That change is a four-line patch, not a rewrite:
[`kicad/firmware/main_cpp_sensor_dividers.patch`](kicad/firmware/main_cpp_sensor_dividers.patch),
with the original source hashes in
[`kicad/firmware/source_change_record.json`](kicad/firmware/source_change_record.json).

The console app's expected payload interface is specified in
[`../07-documentation/api/console-link.md`](../07-documentation/api/console-link.md).
The current TX/RX projects do not implement that NDJSON interface.

---

## Before ordering

Read [`pcb/manufacturing-notes.md`](pcb/manufacturing-notes.md) first. Two things
in it will cost money if they are missed:

1. **The cut path is 100.00 × 100.00 mm.** KiCad's job summary may say
   100.05 × 100.05 because its bounding box includes the 0.05 mm outline stroke.
   Check that the fabricator quotes from the outline and not from the stroke,
   or a 100 × 100 service tier turns into the next one up.
2. **Use `pcb/gerbers/AUV_V3_RevB_Compact_Gerbers.zip`.** Not the loose files
   beside it, which are the same exports unzipped for inspection, and never
   anything from `rev-a-preliminary/`.

Mounting hardware: M3, with screw heads and washers **no larger than 7 mm
outside diameter**. Anything wider approaches the J5 pads.

---

## Assembly notes

The sensor supply selectors J14 and J15 ship with **no shunts fitted**. Choose
3.3 V or 5 V only after checking the actual module in hand. The staged
first-power and waveform checks are in
[`assembly/assembly-and-wiring.md`](assembly/assembly-and-wiring.md).

J17 pad 3 connects directly to the ground plane — nearby routing left room for
only one thermal spoke — so allow extra heating time when soldering it.
