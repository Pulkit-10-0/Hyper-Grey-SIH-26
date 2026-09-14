# Decision record

## D-01: ESP32-S3 rather than STM32 or FPGA

**Decision:** Use ESP32-S3 for the submission system.

**Reason:** It supports the existing firmware path, deterministic DMA, fixed-point control, local connectivity and a low INR bill of materials. STM32 remains a migration option for tighter mixed-signal control; FPGA enters only when channel count or sample timing exceeds the microcontroller envelope.

## D-02: Parallel R-2R output rather than SPI DAC

**Decision:** Use the documented parallel R-2R path for the bench signal chain.

**Reason:** Parallel updates align with the deterministic sample schedule and expose timing clearly. A production revision can adopt a dedicated high-speed DAC after amplitude, linearity, noise and channel requirements are frozen.

## D-03: Retain the mobile interface, remove Bluetooth from the critical path

**Decision:** Keep the operator interface and telemetry contract but run the primary demonstration through the most reliable local link.

**Reason:** The product value is adaptive decision visibility, not a specific radio. The mobile application remains part of the system while Bluetooth pairing cannot block the live flow.

## D-04: Dark operator UI

**Decision:** Use the established dark, instrument-style UI.

**Reason:** It supports high-contrast plots, low-light operation and continuity with the existing application. Printed and submission material uses light backgrounds for legibility.

## D-05: Solver down-band margin

**Decision:** Require explicit margin before the solver selects a higher-frequency candidate when environmental attenuation increases.

**Reason:** This prevents small score differences from creating unstable frequency jumps and preserves acoustic and energy headroom.

## D-06: Physics guard over learned model

**Decision:** A learned surrogate may rank candidates but cannot authorize transmission.

**Reason:** Electrical, timing, memory, duty-cycle and sonar-margin constraints are deterministic release gates. An invalid proposal falls back to the safest feasible waveform and records the reason.

## D-07: INR-first commercial model

**Decision:** Present price, COGS, market and IP budgets in INR; show USD only at the source conversion line.

**Reason:** The target programmes and procurement decisions are Indian. The workbook uses INR 95.7245 per USD from the 11 September 2026 RBI reference-rate archive and keeps FX editable.

## D-08: Disclosure hold through 25 September

**Decision:** Patent-sensitive implementation detail remains controlled until the filing receipt is archived.

**Reason:** The provisional filing gate preserves the strongest available priority position before unrestricted competition publication.

