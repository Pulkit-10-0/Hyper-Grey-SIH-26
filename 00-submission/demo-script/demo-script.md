# SeaNergy six minute demonstration script

SIH 2026 problem statement 26058. Team Hyper Grey.

## Demonstration boundary

The current table demonstration uses physical sensor inputs and analog control dials. Water behaviour, power, endurance, THD and SFDR are estimates until the named tests are complete.

| Beat | Elapsed time | What we do | What we say | What the judge should see | If it fails |
|---|---:|---|---|---|---|
| D-01 | 0:00-0:30 | Hand over the compliance matrix and one-pager. Point to the status and provenance columns. | "Every requirement has a current result, a finished-product target and an evidence file." | Eight PS clauses mapped to proof, estimates and open tests. | Use printed copies from the document wallet. |
| D-02 | 0:30-1:15 | Select CW at the same pulse duration as the design chirp. | "An unmodulated 3.476 ms pulse resolves about 2.68 m in the design water case." | Broad uncompressed response and the calculated baseline. | Open the offline capture named `D-02-cw-baseline`. |
| D-03 | 1:15-2:15 | Select LFM and show the matched-filter output. | "The 69.175 kHz sweep gives TBP 240.5, 23.81 dB calculated gain and 1.08 cm resolution." | Narrow compressed peak beside the CW baseline. | Use the verified app replay and explain that the number is calculated. |
| D-04 | 2:15-3:15 | Ask a judge to turn the turbidity control from clear toward muddy. | "The estimator re-scores the water. The model moves from 351 kHz at 5 NTU to 148 kHz at 1,000 NTU." | Centre frequency falls, bandwidth narrows and the explanation changes without a hard-coded turbidity branch. | Use the four-row sweep card. State that water performance is estimated. |
| D-05 | 3:15-4:00 | Toggle rectangular, Hann, Hamming and Blackman windows. | "Rejection improves from -13.40 dB to -58.33 dB, while the main lobe widens." | Live spectrum and peak-sidelobe values update. | Use evidence card C-06 and the automated verification log. |
| D-06 | 4:00-4:45 | Select Barker-13 and fire a software ping. | "The thirteen-chip code produces a verified 22.28 dB peak-to-sidelobe ratio." | Phase reversals and compressed correlation peak. | Show the Barker known-answer result in the verification log. |
| D-07 | 4:45-5:30 | Open Power and set the ping interval to 10 seconds. | "The model estimates 5.58 mJ per ping and 7.26 hours from a 2,600 mAh 3S pack." | Energy breakdown, duty cycle and endurance. | Use C-08. State that current-shunt validation is still open. |
| D-08 | 5:30-6:00 | Open the pod, show the board and hand over the validation plan. | "The bench path is real. Water, sealing, DMA output and absolute power are the next measurements." | Hardware, labelled connectors, V1 envelope and the evidence register. | Use photographs, the STL geometry card and the recovery plan. |

## Rehearsal record

| Run | Operator | Planned date | Actual duration | Deliberate failure | Result |
|---|---|---|---:|---|---|
| R-01 | Primary operator | To schedule |  | None |  |
| R-02 | Secondary operator | To schedule |  | Hardware output disconnect |  |
| R-03 | Primary operator | To schedule |  | App telemetry disconnect |  |

Acceptance requires three timed runs. One run must include a deliberate hardware failure. A second team member must complete the full script alone.
