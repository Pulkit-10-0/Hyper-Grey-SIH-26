# Slide 1 — Our Solution

Editable slide: `slide-01/output/SeaNergy-slide-01-our-solution-v9.pptx`

Tagline beneath **SeaNergy**: **Every Ping, Purpose-Built.** From the team's slide-authoring brief.

This slide presents the proposed full product. The team can demonstrate a portion of that product in its pitch; presenter notes distinguish the present bench paths, ESP-IDF source and model study.

## Reading order

1. SeaNergy title and a short tagline.
2. Proposed solution paragraph.
3. Four solution capabilities on the left.
4. Why the need on the right.
5. Physical-problem numeric table with illustrative range error on the right.

## Proposed solution

SeaNergy is a proposed software-defined sonar payload for AUVs. Live water data will guide a bounded controller as it selects frequency, bandwidth, duration and waveform for each ping. Onboard synthesis and timed transfer will feed a DAC, filter, power stage and transducer, while a separate receiver and local console will show the returned signal and decision trace. The finished system aims to balance range, detail and battery use as conditions change.

## Four left-side solution points

1. **Adaptive waveform library.** Temperature, salinity, turbidity, pH and depth inform LFM, geometric and phase-coded pulse choices for changing missions.
2. **Bounded decision engine.** Acoustic physics, electrical limits and a per-ping energy budget keep each selected waveform feasible and explainable.
3. **Autonomous transmitter hardware.** Onboard synthesis, timed DMA transfer, DAC, filtering and driver form the proposed signal path inside the AUV.
4. **Inspectable TX and RX.** A local console reveals pulse choices and power data; the receiver displays waveforms and spectra for validation.

These are solution capabilities, not sequential process steps. The slide presents them without numbering.

## Why the need?

PS 26058 calls for physical, low-power sonar hardware that adapts in real time. Changing water alters sound speed and signal loss, so one fixed ping cannot balance range, detail and energy everywhere. AUV battery and CPU limits make each transmit decision consequential.

## Numeric table: physical problem

| Water change | Approximate sound-speed shift | Error at 100 m* |
|---|---:|---:|
| +1 °C temperature | +4.5 m/s | 30 cm |
| +1 ppt salinity | +1.3 m/s | 9 cm |
| +100 m depth | +1.7 m/s | 11 cm |

*Illustrative error for a true 100 m range if sonar keeps assuming 1,500 m/s. Sensitivities come from [NOAA](https://repository.library.noaa.gov/view/noaa/44869/noaa_44869_DS1.pdf); the echo-ranging relationship is described by [NOAA NCEI](https://www.ngdc.noaa.gov/mgg/fliers/84mgg18.html). Calculated estimates, not SeaNergy results. pH and turbidity also affect acoustic loss, but a universal one-line numeric sensitivity is inappropriate without a stated frequency and water baseline.

## Status line

Illustrative 100 m ranging error using NOAA sound-speed sensitivities. SeaNergy architecture is shown as a proposed product.

## Visual

The slide uses `../../08-media/illustrations/slide-01-auv-sonar-concept.png`, a generated concept illustration. It is not a photograph of the prototype. No additional flow diagram appears on this slide.

## Source basis

`source-briefs/SeaNergy-SIH-2026-slide-authoring-brief.txt`, `../compliance-matrix/compliance-matrix.pdf`, `../../01-hardware/README.md`, `../../02-firmware/README.md` and its source components, `../../05-models/README.md`, and the NOAA sources linked above. The RevB bench, ESP-IDF payload source and 100–500 kHz synthetic study remain distinct configurations.
