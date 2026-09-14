# SeaNergy operator guide

## System scope

SeaNergy is an adaptive software-defined sonar transmitter payload and Android
operator console. The same codebase supports two acoustic domains. Select the
domain deliberately because their figures are not interchangeable.

**Numerical basis:** Engineering projection for the final product configuration.

| Configuration | Band | Required range | Transmit current | Per-ping energy | Source level |
|---|---:|---:|---:|---:|---:|
| Bench / air demonstrator | 24 to 80 kHz, 40.2 kHz resonance (T-01) | Metres | 68.0 mA (T-11) | 0.93 mJ range ping (T-11) | Bench level |
| Underwater payload | 100 to 500 kHz | 220 m | 340 mA design peak | 46 mJ budget | 196 dB re 1 microPa at 1 m |

The app's Air bench solver operates over 28 to 52 kHz inside the demonstrator's
validated 24 to 80 kHz sweep. The Underwater setting uses the payload design
constants.

## Powering on

1. Complete the checks in
   [Demo safety](../safety/demo-safety.md), including the dry enclosure,
   transducer fixture and clear tank boundary.
2. Connect the 3S, 11.1 V, 2.6 Ah LiPo pack with the payload switch off.
3. Switch on. The payload enters `BOOT` with transmit disabled, then `READY`.
4. Open SeaNergy on the Android phone. The app starts in Simulation mode with
   the Underwater medium and Coastal scenario.
5. Use Home or Settings to choose Simulation or Telemetry. Confirm the selected
   source remains visible in the value colour and status rows.

## The two modes

| Mode | Use it for | Controls | Provenance |
|---|---|---|---|
| Simulation | Explore environmental response, select scenarios, override waveform parameters and generate reproducible echo traces | Full controls, including medium, scenarios, manual environment, waveform, interval and Fire ping | Modelled values use the simulation colour |
| Telemetry | Operate and monitor the physical payload | Link scan and read-only payload views | Live values use the telemetry colour; unavailable fields show a dash |

Simulation runs entirely on the handset. Telemetry reads the fixed BLE protocol
described in [the GATT API](../api/ble-gatt.md). Do not treat a simulation-colour
value as a sensor reading.

## Full ping cycle

### Simulation

1. On Settings, select `Simulation` and choose `Underwater` or `Air bench`.
2. On Environment, choose Reef, Coastal, Estuary or Deep, or move a manual
   environment slider.
3. On Wave, leave Auto selected for adaptive operation. Review centre frequency,
   bandwidth, duration, amplitude, window and resolution.
4. On Home, confirm solver status `WITHIN MARGIN`.
5. Press `FIRE PING`. The app opens Echo after the generated acquisition.
6. Read measured range and SNR, then compare predicted and measured SNR in the
   Closed loop panel.
7. Repeat. The prediction error updates the noise correction used by the next
   solve.
8. Open Log, inspect individual pings, then select `EXPORT CSV`.

### Telemetry

1. Power the pod and wait for its ready indication.
2. Select `Telemetry`, then `SCAN FOR PAYLOAD`.
3. Connect to `SeaNergy-26058`; the client requires GATT version `1` and never
   guesses after a mismatch.
4. Confirm link `UP`, payload `READY` and an empty fault bitmap.
5. Ensure the acoustic boundary is clear, then send a single ping command.
6. Observe `ARMED`, `TRANSMITTING` and `READY`, followed by a new telemetry
   sequence and log record.
7. If mission mode is armed, BLE intentionally turns off. Press the physical
   trigger to exit mission mode and restore the radio.

## Reading the twelve screens

The main tab strip scrolls horizontally. Eleven tab screens plus Scenario make
the twelve operator screens. Ping detail is a linked record view.

### Home, `app/(tabs)/index.tsx`

| Annotation | What to read or do |
|---|---|
| Data source | Select Simulation or Telemetry. In Telemetry, scan when the link is not up |
| System | Link/source status, waveform mode, zero-padded ping count and uptime in `hh:mm:ss` |
| Last solve | Centre frequency, bandwidth, window, range resolution and pulse duration |
| Health | Rails, DAC loopback, sensors, solver and radio state |
| Actions | Open Scenarios or fire one simulation ping |

