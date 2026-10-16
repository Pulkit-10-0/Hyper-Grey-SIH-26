# Build, flash and run

Run these commands from the repository root. Install PlatformIO Core or open the individual `tx/` and `rx/` folders in the PlatformIO editor. Python 3 is also needed for the RX viewer. Building does not upload to a board.

## TX: ESP32-S3

```sh
pio run -d 02-firmware/tx -e esp32s3_existing
```

The pinned TX dependencies and board definition are in [platformio.ini](../tx/platformio.ini). The other environments are:

```sh
pio run -d 02-firmware/tx -e esp32s3_headless
pio run -d 02-firmware/tx -e esp32s3_pcm5102a
```

`esp32s3_headless` disables OLED updates. `esp32s3_pcm5102a` requires a PCM5102A and the hardware described in [HARDWARE.md](../tx/HARDWARE.md); disconnect the MAX98357A before using it. Confirm the actual ESP32-S3 board's flash size and USB settings against the supplied DevKitC-1 definition.

Find connected serial ports with `pio device list`. Substitute the correct TX port below:

```sh
pio run -d 02-firmware/tx -e esp32s3_existing -t upload --upload-port /dev/cu.YOUR_TX_PORT
pio device monitor -b 115200 -p /dev/cu.YOUR_TX_PORT
```

Send uppercase, newline-terminated commands. TX boots disarmed; `ARM` in automatic mode requires healthy control inputs. A manual example, using the default audio profile, is:

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

The frequency arguments configure the PCM output; GPIO16 remains a separate rectangular ultrasonic PWM burst. `STOP` disarms and cancels playback. See the [TX README](../tx/README.md) for faults, recovery, and optional-DAC commands.

## RX: classic ESP32

```sh
pio run -d 02-firmware/rx -e esp32dev
pio run -d 02-firmware/rx -e esp32dev -t upload --upload-port /dev/cu.YOUR_RX_PORT
```

RX captures GPIO34 / ADC1 channel 6 and automatically emits ASCII capture frames at 115200 baud. This target uses the classic ESP32 built-in ADC/I2S API, not the TX's ESP32-S3 configuration. Refer to the [RX README](../rx/README.md) for the ADC-format and sampling-rate verification still required.

Close the serial monitor before starting the viewer; only one program should own the RX serial port:

```sh
cd 02-firmware/rx
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python seanergy_rx_live.py --port /dev/cu.YOUR_RX_PORT
```

Use the actual device name returned by `pio device list`. The viewer needs a desktop Matplotlib backend; it cannot display an interactive window in a headless environment.

## Software checks without hardware

From `02-firmware/tx/`:

```sh
c++ -std=c++17 -O1 -Wall -Wextra -Werror -pedantic \
  -fsanitize=undefined -Iinclude src/waveform.cpp tests/waveform_test.cpp \
  -o /tmp/seanergy-waveform-test
/tmp/seanergy-waveform-test
```

A successful cross-build or host test does not establish measured waveform timing, ADC calibration, acoustic performance, or synchronization. No device is uploaded by the build and test steps above.
