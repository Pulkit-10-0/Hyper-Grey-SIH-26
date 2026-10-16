# SEANERGY ESP32-S3 transmitter firmware

Replacement firmware for the supplied sketch, retaining its sensor, potentiometer, OLED, I2S, and GPIO16 connections. The default build keeps the existing MAX98357A and nominal 40 kHz transmitter hardware. Outputs start disarmed.

## What runs on the existing hardware

| Output | Implemented behavior |
| --- | --- |
| MAX98357A on GPIO5/6/7 | Real I2S hardware-clocked DMA playback at 48 ksample/s, with 1–8 kHz waveform settings |
| GPIO16 | LEDC carrier at 38–42 kHz; GPTimer controls burst start and cutoff; requested drive changes PWM duty |
| ADS1115 at 0x49 and GPIO1 | Five physical potentiometers control the adaptation policy |
| ADS1115 at 0x48 and DS18B20 | Real sensor voltage/temperature telemetry, validity, and stale-data detection |
| Four OLEDs | Sensor readings, controls, actual PCM buffer preview, applied output configuration and counters |

The DMA output supports LFM chirps, geometric/logarithmic sweeps, and Barker-13 BPSK, with Hann, Blackman, or endpoint-tapered Hamming envelopes. Barker-13 uses the midpoint of the two frequency settings as its carrier; its chip rate is 13 divided by the actual sampled pulse duration. It does not sweep between those settings.

**The GPIO16 output is a rectangular PWM burst. The PCM windows and modulation arrays are applied to the I2S output, not to GPIO16.** PWM duty does not directly set analog peak voltage or calibrated acoustic power. A measured analog filter, arbitrary 40 kHz DAC waveform, and 100–500 kHz sonar output cannot be created by changing firmware alone on the present hardware.

The optional `esp32s3_pcm5102a` build replaces the MAX98357A with a real PCM5102A line DAC on the same I2S pins, providing a 384 ksample/s, 38–42 kHz bench profile. Disconnect the MAX98357A before using this profile. It also requires the analog frontend and a suitable power driver; it does not meet the 100–500 kHz requirement. See [HARDWARE.md](HARDWARE.md) for wiring, circuit values, primary datasheets, and validation.

## Build and run

Open this directory as a PlatformIO project. The configuration pins pioarduino 55.03.39 / Arduino-ESP32 3.3.9 / ESP-IDF 5.5.4 and library versions. The default board definition is ESP32-S3-DevKitC-1-N8; verify flash size and USB/serial settings for the exact board before uploading. GPIO assignments match the supplied code.

```sh
pio run -e esp32s3_existing
pio run -e esp32s3_existing -t upload
pio device monitor -b 115200
```

Use `esp32s3_headless` for the same existing hardware without OLED updates, or `esp32s3_pcm5102a` only after installing that DAC. No upload was performed during development.

The serial console uses uppercase commands and newline termination:

```text
STATUS
MODE LFM
WINDOW HANN
ARM
MODE GEO
WINDOW BLACKMAN
MODE BPSK
STOP
```

`ARM` requires healthy potentiometer readings in the default automatic mode. Turning a control changes the next pulse configuration; an active DMA pulse finishes using its original configuration. `STOP` cancels the active transmission. `CLEAR` disarms and clears a latched runtime fault; `ARM` is then required again. Initialization failures require a reset.

To test without the sensor/potentiometer boards, explicitly select manual control:

```text
STOP
AUTO OFF
SET 1500 6000 12 0.25
MODE LFM
WINDOW HANN
PERIOD 250
ARM
STATUS
STOP
```

`SET` takes start frequency, end frequency, duration in milliseconds, and normalized PCM peak amplitude. Existing-hardware limits are 1000–8000 Hz, 4–28 ms, and amplitude 0–0.8. The optional DAC profile instead accepts 38000–42000 Hz. For that profile use, for example, `SET 39000 41000 12 0.10`.

`PERIOD` accepts 150–5000 ms; the minimum limits GPIO16 burst occupancy to less than 19% at a 28 ms pulse. `AUTO ON` resumes potentiometer adaptation and disarms so the source change is deliberate. `TELEMETRY OFF` reduces serial traffic; `STATUS` remains available. `HELP` lists commands.

## Timing and memory

The CPU synthesizes a replacement array between transmissions using a fixed-point carrier phase accumulator and a sine lookup table. It caches the most recent waveform; unchanged configurations reuse it. Floating-point envelope calculations run during preparation, never in the DMA or timer callback.

Before a transmission, `i2s_channel_preload_data()` copies the complete stereo waveform into the driver's DMA ring. The I2S peripheral then clocks the samples without per-sample CPU writes or a blocking playback loop. The ISR counts completed DMA descriptors. Auto-clear removes each transmitted block so a delayed task cannot replay stale pulse samples around the circular ring. One whole ring and the PWM cutoff must finish before the completion counter advances. A 500 ms control heartbeat, playback deadline, late PWM gate, and missed period trigger latched faults.

