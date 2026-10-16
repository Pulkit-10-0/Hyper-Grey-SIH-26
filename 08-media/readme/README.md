# README media and provenance

[Project overview](../../README.md) · [Parent folder](../README.md)

This directory holds stable, descriptive filenames for selected project media. The October 2026 README refresh copied supplied originals without changing their pixels or content. The main README uses HTML display widths where needed; the original files remain available at full resolution.

| Asset | Source | Caption |
|---|---|---|
| [System design architecture](SeaNergy-system-design.png) | Supplied `Hyper-Grey-26058.png` on 16 October 2026; original 3100 × 2450 PNG copied unchanged | Overall system design connecting environmental sensors, transducers, analog/converter stages, ESP32-S3 processing, operator software, and CSV export. |
| [App console](SeaNergy-app-console-simulation.jpeg) | `WhatsApp Image 2026-09-28 at 12.39.27 AM (2).jpeg` in the supplied October 16 app ZIP; identical repository original retained | Simulation-mode payload status and waveform settings. |
| [App sonar](SeaNergy-app-sonar-simulation.jpeg) | `WhatsApp Image 2026-09-28 at 12.39.26 AM (2).jpeg` in the supplied October 16 app ZIP; identical repository original retained | Simulation-mode PPI sector and range/bearing controls. |
| [App diagnostics](SeaNergy-app-diagnostics-simulation.jpeg) | `WhatsApp Image 2026-09-28 at 12.39.25 AM (3).jpeg` in the supplied October 16 app ZIP; identical repository original retained | Simulation-mode timing budget and telemetry-link status. |
| [Signal-analysis dashboard](SeaNergy-signal-analysis-dashboard.jpg) | Supplied `Screenshot 2026-09-20 at 6.14.50 PM.jpg` | September development dashboard combining serial readouts and computed DSP/propagation plots; its derived waveform and compression panels are software analysis. |
| [Bench carrier photograph](SeaNergy-bench-carrier-photo.jpg) | Supplied photograph of the Tektronix display, timestamp 15 September 2026, 13:47 | September prototype bench session showing an approximately 40 kHz electrical square carrier. |
| [Bench burst photograph](SeaNergy-bench-bursts-photo.jpg) | Supplied photograph of the Tektronix display, timestamp 15 September 2026, 13:56 | September prototype bench session showing gated electrical carrier packets. |
| [40 kHz carrier](SeaNergy-scope-40khz-carrier.jpg) | Supplied Tektronix screen export, timestamp 15 September 2026, 13:41 | Electrical square-carrier capture with displayed readings of 39.99 kHz, 25.00 μs, and 3.56 V peak-to-peak. |
| [Burst packets](SeaNergy-scope-burst.jpg) | Supplied Tektronix screen export, timestamp 15 September 2026, 13:56 | Qualitative electrical-carrier packets separated by quiet intervals. |
| [Periodic oscillation](SeaNergy-scope-periodic-oscillation.jpg) | Supplied Tektronix screen export, timestamp 15 September 2026, 14:13 | Low-amplitude periodic electrical trace from the September bench session. |
| [Analog trace](SeaNergy-scope-analog-trace.jpg) | Supplied Tektronix screen export, timestamp 15 September 2026, 14:11 | Periodic analog trace showing decay and edge transients. |
| [Printed payload](SeaNergy-payload-printed.jpeg) | `payload image 1.jpeg` in the supplied photo/time-lapse ZIP | Physical printed housing showing the payload form and fabrication. |
| [Fabrication](SeaNergy-payload-fabrication.jpeg) | `payload fabrication.jpeg` in the supplied photo/time-lapse ZIP | Printed part and support structure during fabrication. |
| [App environment](SeaNergy-app-environment-simulation.jpeg) | `../screenshots/Mobile App/WhatsApp Image 2026-09-28 at 12.39.26 AM (3).jpeg` | Simulation-mode environmental inputs and propagation calculations. |
| [App waveform](SeaNergy-app-wave-simulation.jpeg) | `../screenshots/Mobile App/WhatsApp Image 2026-09-28 at 12.39.27 AM (1).jpeg` | Simulation-mode tapered LFM pulse and derived quantities. |
| [App spectrum](SeaNergy-app-spectrum-simulation.jpeg) | `../screenshots/Mobile App/WhatsApp Image 2026-09-28 at 12.39.27 AM.jpeg` | Simulation-mode spectral analysis. |

The full-width opening image is `IMG_20260921_093807880.jpg`, showing two DSOs and the development setup. The gallery also features `IMG_20260921_094123797.jpg`, a closer two-DSO photograph.

The prominent prototype gallery uses existing photographs `IMG_20260915_121651963.jpg` (controller close-up), `IMG_20260921_094059848.jpg` (manual tuning), and `IMG_20260921_093807880.jpg` (laboratory setup), all from `../photos/`.

The root README also uses existing [bench photographs](../photos/), the [Rev B KiCad render](../../01-hardware/kicad/previews/Board_3D.png), the [app logo](../../04-software/mobile-android/logo.png), and a [generated research figure](../../05-models/evaluation/figures/eval-2-downband-walk.png). The board image is a design render; the research plot is a numerical study.

The supplied research-paper PDF was identical to the [existing repository manuscript](../../07-documentation/research-paper/SeaNergy_Adaptive_Sonar_Research_Paper.pdf), so that file is reused.

Earlier assets remain in this directory for historical references:

- `SeaNergy-system-architecture.png` documents the earlier system architecture.
- `SeaNergy-app-echo-simulation.jpeg` shows the app’s simulated-echo view.

The scope captures document the earlier electrical bench prototype; current firmware profiles and checks are indexed in the [TX/RX guide](../../02-firmware/README.md).
