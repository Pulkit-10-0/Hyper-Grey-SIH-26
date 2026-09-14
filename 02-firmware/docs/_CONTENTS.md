# docs

## Purpose
How the firmware works, for somebody who has to change it.

## Files that must exist
- `architecture.md` — task map, core assignment, priorities, stack sizes
- `timing.md` — the per-ping timing budget, stage by stage, in microseconds
- `ble-gatt-spec.md` — the frozen protocol: UUIDs, packet layouts, opcodes
- `memory-map.md` — SRAM, PSRAM and flash usage, with buffer sizes
- `state-machine.md` — the transmit state machine, with a diagram
- `build-and-flash.md` — including the offline flash path

## Facts and figures this must carry
- Every packet field with offset, width, type, unit and scaling
- Timing budget with measured values, not design targets
- Buffer sizes in bytes and the sample rate they support
- Interrupt priorities and worst-case latency
- The magic word that guards mission mode entry

## Acceptance
The GATT spec is complete enough that the app team can build against it with
zero conversation. Timing numbers are measured, and say so.

## Why this is separate from src
Firmware and app are built in parallel by different people. This folder is the
contract between them.
