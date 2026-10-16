# Firmware import record

Imported on October 16, 2026 into the local Hyper-Grey-SIH-26 checkout.

| Input | Role | Active destination |
|---|---|---|
| Supplied `seanergy-sonar-firmware/` folder | ESP32-S3 transmitter | [tx/](tx/) |
| Supplied `flying-fish-rx-with-graph-main.zip` | Classic ESP32 receiver and Python waveform/FFT viewer | [rx/](rx/) |

At import, all 15 TX project files were byte-identical to the supplied folder, including its PlatformIO configuration, headers, modules, tests, README and hardware guide. At import, RX `src/main.cpp`, `seanergy_rx_live.py`, `platformio.ini` and `.gitignore` were byte-identical to the ZIP. Subsequent comment cleanup changed the two RX source files without changing their executable content; the manifest retains the input hashes and records the current source hashes separately. RX's README was rewritten to describe the actual implementation, `requirements.txt` was added, and editor-specific `.vscode` settings were omitted. No runtime algorithm, GPIO or protocol was changed by this import. Original input files remain untouched.

The previous `02-firmware` files were moved unchanged into [legacy/esp-idf-payload/](legacy/esp-idf-payload/). New setup and architecture docs describe the active projects; repository, hardware and protocol indexes distinguish them from the old design. Generated build files and Python environments are ignored. The [SHA-256 manifest](import-manifest.json) records the imported files, input ZIP and previous repository commit.

## Verification from the imported locations

| Check | Result |
|---|---|
| TX `esp32s3_existing` cross-build | Passed; 37,796 B static RAM, 475,203 B flash |
| TX `esp32s3_pcm5102a` cross-build | Passed; 101,284 B static RAM, 538,691 B flash |
| TX `esp32s3_headless` cross-build | Passed; 36,012 B static RAM, 461,679 B flash |
| Existing TX host waveform tests, strict compiler warnings and undefined-behavior sanitizer | Passed; 409,765 checks |
| RX `esp32dev` cross-build | Passed; 30,364 B static RAM, 311,008 B flash |
| RX Python syntax and isolated FFT/rate/Nyquist checks with controlled input | Passed; 40 kHz carrier detected at 39,997.865 Hz with a stronger 80 kHz harmonic |
| Imported source identity and archived-file identity | Passed |
| Flashing, live serial/GUI, electrical/acoustic tests and measured power | Not performed |

TX uses its pinned pioarduino 55.03.39 platform. RX's supplied `platform = espressif32` is unpinned and resolved on this machine to installed pioarduino 55.03.39 / Arduino 3.3.9 / ESP-IDF 5.5.4. Another installation can resolve a different platform. Builds emit upstream framework/library warnings and RX legacy ADC/I2S deprecation warnings. TX has no project-source warnings in these builds.

Software checks establish compilation and controlled calculations. They do not validate RX's ADC word extraction or its wall-clock DMA-read sample-rate estimate; both are documented in the [RX measurement assumptions](rx/README.md#measurement-assumptions-to-validate). They also do not establish PCM/PWM timing, acoustic output, synchronization, ranging or mobile app connectivity. No commit, push or hardware upload was performed as part of this update.
