# Rev A preliminary concept archive

**Superseded. Not for fabrication.** This folder preserves the early wideband payload concept and its unfinished schematic/layout records.

## What is preserved

The native PCB has a **100 × 80 mm** outline and four declared copper layers, but no component footprints or routing. Its schematic is a labelled logical container rather than a wired design. The concept includes a parallel R-2R converter bus, MCP4921, OPA1652 front end and INA226 monitor.

| Folder | Contents and status |
|---|---|
| [schematics/](schematics/README.md) | Preliminary logical container; ERC not run |
| [pcb/](pcb/README.md) | Unrouted concept, stack-up and mechanical export previews; DRC not run, order on hold |
| [bom/](bom/README.md) | Historical concept parts assumptions |

## Current board and naming

Use [AUV V3 Compact Revision B](../README.md) for the current board: 100 × 100 mm, two routed copper layers, seven wired schematic sheets and stored zero-violation ERC/DRC checks. It remains an unbuilt prototype design.

The **200 × 150 mm, two-layer AUV V3 revision A** mentioned in the compact-board documentation is a different preceding layout, not the preliminary concept archived here. The [compact equivalence report](../kicad/verification/compact_equivalence.json) records its 66.7% area reduction to Rev B with the same 91 references. Do not apply that comparison to this 100 × 80 mm concept.

Do not submit anything in this archive for fabrication or combine its exports with Rev B Gerbers/drills. The current purchase list is in [bom/](../bom/README.md), and current manufacturing guidance is in [pcb/](../pcb/README.md).
