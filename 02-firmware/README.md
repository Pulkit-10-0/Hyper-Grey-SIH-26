# SeaNergy TX and RX firmware

The active firmware is now two independent PlatformIO / Arduino projects:

| Project | Board | Purpose | Start here |
|---|---|---|---|
| [tx/](tx/) | ESP32-S3 | Sensor/potentiometer acquisition, waveform synthesis, I2S DMA output, GPIO16 PWM bursts and OLEDs | [TX instructions](tx/README.md), [hardware guide](tx/HARDWARE.md) |
| [rx/](rx/) | Classic ESP32 (`esp32dev`) | GPIO34 ADC capture through I2S DMA, ASCII serial samples, Python waveform/FFT viewer | [RX instructions](rx/README.md) |

Open **tx/** or **rx/** as its own PlatformIO project. They target different ESP32 chips and have separate build configurations; do not combine their source trees or flash one board's image onto the other.

## Build

From this repository's root:

```sh
pio run -d 02-firmware/tx -e esp32s3_existing
pio run -d 02-firmware/rx -e esp32dev
```

The TX default uses the existing MAX98357A audio hardware and the separate nominal 40 kHz GPIO16 driver. Optional TX environments are `esp32s3_headless` and `esp32s3_pcm5102a`; the latter requires changing the DAC hardware. See [build and flash](docs/build-and-flash.md) before uploading.

## How they are used together

TX generates bursts; RX independently samples its analog receive input. RX's desktop viewer draws ADC samples and calculates an FFT for completed frames. There is no shared trigger, TX-to-RX data cable protocol, waveform decoder, matched filter, or time-of-flight/range calculation in these supplied projects.

- **TX GPIO16:** 38–42 kHz rectangular PWM bursts. This is the output near the RX viewer's 30–50 kHz carrier-search band.
- **TX default I2S:** 1–8 kHz PCM at 48 ksample/s. LFM, geometric sweeps, Barker-13 phase coding, and window functions apply to this PCM path, not to GPIO16.
- **TX optional I2S:** 38–42 kHz PCM at 384 ksample/s with a PCM5102A and suitable analog hardware. This is a separate hardware profile.
- **RX:** requests 200 ksample/s, captures 4,096 samples and sends decimal ADC values over serial at 115200 baud. The read-time sample-rate estimate and raw ADC word decoding need hardware verification; see [RX limitations](rx/README.md).

Neither firmware implements the mobile console's NDJSON protocol, Wi-Fi or BLE. The app and its link specifications remain separate integration work. The Python RX viewer understands RX's ASCII capture frames only.

## Startup and wiring

TX starts disarmed. Automatic mode needs five healthy potentiometer inputs (four on ADS1115 `0x49`, depth on GPIO1). Manual control can be selected using `AUTO OFF`, `SET`, and `ARM`; [TX instructions](tx/README.md) include an example. Real sensor voltages are telemetry, not calibrated environmental values driving the current policy.

The repository's Rev B PCB is an earlier wiring snapshot. It documents three potentiometers and TDS/turbidity dividers; the imported TX expects five potentiometer inputs and reports the measured ADS1115 voltages without that snapshot's two-times TDS/turbidity compensation. Review [architecture and compatibility](docs/architecture.md) before using that PCB with the current source.

## Previous implementation

The replaced ESP-IDF project, its binary BLE specification, figures, release templates, and measurement material are retained under [legacy/esp-idf-payload/](legacy/esp-idf-payload/). They describe the earlier i80 / parallel-DAC design and do not describe the current TX/RX projects. The source next to the KiCad files remains a [historical board companion](../01-hardware/kicad/firmware/README.md).

Imported application source is preserved from the two supplied packages. [Import record](IMPORT.md) identifies the inputs and records verification. [Measurements](measurements/README.md) separates bench work still needed from software checks.
