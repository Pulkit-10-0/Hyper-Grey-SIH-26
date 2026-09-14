# Subsystem ownership matrix

| Subsystem | Primary owner | Backup owner | Owned deliverables | Handoff trigger |
|---|---|---|---|---|
| Physics and adaptive solver | Pulkit | Harshada | Equations, constraints, candidate ranking, safety margin and explanation | Solver output differs from expected operating envelope |
| Embedded firmware and real-time | Pulkit | Harshada | ESP32-S3 build, DDS, DMA, sensors, fault handling and recovery image | Missed buffer, boot fault or sensor-bus stall |
| Analog and power | Harshada | Pulkit | Filtering, bridge drive, protection, supply budget and oscilloscope evidence | Output amplitude, current or temperature leaves its limit |
| PCB and hardware integration | Pulkit | Harshada | Schematic, layout, grounding, connectors, bring-up and spare board | Board, cable or connector failure |
| Mechanical, tank and safety | Ananya | Harshada | Enclosure, mount, tank layout, drip control and electrical-safety sequence | Leak, wet connector, venue restriction or safety stop |
| Mobile application and telemetry | Prakhar | Jaspreet | Operator UI, local link, offline build, trace display and export | Telemetry absent for 10 seconds or primary device fails |
| Dataset, notebook and model | Jaspreet | Prakhar | Dataset schema, generation record, model output and reproducibility package | Model input, calibration record or expected output is unavailable |
| Documentation, business and IP | Aarushi | Ananya | Submission narrative, INR model, source register, filing pack and disclosure control | Source gap, document inconsistency or public-release request |
| Demonstration and QA | Pulkit and Jaspreet | Ananya | Runbook, timed rehearsals, evidence order, fallback drill and kit control | Live sequence fails, time gate is missed or a member is absent |
| Final presentation | Aarushi | Pulkit | Six-minute script, transitions, plain-language explanation and final ask | Presenter unavailable or 4:30 timing gate is missed |

## Decision rights

| Decision | Final owner | Required consultation |
|---|---|---|
| Acoustic operating limits | Pulkit | Harshada |
| Power-up and water-safety approval | Ananya | Harshada and Pulkit |
| Firmware release selection | Pulkit | Harshada |
| Application build selection | Prakhar | Jaspreet |
| Dataset/model release selection | Jaspreet | Prakhar and Pulkit |
| Public disclosure and IP material | Aarushi | Pulkit and Ananya |
| Demonstration fallback activation | Pulkit | Jaspreet and Ananya |
| Presentation timing cut | Aarushi | Pulkit |

