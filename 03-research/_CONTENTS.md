# 03-research

## Purpose
The literature the design actually rests on, sorted by **what each paper
supports** rather than by generic topic. If a paper is in a folder, it is there
because it backs a specific equation, technique or design decision used in this
submission.

This is not a reading list. It is the evidence base for the technical report and
the answer to "where did that formula come from?" under questioning.

## The rule
> One folder, one thing we claim. Every paper in it supports that claim.

A paper that does not support the folder's claim does not belong in the folder,
however interesting it is. An empty slot is better than a filler paper, because
a judge who opens a folder and finds padding stops trusting the rest.

## Folder map

| Folder | What it supports in our design |
|---|---|
| `01-sound-speed` | Mackenzie's equation, used to convert echo delay into range |
| `02-absorption-attenuation` | Thorp's expression, the frequency-dependent loss term |
| `03-sediment-scattering` | The turbidity excess-loss term that drives the adaptation |
| `04-sonar-equation-detection` | The active sonar equation and the detection threshold |
| `05-lfm-chirp-design` | Why an LFM sweep, and how the sweep is parameterised |
| `06-pulse-compression-matched-filter` | Matched filtering, compression gain, range resolution |
| `07-windowing-sidelobes` | Hann, Hamming and Blackman envelopes and their sidelobe floors |
| `08-phase-coding-barker` | Barker-13, its 22.3 dB peak-to-sidelobe ratio, constant envelope |
| `09-adaptive-cognitive-sonar` | The core claim: adapting the transmitted waveform to the medium |
| `10-dds-waveform-synthesis` | Phase accumulator and lookup table synthesis in firmware |
| `11-transducers-matching` | Transducer resonance, clamped capacitance, the matching inductor |
| `12-side-scan-seabed-imaging` | The application: what the payload is ultimately for |
| `13-auv-platforms-survey` | The host platform and its constraints |
| `14-low-power-embedded` | The duty-cycled power budget and DMA offload argument |
| `15-ml-for-sonar` | The learned surrogate and its safety bound |

## Per-folder requirements
Each folder holds:
- **7 to 10 papers** as PDFs, named `YYYY-short-title.pdf`
- A `README.md` listing every paper with what it supports and where it is used

## Naming
`YYYY-lower-case-hyphenated-title.pdf`. Year first so folders sort
chronologically and the age of the evidence is visible at a glance.

## Sourcing rules
- **Open access only.** Every PDF here came from arXiv, an open-access
  publisher, or an institutional repository, retrieved from the publisher's own
  declared open-access location.
- **Paywalled canonical references are cited, not copied.** Several foundational
  papers (Mackenzie 1981, Francois and Garrison 1982, Ainslie and McColm 1998,
  Harris 1978) are behind JASA and IEEE paywalls. They are listed in
  `README.md` with their DOI under "cite, obtain via institution" and must not
  be redistributed here.
- Licence recorded per paper where the publisher declares one.

## Radar papers in a sonar project
Several folders contain radar literature. That is deliberate and correct: pulse
compression, matched filtering, windowing, phase coding and cognitive waveform
adaptation are the same mathematics in both domains, and the radar literature is
deeper and more open. Where a radar paper is used, the README says so and states
what transfers.

## Acceptance
- Every folder has at least 7 papers
- Every paper appears in its folder README with one line on what it supports
- Every citation in `07-documentation/technical-report` resolves to a paper here
  or to a listed paywalled reference
- No paper appears in two folders; if it supports two things, it lives with the
  primary one and is cross-referenced

## What went wrong last year
Fifteen reference PDFs sat in one flat folder with no notes. There was no way to
tell which informed the design and which were decoration, and no way to answer
"which paper backs this equation?" without opening all fifteen.