### Environment, `app/(tabs)/env.tsx`

| Annotation | What to read or do |
|---|---|
| Sensed medium | Temperature, salinity, turbidity and depth, shown as a moving average |
| Derived | Sound speed, absorption at centre frequency, excess scattering, total loss, hydrostatic pressure and medium |
| Scenario | Select one of four named operating conditions |
| Manual environment | Drive the solver with temperature, salinity, turbidity and depth sliders in Simulation |

### Wave, `app/(tabs)/wave.tsx`

| Annotation | What to read or do |
|---|---|
| Transmit pulse | Inspect the windowed time-domain envelope |
| Derived | Sweep limits, bandwidth, time-bandwidth product, compression gain, resolution and amplitude |
| Compression | Compare unmodulated resolution with compressed resolution |
| Envelope window | Select Rectangular, Hann, Hamming or Blackman and read theoretical peak sidelobe level |
| Waveform family | Select LFM, geometric, Barker-13 or CW in Simulation |
| Manual override | Switch from Auto to Manual, then set centre, bandwidth, pulse and amplitude |
| Play sweep | Plays an audible representation; it does not transmit acoustically |

### Sonar, `app/(tabs)/sonar.tsx`

| Annotation | What to read or do |
|---|---|
| PPI | Read contacts in the 120 degree sector and current maximum-range scale |
| Contacts | Each return shows range and confidence percentage |
| Display | Read scale, one-quarter-scale ring step, range resolution, sector and held-ping count |

### Spec, `app/(tabs)/spec.tsx`

| Annotation | What to read or do |
|---|---|
| Spectrum | Normalised magnitude from 0 Hz to half the preview sample rate |
| Time/frequency | Inspect instantaneous frequency over the pulse duration |
| Spectrogram | Hann analysis window with 50% overlap, time rightwards and frequency upwards |
| Band | Centre, start, stop, bandwidth and fractional bandwidth |

### Echo, `app/(tabs)/echo.tsx`

| Annotation | What to read or do |
|---|---|
| Result | Measured range and matched-filter output SNR |
| Received trace | Raw pre-compression return over the display range |
| Matched filter | Correlation trace and detected-range marker |
| Detection | Target range, range error, resolution, peak-to-sidelobe ratio, compression gain and time-bandwidth product |
| Closed loop | Predicted SNR, measured SNR, their signed difference, noise correction, centre frequency and turbidity at fire |
| Actions | Reset the learned correction or fire again |

### Power, `app/(tabs)/power.tsx`

| Annotation | What to read or do |
|---|---|
| Per ping | Modelled total energy, average current, pings left and endurance |
| Current draw | One cycle from sleep through wake, sample and transmit |
| Energy split | Transmit, sample, synthesis and wake energy |
| Synthesis engine | DDS/DMA energy, live-trigonometry comparison, saving and CPU currents |
| Duty cycle | Current and percentage of the cycle in every power state |
| Supply | Battery capacity/configuration, usable energy, rail and current-sensor provenance |
| Ping interval | Set 0.50 to 60.00 s in Simulation |

### Mission, `app/(tabs)/mission.tsx`

| Annotation | What to read or do |
|---|---|
| Progress | Elapsed time, derived along-track distance, detections and pings |
| Coverage | Swath, line spacing, along-track resolution, area and vehicle speed |
| Next waypoint | Waypoint index, bearing, depth hold and ping rate |
| Endurance | Remaining time, pings and derived remaining track at the selected interval |

### Diagnostics, `app/(tabs)/diag.tsx`

| Annotation | What to read or do |
|---|---|
| Timing | Transmit window, cycle budget, headroom, DMA underruns and solver budget state |
| Link | Link status/detail, packet size and drops |
| Packet layout | Wire-field names and widths |
| Solver | Noise correction, time-bandwidth product and logged-ping count |
| Faults | Last fault, self-test and watchdog state |

### Log, `app/(tabs)/log.tsx`

