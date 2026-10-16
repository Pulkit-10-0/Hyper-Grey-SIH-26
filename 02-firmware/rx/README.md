# SeaNergy receiver firmware and live graphs

This project combines classic ESP32 ADC capture with a Python live waveform and FFT viewer. It includes receiver firmware, PlatformIO configuration, desktop analysis, and Python dependencies. The [import record](../IMPORT.md) documents the supplied source package and verification.

The firmware captures analog receiver samples and sends them over USB serial. The desktop Python viewer plots the waveform and its FFT as a standalone receive-analysis workflow.

## Hardware and project layout

| Item | Configuration in the supplied code |
| --- | --- |
| MCU | Classic ESP32, PlatformIO `esp32dev`; separate from the ESP32-S3 TX board |
| Analog signal input | GPIO34, `ADC1_CHANNEL_6` |
| ADC configuration | 12 bits, 11 dB attenuation |
| Capture peripheral | Legacy I2S0 built-in ADC/DMA driver |
| Requested sampling rate | 200,000 samples/s; see acquisition reference below |
| Samples per capture | 4,096 |
| USB serial | 115200 baud, ASCII |
| Pause after each serial frame | 1 second, in addition to capture and serial transfer time |

Connect the conditioned analog receiver output to GPIO34 and use a common ground. The input needs a suitable bias, gain, filtering, and protection for the ESP32 ADC. Do not connect a bipolar or overvoltage analog signal directly. The viewer's approximate voltage display does not establish an electrical input limit.

```text
rx/
├── platformio.ini
├── src/main.cpp          # ESP32 ADC capture and serial output
├── seanergy_rx_live.py   # Desktop waveform and FFT viewer
├── requirements.txt
└── README.md
```

## Build and upload

Open this `rx` directory as a PlatformIO project. Commands below run from this directory, with PlatformIO available as `pio`:

```sh
pio run -e esp32dev
pio run -e esp32dev -t upload --upload-port YOUR_RX_SERIAL_PORT
```

Replace `YOUR_RX_SERIAL_PORT` with the receiver board's port. `pio device list` lists connected devices. The supplied configuration leaves `platform = espressif32` unpinned and uses legacy Arduino/ESP-IDF APIs; do not assume that the TX project's ESP32-S3 framework configuration can be reused here.

## Run the graphs

Create a Python environment and install the viewer's dependencies:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Close PlatformIO Serial Monitor or any other program using the receiver's serial port, then run:

```sh
python seanergy_rx_live.py --port YOUR_RX_SERIAL_PORT
```

For example, on macOS the port may resemble `/dev/cu.usbserial-10`; use the actual device reported by `pio device list`. The default baud rate is 115200. The `--baud` option changes the viewer setting only; it must match the firmware.

The viewer has a background serial reader and requests a GUI redraw about every 16 ms. It displays incoming partial samples and analyzes completed frames. Display refresh and capture cadence are separate: acquisition includes DMA reads, ASCII transfer, and a one-second pause. Drawing uses reduced waveform points; FFT analysis uses the received frame.

The FFT display covers 0–60 kHz. Carrier detection selects the strongest peak within **30–50 kHz**, then applies parabolic peak interpolation. The readout is a spectral peak candidate; use a known input and the acquisition reference below when interpreting it.

## Serial protocol

The receiver streams frames automatically; the viewer does not send a capture command. On startup it prints `SEANERGY_RX_CAPTURE` and `READY`. Each capture then has the following structure:

```text
CAPTURE_START
CAPTURE_INFO
SAMPLES=4096
ELAPSED_US=<duration around the blocking DMA reads>
ACTUAL_FS=<4096 divided by that duration in seconds>
DATA_START
<one decimal sample per line>
DATA_END
```

At 115200 baud, sending thousands of decimal lines takes much longer than the nominal capture interval. The one-second delay follows that transfer, so this is an intermittent bench capture tool rather than a continuous full-rate serial stream.

<a id="measurement-assumptions-to-validate"></a>

## Acquisition reference

The capture and viewer use the following rate, word-format, and calibration conventions:

- **ADC word decoding:** `adcFromI2SWord()` currently uses `(raw >> 4) & 0x0FFF` and calls the ADC data left-aligned. Espressif documents the classic ESP32 12-bit DMA format as ADC data in bits 11:0 and the channel in bits 15:12. The supplied decoding therefore appears inconsistent with that format and must be checked against the actual driver output before trusting amplitude readings. See [Espressif's ADC data-format reference](https://docs.espressif.com/projects/esp-idf/en/v4.4/esp32/api-reference/peripherals/adc.html).
- **Requested versus actual rate:** the firmware requests 200 ksample/s, while the legacy driver's [I2S ADC documentation](https://docs.espressif.com/projects/esp-idf/en/v4.4/esp32/api-reference/peripherals/i2s.html) lists a 150 kHz maximum for this mode. Establish the sample clock with a known input when calibrating the frequency axis.
- **DMA timing:** the ADC/DMA engine is enabled in setup and keeps running during serial transmission and the following delay. Only the initial setup discards queued data. `ELAPSED_US` times the later blocking reads and may include already-buffered data or queue overrun effects; it does not independently measure sample spacing. `ACTUAL_FS` and the viewer's preferred `n / elapsed` calculation can consequently produce a misleading frequency axis. Use a known input and independent timing reference to calibrate this axis.
- **Incomplete frames:** `DATA_END` can finalize a frame with as few as eight samples. The parser does not require all 4,096 expected samples before analyzing it. A truncated capture can therefore reach the FFT with metadata for a full frame.
- **Voltage and frequency display:** the viewer estimates Vpp using `ADC span / 4095 * 3.3`; it does not apply ADC calibration, receiver gain correction, or an analog frontend calibration. The Nyquist warning also depends on the unverified reported rate. Use a known input signal and an oscilloscope to validate results.

## Relationship to the transmitter

The separate [TX project](../tx/README.md) generates GPIO16 ultrasonic bursts around 38–42 kHz, which lie inside this viewer's carrier-search band. Its optional PCM5102A profile also targets 38–42 kHz. The TX default MAX98357A I2S waveform is in the 1–8 kHz audio range, outside the RX viewer's carrier-search band.

TX and RX run independently. Adjust burst and capture timing while observing the bench signals so the receive window overlaps the transmitted packet. The [firmware overview](../README.md) maps the two workflows and their interfaces.

## Import verification

Checked on October 16, 2026:

| Check | Result |
| --- | --- |
| Firmware, viewer, PlatformIO config, and `.gitignore` compared with the supplied ZIP | Byte-identical |
| ESP32 cross-build using unchanged `platformio.ini` | Passed; local platform resolved to pioarduino 55.03.39 / Arduino 3.3.9 / ESP-IDF 5.5.4 |
| Build size | 30,364 bytes static RAM; 311,008 bytes flash |
| Python syntax | Passed |
| Isolated FFT analysis with synthetic 40 kHz input and a stronger 80 kHz harmonic | Passed; carrier candidate 39,997.865 Hz |
| Reported-rate fallback, low-rate Nyquist flag, invalid-rate rejection | Passed |

These records cover source import, cross-compilation, syntax, and synthetic FFT analysis. The build emits legacy ADC/I2S deprecation warnings; record the resolved platform version for reproducible builds. The acquisition reference above covers the physical input and sample-clock conventions.
