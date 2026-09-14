# safety

## Purpose
Failure modes, electrical safety, and the acoustic exposure question. Directly
answers the PS clause about protecting the hardware.

## Files that must exist
- `fmea.pdf` — **3 to 4 pages**, the failure mode table
- `electrical-safety.md`
- `acoustic-exposure.md`
- `demo-safety.md` — water near mains, battery handling, spill containment

## FMEA columns
Failure mode, cause, effect, severity, likelihood, detection, mitigation, and
where the mitigation is implemented.

## The failure modes that must appear
Transducer disconnected during transmit, sensor reading out of range, brown-out
mid-pulse, DC across the piezo from a firmware fault, receive chain exposed to
the transmit pulse, water ingress, thermal runaway in the driver, and battery
over-discharge.

## Mitigations that must be traceable to hardware
Back-to-back diode limiter, DC blocking capacitor, windowed envelope, reverse
polarity protection, resettable fuse, TVS, watchdog with a defined safe state.

## Facts this must carry
- Peak drive voltage and current at the transducer
- Battery chemistry, capacity and protection method
- A stated position on acoustic output level and why it is not a hazard at
  these powers in a tank

## Acceptance
Every mitigation names the component or code path that implements it. An FMEA
with mitigations that exist only on paper is worse than none.
