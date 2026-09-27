# Revision B compact verification record

KiCad 9.0.7 was used for the native schematic, PCB, rule checks and manufacturing exports.

| Check | Result |
| --- | --- |
| Schematic ERC | 0 violations |
| PCB DRC, all severities and all track errors | 0 violations |
| Unconnected PCB items | 0 |
| Schematic/PCB parity | 0 differences |
| Physical component references and footprints | 91 matched |
| Connected physical pins versus native schematic netlist | 233 matched |
| Explicit no-connect pins | 3 matched |
| Model references | 56 resolved to packaged files |
| Original source firmware | Hash unchanged |

The 100 × 100 mm PCB has two copper layers and two filled GND zones. Short 0.30 mm traces provide the fine-pitch U3 supply and ground escapes; the rest of the 3.3 V distribution uses 0.60 mm traces. J17 pad 3 has a direct ground-plane connection because nearby tracks leave only one thermal spoke; allow extra heating time when soldering this pad. The circuit and firmware match Revision A; placement, routing and mounting-hole positions changed.

The electrical audit compares the actual PCB pad nets with KiCad's exported native schematic netlist. The supplied machine-readable reports retain the detailed counts, versions and timestamps. No DRC exclusions were used to hide violations. Manufacturing exports were generated from this checked board; release-sha256.json records the board, schematic and export hashes.

These checks do not measure the hardware. Firmware was checked by exact source comparison; no successful firmware toolchain build is claimed. The board has not been fabricated, assembled, calibrated, acoustically measured, tested for EMC or tested underwater. Actual module power ratings, physical pin functions, enclosure fit and the regulator budget remain assembly checks described in the guide.
