# SIH 26058 technical evidence audit

**Project:** SeaNergy / Hyper Grey  
**Problem:** Low-power, real-time adaptive software-defined sonar transmitter payload for AUVs  
**Audit basis:** Repository contents available on 27 September 2026, the problem statement supplied by the team, and public component/acoustics references below.  
**Method:** Static source, design, document and image inspection. No firmware was built or flashed, no board was powered, and no instrument or tank test was run for this audit. Absence of repository evidence is not proof that a private test never occurred.

## Executive verdict

**The repository does not presently demonstrate the central deliverable of PS 26058: one physical, self-contained payload that reads an environmental input and emits an adaptively selected, conditioned analog sonar waveform through a DAC and amplifier.** It contains useful sensor-interface evidence, an actual older fixed-frequency electrical transmitter sketch, a newer but unproven DMA/DDS firmware path, a legal PCB design for a different signal chain, extensive models, and projected validation artifacts. These are meaningful engineering foundations, but they do not join into a verified end-to-end physical execution path.

The strongest positive evidence is the older serial session showing a connected board reading a DS18B20, two analog sensor channels and three changing potentiometer channels [legacy session](02-firmware/measurements/captures/legacy-sensor-session.txt#L1). That session reports 1 kHz audio; it does **not** record a sonar waveform, its spectrum, current draw, or sensor-driven transmitter changes. The current RevB PCB is explicitly not fabricated [hardware README](01-hardware/README.md); the current firmware release directory explicitly has no built payload binary [release note](02-firmware/releases/README.md#L11). The validation package identifies its numerical results as engineering projections [validation README](06-validation/README.md), despite `PASS` entries in result tables. The representative `step-01.jpg` is an illustration that says no production PCB exists, not a build photograph [image](01-hardware/assembly/photos/step-01.jpg).

**Compliance outcome:** partially implemented in source and design; **physical PS-level solution not verified and not demonstrated by the submitted evidence**. No overall numeric score is assigned because the PS supplies no official weights, and a precise percentage would falsely imply laboratory verification.

### Evidence categories used

| Label | Meaning in this audit |
|---|---|
| Fully implemented | Working path plus direct physical verification for the requirement. |
| Substantially implemented | Complete relevant path in deployed hardware/firmware, with a limited proof gap. |
| Partially implemented | Real source/design exists, but the path or essential function is incomplete. |
| Prototype / demo only | A limited physical or software demonstration does not meet the full clause. |
| Simulation only | Result comes from a model, generator or synthetic run. |
| Claimed but unimplemented | A document states it, while the inspected implementation lacks it. |
| Not implemented | No relevant implementation found in the inspected paths. |
| Not verifiable | Plausible private evidence may exist, but the submitted material cannot substantiate it. |

## 1. Repository reconstruction: all numbered folders

| Folder | What it contributes | Evidentiary weight for physical transmitter |
|---|---|---|
| `00-submission` | Pitch, executive material, compliance matrix and evidence cards. Its own [evidence index](00-submission/compliance-matrix/evidence/EVIDENCE_INDEX.md#L5) marks physical module, DMA, modes and sensors only partially met and output validation not met. | Claim/evidence index, not independent output proof. |
| `01-hardware` | RevB KiCad schematic, PCB, netlist, Gerbers, BOM, bench/enclosure procedures and illustrations. PCB is 100 x 100 mm, two copper layers and 91 references, but is explicitly **not fabricated** [hardware README](01-hardware/README.md), [fab order](01-hardware/pcb/fab-order.txt). | Electrical and mechanical design evidence only; some older external-board sensor evidence is separate. |
| `02-firmware` | ESP-IDF/FreeRTOS S3 source for sensor reading, rule selection, DDS, windowing and I80 DMA; older Arduino/PlatformIO bench sketch is under `01-hardware/kicad/firmware`. No payload release binary [release note](02-firmware/releases/README.md#L11). | Source implementation, not proof of deployment or analog output. |
| `03-research` | Curated paper index with 132 listed papers across 15 topic folders [index](03-research/README.md#L3). | Background science; does not validate the team's equations or hardware. |
| `04-software` | Android/iOS operator application, website and Android packages [README](04-software/README.md#L10). | Operator UI is not a DAC, sensor acquisition or physical sonar test. |
| `05-models` | Deterministically generated 20,000-row dataset, solver experiments and ML evaluation. Its own [provenance section](05-models/README.md#L178) says it is generated data, not measurement. | Simulation/method-development evidence. The model's 148-351 kHz selections cannot be attributed to the 40 kHz board. |
| `06-validation` | T-01 to T-16 plans, tables, CSVs and plots. The [README](06-validation/README.md) and [bench results](06-validation/bench-results/results.md) call the figures projections. | Scenario/acceptance planning, not verified oscilloscope, power or tank results. |
| `07-documentation` | Technical report, references, guide and safety material. Its [README](07-documentation/README.md#L34) checks whether test IDs resolve to files, not whether those files came from instruments. | Documentation, not independent physical evidence. |
| `08-media` | Diagrams and illustrations; the [photo register](08-media/photos/_CONTENTS.md#L6) describes photographs still needed. | Visual communication; no authenticated board/tank photographs in inspected photo register. |
| `09-business` | Market, IP and roadmap deliverables. | No technical implementation proof. |
| `10-project` | Risk, team and timeline. The [build log](10-project/timeline/build-log.md#L13) labels integrated rehearsals and calibration evidence as planned. | Coordination evidence, not achieved performance. |

### Two distinct, non-interchangeable configurations

| Configuration | Controller/output | Frequency and behavior | State |
|---|---|---|---|
| Older bench sketch / RevB circuit | ESP32-S3 Arduino sketch, GPIO16 LEDC to level translator, TC4426 gate driver, IRLZ44N and GU1008C-40T. Separate I2S/MAX98357A speaker path. | Fixed continuous 40 kHz TX PWM; fixed 1 kHz audio tone. Sensors and pots print to serial/display; they do not change the sonar TX. See [sketch](01-hardware/kicad/firmware/ESP32-S3/src/main.cpp#L103), [netlist](01-hardware/kicad/verification/schematic.net.xml), [schematic inventory](01-hardware/schematics/_CONTENTS.md#L20). | Limited bench sensor evidence; current RevB PCB itself is not fabricated. The older sketch is described as an uncompiled/untested copied source [firmware note](01-hardware/kicad/firmware/README.md). |
| Proposed ESP-IDF flight path | ESP32-S3, 8-bit I80 parallel output on GPIO35-42/WR47/CS48, nominal external DAC, INA226, FreeRTOS. | Fixed DDS tones selected from 24, 32, 40, 48, 60 and 80 kHz; pulse length/window changes by rule. | Source only, no matching DAC board or physical output capture; see [pin map](02-firmware/src/components/board/include/board.h#L19), [solver](02-firmware/src/components/solver/solver.cpp), [DMA](02-firmware/src/components/sonar_dma/sonar_dma.cpp). |
| Dataset/product study | Laptop-side 468-candidate model, assumed 100-500 kHz PZT band. | Selected centers 148-351 kHz in generated rows; LFM bandwidth/pulse estimates. | Generated/simulated, not the ESP-IDF controller or GU1008C-40T. See [generation method](05-models/dataset/generation.md#L39). |

The RevB layout explicitly says the earlier parallel converter bus is **not on this board** [stackup](01-hardware/pcb/stackup.md#L20). Therefore the ESP-IDF I80 output cannot be credited as a working path through that PCB. It would need another documented wiring harness/board and an identified DAC with rated sample rate and analog stages.

## 2. Embedded platform and execution paths

The selected main platform is an ESP32-S3 DevKitC-1 class board in the bench PlatformIO configuration and an ESP32-S3 target in the ESP-IDF `sdkconfig.defaults`; the exact module/flash/PSRAM variant on the physical setup is not identified. Espressif specifies a dual-core Xtensa LX7 up to 240 MHz, 512 KB on-chip SRAM, ADC, LCD/I80, I2S, timers and GDMA, but **no on-chip DAC** [ESP32-S3 datasheet](https://documentation.espressif.com/esp32_s3_datasheet_en.pdf). The older design has a separate classic ESP32 receive controller; it is not the high-speed TX DAC. The ADS1115 modules are 16-bit, four-input, I2C sensor ADCs rated up to 860 conversions/s, not DACs [TI ADS1115](https://www.ti.com/product/ADS1115).

**ESP-IDF source path:** `sensor_task` reads DS18B20 and ADS1115 channels at approximately a 1 s task period; `control_task` evaluates a plan every 20 ms and queues a ping; `tx_task` enables TX and calls `sonar_dma_transmit()` [main](02-firmware/src/main/main.cpp#L51). `solver_select()` chooses one fixed frequency, one of three sample counts, a window and battery-dependent amplitude [solver](02-firmware/src/components/solver/solver.cpp#L23). `dds_configure()` computes one constant phase step per pulse; `dds_next_q15()` advances it [DDS](02-firmware/src/components/dds/dds.cpp#L28). `fill_block()` computes/window-scales bytes into 1024-byte `DMA_ATTR` buffers and submits each block through ESP-IDF I80 `esp_lcd_panel_io_tx_color()` [DMA](02-firmware/src/components/sonar_dma/sonar_dma.cpp#L79). The I80 peripheral can use DMA, but the task waits for each block completion and refills in a loop; there is no demonstrated timer-triggered sample-by-sample DAC, circular DMA, overlapped ping-pong refill or captured continuity trace. The GPTimer schedules only a start delay, not the DAC sample clock. Espressif documents `pclk_hz` as the I80 pixel clock and transfer-complete callbacks as transaction boundaries [I80 guide](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/peripherals/lcd/i80_lcd.html).

**Bench sketch path:** LEDC continuously drives GPIO16 at 40 kHz; the I2S code emits a separate 1 kHz audio sine to MAX98357A [sketch](01-hardware/kicad/firmware/ESP32-S3/src/main.cpp#L695). The sensor variables are displayed/logged but not connected to frequency, duration or amplitude of the sonar GPIO output. This is a sensor/display plus fixed-tone electrical demonstrator, not adaptive sonar transmission.

No FPGA/HDL path or FPGA synthesis/timing reports were found in these implementation paths; FPGA-specific requirements are not applicable if the MCU approach satisfies the PS.

## 3. Requirement-by-requirement compliance

| PS capability | Observed implementation and limiting evidence | Verdict |
|---|---|---|
| Physical, self-contained payload | Current PCB Gerbers and enclosure drawings exist; fabrication, populated-board photographs, waterproofing and integrated output records are absent/marked open [hardware README](01-hardware/README.md), [dunk test](01-hardware/enclosure/dunk-test.md). | **Not verifiable** as a physical payload. |
| Physical sensor or analog control input | DS18B20, ADS1115 TDS/turbidity, three pots in source and connector design. The older serial session shows variable values [session](02-firmware/measurements/captures/legacy-sensor-session.txt#L21). It does not prove calibration or adaptation. | **Partially implemented**; limited prototype/demo evidence. |
| Physical DAC sonar output | ESP-IDF has proposed I80 data pins, but RevB netlist has no sonar DAC; bench sonar output is LEDC PWM/MOSFET. The 1 kHz I2S amplifier is a separate audio path. | **Not implemented** on the documented current hardware. |
| Low-pass reconstruction filter and TX amplifier | Current TX path uses gate driver/MOSFET; the MCP6002 is a **receive** gain stage. No documented measured TX reconstruction response or output op-amp path [schematic inventory](01-hardware/schematics/_CONTENTS.md#L27). | **Not implemented** for the required DAC/analog TX chain. |
| LFM chirp | ESP-IDF DDS phase step is constant through a pulse; no `f0`, `f1` or chirp-rate update in `solver_plan_t` [solver interface](02-firmware/src/components/solver/include/solver.h). Generated chirp plots are projections. | **Claimed but unimplemented** in inspected TX firmware. |
| Geometric/exponential sweep | No time-varying multiplicative frequency law in the inspected DDS/TX paths. | **Not implemented**. |
| Phase-coded pulse | No transmitted BPSK/Barker phase-bit application in the inspected DDS/TX path. Projected T-07 correlation is not physical TX evidence. | **Claimed but unimplemented**. |
| Dynamic waveform switching | Rule changes the fixed tone and envelope between pings in source; no physical I80/DAC output proof or glitch/transition capture. Bench TX remains 40 kHz. | **Partially implemented** in unproven source. |
| Adapt bandwidth/center, duration, power | Source selects center tone and one of 1.024/1.536/2.048 ms lengths; there is no nonzero sweep bandwidth. Amplitude changes only for a low battery threshold, not as a three-parameter environmental optimization [solver](02-firmware/src/components/solver/solver.cpp#L23). | **Partially implemented** (frequency/duration only in source). |
| Windowing | Hann, Tukey and Blackman Q15 envelopes are implemented and applied in `fill_block`; **Hamming is absent** despite appearing in validation plans [window](02-firmware/src/components/window/window.cpp). No physical sidelobe comparison. | **Partially implemented** in source. |
| Timer/DMA and low CPU load | I80 transfer uses DMA-capable peripheral; CPU generates each block and waits between transactions; GPTimer does not pace samples. The stated 97.6% idle is a projection [DMA](02-firmware/src/components/sonar_dma/sonar_dma.cpp), [validation](06-validation/README.md). | **Partially implemented** DMA offload; real-time/idle performance **not verifiable**. |
| Low-power operation | INA226 source reads voltage/current before/after ping; no complete-pulse current integration. `power_light_sleep_ms()` exists but is not invoked in `app_main` path [power](02-firmware/src/components/power/power.cpp), [main](02-firmware/src/main/main.cpp). | **Not verifiable** as low power; power-aware amplitude rule is partial. |
| Scope/FFT/THD/SFDR validation | The capture directory asks for native analyzer exports; available graphics are models. T-01 to T-16 numerical outputs explicitly projections [capture README](02-firmware/measurements/captures/README.md), [validation](06-validation/README.md). | **Not verifiable** for physical output. |
| AUV enclosure/deployment | Pod/CAD/seal design exist; dunk test says not performed and no pressure/corrosion/connector qualification exists [dunk test](01-hardware/enclosure/dunk-test.md). | **Design only**; not AUV-ready. |

### Physical path that can actually be traced

| Stage | Older bench path | Proposed flight path |
|---|---|---|
| Input | DS18B20 and ADS1115 modules/pots; serial log provides limited connected-system evidence. | Same types read in `sensors_read()`, including pot readings. |
| Decision | No connection from sensors to TX PWM. | `solver_select()` receives temperature/TDS/turbidity/battery. Pot readings are stored but not used to choose the plan. |
| Synthesizer | LEDC fixed 40 kHz square wave; separate 1 kHz I2S sine. | Constant-frequency 256-entry sine-LUT DDS plus optional envelope window. |
| Sample transfer | LEDC hardware PWM, not a sonar DAC buffer. | I80 DMA transactions sourced by CPU-filled 1024-byte buffers; no matching RevB DAC. |
| Analog output | TC4426/IRLZ44N drives nominal 40 kHz GU1008C-40T electrically if built as designed. | DAC, reconstruction filter, output amplifier, impedance matching and transducer not present on documented RevB path. |
| Verification | Sensor serial output only in submitted raw capture folder. | No flash image, native scope trace, bus capture or DAC-output FFT in submitted captures. |

## 4. Waveform mathematics, sampling and timing

For an LFM pulse, phase must contain a quadratic time term, `2*pi*(f0*t + 0.5*k*t*t)`, with `k=(f1-f0)/T`. A geometric sweep requires a frequency law such as `f(t)=f0*(f1/f0)^(t/T)` and integrated phase. A phase code requires carrier sign/phase changes at chip boundaries. The actual DDS uses a **constant** phase increment throughout each pulse [DDS](02-firmware/src/components/dds/dds.cpp#L28); changing the selected tone between pings does not turn each ping into any of these three modulations. The generated data and documentation may implement or illustrate those mathematics on a laptop, but that is not a transmitted waveform.

The ESP-IDF source defines 2,000,000 samples/s. If truly achieved, 24, 40 and 80 kHz tones have about 83.3, 50 and 25 samples/cycle, respectively, and the three sample counts yield 1.024, 1.536 and 2.048 ms pulses. A hypothetical 500 kHz tone would have four samples/cycle at 2 MSps: above Nyquist but poor for a low-distortion, filtered analog sine. Neither a DAC capable of that rate nor a 100-500 kHz transducer is evidenced on RevB. The GU1008C-40T/R manufacturer sheet identifies a 40 kHz **open** transducer and plots sensitivity only around its resonance; it does not establish 24-80 kHz broadband operation, much less underwater operation [manufacturer datasheet](https://robu-prod-media.s3.ap-south-1.amazonaws.com/uploads/2024/10/C242178.pdf).

The I80 configuration sets a **20 MHz pixel clock** while software metadata says **2 MSps** [DMA](02-firmware/src/components/sonar_dma/sonar_dma.cpp). Pixel-clock setting alone does not prove the effective contiguous sample period at DAC pins; command/CS framing and inter-transaction gaps must be checked on a logic analyzer. The claimed T-12 8.4 microsecond refill for 1,024 CPU-generated samples would allow about `240 MHz * 8.4 us / 1024 = 1.97` CPU clock cycles per sample, too little for the documented DDS/window/multiply/store loop. This makes that projected timing particularly implausible until a cycle trace explains it. The 97.6% CPU-idle and 2.003 MSps figures must not be presented as measured.

**Real-time interpretation:** the `control_task` period is 20 ms, but environmental acquisition is about once per second and includes a blocking DS18B20 conversion of about 750 ms [sensor source](02-firmware/src/components/sensors/adc_sensors.cpp#L102), [main](02-firmware/src/main/main.cpp#L51). A 20 ms decision loop is not a 20 ms sensor-to-output response. A plan is queued and applied on a later ping; input changes during a pulse do not intentionally rewrite its current buffer, which is safer than mid-pulse mutation, but start-of-next-ping transition quality is unmeasured. The reported 1.25-1.49 ms sensor-reading-to-waveform-start interval from the team is an **unverified recollection**, not a repository trace, and cannot substitute for a timestamped sensor-edge/ADC/CS/analog-output capture.

## 5. Sensor and adaptation audit

| Input | Physical provision | Firmware sampling/calibration | Used by ESP-IDF solver? |
|---|---|---|---|
| Temperature | DS18B20 one-wire probe; serial session shows ~28.69-28.75 C after an initial `ERROR`. | Blocking conversion; no calibration certificate or immersion map. | Read and passed, but `physics_margin_db_x10()` calls absorption at hard-coded 25 C, so measured temperature does not affect that margin. |
| TDS/conductivity | ADS1115 external module; serial log shows voltage changes are small. | Raw-to-TDS mapping in source; no seawater salinity calibration. | Used as a penalty/model input. TDS in mg/L is not interchangeable with seawater practical salinity without calibration. |
| Turbidity | ADS1115 external module. | Raw-to-NTU mapping; no standards/particle-size calibration record. | Thresholds choose RANGE above 80 NTU and DETAIL below 15 NTU. |
| TDS/turbidity/temperature pots | Three ADC channels; serial log demonstrates changing voltages. | Voltage recorded in `sensor_snapshot_t`. | **No:** pot fields do not feed the inspected solver decision; not a valid demonstrated adaptive control route. |
| Depth/pressure/pH | Discussed in some app/model/product material. | No corresponding physical acquisition in inspected ESP-IDF sensor snapshot or RevB TX path. | **No.** |
| Battery | Power monitor/board voltage in ESP-IDF source. | INA226 current/voltage source exists; no calibrated physical trace. | Yes: low-voltage mode/amplitude threshold, but not an environmental sonar measurement. |

The actual selection algorithm is a **small threshold/rule system**, not AI or a continuous mathematical optimum. Six discrete frequencies are scored with a simplified margin and two ad hoc mode bonuses [solver](02-firmware/src/components/solver/solver.cpp#L23). Model/ML experiments in `05-models` are neither deployed in this firmware nor physically trained against this transmitter. Calling the selected tone an adaptive **bandwidth** is technically wrong: a fixed-frequency pulse has only envelope-limited spectrum, not a controllable LFM sweep bandwidth.

The firmware physics model also cannot be treated as validated underwater acoustics. At 100 m (`range_cm=10000`), `spreading_db_x10=(range_cm-100)/5` produces **198 dB** as a supposed spreading term, while spherical one-way spreading from a 1 m reference is `20 log10(100)=40 dB` [physics source](02-firmware/src/components/physics/physics.cpp#L19), [NOAA treatment](https://repository.library.noaa.gov/view/noaa/33668/noaa_33668_DS1.pdf). The absorption function is named `db_km_x1000` but its multiplication/division in `physics_margin_db_x10()` is inconsistent with conversion of centimeters to kilometers and tenths of a dB; its temperature argument is also fixed at 25 C [physics source](02-firmware/src/components/physics/physics.cpp#L10). The constant NTU/TDS penalty has no submitted calibration to acoustic sediment loss. These are substantive algorithmic faults, not merely missing citation polish.

External science supports the *general direction* that absorption depends on frequency and seawater conditions: the original Francois-Garrison ocean measurements model temperature, salinity and depth [Part I](https://pubs.aip.org/jasa/article/72/3/896/637448/Sound-absorption-based-on-ocean-measurements-Part). USGS research shows suspended-sediment acoustic attenuation depends on concentration, **grain-size distribution and frequency**, so optical turbidity alone is not a universal loss coefficient [USGS study](https://www.usgs.gov/publications/long-term-continuous-acoustical-suspended-sediment-measurements-rivers-theory-0). A lower-frequency response to some turbid conditions is a defensible hypothesis, not a verified universal rule for this device. Higher bandwidth can improve compressed-pulse range resolution, but only if the complete transducer/analog path passes that bandwidth [NOAA acoustic workshop](https://spo.nmfs.noaa.gov/sites/default/files/TM192_0.pdf).

## 6. Analog, power, spectrum and enclosure findings

**DAC/reconstruction:** Current RevB netlist has TX_PWM -> level/gate driver -> MOSFET -> 40 kHz transmitter and a distinct I2S -> MAX98357A speaker. It has no identified parallel sonar DAC. The MCP6002 is on the receive side, so its gain/bandwidth/slew rate cannot establish transmitter-fidelity compliance. With no implemented TX DAC/LPF/op-amp stage, there are no applicable measured TX filter cutoff, passband, gain, rail, slew-rate, load-current or THD values to calculate. A document's proposed 400 kHz filter sweep is a test setting, not an as-built filter response [instrument settings](01-hardware/bench-setup/instrument-settings.md#L7).

**Transducer:** A nominal GU1008C-40T connector is in RevB design and older PWM source. No impedance sweep or acoustic transmit capture is submitted [characterization plan](01-hardware/bench-setup/transducer-characterisation.md). The manufacturer specifies an open 40 kHz part [datasheet](https://robu-prod-media.s3.ap-south-1.amazonaws.com/uploads/2024/10/C242178.pdf). Electrical generation and acoustic propagation must be separately demonstrated. Presently even the electrical adaptive DAC output is unverified; underwater transmission is further unverified.

**Low power:** DMA use can offload transfer but cannot itself prove low energy. `power_begin_ping()` and `power_end_ping()` read endpoint samples and estimate `V * I * duration`; they do not integrate `P(t)` through the burst [power source](02-firmware/src/components/power/power.cpp#L25). This can miss the TX current entirely if sampled after disabling the driver. Sleep helper is unused on the main path. The `0.93 mJ/ping` result in [bench results](06-validation/bench-results/results.md) is explicitly projected. A separate team-recalled run put energy 48.0-48.9% above a recalled 4.33-4.65 mJ limit (arithmetically about 6.41-6.92 mJ/ping); without run configuration, raw current/voltage/time series or an instrument ID, that recollection must be labeled **unverified reported result**, not compared as though it were the same setup as the projection.

**FFT/oscilloscope:** T-02 lists 51.6 dBc SFDR, T-10 2.003 MSps and 97.6% idle, T-11 0.93 mJ, T-13 34.1 ms mean adaptation, plus projected chirp/Barker/tank/immersion `PASS` claims [bench results](06-validation/bench-results/results.md), [tank results](06-validation/tank-results/results.md). The instruments [setting sheet](01-hardware/bench-setup/instrument-settings.md#L11) sets a finished-product target of **55 dBc** SFDR, while the validation [test plan](06-validation/test-plan/test-plan.md) uses **45 dBc** as its T-02 pass threshold. Therefore 51.6 dBc would miss the 55 dBc product target even if it were measured. The team's recalled 50.0-50.9 dBc reading also falls short but is not independently verifiable. No native scope/FFT record with sample rate, probe point, instrument settings and raw waveform is available in the inspected captures [capture README](02-firmware/measurements/captures/README.md).

**Mechanical/environmental:** RevB dimensions and mounting holes are documented; enclosure CAD and seal-design math exist. [Dunk-test record](01-hardware/enclosure/dunk-test.md) says **not performed**, and [bench setup](01-hardware/bench-setup/bench-setup.md#L39) says the tank rig and photos remain open. A projected 120-minute immersion line in the validation results is not an immersion qualification. There is no demonstrated pressure rating, connector sealing, corrosion endurance or AUV mounting/thermal trial. Do not present the design as underwater deployable.

**Cybersecurity/safety:** BLE command reception checks length, magic, version and CRC but the inspected GATT command characteristic permits writes without an encryption/authentication requirement [link source](02-firmware/src/components/link/link.cpp#L54). CRC detects accidental corruption; it is not access control. A nearby unauthorized device could potentially request a transmit action if the radio path is enabled. This is a design review issue, not a demonstrated exploit, and belongs in the risk register before vehicle integration.

## 7. Environmental scenario matrix

| Scenario | What source would do | What is physically supported by submitted evidence | Verdict |
|---|---|---|---|
| A. Muddy estuary | ESP-IDF rule chooses RANGE if turbidity >80 NTU, generally biasing to a lower fixed tone and longer pulse. | Old serial log shows a turbidity ADC voltage, not calibrated muddy-water switching or analog waveform. T-15 tank results are projections. | Source-level partial; physical outcome **not verifiable**. |
| B. Clear shallow water | Below 15 NTU, DETAIL mode biases higher tone and shorter pulse. | No scope/transducer comparison or measured spatial resolution; no real depth input. | Source-level partial; physical outcome **not verifiable**. |
| C. Deep water | No depth/pressure measurement in inspected TX firmware; range input is not a live pressure input. | No deep-water acoustic output or pressure test. | **Not implemented** as environmental depth adaptation. |
| D. Rapid change | New snapshot can alter a later ping, not the current synthesized block. About 1 s input refresh; 20 ms control loop. | No timestamped change-to-output capture; transaction-boundary glitches unmeasured. | Partial source, performance **not verifiable**. |
| E. Maximum frequency | ESP-IDF tone candidate up to 80 kHz; model extends to 500 kHz. | 40 kHz resonant open transducer; no matching flight DAC/filter/amp. | **Not verifiable** at 80 kHz; 500 kHz **not implemented** on documented hardware. |
| F. Low battery | Rule selects RANGE below one battery threshold and reduces amplitude below another. | No measured per-ping or endurance benefit. | **Partially implemented** in source. |

## 8. Claim versus reality

| Project claim or impression | Where it appears | Actual evidence | Reality / severity |
|---|---|---|---|
| Adaptive physical sonar payload | Submission, technical report, app and slides | Sensor log; separate fixed-40-kHz sketch and unproven adaptive firmware; no integrated DAC board. | **Critical:** central physical claim unproven. |
| 100-500 kHz finished band | Dataset/product study [generation](05-models/dataset/generation.md#L53) | Synthetic search grid, not transducer/driver measurements. | **Critical** if represented as built capability. |
| LFM, geometric and Barker TX | Test plan/figures | Inspected TX DDS has constant frequency/phase progression. | **High:** three required modes absent in firmware. |
| Timer-paced 2 MSps DMA, 97.6% CPU idle | Firmware docs and projected T-10 | I80 DMA transactions at 20 MHz pclk; CPU fill/wait; no logic-analyzer/idle trace. | **High:** sample cadence and idle number unverified. |
| Low-distortion 51.6 dBc SFDR | Projected T-02 | No physical FFT; below 55 dBc product target. | **High:** not an acceptance result. |
| 0.93 mJ per ping / low power | Projected T-11 | Endpoint-based energy estimator, no burst integration trace. | **High:** energy claim unverified. |
| Tank adaptation and immersion PASS | T-14/T-16 projected results | Tank layout and dunk procedure open; no native tank/immersion record. | **Critical** if described as performed testing. |
| AUV-ready/field deployable | Enclosure and pitch materials | CAD, 100 x 100 mm PCB layout, not fabricated/sealed/qualified. | **High:** design intent only. |
| AI-optimized transmitter | Model folder/app narrative | Generated-data model is not deployed in inspected ESP-IDF TX path; active rule is threshold logic. | **Medium:** label model work accurately. |

## 9. Simulation versus physical implementation

| Component/result | Simulation/design | Physical evidence in repository | Classification |
|---|---|---|---|
| Sound-speed/absorption and 468-candidate solver | Laptop dataset and plots | No acoustic calibration tying it to board. | **Simulation only** for performance. |
| RevB PCB | Complete KiCad/DRC/ERC/Gerbers | Fab-order and README say not ordered/fabricated. | **Design only**. |
| Sensors/pots | KiCad connector design and two source paths | Legacy serial log of changing values; no calibration or authenticated photo. | **Prototype/demo evidence**, limited. |
| Fixed 40 kHz electrical TX | LEDC source and gate-driver circuit | No submitted scope trace of TX_GATE or transducer terminals. | **Partially implemented**, physical output not verifiable. |
| Adaptive 24-80 kHz DMA/DDS TX | ESP-IDF source | No matching DAC on RevB, firmware binary or oscilloscope trace. | **Source only**, end-to-end not implemented. |
| LFM/Barker/geometric output | Generated/projected test plots | No corresponding TX firmware path or raw hardware capture. | **Simulation only / claimed but unimplemented**. |
| Power, THD, SFDR, CPU idle | T-series CSVs and plots marked projected | No time-aligned native instrument exports. | **Engineering projections**, not measurements. |
| Tank range/echo/adaptation | Tank plan and projected results | Tank rig/photos remain open. | **Simulation only** in submitted evidence. |
| Enclosure immersion | CAD and projected 120-minute result | Dunk-test status not performed. | **Design/projection only**. |

## 10. Priority corrections before an SIH demonstration

1. **Unify one build.** Choose the actual board and firmware; document the exact ESP32-S3 module, DAC part, data/WR/CS wiring, filter, amplifier/driver, load and transducer. RevB as documented cannot support the proposed parallel-DAC firmware.
2. **Create the actual PS waveform path.** Implement selectable LFM, exponential/geometric and phase-coded bursts in the MCU transmitter, with explicit sample rate, `f0/f1`, chip clock, amplitude, duration, bounded parameter updates and no discontinuities between DMA blocks.
3. **Repair the acoustic decision model.** Fix spreading/absorption units, use measured temperature rather than a fixed 25 C, separate optical NTU from acoustic sediment loss, calibrate TDS/salinity and bound all choices by the characterized transducer/analog passband. Avoid calling this AI unless an actual model is deployed.
4. **Demonstrate a real sensor-to-analog chain.** Save a single time-correlated recording that shows a changed physical pot/sensor input, ADC value, selected parameters, DAC pins, analog output and next-ping update. Identify run configuration and instrument IDs.
5. **Capture raw physical acceptance evidence.** Native scope/logic-analyzer CSVs for every modulation type, FFT/THD/SFDR at the transmitter output and load, filter sweep, current waveform integrated as `E_ping = integral V(t)I(t)dt`, CPU timing and underrun/transaction-gap checks. Retain plots as derived views, not substitutes for raw records.
6. **Resolve safety/claims before release.** Keep projected CSVs and image renders explicitly labeled; reconcile 45 versus 55 dBc criteria; secure command writes; do not call the enclosure sealed or the tank trial passed before physical qualification.

## References and provenance notes

1. **Authoritative requirement:** PS 26058 text supplied with the audit request, including the physical DAC/analog-output requirement and permission to use pots as simulated environmental inputs.
2. **Component limits:** [Espressif ESP32-S3 datasheet](https://documentation.espressif.com/esp32_s3_datasheet_en.pdf); [TI ADS1115 product/datasheet](https://www.ti.com/product/ADS1115); [TI INA226 product/datasheet](https://www.ti.com/product/INA226); [Espressif I80 interface documentation](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/peripherals/lcd/i80_lcd.html); [GU1008C-40T/R manufacturer specification](https://robu-prod-media.s3.ap-south-1.amazonaws.com/uploads/2024/10/C242178.pdf).
3. **Acoustics:** [Francois and Garrison, JASA 72 (1982), Part I](https://pubs.aip.org/jasa/article/72/3/896/637448/Sound-absorption-based-on-ocean-measurements-Part); [NOAA acoustic propagation derivation](https://repository.library.noaa.gov/view/noaa/33668/noaa_33668_DS1.pdf); [USGS sediment-acoustics study](https://www.usgs.gov/publications/long-term-continuous-acoustical-suspended-sediment-measurements-rivers-theory-0); [NOAA acoustic-technology workshop](https://spo.nmfs.noaa.gov/sites/default/files/TM192_0.pdf).
4. **Reported but not independently documented:** The team recalled 1.25-1.49 ms from sensor reading to waveform start, 50.0-50.9 dBc SFDR, and 48.0-48.9% energy over a recalled 4.33-4.65 mJ/ping budget. These may refer to a different bench configuration. They are not combined with the projected validation rows and are not scored as measured evidence without raw instrument files and a run manifest.

**Bottom line for evaluators:** A physically connected sensor-display/fixed-tone demonstrator and extensive transmitter design work are visible. An adaptive, low-power, multi-modulation **physical analog sonar transmitter payload** is not established by this submission's traceable evidence. The next defensible milestone is one recorded, end-to-end adaptive electrical output from the same assembled hardware and firmware, followed by acoustic and enclosure qualification.
