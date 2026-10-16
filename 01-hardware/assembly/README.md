# Assembly and wiring

Start with [assembly-and-wiring.md](assembly-and-wiring.md) for the current **AUV V3 Compact Revision B** PCB. It documents the separate controller supplies, external module wiring, sensor divider protection and staged first-power checks. The design-checked release includes the drawings, connection tables and build sequence below.

| Resource | Use |
|---|---|
| [Assembly and wiring guide](assembly-and-wiring.md) / [HTML](assembly-and-wiring.html) | Current Rev B build reference |
| [Assembly drawing](assembly-drawing.pdf) | Placement; verify print scale before use as a template |
| [Connector wiring](connector-wiring.csv) | External connections by connector and pad |
| [Component pin table](every-component-pin.csv) | Physical pin and net cross-check |
| [Visual register](photos/README.md) | Assembly illustrations and provenance register |

The older [bring-up procedure](bring-up-procedure.md), [soldering notes](soldering-notes.md), [test-point notes](test-points.md) and `assembly-guide.pdf` include the earlier proposed converter/driver architecture. Their 9 V, DAC, bridge and numbered-test-point instructions must not be applied to Rev B without reconciliation with its native schematic. The current guide above takes precedence for this board.

Before using current imported firmware, read the [TX/RX compatibility notes](../../02-firmware/docs/architecture.md): the present TX has five analog controls, whereas this PCB snapshot routes three.

[Hardware overview](../README.md)
