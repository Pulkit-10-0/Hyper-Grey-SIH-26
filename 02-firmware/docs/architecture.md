# Current TX/RX architecture and compatibility

## TX data flow

1. Two ADS1115 ADCs acquire real sensor voltages and four potentiometers; GPIO1 supplies a fifth, depth control. DS18B20 temperature acquisition is asynchronous.
2. A bounded prototype mapping converts potentiometer levels into frequency, duration, and amplitude settings. Real sensor voltages are reported separately.
3. `waveform.cpp` synthesizes stereo PCM using a fixed-point phase accumulator, sine lookup table, the selected modulation, and a window.
4. `transmitter.cpp` preloads the I2S DMA ring. Hardware clocks output the pulse; LEDC and GPTimer drive a separate GPIO16 carrier burst.
5. `main.cpp` handles serial commands, telemetry, arming and fault recovery; `displays.cpp` updates the OLEDs.

Default PCM output is 1–8 kHz at 48 ksample/s through MAX98357A. Optional PCM5102A output is 38–42 kHz at 384 ksample/s and needs different analog hardware. GPIO16 is always the separate rectangular 38–42 kHz PWM path; it does not reproduce PCM chirps, phase codes or windows. Details are in [TX README](../tx/README.md) and [hardware guide](../tx/HARDWARE.md).

## RX data flow

1. A classic ESP32's built-in ADC samples GPIO34 through the legacy I2S DMA driver, requesting 200 ksample/s.
2. Each loop reads 4,096 raw words, converts them with the supplied `adcFromI2SWord`, and reports read elapsed time, a derived rate and decimal sample values over 115200-baud serial.
3. `seanergy_rx_live.py` receives frames on a background thread, draws partial samples and performs a Hann-windowed FFT on completed frames. The spectrum view covers 0–60 kHz; carrier selection is restricted to 30–50 kHz.

The receiver's raw-word shift and its use of wall-clock DMA-read duration as a sampling-rate estimate are supplied implementation assumptions, not verified acquisition characteristics. DMA remains active while samples are printed and during the delay between frames. See [RX README](../rx/README.md) before interpreting a frequency or voltage as a measurement.

## Signal and control connections

| Project | Function | GPIO / address |
|---|---|---|
| TX ESP32-S3 | I2S BCLK / LRCLK / DATA | 5 / 6 / 7 |
| TX ESP32-S3 | Ultrasonic PWM burst | 16, through the appropriate driver |
| TX ESP32-S3 | Main I2C SDA / SCL | 8 / 9 |
| TX ESP32-S3 | Sensor ADC / four-pot ADC | ADS1115 `0x48` / `0x49` |
| TX ESP32-S3 | DS18B20 / depth pot | 4 / 1 |
| TX ESP32-S3 | OLEDs 2, 3, 4 SDA / SCL | 10 / 11, 12 / 13, 14 / 15 |
| RX classic ESP32 | Analog input | 34 / ADC1 channel 6 |

There is no shared trigger in either project. RX can miss TX bursts because acquisition is independent and serial transfer is slow relative to a pulse. An FFT peak alone is not a detected target, decoded Barker sequence, or range estimate. The code contains no matched filter or TX-to-RX feedback loop.

## Existing PCB and app compatibility

The [Rev B KiCad snapshot](../../01-hardware/) retains its original three-pot bench firmware and its TDS/turbidity input dividers. It is historical hardware evidence, not proof of compatibility with this imported firmware:

- Current automatic TX mode expects four valid ADS1115 potentiometer channels plus the GPIO1 depth pot. The earlier board documents three pots. Verify or extend the actual wiring, or explicitly select manual mode for bench work.
- Current TX reports raw ADS1115 TDS/turbidity node voltages. It does not include the historical board sketch's multiplication by two for the Rev B dividers. Apply sensor/board calibration deliberately in future integration; do not silently treat these voltages as ppm or NTU.
- The RX connection remains GPIO34, but word packing, sample rate, analog bias/gain and calibration must be checked on the actual receiver hardware.

The [mobile console link](../../07-documentation/api/console-link.md) expects NDJSON records. Current TX emits human-readable command/status telemetry; RX emits its own ASCII capture frames. Neither implements NDJSON, BLE or Wi-Fi. Adding app connectivity, synchronized capture, receive processing or calibrated physical adaptation is separate implementation work.

The previous binary BLE/i80 design is preserved under [legacy/esp-idf-payload/](../legacy/esp-idf-payload/) for historical reference.