Each DMA ring includes a silent wake interval rounded to full DMA blocks: 21.33 ms at 48 ksample/s or 20 ms at 384 ksample/s. GPIO16 opens after that interval and closes after the commanded pulse duration. At least one full zero block follows the maximum-length PCM pulse. Clocks stop afterward. This provides wake time for the MAX98357A's specified turn-on delay and a starting margin for the optional DAC. Confirm onset, clock recovery, filter delay, and settling on the actual hardware; the interval is not a guaranteed PCM5102A settling specification. Analog onset and GPIO16 may differ slightly because I2S, GPTimer, and DAC group delay are independent.

The CPU sleeps in the transmitter task between events. There are no busy-wait sample loops. I2S stops between bursts, no network stack is started, ADS conversions and DS18B20 conversion waits are asynchronous, and only one display updates every 200 ms. Software I2C and OneWire transactions still consume CPU time; disable OLEDs to reduce it further. Measure battery current before claiming a power reduction. The enabled hardware timers also have clock/power-management costs; this is not a deep-sleep design.

There is one fixed 16-bit stereo source buffer plus the driver's DMA copy. The existing profile uses 11,264 bytes in each; the optional profile uses 74,752 bytes in each, plus descriptors and driver/task overhead. DMA trades RAM for less CPU service and does not compress waveform storage. Waveform storage and DMA allocations occur during initialization; synthesis does not allocate memory. Other library operations, including serial formatting, can use the heap. Build size reports describe static RAM only, excluding runtime DMA allocations.

The ping timer wakes a task to prepare/enable playback. Pulse samples have hardware clock timing; exact trigger-to-first-sample latency is not deterministic. `PREPARE_US` includes waveform preparation and preload, and `START_DELAY_US` measures alarm-to-playback-setup latency. Use these along with a scope when evaluating timing.

## Environmental controls and diagnostics

Potentiometers are explicitly the selected environmental control source. TDS, turbidity, and depth controls move frequency and bandwidth; depth and temperature controls change duration; the fourth pot and loss controls change amplitude. More turbidity/depth moves frequency downward. These are bounded prototype mappings, not calibrated underwater propagation equations. The real sensor voltages are reported separately until sensor-specific calibrations and a validated adaptation policy are supplied.

ADS conversions rotate through each channel with timestamps. Missing or stale controls disarm automatic transmission; recovery does not automatically re-arm it. DS18B20 uses asynchronous 10-bit conversions. Pressure telemetry checks the supplied divider and nominal sensor transfer range. No firmware can reliably detect a disconnected analog wire that floats to a plausible voltage; add suitable pull resistors and electrical diagnostics where required.

Original sensor/potentiometer serial labels are retained. Invalid readings now print `ERROR`, which existing parsers must handle. The misleading constant `Audio : 1000 Hz` field is removed because the audio output now carries the selected modulation. Status reports requested and applied PCM settings, actual LEDC carrier frequency, completion counts, preparation latency, and fault reason. The OLED plot is a sample preview, not an oscilloscope or measured FFT. `BACKEND` identifies the configured profile; I2S DACs do not acknowledge data and their physical presence is not automatically verified.

## Verification

Verified on October 16, 2026:

| Check | Result |
| --- | --- |
| Existing hardware cross-build | Passed; 37,796 bytes static RAM, 475,203 bytes flash |
| Optional PCM5102A cross-build | Passed; 101,284 bytes static RAM, 538,691 bytes flash |
| Headless cross-build | Passed; 36,012 bytes static RAM, 461,679 bytes flash |
| Strict host waveform build + undefined-behavior sanitizer | Passed; 409,765 checks |
| Upload, electrical/acoustic measurements, measured power | Not performed |

The pinned framework and OneWire emit upstream warnings; the project sources compiled without their own warnings in these builds.

The portable waveform tests compare generated samples with analytic LFM/geometric/Barker references, check all window/mode combinations, validate stereo/endpoint/amplitude behavior, reject non-finite/out-of-range inputs, and guard buffer boundaries.

```sh
c++ -std=c++17 -O1 -Wall -Wextra -Werror -pedantic \
  -fsanitize=undefined -Iinclude src/waveform.cpp tests/waveform_test.cpp \
  -o /tmp/seanergy-waveform-test
/tmp/seanergy-waveform-test
```

The tests also exercise a generic 4 Msample/s mathematical configuration; this does not imply a 4 Msample/s ESP32-S3 output backend. Host synthesis tests and successful cross-compilation do not verify physical timing, FFT quality, transducer power, acoustic range, or electrical protection. Follow the bench procedure in [HARDWARE.md](HARDWARE.md). Production qualification still needs physical measurements, calibrated sensing, hardware current/thermal protection, EMC and fault testing, and an enclosure suited to the intended depth.
