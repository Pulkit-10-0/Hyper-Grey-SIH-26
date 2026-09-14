# Failure mode and effects analysis

This FMEA covers the SeaNergy Rev A transmitter payload, its 3S battery,
transducer path, enclosure, firmware and operator console. Severity and
likelihood are qualitative so they do not imply unsupported numerical failure
rates.

**Numerical basis:** Engineering projection for the final product configuration.

The bench demonstrator transmits at 68.0 mA and uses 0.93 mJ per complete range
ping (T-11). The underwater payload design uses 340 mA peak transmit current and
a 46 mJ per-ping budget. The values belong to different configurations.

## Ratings

| Rating | Meaning |
|---|---|
| Critical severity | Can create electric shock, fire, cell failure or permanent hardware damage |
| Major severity | Stops the mission or can damage a protected subsystem |
| Moderate severity | Degrades data or requires an operator retry |
| Minor severity | Visible anomaly without loss of safe operation |
| Likely | Expected after a single credible fault or handling error |
| Possible | Requires an abnormal condition or component failure |
| Unlikely | Requires independent protections to fail together |

## Failure modes

| Failure mode | Cause | Effect | Severity | Likelihood | Detection | Mitigation | Where the mitigation is implemented |
|---|---|---|---|---|---|---|---|
| Transducer disconnected during transmit | Open connector, cable damage or penetrator separation | High unloaded bridge/transformer voltage, ringing and loss of acoustic output | Major | Possible | INA226 current departs from the expected transmit envelope; no matched-filter return | Windowed envelope limits edge energy; current telemetry exposes the open-load signature; connector is latched and inspected before arming | `window_gain_q15()` called by `fill_block()` in `sonar_dma.cpp`; U9 INA226; J2 to J7 Micro-Fit headers; PEN1/PEN2 penetrators; pre-ping checks in `demo-safety.md` |
| Sensor reading out of range | Disconnected probe, ADC saturation, DS18B20 absence or corrupt conversion | Solver could select a waveform for the wrong medium | Major | Possible | Sensor driver returns an error; DS18B20 absence returns `INT16_MIN`; telemetry fault bits identify ADC or temperature | Last complete snapshot is retained; temperature sentinel is substituted by a defined solver input; client displays unavailable rather than inventing telemetry | `sensors_read()` and `read_temperature_centi_c()` in `adc_sensors.cpp`; snapshot update guard in `sensor_task()`; sentinel handling in `solver_update()`; fault bits 1 and 2 in BLE contract |
| Brown-out mid-pulse | Cell depletion, connector resistance or transmit load step | MCU reset or incomplete DMA burst | Major | Possible | Reset/uptime discontinuity, missing telemetry sequence and INA226 voltage record | Reset path drives transmit enable low before normal operation; low monitored voltage changes solver mode and amplitude; incomplete DMA exits to fault-safe shutdown | `app_main()` then `board_init()`; `board_set_tx_enabled(false)` in `board.cpp`; battery checks at 3,500 mV and 3,400 mV in `solver_update()`; safe exit in `tx_task()` |
| DC across the piezo from a firmware fault | Output held in one bridge state, stopped DMA or corrupt waveform buffer | Piezo heating, depolarisation and driver stress | Critical | Unlikely | Differential waveform at TP12; INA226 current and energy; watchdog/reset or DMA error | C12 DC blocking capacitor and T1 isolation interrupt DC; symmetric bridge drive and a windowed pulse limit edge stress; any DMA failure removes enable; watchdog reset re-enters the low-enable boot state | C12 from the C1 to C12 10 uF/25 V network at the T1 primary; T1; Q2 to Q5; `fill_block()`; `tx_task()`; `board_init()` |
| Receive chain exposed to the transmit pulse | T/R leakage or simultaneous receive gain during the burst | ADC overvoltage, amplifier saturation and extended recovery | Major | Possible | TP13 and TP14 limits during transmit; clipped receive trace | Back-to-back limiter clamps the receive input; ADC range is checked; receive path is spatially separated from bridge routing | D3 to D6 BAT54S T/R limiter between transducer node and receive amplifier; TP13 limit of plus or minus 0.30 V; TP14 range of 0.10 to 3.20 V; PCB south-east analogue placement |
| Water ingress | Damaged O-ring, debris, uneven closure or loose penetrator | Corrosion, battery short and loss of insulation | Critical | Possible | External inspection, blue indicator tissue, mass comparison and insulation test | Dual static face seals, controlled cross-pattern closure, rated penetrators, dry inspection and staged immersion acceptance | OR1 and OR2 AS568-246 seals; PEN1 and PEN2; twelve M3 fasteners; `01-hardware/enclosure/seal-design.md`; immersion test T-16 |
| Thermal runaway in the driver | Shoot-through, stalled bridge, excessive duty cycle or poor heat rejection | MOSFET damage, enclosure heating and possible cell event | Critical | Unlikely | INA226 current trend, two-minute thermal check, driver temperature check and unexpected fuse operation | Dead time, current monitoring, duty-cycle limit, resettable fuse and immediate transmit disable on error | Q2 to Q5 bridge and U7 gate driver; TP11 dead time at least 100 ns; U9 INA226; F1 2.0 A resettable fuse; `sonar_dma_transmit()` timeout and `tx_task()` safe exit |
| Battery over-discharge | Mission left armed, interval too short or ageing pack | Cell damage, brown-out and corrupted final record | Critical | Possible | Battery mV telemetry, low-battery fault bit and endurance display | Monitored-voltage solver policy reduces demand; low-battery status causes mission disarm; pack protection provides final cut-off; reverse and overcurrent protection remain in series | U9 INA226; 3,500 mV range-mode and 3,400 mV amplitude policy in `solver_update()`; fault bit 5; `MISSION_DISARM`; BAT1 protection; F1 and Q1 |
| Battery connected in reverse | Reversed service connector or bench supply | Rail damage and high fault current | Critical | Unlikely | No BAT_PROT output at TP02; current-limited supply enters limit | P-channel reverse-polarity MOSFET blocks conduction; resettable fuse limits sustained fault | Q1 DMP3010LK3-13 and F1 MF-MSMF200X-2; TP01/TP02 bring-up check |
| Supply surge or ESD | Hot-plug transient, inductive lead or USB discharge | Regulator or MCU damage | Major | Possible | Rail excursion at TP02 to TP04; reset or link loss | Battery TVS clamps the input and USB protector diverts interface ESD | D1 SMBJ15A 15 V TVS; D2 USBLC6-2SC6; bypass C1 to C12 |
| DMA timeout | Bus stall, missed completion interrupt or memory fault | Truncated pulse and possible stuck enable | Major | Possible | `xSemaphoreTake()` reaches its 10 ms timeout; fault state and fault bit 0 | Timeout returns an error; caller always lowers envelope and transmit enable before entering `FAULT` | `sonar_dma_transmit()` in `sonar_dma.cpp`; `tx_task()` in `main.cpp`; GPIO 18 transmit enable |
| Unauthorised mission arming | Corrupt or unintended BLE write | Autonomous transmitting and deliberate link loss | Major | Unlikely | Command sequence and mode transition; advertising stops only after valid arm | Fixed packet size, magic, version, CRC and `SNRG` guard word all precede mission entry | `command_access()` in `link.cpp`; `handle_command()` in `main.cpp`; protocol version 1 |
| Solver cannot clear margin | Range or environment makes all candidates inadequate | Weak echo or misleading operator expectation | Major | Possible | `feasible` false in app; solver-margin fault bit in payload protocol | Search falls back visibly to best effort; client does not present it as within margin and inhibits mission use | `decide()` in `adaptation.ts`; `feasible` field; fault bit 6; Home and Diagnostics solver status |
| Firmware task stall | Deadlock, runaway loop or task starvation | Control and telemetry stop; transmit state may freeze | Critical | Unlikely | Watchdog reset, uptime discontinuity and missing sequence | Watchdog reset has a defined safe state: startup configures GPIO 18 low before queues or tasks can transmit | ESP32-S3 watchdog/reset path to `app_main()`; `board_init()` and `board_set_tx_enabled(false)`; BOOT invariant in `state-machine.md` |

## Evidence and review points

The receive limiter is checked at TP13, the ADC at TP14, bridge output at TP12,
current shunt at TP17 and TP18, and protected battery rail at TP02. Enclosure
immersion leaves 0 mL visible ingress after 120 min at 1.5 m, with 239 Mohm
insulation resistance and 0.1 g mass change (T-16). These are tank-configuration
validation figures, not a depth-rating substitution.

See [Electrical safety](electrical-safety.md),
[Acoustic exposure](acoustic-exposure.md) and
[Demo safety](demo-safety.md).
