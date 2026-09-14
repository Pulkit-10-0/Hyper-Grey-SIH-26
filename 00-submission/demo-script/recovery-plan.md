# SeaNergy demonstration recovery plan

| ID | Failure | Detection | Immediate action | Evidence fallback | Recovery target |
|---|---|---|---|---|---:|
| F-01 | Payload will not power | No LEDs or current | Disconnect driver, check polarity, use current-limited USB supply | C-01 physical-module card and hardware photographs | 30 s |
| F-02 | Sensor channel is invalid | Frozen, saturated or out-of-range flag | Switch to the matching analog dial and state the substitution | C-04 sensor-interface card and 33-block bench log | 15 s |
| F-03 | Telemetry disconnects | Live indicator changes state | Keep the payload running and switch the app to simulation/replay | Saved `D-04-adaptation` capture | 10 s |
| F-04 | Scope loses trigger | Unstable or blank trace | Load the saved trigger setup, then reduce repetition interval | C-07 output-validation card | 20 s |
| F-05 | Analog waveform is distorted | Clipping, oscillation or excess harmonics | Mute the amplifier, reduce amplitude, show DAC output before the driver | Software FFT and C-06 filter-window card | 30 s |
| F-06 | DDS/DMA hardware path is unavailable | No adaptive analog output | State that the current firmware build is the sensor/I2S testbed | 85-check log, app waveform lab and C-02 card | 10 s |
| F-07 | Matched filter fails | No stable correlation peak | Use the deterministic replay with the known delay | Verified 900-sample recovery and Barker result | 15 s |
| F-08 | Water demonstration is unavailable | Tank, transducer or medium issue | Run the physical dial injection and label the water result estimated | C-05 modelled sweep and tank-test plan | 10 s |
| F-09 | App closes | Missing screen or crash | Reopen the release build; use the website dossier if needed | 33 passed screen cases | 20 s |
| F-10 | Enclosure cannot be opened | Fastener or cable obstruction | Do not force it; use the exploded view and geometry evidence | C-01 and STL viewer | 10 s |

The secondary operator owns the timer, fallback files and verbal correction of provenance.
