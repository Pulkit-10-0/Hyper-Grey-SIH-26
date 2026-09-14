# timeline

## Purpose
What was done when. Evidence of process, and useful for the build itself.

## Files that must exist
- `timeline.md` — milestones with dates
- `build-log.md` — dated entries, what was tried, what happened
- `decisions.md` — the architecture decision record

## What `decisions.md` must hold
One entry per significant decision: context, options considered, what was
chosen, and why. The decisions worth recording here:

- ESP32-S3 over STM32 or FPGA, with the trade study
- R-2R parallel DAC over the SPI DAC, with the settling-time calculation
- Dropping Bluetooth from the app build and why the interface still exists
- Dark instrument UI over the earlier light theme
- The design margin rule that makes the solver move downband
- Keeping the physics as a guard over the learned model

## Acceptance
A judge asking "why did you choose the S3?" gets a written answer with numbers,
not an opinion. A decision record with rejected options in it is far more
convincing than one listing only what was picked.
