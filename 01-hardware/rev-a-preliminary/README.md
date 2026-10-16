# Rev A preliminary concept archive

**Superseded. Not for fabrication.** This folder preserves the early wideband payload concept, its architectural schematic and mechanical layout study.

## What is preserved

The native PCB defines a **100 × 80 mm** outline and four-layer concept stack. Its labelled architectural schematic captures the original logical blocks. The concept includes a parallel R-2R converter bus, MCP4921, OPA1652 front end and INA226 monitor.

| Folder | Preserved design records |
|---|---|
| [schematics/](schematics/README.md) | Architectural schematic and ERC status record |
| [pcb/](pcb/README.md) | Layout study, stack-up, mechanical previews and release-status records |
| [bom/](bom/README.md) | Historical concept parts assumptions |

## Current board and naming

Use [AUV V3 Compact Revision B](../README.md) for the current board: 100 × 100 mm, two routed copper layers, seven wired schematic sheets and stored zero-violation ERC/DRC checks.

The **200 × 150 mm, two-layer AUV V3 revision A** mentioned in the compact-board documentation is a different preceding layout, not the preliminary concept archived here. The [compact equivalence report](../kicad/verification/compact_equivalence.json) records its 66.7% area reduction to Rev B with the same 91 references. Do not apply that comparison to this 100 × 80 mm concept.

Do not submit anything in this archive for fabrication or combine its exports with Rev B Gerbers/drills. The current purchase list is in [bom/](../bom/README.md), and current manufacturing guidance is in [pcb/](../pcb/README.md).
