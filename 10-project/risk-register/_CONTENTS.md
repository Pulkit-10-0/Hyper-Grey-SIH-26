# risk-register

## Purpose
What can go wrong between now and the finale, and what was decided in advance.

## Files that must exist
- `risk-register.xlsx` or `.md`
- `contingency.md` — the decided fallback per risk

## Columns
Risk, category, likelihood, impact, mitigation, owner, trigger, fallback,
status.

## The risks that must appear
- Parallel bus does not reach the assumed sample rate
- Transducer resonance is not where the datasheet claims
- Venue oscilloscope lacks FFT or bandwidth
- A component fails the night before
- Firmware bricks with no internet to reinstall the toolchain
- Water near mains power at the booth
- Ambient acoustic noise at a loud venue
- Demo slot is six minutes, not twenty
- Panel has no acoustics background
- A team member is absent

## Rules
Each risk has a decided fallback, chosen now, not improvised on the day. Each
has a trigger that says when to switch to the fallback.

## Acceptance
Every high-impact risk has a fallback that has actually been tested. An
untested fallback is a wish.
