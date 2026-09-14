# SeaNergy — Hyper Grey, SIH 2026

**PS 26058** — Low-Power, Real-Time Adaptive Software-Defined Sonar Transmitter
Payload for AUVs
**Ministry of Earth Sciences / National Institute of Ocean Technology**

---

## How this repository is organised

Eleven top-level folders, numbered in the order a judge would meet them. Every
innermost folder contains a `_CONTENTS.md` stating exactly what belongs there,
the page limit for any PDF, the facts and figures it must carry, and what
counts as done.

Read `_CONTENTS.md` before putting anything in a folder.

```
00-submission/     what a judge sees first
01-hardware/       the physical design
02-firmware/       what runs on the payload
03-research/       the literature each equation rests on
04-software/       app, website, releases
05-models/         the dataset and the learned surrogate
06-validation/     every measured number
07-documentation/  the written record
08-media/          video, photographs, diagrams
09-business/       market, roadmap, IP
10-project/        team, timeline, risk
```

---

## What changed from SIH 2025

Last year's submission was strong on code and weak on evidence. Five folders
held nothing but a `readme.md`. This structure closes those gaps directly.

| 2025 | 2026 |
|---|---|
| `hardware/schematics/` held a Python script | `01-hardware/schematics/` requires KiCad source, PDF sheets and a clean ERC |
| `hardware/assembly/` was a readme | `01-hardware/assembly/` requires a photographed, step-numbered guide and a bring-up procedure |
| No BOM anywhere | `01-hardware/bom/` with MPNs, cost at three quantities and procurement status |
| No mechanical folder | `01-hardware/enclosure/` with CAD, o-ring dimensions and an immersion test |
| `documentation/api-docs/` was a readme | `07-documentation/api/` requires byte-level packet layouts |
| `documentation/user-guides/` was two duplicate readmes | `07-documentation/user-guide/` requires a screenshotted 8-page guide |
| No test plan, no results folder | `06-validation/` is its own top-level section with a traceability matrix |
| No compliance matrix | `00-submission/compliance-matrix/` — the highest-return artefact in the set |
| No FMEA or safety analysis | `07-documentation/safety/` |
| An Android project inside a folder named `ios` | `04-software/mobile-ios/` states its own status honestly |
| 15 reference PDFs with no notes | `03-research/` — 132 papers in 15 folders, each keyed to the claim it supports |
| No iOS artefact of any kind | `04-software/mobile-ios/` holds a real generated Xcode project and a verified iOS bundle |
| No risk register or decision record | `10-project/` |

---

## Published artefacts

| Artefact | Location |
|---|---|
| Kaggle notebook | <https://www.kaggle.com/code/prakhar1803/adaptive-sonar-waveform-selection> |
| Dataset | `05-models/dataset/`, CC BY 4.0, 20,000 x 27 |
| Android package | `04-software/releases/` |
| Technical report | `07-documentation/technical-report/technical-report.pdf` |

---

## Page limits, in one place

| Document | Limit |
|---|---|
| Executive summary | 2 pages |
| One-pager | 1 page |
| Compliance matrix | 2 to 3 pages, landscape |
| Pitch deck | 12 to 15 slides |
| Technical report | 25 to 30 pages, excluding appendices |
| Test plan | 6 to 8 pages |
| Assembly guide | 6 to 8 pages |
| User guide | 8 to 10 pages |
| Quick start | 1 page |
| Schematic PDF | 4 to 6 sheets |
| Mechanical drawings | 2 to 3 pages |
| FMEA | 3 to 4 pages |
| Market sizing | 3 to 4 pages |
| Roadmap | 2 pages |
| BOM PDF | 2 pages |
| Full demo video | 4 to 6 minutes |
| Short demo video | 90 seconds |

---

## The numbers this submission stands on

Every one of these must exist, be measured rather than asserted, and appear
identically in the compliance matrix, the technical report and the deck.

| Claim | Where measured |
|---|---|
| CPU idle fraction during transmit | `02-firmware/measurements` |
| Sustained parallel bus sample rate | `02-firmware/measurements` |
| Peak sidelobe level, four windows | `06-validation/bench-results` |
| Compression gain against time-bandwidth product | `06-validation/bench-results` |
| Barker-13 peak-to-sidelobe ratio | `06-validation/bench-results` |
| Range resolution, unmodulated against compressed | `06-validation/tank-results` |
| Range accuracy against a tape measure | `06-validation/tank-results` |
| Centre frequency swing against turbidity | `06-validation/tank-results` |
| Energy per ping and endurance | `02-firmware/measurements` |
| DDS against naive trigonometry | `02-firmware/measurements` |
| Surrogate error and safety-violation rate | `05-models/evaluation` |
| Immersion test result | `01-hardware/enclosure` |

---

## Rules that apply everywhere

1. **No claim without a number**, and no number without a file behind it.
2. **State what is not real.** The reality ledger is a feature, not an
   admission. Volunteering a limitation before it is found is worth more than
   any additional feature.
3. **Simulated is labelled simulated**, at the moment it is shown.
4. **Every figure has axis labels with units** and a caption saying what to
   look at.
5. **Two owners per subsystem.** No single point of failure in the team.
6. **Every fallback is tested.** An untested fallback is a wish.
7. **Nothing depends on venue internet or venue instruments.**

---

## Build order

The folders are numbered for reading, not for building. Build in this order:

1. `06-validation/test-plan` — decide what you will measure before you measure it
2. `01-hardware/bench-setup` — the rig, characterised
3. `02-firmware/measurements` — the low-power evidence
4. `06-validation/bench-results` — dry measurements
5. `06-validation/tank-results` — water
6. `00-submission/compliance-matrix` — fill it from the results
7. `07-documentation/technical-report` — write it from the matrix
8. `00-submission/executive-summary` and `pitch-deck` — write these last, from
   the report

Writing the summary first is how projects end up with claims nothing supports.
