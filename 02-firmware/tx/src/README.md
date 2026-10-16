# Transmitter implementation

| Source | Responsibility |
|---|---|
| [main.cpp](main.cpp) | Console commands, bounded control mapping, telemetry and application lifecycle |
| [environment.cpp](environment.cpp) | ADS1115 channels, potentiometers, DS18B20 and stale-input handling |
| [waveform.cpp](waveform.cpp) | Portable LFM/geometric/Barker synthesis, envelopes and input validation |
| [transmitter.cpp](transmitter.cpp) | I2S DMA preload/playback, PWM gating, scheduling and fault handling |
| [displays.cpp](displays.cpp) | Four OLED views and paced display updates |

The corresponding interfaces are in [include](../include/README.md), with portable checks in [tests](../tests/README.md). Use the [TX project build](../README.md) rather than compiling these Arduino-dependent modules individually. Calibrated sensor-to-physics adaptation and app protocol integration remain separate work.
