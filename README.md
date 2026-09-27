# SeaNergy

SeaNergy is Hyper Grey's Smart India Hackathon 2026 project for Problem Statement
26058: a low-power, real-time adaptive software-defined sonar transmitter payload
for autonomous underwater vehicles. The problem sponsor is the Ministry of Earth
Sciences / National Institute of Ocean Technology.

This repository brings the embedded source, electrical and mechanical design,
operator application, acoustic research, dataset, validation framework and
submission material into one traceable engineering package.

## Start here

- PPT_PROJECT_CONTEXT.txt is the slide-authoring brief and project handoff.
- PS26058-technical-audit.md is the source-to-hardware evidence review.
- 00-submission contains the judging package and editable slide work.
- 07-documentation/technical-report contains the full technical report.
- 09-business contains the India-focused cost, market, roadmap and IP analysis.

## Repository map

| Folder | Contents |
|---|---|
| 00-submission | Executive material, compliance matrix, demo script and pitch deck |
| 01-hardware | KiCad RevB design, manufacturing outputs, BOM, wiring and enclosure |
| 02-firmware | ESP-IDF payload source, module documentation and measurement methods |
| 03-research | Literature indexed by acoustic or implementation claim |
| 04-software | Android and iOS operator console source, website and releases |
| 05-models | Reproducible generated dataset, notebook and model evaluation |
| 06-validation | Controlled test plan, projected datasets and result presentation |
| 07-documentation | Technical report, API, safety, user guidance and references |
| 08-media | Diagrams, slide imagery and media production assets |
| 09-business | Market, cost, intellectual-property and scaling material |
| 10-project | Ownership, risk and dated project decisions |

## Engineering architecture

The bench signal chain and the flight-payload source are distinct configurations.
The documented RevB circuit routes an ESP32-S3 40 kHz PWM signal through a gate
driver and MOSFET to a nominal 40 kHz transducer. It also provides external
sensor ADCs and a separate I2S audio path. The ESP-IDF source defines a
sensor-to-solver-to-DDS-to-I80 transfer architecture using 8-bit sample buffers.
The parallel DAC and analog reconstruction/output stages required to connect
that newer source to a complete sonar transmitter are not on the RevB PCB.

The generated dataset and mobile application provide decision-system research
and operator workflows. They do not stand in for a measured analog output.
Consult the technical audit for the precise implementation and evidence
boundary before reusing any number in a presentation or paper.

## Reproducible assets

- Hardware: 01-hardware/kicad, 01-hardware/pcb and 01-hardware/bom.
- Firmware: 02-firmware/src and 02-firmware/docs/build-and-flash.md.
- Application: 04-software/mobile-android and 04-software/mobile-ios.
- Dataset and methods: 05-models/dataset and 05-models/notebook.
- Test procedures: 06-validation/test-plan and 01-hardware/bench-setup.
- Research paper: 07-documentation/research-paper.
- India cost study: 09-business/cost-analysis.

For any performance figure, keep its configuration, source file, unit and
provenance together. A generated plot, PCB visualization or planned test is not
a physical instrument record. Raw measurements should include the instrument,
probe point, firmware revision, board revision and run conditions.

## Team

Hyper Grey is based at Maharaja Surajmal Institute of Technology. Pulkit leads
the team; Aarushi presents. Subsystem owners and backups are recorded in
10-project/team/ownership.md.
