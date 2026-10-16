# Compact Rev B design verification

The stored KiCad 9.0.7 reports record zero ERC/DRC violations, zero unconnected items and zero schematic/PCB parity differences for the exported board, with no DRC exclusions.

- [Verification_Summary.md](Verification_Summary.md): readable design-check summary.
- [final-verification.json](final-verification.json): consolidated counts and checks.
- [schematic-erc.json](schematic-erc.json), [pcb-drc.json](pcb-drc.json): native rule-check reports.
- [schematic.net.xml](schematic.net.xml): netlist used in connectivity checks.
- `schematic_*_check.json` and `schematic_*_review.json`: contract, path and export reviews.
- [compact_equivalence.json](compact_equivalence.json), [compact_visual_review.json](compact_visual_review.json): compact-layout comparison and review.
- [release-sha256.json](release-sha256.json): release snapshot hashes.

The stored design-verification records cover rule checks, connectivity, layout equivalence and release provenance. Follow the [KiCad guide](../README.md) when changing and regenerating the design.

[Hardware overview](../../README.md)
