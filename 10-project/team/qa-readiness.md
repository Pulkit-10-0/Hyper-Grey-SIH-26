# QA readiness and question ownership

## Coverage matrix

| Evaluation area | Primary answer owner | Backup | Evidence to open first | Core answer |
|---|---|---|---|---|
| Acoustics and physics | Pulkit | Harshada | Solver flow, attenuation curves and waveform comparison | The controller selects only feasible waveforms and records the acoustic margin |
| Embedded and real-time | Pulkit | Harshada | DMA timing, fixed-point DDS and execution trace | Deterministic buffers separate waveform calculation from sample output |
| Analog electronics | Harshada | Pulkit | Filter, bridge, T/R protection and output plots | Hardware limits and protection remain independent of the selected waveform |
| Power and thermal | Harshada | Pulkit | Per-ping energy and 100 W scaling table | Burst duty cycle, efficiency and thermal loss define the safe operating envelope |
| PCB and integration | Pulkit | Harshada | PCB layout, grounding plan and bench interconnect | Separated returns, controlled interfaces and a spare-board path support repeatability |
| Mechanical and safety | Ananya | Harshada | Tank layout, enclosure and safety checklist | Water, power and personnel are separated through a battery-first controlled setup |
| Software architecture | Prakhar | Jaspreet | Telemetry contract, offline UI and export flow | The interface remains local and operational without cloud connectivity |
| Dataset and machine learning | Jaspreet | Prakhar | Dataset card, notebook and physics-guard diagram | The learned model proposes candidates; deterministic guards retain final authority |
| Market and deployment | Aarushi | Ananya | Market-sizing PDF and INR cost model | Entry begins with evaluation payloads and expands only after qualification evidence |
| IP and prior art | Aarushi | Ananya | Claim chart, disclosure schedule and attribution register | Protection focuses on the bounded embedded combination, not established sonar foundations |
| Demonstration execution | Pulkit and Jaspreet | Ananya | Six-minute runbook, risk register and fallback ladder | Each high-impact interruption has a named switch point and rehearsed fallback |

## Six-minute ownership

| Segment | Time | Owner |
|---|---:|---|
| Problem and Indian deployment need | 0:00-0:40 | Aarushi |
| Architecture and adaptive decision | 0:40-1:30 | Aarushi with Pulkit for technical handoff |
| Live system sequence | 1:30-3:20 | Pulkit; Jaspreet monitors evidence and timing |
| Performance and energy | 3:20-4:20 | Pulkit |
| Market, INR price and IP | 4:20-5:10 | Aarushi |
| Roadmap, team and pilot ask | 5:10-6:00 | Aarushi |

## Readiness gates

1. Pulkit and Harshada can each start the controller, select the safe profile and explain the signal chain.
2. Prakhar and Jaspreet can each open the offline interface and replay the trace.
3. Aarushi and Ananya can each locate the source, INR assumption and disclosure status for business claims.
4. Ananya can stop the physical demonstration immediately and move the team to the dry fallback.
5. Aarushi can invoke the 90-second close at the 4:30 timing gate.
6. Every member knows the primary evidence file for their evaluation area.
