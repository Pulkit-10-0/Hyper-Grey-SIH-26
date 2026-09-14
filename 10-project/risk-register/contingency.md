# Demonstration contingency playbook

## Operating rule

The live system is the primary demonstration. Every critical failure path has a rehearsed fallback that preserves the evaluation story without overstating what occurred live. The demo lead calls the switch; the presenter continues without debate.

## Fallback ladder

| Trigger | Immediate response | Fallback asset | Owner role |
|---|---|---|---|
| No waveform within 20 seconds | Power-cycle once using the printed sequence | Standalone firmware trace replay | Pulkit / Harshada |
| Sensor bus stalls or reports invalid data | Load the known environment profile | Deterministic input JSON and local replay | Pulkit / Harshada |
| Transducer or analog stage fails | Move to protected electrical output point | Oscilloscope capture plus synchronized waveform replay | Harshada / Pulkit |
| Water activity is restricted | Use the sealed dry bench | Bench layout, tank animation and recorded water trace | Pulkit / Ananya |
| Ambient noise masks received echo | Use coded-waveform replay with matched-filter plot | Validation figure set and narrated comparison | Pulkit / Harshada |
| Mobile link drops | Switch to USB/local display | Offline dashboard build and exported run report | Prakhar / Jaspreet |
| Primary laptop fails | Move HDMI and USB to backup laptop | Mirrored repository, PDF pack and local video | Prakhar / Jaspreet |
| Projector or internet fails | Use local files only | 16:9 PDF, printed A3 architecture sheet and phone video | Aarushi / Ananya |
| Presenter exceeds time | Jump to the 90-second close | Three headline numbers and final ask | Aarushi / Pulkit |
| Team member is absent | Backup owner runs the subsystem | Printed runbook and ownership matrix | Pulkit / Ananya |

## Six-minute run order

| Time | Action |
|---|---|
| 0:00-0:40 | Problem, user and deployment setting |
| 0:40-1:30 | System architecture and adaptive decision |
| 1:30-3:20 | Live environment change, waveform selection and output |
| 3:20-4:20 | Measured/projected performance figures and energy |
| 4:20-5:10 | India market, INR price and deployment path |
| 5:10-6:00 | IP moat, roadmap and specific pilot ask |

## Kit checklist

- Primary and backup laptop with chargers.
- Two data cables, spare USB hub and HDMI adapters.
- Programmed primary board and known-good spare board.
- Spare sensors, jumper set, fuse, power supply and multimeter.
- Dry bench fixture, towels, drip tray, isolation transformer/RCD where mains is present.
- Local copies of PDFs, video, logs, app package and source archive.
- Printed architecture, risk sheet, three headline figures and contact card.
