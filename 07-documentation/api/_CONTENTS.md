# api

## Purpose
Interface documentation for anything another program talks to.

## Files that must exist
- `ble-gatt.md` — the frozen protocol, mirrored from the firmware docs
- `csv-schema.md` — exported session format, column by column
- `core-api.md` — the physics and DSP module surface, with units
- `examples/` — a worked example per interface

## What each entry needs
Name, direction, units, valid range, scaling, and what happens on an invalid
value. Byte offsets and widths for anything on the wire.

## Facts this must carry
- Packet layouts with offset, width, type, unit and scale factor
- Every GATT characteristic with UUID, properties, size and update rate
- The version byte rule: a mismatch is refused, never guessed at
- CSV column list matching the app's actual export

## Acceptance
Somebody can write a client against this without reading the source. That is
the only test that matters.

## What went wrong last year
`api-docs/` contained a readme with no API in it.
