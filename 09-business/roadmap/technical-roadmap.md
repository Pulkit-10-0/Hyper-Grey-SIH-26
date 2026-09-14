# Technical roadmap

## Stage 1: submission system

- ESP32-S3 fixed-point DDS and deterministic ping-pong DMA.
- Environment-aware solver with voltage, current, duty-cycle, timing and sonar-margin guards.
- R-2R bench output, local telemetry, mobile interface and reproducible validation dossier.
- Target proof: deterministic waveform selection and execution trace at low per-ping energy.

## Stage 2: integrated tank unit

- Rev-B PCB with separated analog, digital and power returns.
- Differential line driver and protected transmit/receive switching.
- Sealed bench enclosure, cable glands, transducer mount and repeatable tank geometry.
- Automated calibration table for output amplitude, frequency and sensor offsets.
- Target proof: repeatable transmitted pressure and received echo timing across water conditions.

## Stage 3: 100 W acoustic transmitter

- Full-bridge Class-D stage from a 24 V nominal supply, current-limited to the transducer design envelope.
- Ferrite transformer selected from measured transducer impedance and duty cycle.
- Fast MOSFET or relay-assisted T/R switch with blanking, clamp and receiver recovery measurement.
- Hardware overcurrent, overtemperature, undervoltage and watchdog shutdown independent of software.
- Aluminium heat spreader, temperature telemetry and a burst-duty thermal model.
- Airmar P66 50/200 kHz, 600 W transducer as a purchasable integration reference; interface characterization precedes drive-level increase.
- Target proof: 100 W electrical burst operation, stable switching, controlled recovery and calibrated acoustic output.

## Stage 4: calibrated receive and field payload

- Low-noise receive chain with programmable gain, anti-alias filtering and synchronized ADC capture.
- HBK Type 8103 or equivalent calibrated reference hydrophone for absolute pressure measurement up to the required band.
- Pressure-rated housing, wet-mate or field-serviceable connectors, corrosion control and strain relief.
- Time synchronization, GNSS/vehicle timestamp bridge and export to survey/vehicle software.
- Target proof: absolute source-level evidence, repeatable range/echo metrics and vehicle integration.

## Stage 5: production readiness

- Design-for-manufacture PCB, controlled substitutions and end-of-line calibration fixture.
- Environmental screening, ingress checks, burn-in, serial-number traceability and signed firmware releases.
- Installation manual, field replacement procedure, spares kit and service-level policy.
- Target proof: repeatable build yield, bounded calibration time and documented acceptance criteria.

## Claims unlocked by stage

| Stage | Evidence-backed claim |
|---|---|
| Submission | Embedded adaptive waveform decision and deterministic synthesis |
| Integrated tank | Repeatable water-coupled transmit and echo timing |
| 100 W | High-power protected acoustic burst operation |
| Calibrated field payload | Absolute acoustic output and operational integration |
| Production | Manufacturing repeatability, traceability and supportability |

