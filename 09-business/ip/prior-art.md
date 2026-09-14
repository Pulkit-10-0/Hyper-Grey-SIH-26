# Prior-art position and claim boundary

## 1. Baseline that is already known

Adaptive and cognitive sonar, matched filtering, the sonar equation, linear frequency-modulated chirps, Barker sequences, pulse compression, direct digital synthesis and environmental compensation are established techniques. SeaNergy must not claim ownership of these foundations in isolation.

The protectable case should focus on a specific embedded system and method that combines them under constrained compute, energy and safety limits. A patent agent should search patent families and technical literature using the claim chart below before filing.

## 2. Proposed patent family A

**Title:** Physics-constrained adaptive acoustic waveform controller for low-cost embedded underwater platforms

Proposed independent claim spine:

1. Acquire water temperature, dissolved-solids/salinity proxy, turbidity, battery and operating-mode inputs.
2. Generate a bounded set of waveform candidates on an embedded controller.
3. Estimate propagation loss, reverberation/noise exposure, transducer response and electrical energy for each candidate.
4. Reject candidates that violate voltage, current, duty-cycle, memory, timing or acoustic-margin limits.
5. Select a frequency, bandwidth, code and pulse duration that maximises a defined mission utility.
6. Synthesize the selected waveform through fixed-point DDS and deterministic DMA.
7. Publish the decision, guard margin and execution trace to a local interface.

Strong dependent claims can cover down-band selection when attenuation increases, safe fallback waveforms, fixed-point quantisation constraints, offline operation, per-ping energy accounting and deterministic timing markers.

## 3. Proposed patent family B

**Title:** Bounded learned surrogate for embedded acoustic waveform selection

Protect the architecture in which a learned surrogate proposes a waveform but a physics guard verifies every proposal before transmission. The differentiator is not generic machine learning. It is the safety-bounded interaction between measured environmental inputs, the surrogate, a deterministic feasibility guard and a recorded fallback.

## 4. Additional protectable assets

| Asset | Recommended protection | Reason |
|---|---|---|
| Enclosure access-cap, rail and sealed service layout | Indian design registration assessment | Visible industrial form can be separated from function |
| SeaNergy word/device mark | Trade mark application | Protects market identity in instruments and software |
| Firmware, app, figures and documentation | Copyright | Arises automatically; notices and authorship records improve evidence |
| Calibration coefficients and supplier-specific tuning | Trade secret | Commercial value depends on controlled access |
| Dataset schema and frozen dataset release | Copyright/database terms | Supports attribution and reproducibility |

## 5. Claim chart

| Element | Established field | SeaNergy claim emphasis | Evidence package |
|---|---|---|---|
| LFM/Barker/pulse compression | Yes | Combination selected under embedded constraints | Firmware interfaces and waveform catalogue |
| Sonar equation | Yes | Real-time feasibility guard and recorded margin | Solver equations, trace schema and decision log |
| Environmental adaptation | Yes | Multi-sensor, energy-aware selection with deterministic fallback | Sensor pipeline and candidate ranking |
| DDS/DMA synthesis | Yes | Fixed-point execution tied to guarded solver decision | Timing architecture and buffer schedule |
| Learned selection | Yes | Surrogate cannot bypass the physics and hardware guards | Notebook, exported model and acceptance limits |
| Dataset | Many sonar datasets exist | Published transmit-side decision dataset tied to environmental and energy labels | Dataset card, schema and generation record |

## 6. Search plan through 25 September

Search CPC/IPC areas for underwater acoustic systems, adaptive sonar, waveform selection, pulse compression, embedded DDS and physics-constrained machine learning. Search applicant and assignee portfolios from major sonar manufacturers, defence laboratories and ocean-instrumentation firms. Record the closest documents, map every proposed claim element and narrow the independent claim around the smallest defensible combination.

This file is an engineering IP strategy, not a legal opinion. Patent-agent review is the filing gate.

