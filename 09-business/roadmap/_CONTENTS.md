# roadmap

## Purpose
What happens after the hackathon, concretely enough to be credible.

## Files that must exist
- `roadmap.pdf` — **2 pages**
- `technical-roadmap.md` — the engineering path
- `scaling-analysis.md` — what changes at 100 W acoustic output

## The engineering path
| Stage | Content |
|---|---|
| Now | 40 kHz air bench, breadboard, modelled power |
| Next | Water tank, real transducers, INA226, measured power |
| Then | Custom PCB, sealed pod, immersion tested |
| After | 100 to 500 kHz band, real transmit power, T/R switch |
| Production | Calibrated source level, NIOT tank characterisation, sea trial |

## Facts this must carry
- What changes electrically at 100 W: amplifier topology, matching transformer,
  transmit and receive switch, thermal management, supply
- The real transducer part that would replace the bench pair, with its price
- What a calibrated hydrophone would buy and what it costs
- Which claims become measurable at each stage

## Acceptance
Every stage names parts and numbers, not intentions. A reader should be able to
tell exactly which claim is unlocked by each step.
