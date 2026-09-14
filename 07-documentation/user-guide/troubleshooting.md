# Troubleshooting

Begin from a safe state: stop ping commands, leave mission mode with the
physical trigger, isolate the acoustic boundary and inspect status before
resetting. Do not bypass F1, D1, Q1 or the T/R limiter.

## Link and app

| Symptom or status | Meaning | Checks and action |
|---|---|---|
| `DOWN`, `No payload paired` | No connection has been selected | Power the pod, choose Telemetry and select Scan |
| `SCANNING`, `Searching for SEANERGY-xxxx` | Discovery is active | Keep phone close and wait for scan completion |
| `DOWN`, `No payload found in range` | Scan completed without the GAP name | Confirm payload is powered, not in mission mode and within radio range; scan again |
| `CONNECTING` does not reach `UP` | BLE connection or service discovery did not finish | Disconnect, move closer, power-cycle after safe shutdown and reconnect by service UUID |
| Link disappears immediately after mission arm | Expected mission behaviour | Press physical trigger to exit mission mode and restore BLE |
| Protocol version mismatch | Client and payload contracts differ | Refuse the packet. Use a version `1` client; never guess a layout |
| CRC error | Packet was corrupt or decoded with wrong byte order | Discard the record, retain the last valid telemetry, verify little-endian decoding and resubscribe |
| Command length error | Write was not exactly 20 B | Build the fixed packet in [BLE GATT](../api/ble-gatt.md) |
| No telemetry after ping | No completed ping notification arrived | Read the characteristic, compare sequence, then inspect state and DMA fault |
| Live field shows a dash | Telemetry does not supply a valid value | Inspect associated fault bit; do not use a simulation value as replacement |
| App shows `Render error` | A screen raised a runtime error | Record message and stack, then select Retry |

## Payload and solver

| Symptom or status | Meaning | Checks and action |
|---|---|---|
| Stays in `BOOT` | Driver initialisation did not complete | Isolate transmit, inspect 5.00 V and 3.30 V rails at TP03/TP04 and restart after correction |
| Stays in `ARMED` | Start timer or transmit task did not progress | Stop commands, reset once, inspect trigger/timer and watchdog record |
| `FAULT` after transmit | Critical driver error, normally DMA timeout | Read fault bitmap, isolate power and inspect DMA timing before reset |
| `BEST EFFORT` | No candidate clears full design margin | Do not arm mission; reduce required range or move to a suitable acoustic condition/configuration |
| `WITHIN MARGIN` changes often | Environment crossed a candidate boundary | Check sensor stability; the app re-solves after defined movement thresholds |
| Centre frequency falls as turbidity rises | Expected adaptive response | No action; scattering penalises high frequency |
| Pulse length rises before frequency falls | Expected adaptive response | No action; compression gain can preserve bandwidth first |
| Manual controls unavailable | Auto is selected or source is Telemetry | Use Simulation and set Wave to Manual |
| Scenario controls unavailable | Source is Telemetry | Use Simulation; telemetry environment is read-only |

## Fault bitmap

| Bit | Fault | Immediate action | Inspection path |
|---:|---|---|---|
| 0 | DMA timeout | Stop pinging and isolate transmit | `sonar_dma_transmit()`, 10 ms completion timeout, GPIO 47 and GPIO 3 traces |
| 1 | Sensor ADC | Do not use TDS/turbidity | ADS1115 at `0x48`, I2C SDA/SCL at TP15 and sensor connectors |
| 2 | Temperature | Do not use temperature-derived sound speed | DS18B20 presence on GPIO 4 and probe connector |
| 3 | INA226 | Stop energy-dependent operation | INA226 at `0x40`, TP17/TP18 shunt and I2C bus |
| 4 | OLED | Continue only from remote console | OLED power and shared I2C bus |
| 5 | Low battery | Disarm and power down | Pack condition, BAT_RAW/BAT_PROT and charger balance |
| 6 | Solver margin | Do not transmit proposed plan | Environment values, required range and active medium |
| 7 to 31 | Unknown/reserved | Stop automated operation | Record raw packet and use matching firmware documentation |

## Power and waveform

| Symptom | Checks and action |
|---|---|
| No protected battery voltage | Verify polarity at TP01, then F1 and Q1 at TP02 |
| Rail outside tolerance | Stop at the first failed rail; inspect U1/U2 and bypass parts before reconnecting the transducer |
| Unexpected current or heating | Disable transmit, inspect bridge dead time at TP11, shunt at TP17/TP18 and F1 |
| Transducer produces no return | Inspect connector/penetrator, current signature, resonance setting and physical alignment |
| Raw echo visible but no clean compressed peak | Confirm transmit replica, mode, window, sample rate and range scale; inspect saturation at TP13/TP14 |
| Receive trace clipped after transmit | Stop; verify D3 to D6 limiter and TP13 remains within plus or minus 0.30 V |
| Range offset varies with environment | Verify temperature, salinity and depth; range uses environment-derived sound speed |
| Endurance differs from earlier screen value | Pulse, amplitude or ping interval changed | Read the active values on Power; endurance recalculates on each solve |

## Water and enclosure

**Numerical basis:** Engineering projection for the final product configuration.

| Symptom | Action |
|---|---|
| Bubble, wet indicator, mass gain or reduced insulation | Isolate power without touching water, remove pod, dry exterior and open only in a dry area |
| O-ring pinched or twisted | Clean and refit both AS568-246 seals with compatible lubricant |
| Penetrator movement | Remove payload from service and re-seal to manufacturer torque |
| Spill outside bund | Use dry-side isolator/RCD, keep people clear, contain and recover water, then inspect equipment |

Water-tank validation records 0 mL visible ingress after 120 min at 1.5 m,
239 Mohm insulation resistance and 0.1 g mass change (T-16).

## Escalation record

Record the active mode, medium, payload state, link status, telemetry sequence,
fault bitmap, battery mV, current mA, energy microjoules, waveform parameters,
environment values, app build and firmware revision. Preserve the exported CSV
and relevant scope capture.

Return to [Quick start](quick-start.md) only after the failed protection or test
point passes. See [the FMEA](../safety/fmea.md) for failure consequences and
implemented mitigations.
