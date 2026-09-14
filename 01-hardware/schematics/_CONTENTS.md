# schematics

## Purpose
The actual electrical design, in a format an engineer can open and check.

## Files that must exist
- `seanergy.kicad_sch` and the full KiCad project
- `schematic.pdf` — **4 to 6 sheets**, one subsystem per sheet
- `netlist.net`
- `erc-report.txt` — electrical rules check, clean or with each waiver explained

## Sheet breakdown
1. Power tree: battery, protection, buck, analog LDO, rails annotated with current
2. MCU and digital: ESP32-S3 module, USB, boot and reset, parallel DAC bus
3. Conversion: MCP4921 path and the R-2R ladder, receive ADC
4. Analog front end: reconstruction filter, driver, matching network, T/R limiter
5. Sensors and interfaces: 1-Wire, I2C bus with addresses, ADC inputs, pot rail gating
6. Connectors and test points

## Facts and figures this must carry
- Every net named. No auto-generated net labels on signal paths.
- Rail currents annotated per branch
- I2C addresses listed on the sheet
- Test point numbers matching the silkscreen
- Component values with tolerance where it matters (0.1 percent on the ladder)

## Acceptance
ERC passes or every waiver is written down with a reason. A stranger can trace
the transmit path from MCU pin to transducer without asking a question.

## What went wrong last year
`schematics/` contained a Python script that drew a diagram. That is not a
schematic. It cannot be checked, netlisted or fabricated.
