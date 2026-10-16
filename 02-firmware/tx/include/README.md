# Transmitter interfaces and board configuration

| Header | Responsibility |
|---|---|
| [board_config.h](board_config.h) | GPIO assignments, output profile, sample rate, DMA sizing and period limits |
| [waveform.h](waveform.h) | Portable waveform configuration, validation and synthesis API |
| [environment.h](environment.h) | Sensor/control snapshots, validity and acquisition interfaces |
| [transmitter.h](transmitter.h) | Playback commands, runtime status, timers and DMA ownership |
| [displays.h](displays.h) | OLED display state and update interface |

Implementations are in [src](../src/README.md). Read the [hardware profiles](../HARDWARE.md) before changing pins or sample rates. The default I2S audio profile and GPIO16 ultrasonic PWM path have separate output settings. Build from the [TX project](../README.md).