| Annotation | What to read or do |
|---|---|
| Session | Total energy, mean measured SNR, mean absolute prediction gap and distinct centre-frequency count |
| Record row | Ping ID, mode, range, centre frequency, turbidity, clock time and measured SNR |
| Export CSV | Shares the exact schema in [CSV schema](../api/csv-schema.md) |
| Clear | Removes the in-memory ping history and last-ping view |

### Settings, `app/(tabs)/settings.tsx`

| Annotation | What to read or do |
|---|---|
| Data source | Select mode, read transport and link status, and scan in Telemetry |
| Medium | Select Underwater or Air bench and verify band, required range, threshold, pulse range and energy budget |
| Ping rate | Set interval in Simulation |
| Adaptation loop | Read or reset noise correction |
| Session | Clear the ping log |
| About | Build, problem statement, packet layout and unit system |

### Scenario, `app/scenario.tsx`

| Annotation | What to read or do |
|---|---|
| Scenario cards | Compare Reef, Coastal, Estuary and Deep descriptions and their environmental quantities |
| Active indicator | Identifies the scenario currently supplying environment targets |
| Selection | Tap a card to set the target and return to the previous screen |

### Ping detail, `app/ping/[id].tsx`

Open a Log row to see measured range/SNR, raw and compressed traces, conditions
at fire, complete waveform parameters, energy and closed-loop comparison. The
log retains the most recent 200 pings. A removed or unknown ID shows `Not found`.

## Displayed quantities and units

| Quantity | Display unit | Screens |
|---|---|---|
| Temperature | degree C | Environment, Scenario, Ping detail |
| Salinity | ppt | Environment, Scenario, Ping detail |
| Turbidity | NTU | Environment, Scenario, Echo, Log, Ping detail |
| Depth, range, scale, swath, spacing, track, resolution | mm, cm, m or km selected by magnitude | Home, Environment, Wave, Sonar, Echo, Mission, Settings, Ping detail |
| Sound speed | m/s | Environment |
| Absorption and scattering | dB/km | Environment |
| Pressure | bar | Environment |
| Frequency and bandwidth | Hz, kHz or MHz selected by magnitude | Home, Wave, Spec, Log, Settings, Ping detail |
| Pulse and interval | microseconds, ms or s selected by magnitude | Home, Wave, Spec, Power, Diagnostics, Settings, Ping detail |
| SNR, prediction gap, correction, compression, sidelobes | dB | Home, Wave, Echo, Diagnostics, Log, Settings, Ping detail |
| Amplitude | % full scale | Wave, Ping detail |
| Time-bandwidth product | Dimensionless | Wave, Echo, Diagnostics, Ping detail |
| Energy | microjoules, mJ or J selected by magnitude | Power, Mission, Log, Settings, Ping detail |
| Current | microamps, mA or A selected by magnitude | Power |
| Battery capacity | mAh | Power |
| Duty and confidence | % | Sonar, Power |
| Ping rate | Hz | Mission |
| Area | square kilometres | Mission |
| Bearing and sector | degrees | Sonar, Mission |
| Time and endurance | `hh:mm:ss`, `mm:ss`, min, h or days | Home, Mission, Power, Log |
| Counts | Count | All status, ping, contact, detection, waypoint and drop rows |
| Packet size and field width | B | Diagnostics |

## Status values

### Data and link

| Value | Meaning | Operator response |
|---|---|---|
| `SIMULATION` | Handset physics supplies the values | Use controls and Fire ping normally |
| `TELEMETRY` | Payload link supplies the values | Require link `UP` before treating values as live |
| `DOWN` | No active payload connection | Select Scan and check range/power |
| `SCANNING` | BLE discovery is active | Wait for completion |
| `CONNECTING` | A device was found and connection is opening | Wait; do not send a command |
| `UP` | GATT link is connected | Validate protocol/version and telemetry before pinging |
| Dash | Live field is unavailable | Do not substitute the simulation value |

### Payload state

| Value | Meaning | Operator response |
|---|---|---|
| `BOOT` | Reset and driver-safe initialisation | Wait for `READY` |
| `READY` | Transmit disabled; command link available | Safe state for a single ping |
| `ARMED` | Complete plan queued and hardware timer armed | Keep boundary clear |
| `TRANSMITTING` | DMA is streaming the windowed burst | Do not touch tank or cabling |
| `MISSION` | Autonomous periodic pings; radio disabled | Use physical trigger to exit |
| `FAULT` | Critical error; transmit disabled | Isolate, read fault bitmap and follow troubleshooting |

