# Acoustic exposure

## Position

SeaNergy's table demonstration is not an acoustic exposure hazard when operated
with the transducers submerged, the tank exclusion boundary in place and the
configured pulsed duty cycle. The conclusion applies to the bench/tank
configuration. It does not transfer the underwater payload's source-level design
figure to an air or table demonstration.

**Numerical basis:** Engineering projection for the final product configuration.

| Quantity | Bench / tank configuration | Underwater payload design |
|---|---:|---:|
| Band | 24 to 80 kHz | 100 to 500 kHz |
| Resonance | 40.2 kHz (T-01) | Selected within design band |
| Transmit current | 68.0 mA (T-11) | 340 mA peak |
| Complete range-ping energy | 0.93 mJ (T-11) | 46 mJ budget |
| Source level | Bench level | 196 dB re 1 microPa at 1 m |

The underwater source level is a payload design input used by
`WATER_CONFIG.sourceLevelDb` and the active-sonar equation. It is not the output
of the bench 40.2 kHz pair and is not used to classify tank exposure.

## Why the tank demonstration is controlled

The transmitter emits short, windowed bursts rather than a continuous tone.
The range waveform is 2.048 ms in the firmware bench configuration. At the
firmware default 1,000 ms mission period, its transmit-time duty factor is
0.2048%, derived as `2.048 ms / 1,000 ms * 100`. The complete bench range ping
contains 0.93 mJ (T-11). Submersion couples that pulse into water and the tank
boundary prevents a person placing an ear or hand next to the radiating face.

Window multiplication in `fill_block()` controls both pulse edges. If DMA fails,
`tx_task()` lowers transmit enable and the envelope marker before entering
`FAULT`. This prevents a software fault turning the intended burst into a
continuous emission.

## Operating controls

| Control | Requirement | Implementation |
|---|---|---|
| Coupling | Transmit only with the intended face submerged and secured | Tank fixture and pre-ping inspection |
| Separation | No body part inside the tank while armed or transmitting | Marked exclusion boundary and one operator controlling fire |
| Duty cycle | Use the configured ping interval; no continuous manual retrigger | Mission interval and guarded `PING_NOW`/`MISSION_ARM` commands |
| Edge control | Use a windowed waveform | `window_gain_q15()` in the DMA fill path |
| Fault response | Remove drive on timeout or critical error | `tx_task()` and GPIO 18 safe state |
| Observation | Watch current, energy, fault bitmap and state | INA226 telemetry and operator console |

## Stop conditions

Disarm and isolate power on unexpected audible artefact, visible cavitation,
transducer movement, abnormal current, heating, repeated fault state, damaged
cable, exposed face, or a person entering the tank boundary. Do not assess an
ultrasonic source by audibility; use the electrical state and the exclusion
control.

The complete wet-area procedure is in [Demo safety](demo-safety.md), and the
electrical interlocks are in [Electrical safety](electrical-safety.md).
