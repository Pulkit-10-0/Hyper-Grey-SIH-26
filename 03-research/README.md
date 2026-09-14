# 03-research — paper index

Every paper we hold, sorted by **what it supports**. If a paper is in a
folder, it is there to back a specific equation, technique or design
decision used in this submission.

**132 papers across 15 folders.** Every folder holds 7 to 10.

Open a folder's own `README.md` for the full paper list with links.

---

## Index

| Folder | Papers | Supports |
|---|---|---|
| [`01-sound-speed`](./01-sound-speed/) | 8 | Sound speed in water, and why a range estimate is only as good as the sound speed used to compute it. |
| [`02-absorption-attenuation`](./02-absorption-attenuation/) | 8 | Frequency-dependent absorption in sea water: the term that makes high frequency expensive over range. |
| [`03-sediment-scattering`](./03-sediment-scattering/) | 9 | Excess attenuation from suspended sediment, which rises steeply with frequency and is what forces the payload downband. |
| [`04-sonar-equation-detection`](./04-sonar-equation-detection/) | 8 | The active sonar equation, detection threshold, and reverberation as the competing term. |
| [`05-lfm-chirp-design`](./05-lfm-chirp-design/) | 8 | Why a linear frequency modulated sweep, and how the sweep is parameterised. |
| [`06-pulse-compression-matched-filter`](./06-pulse-compression-matched-filter/) | 8 | Matched filtering, compression gain, and range resolution decoupled from pulse energy. |
| [`07-windowing-sidelobes`](./07-windowing-sidelobes/) | 8 | The transmit envelope window, its sidelobe floor, and why the pulse edges are tapered. |
| [`08-phase-coding-barker`](./08-phase-coding-barker/) | 8 | Barker-13, its 22.3 dB peak-to-sidelobe ratio, and constant-envelope phase coding. |
| [`09-adaptive-cognitive-sonar`](./09-adaptive-cognitive-sonar/) | 10 | The core claim: adapting the transmitted waveform to the measured environment, in a closed loop. |
| [`10-dds-waveform-synthesis`](./10-dds-waveform-synthesis/) | 7 | Generating the pulse in firmware with a phase accumulator and a lookup table rather than live trigonometry. |
| [`11-transducers-matching`](./11-transducers-matching/) | 10 | Transducer resonance, clamped capacitance, and the series matching network. |
| [`12-side-scan-seabed-imaging`](./12-side-scan-seabed-imaging/) | 10 | The application: what a side-scan payload is ultimately for, and what image quality depends on. |
| [`13-auv-platforms-survey`](./13-auv-platforms-survey/) | 10 | The host platform, its mission profile, and the constraints a payload inherits from it. |
| [`14-low-power-embedded`](./14-low-power-embedded/) | 10 | The duty-cycled power budget, and offloading the transmit path from the CPU. |
| [`15-ml-for-sonar`](./15-ml-for-sonar/) | 10 | The learned surrogate, and why the physics stays resident as a guard. |

---

## How to add a paper

1. Decide which single claim it supports. If it supports two, file it
   under the primary one and cross-reference in the other README.
2. Name it `YYYY-lower-case-hyphenated-title.pdf`.
3. Add a row to that folder's `README.md` with year, title, venue and link.
4. Update the count in this table.

If you cannot write one sentence saying what the paper supports, it does
not belong in the tree. An empty slot is better than a filler paper: a
judge who opens a folder and finds padding stops trusting the rest.

---

## Sourcing and licensing

Every PDF here was retrieved from a publisher-declared **open-access**
location, via the arXiv API or the OpenAlex open-access index. Sources are
arXiv, MDPI, Frontiers, PMC, IEEE Access and institutional repositories.

**Paywalled canonical references are cited, never copied.** Mackenzie 1981,
Francois and Garrison 1982, Ainslie and McColm 1998, Thorp 1967, Harris 1978,
Barker 1953 and Urick's *Principles of Underwater Sound* are foundational to
this design and are listed with their DOI under **Cite, obtain via
institution** at the end of the relevant folder README. Obtain them through
your college library; do not put them in this tree.

---

## Radar papers in a sonar project

Folders 05 to 10 lean heavily on radar literature. That is deliberate.
Pulse compression, matched filtering, windowing, phase coding and cognitive
waveform adaptation are the same mathematics in both domains; the radar
literature is deeper and far more open access. What differs is the medium,
the propagation speed and the timescale, not the signal processing.

Expect to be asked about this. The answer is that the ambiguity function
does not care whether the wave is electromagnetic or acoustic.

---

## Quality control applied

Automated collection produces noise. Three passes were run:

- **Relevance gate** — a paper is only kept if its title or abstract
  contains a term tying it to the folder's claim *and* a term tying it to
  the acoustic or radar domain.
- **Domain blocklist** — fields that share vocabulary but not subject
  matter were rejected: quantum optics, gravitational waves, biology,
  optical communications, microfluidics, solar physics.
- **Manual review** — every title was read. Duplicates and survivors of the
  automated passes were removed by hand.

Roughly 60 papers were discarded during curation. Papers that arrived but
did not survive review are not in this tree.