The app transport interface also defines decoded state labels for adapters that
use the earlier `TelemetryPacket` surface:

| Adapter value | Meaning |
|---|---|
| `boot` | Initialising, equivalent to wire `BOOT` |
| `idle` | Ready and not acquiring, equivalent to wire `READY` |
| `armed` | Ping queued, equivalent to wire `ARMED` |
| `sampling` | Receive or sensor sampling is active |
| `transmitting` | Burst output is active, equivalent to wire `TRANSMITTING` |
| `fault` | Safe fault state, equivalent to wire `FAULT` |

### Power state

| Value | Meaning | Display current in the underwater design model |
|---|---|---:|
| `sleep` | Between acquisitions | 0.9 mA |
| `idle` | Wake/control interval | 12 mA |
| `sampling` | Sensor/receive acquisition | 28 mA |
| `transmitting` | Full-amplitude burst | 340 mA |

### Solver and health

| Value | Meaning | Operator response |
|---|---|---|
| `WITHIN MARGIN` / `WITHIN BUDGET` | Selected candidate clears configured SNR margin and energy budget | Ping is permitted |
| `BEST EFFORT` | No full-margin candidate; strongest available result shown | Do not arm a mission; reduce range or change conditions/configuration |
| `OK` | Rail or loopback self-test passes | None |
| `MODELLED` | Simulation supplies the sensor value | Do not cite it as measured telemetry |
| `NONE` | No return or no last fault in that panel | Fire once if a return is expected |
| `PASS` | Diagnostics self-test passes | None |
| `ARMED` watchdog | Reset supervision is active | None |
| `OFF` radio | Radio is intentionally off in Simulation or mission operation | Confirm source/mode before diagnosing |

### Fault bitmap

| Bit | Status | Meaning | Operator response |
|---:|---|---|---|
| 0 | DMA timeout | Pulse stream did not complete | Stop commands and reset after inspection |
| 1 | Sensor ADC | Environmental ADC failed | Inspect sensor bus and do not use the value |
| 2 | Temperature | Temperature probe failed | Inspect DS18B20 and do not use the value |
| 3 | INA226 | Voltage/current monitor failed | Stop energy-dependent operation |
| 4 | OLED | Local display failed | Use remote console and service display |
| 5 | Low battery | Energy reserve reached its protection threshold | Disarm, power down and service battery |
| 6 | Solver margin | Required detection margin is not available | Do not transmit the plan |
| 7 to 31 | Reserved/unknown | Newer firmware or corrupt value | Retain raw bitmap and use compatible documentation |

## Battery life at the configured ping rate

The default app configuration is Underwater, Coastal, one ping every 10.00 s.
The selected 0.500 ms pulse has amplitude 0.920. `pingEnergy()` derives
5.5767 mJ per ping from 0.4752 mJ wake, 4.6200 mJ sample, 0.0066 mJ synthesis
and 0.4749 mJ transmit energy. `endurance()` adds 28.2150 mJ sleep energy per
cycle and reports 2,613 pings, 1.0240 mA average draw and 7.3 h endurance. Every
figure in this paragraph is derived directly from `power.ts`, `engine.ts` and
the Coastal scenario constants. The Power and Mission screens recalculate the
result whenever pulse, amplitude or interval changes.

## Exporting a session

Open Log and select `EXPORT CSV`. Android opens the share sheet for a UTF-8
`text/csv` file named `seanergy-session-YYYY-MM-DDTHH-MM-SS.csv`. It contains
one oldest-first row per ping. Preserve the header and units when importing.
See [CSV schema](../api/csv-schema.md) for every column and missing-value rule.

## Safe shutdown

Leave mission mode with the physical trigger, confirm `READY`, disconnect the
link and switch off payload power. Remove the battery before opening the pod.
Dry the enclosure exterior before moving it out of the spill boundary.

For abnormal behaviour, use [Troubleshooting](troubleshooting.md). For the
table-side sequence, use [Quick start](quick-start.md).
