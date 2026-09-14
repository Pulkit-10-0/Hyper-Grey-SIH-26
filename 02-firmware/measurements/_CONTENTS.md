# measurements

## Purpose
The evidence for every firmware-level claim. Without this folder the low-power
argument is an assertion.

## Files that must exist
- `cpu-idle-during-transmit.md` plus the scope capture
- `dds-vs-naive-trig.md` — the A/B, same board, same INA226
- `dma-timing.md` — sample rate achieved on the parallel bus
- `power-states.csv` — sleep, idle, sampling, transmitting, in mA
- `energy-per-ping.md` — integration method and result
- `captures/` — raw scope files and PNG exports, named by test

## The measurements that matter most
| Measurement | Method | Target |
|---|---|---|
| CPU idle during transmit | GPIO from idle hook, scoped against the envelope | above 95 percent |
| Sustained parallel bus rate | GPIO toggle, scope, sustained not burst | 2 MSps or better |
| Sleep current | INA226, radios off, peripherals gated | under 1.5 mA |
| Energy per ping | Integrated INA226 across one cycle | stated in mJ |
| Adaptation latency | GPIO high on ADC read, low on first DMA sample | under 100 ms |

## Acceptance
Every number has a scope capture or a logged CSV behind it, referenced by
filename. The CPU idle capture shows two traces on one screen: the idle GPIO
and the transmit envelope. That single image is the strongest evidence in the
whole submission.

## Why this folder exists
The PS asks for DMA and hardware timers so the processor does not drain the
battery. Everybody will claim it. Almost nobody will photograph it.
