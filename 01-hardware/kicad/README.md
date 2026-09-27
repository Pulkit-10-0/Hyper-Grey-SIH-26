# AUV V3 combined PCB — Compact Revision B

This is one **100 × 100 mm, two-layer PCB** for the ESP32-S3 main/TX controller, classic ESP32 DevKit receiver, two ADS1115 modules, four OLED displays, DS18B20, TDS/turbidity modules, three potentiometers, MAX98357A audio module, speaker and ultrasonic TX/RX elements.

**The original board already used two layers.** Revision B reduces its outline by placing the components and solder pads closer together and routing the copper again. It retains all 91 board references, the same circuit, external connections and firmware.

| | Revision A | Compact Revision B |
| --- | --- | --- |
| Board size | 200 × 150 mm | 100 × 100 mm |
| Board area | 30,000 mm² | 10,000 mm² — 66.7% smaller |
| Copper layers | 2 | 2 |
| Connections | Labelled plated solder pads | Same functional pad connections |
| Existing modules | Wired externally | Wired externally |

The larger first layout provided generous spacing for hand assembly and labels. The compact board fits those same connections into a smaller area. The existing controllers and modules still connect by wires to labelled plated solder pads; secure those external modules separately. The **100 × 100 mm size applies to this PCB**, not to the complete collection of ESP32 boards, displays, sensors and their wiring.

## Open and use

1. Extract **AUV_V3_RevB_Compact_Complete_KiCad.zip** into one folder. Keep its libraries and 3dmodels folders alongside the project.
2. Open **AUV_V3_Combined.kicad_pro** in **KiCad 9.0.7 or later**. Use its schematic and PCB editors to inspect or edit the design.
3. Read **docs/Assembly_and_Wiring.md** or its printable HTML version before fitting parts or connecting modules. Each solder pad, component and test point is listed there.
4. Use **docs/BOM_purchase.csv** to purchase board components. Existing modules are listed separately. Most parts are through-hole; Q2, U3 and F1 are surface-mount. Match the specified body dimensions because the layout is compact.
5. Use the final **AUV_V3_RevB_Compact_Gerbers.zip** for bare-board manufacture, together with **fabrication/Manufacturing_Notes.md**. Use revision B files throughout; do not mix revision A copper or drill files with revision B.

The native schematics, PCB, project settings, local symbol library, footprint libraries and referenced 3D models are included. Standard KiCad library licensing and provenance are preserved in the libraries folder. The 3D preview uses generic package models; DIP sockets may be drawn without the inserted IC bodies.

## Circuit and firmware

- The two controllers retain **separate MAIN3V3 and RX3V3 supplies**, with a shared ground. Power each ESP32 through its own USB. External regulated 5 V powers TX, audio and optionally the sensor modules.
- TX uses the IRLZ44N, an **AO3400A level translator and TC4426AEPA gate driver**. The two inversions retain GPIO HIGH = transmitter ON. A 1 kΩ resistor across the piezo provides its discharge/reset path.
- Sensor inputs accept the documented **0–5 V output range** through 2:1 dividers, filtering, TMUX1511 powered-off isolation and MCP100 supply supervision. Series 1 kΩ resistors limit brief ADC-input transient current.
- The supplied **firmware/ESP32-S3** source is the same as revision A: only the TDS and turbidity ADC voltages are multiplied by two to compensate for those dividers. Potentiometer voltages and TX GPIO phase are unchanged. The retained Rev A comments in the source refer to this unchanged circuit. Original source files were not edited.
- RX preserves the MCP6002 reference follower and nominal gain-23 amplifier. A 100 Ω resistor separates its output from GPIO34. Its finite bandwidth and physical wiring affect the measured 40 kHz response.

## Validation and scope

**The compact revision B passes the final checks:** zero ERC violations, zero DRC violations, zero unconnected items and zero schematic/PCB parity differences, with no DRC exclusions. All 91 footprints and 236 physical pins, including 3 intentionally unconnected pins, agree with the design. The board contains 483 routed track segments, 6 vias and 2 ground-plane zones across its two copper layers. All 56 model references resolve to packaged local 3D files. The seven-page schematic PDF carries revision B on every sheet. Fourteen fabrication files were exported from the checked PCB; the supplied verification reports and SHA-256 hashes identify the release.

These are prototype design files. No board has been manufactured, assembled, electrically measured, calibrated or tested underwater. KiCad checks establish design consistency and geometric clearances, not measured receiver performance or compatibility with an unidentified module variant.

J17 pad 3 connects directly to the GND plane and may require a little extra heating time during soldering; the assembly guide explains the connection.

The requested 100 × 100 mm outline is used. Use M3 mounting screw heads and washers no larger than 7 mm outside diameter; oversized washers could approach J5. Allow additional enclosure space for mounted component height, wire bends and the separately secured external modules. Before connecting modules, confirm their functional pin labels and supply requirements, and check the ESP32-S3 regulator's current budget. Sensor supply selectors initially have no shunts; select 3.3 V or 5 V only after checking the actual module. The assembly guide contains staged first-power and waveform checks.

## Included review files

- **AUV_V3_Combined_Schematic.pdf** — native schematic export.
- **previews/Assembly.pdf** — top-view assembly drawing; print at 100% and verify its scale before using it as a physical template.
- **previews/Board_3D.png** — package and placement preview.
- **previews/Front_Copper.svg** and **Back_Copper.svg** — copper views.
- **verification/** — revision B electrical, PCB and consistency checks, and export hashes.
- **docs/** — assembly guide, complete pin tables, BOM and existing-module list.
- **firmware/** — the existing source copy, exact patch and original-source hashes.

After any circuit or layout change, update both the schematic and PCB as needed, refill copper zones, rerun ERC/DRC with schematic parity, then regenerate fabrication outputs. Do not reuse older Gerbers after changing the board.
