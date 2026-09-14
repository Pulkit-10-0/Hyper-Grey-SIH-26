# SeaNergy Payload Firmware

Production-oriented ESP-IDF firmware for the SIH 2026 problem statement 26058
payload. The project converts the working ESP32-S3 sensor and audio prototype
from `D:/lab/daa/AUV_Firmware` into a deterministic adaptive-sonar controller.

## Delivered capabilities

- Fixed-point Q16.16 DDS with a 256-entry sine table and optional naive-trig A/B build.
- Rectangular, Hann, Tukey and Blackman transmit envelopes.
- 8-bit LCD/i80 output using internal-SRAM DMA buffers and a 1 MHz hardware timer.
- Core 0 transmit ownership; sensing, solver, BLE, OLED and power control on Core 1.
- ADS1115 sensor acquisition, DS18B20 temperature, potentiometer test inputs and rail gating.
- Fixed-point water-physics model and constrained candidate solver.
- Frozen BLE GATT contract with explicit offsets, scaling, CRC and mission-mode guard word.
- INA226 current integration, light sleep, external CPU-idle marker and test-point markers.

## Start here

- Firmware project: `src/`
- App contract: `docs/ble-gatt-spec.md`
- Architecture: `docs/architecture.md`
- Evidence plan and numerical baselines: `measurements/`
- Release procedure: `releases/README.md`

## Hardware baseline

The inherited prototype established ESP32-S3 operation with two ADS1115 ADCs,
DS18B20 temperature sensing, four OLED displays and I2S audio. The product
firmware preserves GPIO 4 through 15 for those validated functions and assigns
GPIO 35 through 42 to the parallel DAC bus.
