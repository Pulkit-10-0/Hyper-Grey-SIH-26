# SeaNergy Rev A PCB stack-up

Document ID: HW-PCB-001  
Board target: 100 x 80 mm, 4 layers, 1.60 mm finished thickness, FR-4 Tg >=150 degC.

| Layer | Function | Copper | Dielectric target to next layer |
|---|---|---:|---:|
| L1 F.Cu | Components, short digital/analog signals, controlled placement zones | 35 um / 1 oz | 0.18 mm prepreg target |
| L2 In1.Cu | Continuous ground reference; local AGND top pour joins at DAC star | 35 um / 1 oz | 1.00 mm core target |
| L3 In2.Cu | +3V3, +5V and filtered analog-power regions | 35 um / 1 oz | 0.18 mm prepreg target |
| L4 B.Cu | Low-speed sensors, control and secondary routing | 35 um / 1 oz | solder mask |

Manufacturing rules: 0.15 mm minimum trace/space, 0.30 mm drill with 0.60 mm pad minimum, 0.25 mm edge clearance, ENIG target finish, green solder mask.

A four-layer board is selected because the multi-megasample converter bus, clock edges, mixed-signal return paths and driver currents need continuous reference and power planes. On two layers, routing density would force long return detours beside the analog front end.

Controlled impedance: 50 ohm single-ended is a routing objective for clock/critical edges only. The final width is NOT specified until the selected fabricator supplies its dielectric stack and field-solver result.
