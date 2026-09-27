# AUV V3 Compact Revision B — bare-board manufacturing notes

**Release status: compact revision B prototype fabrication package.** Final ERC and DRC report zero violations, zero unconnected items and zero schematic/PCB parity differences, with no DRC exclusions. Fourteen fabrication files were exported from the checked PCB. Use this package's final Gerbers and drills together with its verification reports and release hashes. The board has not been physically built or tested.

| Item | Specification |
| --- | --- |
| Outline | 100.00 × 100.00 mm rectangle; use Edge.Cuts Gerber |
| Board construction | 2 copper layers, FR-4, 1.6 mm nominal finished thickness |
| Copper | 35 micrometres / 1 oz nominal on each outer layer |
| Solder mask | Both sides; green suggested |
| Silkscreen | White; functional labels on front |
| Surface finish | Lead-free HASL or ENIG |
| Controlled impedance | Not required |
| Design copper clearance | 0.25 mm |
| Signal trace width | 0.30 mm nominal |
| Main external 5 V traces | 1.00 mm nominal |
| 3.3 V distribution | 0.60 mm nominal; fine-pitch supply escapes may be narrower |
| Speaker pair traces | 0.80 mm nominal |
| Through vias | 0.80 mm copper diameter / 0.40 mm drill |
| Wiring-pad holes | 1.00 mm plated drill, 2.00 mm copper pad, 2.54 mm pitch |
| Mounting holes | Four 3.20 mm non-plated holes; centres (4,4), (96,4), (96,96), (4,96) mm from top-left |
| Electrical test | Request the fabricator's standard bare-board net test |

The mounting holes are mechanical, non-plated and not connected to ground. Use M3 screw heads and washers no larger than **7 mm outside diameter**, matching the reserved mounting area; oversized washers could approach the J5 pads. All positive supplies remain separate nets as shown in the schematic. The board has two GND-plane zones, one on each copper layer. J17 pad 3 is connected directly to its GND plane: nearby routing allowed only one thermal spoke, so a direct connection was used and verified by DRC. This pad may need a little extra heating time during hand soldering; see the assembly guide.

The cut-path centreline is **100.00 × 100.00 mm**. KiCad's job summary may report 100.05 × 100.05 mm if its bounding box includes a 0.05 mm outline drawing stroke; manufacture along the outline centreline. When requesting a nominal 100 × 100 mm service tier, verify that the fabricator interprets the outline rather than charging from the stroke-inclusive bounding box.

## File interpretation

- `.gtl` / `.gbl`: front / back copper — these are the two conductive layers.
- `.gts` / `.gbs`: front / back solder mask openings.
- `.gto` / `.gbo`: front / back silkscreen. The back silkscreen may be empty.
- `.gtp`: front paste openings for the surface-mount parts; a stencil is optional for hand assembly.
- `.gm1`: board outline (Edge.Cuts).
- `-PTH.drl`: plated component holes and vias.
- `-NPTH.drl`: non-plated mounting holes.
- `-drl_map.svg`: drill reference drawings, not additional copper layers.
- `.gbrjob`: Gerber job/layer information.

Mask, paste, silkscreen and mechanical files do not add copper layers. All drill coordinates and Gerbers use the same origin. Do not mirror, scale, offset or merge the plated/non-plated holes manually. No panelization, V-scoring or assembly order is included.

## Review before submitting

Use **AUV_V3_RevB_Compact_Gerbers.zip** from the compact package. In the fabricator's viewer, verify the 100 × 100 mm outline, two copper layers, four non-plated mounting holes and front labels. The selected fabricator must accept the actual files and settings. Do not combine them with revision A's 200 × 150 mm files.

This package describes the bare PCB. The electronics BOM and assembly instructions are in docs/. External ESP32 boards and sensor/display/ADC/audio modules are wired to functional pads; they are not fabricated as part of this board. The requested dimensions cover this PCB only. Allow room for external modules, component height and wire exits. The electrical design remains an unmeasured prototype.
