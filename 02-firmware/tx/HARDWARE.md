# Hardware integration and validation

This firmware retains the ESP32-S3 and the wiring in the supplied sketch. The optional circuit below is a build proposal; no assembled analog frontend, acoustic measurement, power measurement, or enclosure has been verified in this workspace.

## Output paths and limits

| Path | Physical signal | Appropriate demonstration |
| --- | --- | --- |
| GPIO16 / existing nominal 40 kHz transducer | Timer-generated PWM bursts | Carrier frequency, burst duration, repetition interval, and duty envelope on an oscilloscope |
| GPIO5/6/7 / existing MAX98357A | I2S DMA, 48 ksample/s, audio-band waveform arrays | LFM, geometric sweeps, and Barker-13 phase-coded pulses at the configured 1–8 kHz limits, using a suitable speaker or dummy load |
| Optional PCM5102A line DAC | I2S DMA, 384 ksample/s, 38–42 kHz waveform arrays | Analog chirp and phase-code measurements after building and testing the frontend below |

The ESP32-S3 has I2S and DMA peripherals but no internal voltage-output DAC. Its GPIO PWM and its I2S sample stream are separate outputs. DMA services sample transfer; the CPU still builds replacement arrays and handles peripherals. DMA reduces time spent feeding samples, rather than compressing sample storage. See the [ESP32-S3 datasheet](https://documentation.espressif.com/esp32_s3_datasheet_en.pdf) and [Espressif I2S driver documentation](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/peripherals/i2s.html).

The MAX98357A is a digital-input Class D audio amplifier with an internal DAC, audio reconstruction filters, and supported PCM rates through 96 ksample/s. It has no accessible line-level DAC output. Even at 96 ksample/s, its specified filter passband limit is `0.24*fs = 23.04 kHz` and its −3 dB point is `0.31*fs = 29.76 kHz`; retain the audio profile when using it. See the [MAX98357A datasheet, digital filters and output-stage sections](https://www.analog.com/media/en/technical-documentation/data-sheets/MAX98357A-MAX98357B.pdf).

The GPIO16 path cannot reproduce arbitrary DAC samples or smooth sinusoidal chirps. A PWM duty envelope changes the harmonic content as well as the fundamental amplitude. A nominal 40 kHz marking also does not establish a safe 38–42 kHz operating range, underwater suitability, allowable continuous power, or a safe capacitive load for the driver. Obtain the actual GU1008C-40T datasheet and validate the assembled driver before acoustic transmission.

The 100–500 kHz requirement needs another DAC, reconstruction network, power stage, and compatible transducer. A 500 kHz carrier requires a sample rate above 1 Msample/s even before allowing filter transition bandwidth; 4 Msample/s is a useful design target for eight samples per carrier cycle, not a guarantee of analog performance. Neither the existing MAX98357A nor the optional 384 ksample/s profile meets this range.

## Existing wiring

| Connection | ESP32-S3 GPIO / address |
| --- | --- |
| Main I2C SDA / SCL | 8 / 9 |
| ADS1115 sensor ADC | `0x48`, ADDR to GND |
| ADS1115 potentiometer ADC | `0x49`, ADDR to VDD |
| OLED1 | Main I2C, `0x3C` |
| OLED2 SDA / SCL | 10 / 11, software I2C |
| OLED3 SDA / SCL | 12 / 13, software I2C |
| OLED4 SDA / SCL | 14 / 15, software I2C |
| DS18B20 data | 4; pull up to 3.3 V as required by the sensor wiring |
| I2S BCLK / LRCLK / DIN | 5 / 6 / 7 |
| Existing ultrasonic PWM | 16, to the existing driver input |
| Depth potentiometer wiper | 1, with potentiometer ends at GND and 3.3 V |

Use a common logic ground and 3.3 V I2C pull-ups. Do not connect a transducer that requires a power driver directly to an ESP32 GPIO. Keep sensor outputs within the ADC supply limits; selecting a larger programmable ADC measurement range does not increase input-pin voltage tolerance. The original pressure divider is 10 kΩ from the sensor to the ADC node and 22 kΩ from the node to ground: 4.5 V becomes approximately 3.09 V. Check sensor fault voltages and tolerances before using it with a 3.3 V ADC.

The pots are simulated environmental inputs. Raw TDS, turbidity, pH, and pressure voltages need sensor-specific calibration; the adaptation mapping is a bounded control policy, not a measured model of seawater propagation. A temperature sensor does not measure power-amplifier junction temperature.

## Optional line-level analog frontend

Build this only for a real, ground-centered line DAC such as the PCM5102A. It is a low-level measurement and driver-input circuit, not a piezo power amplifier. The [PCM5102A datasheet](https://www.ti.com/lit/ds/symlink/pcm5102a.pdf) specifies a 384 ksample/s PCM interface and a nominal 2.1 Vrms ground-centered full-scale output. Check the selected breakout's supply regulator, output filters, format straps, mute control, and supported clocking before connecting it.

Disconnect the MAX98357A from the I2S wires before selecting the 384 ksample/s DAC profile. Wire GPIO5 to BCK, GPIO6 to LRCK, and GPIO7 to DIN. For the PCM5102A's three-wire I2S configuration, use the manufacturer's specified SCK/PLL configuration, FMT setting, charge-pump components, and decoupling; a bare IC needs more components than these three signal wires.

Use a TLV9062 dual op amp on a regulated **5 V** analog supply, with 100 nF ceramic bypass immediately across its supply pins and a nearby 10 µF bulk capacitor. It is unity-gain stable; typical bandwidth is 10 MHz and slew rate is 6.5 V/µs. See the [TLV9062 datasheet](https://www.ti.com/lit/ds/symlink/tlv9062.pdf). Check the pinout of the exact package; the following connections use amplifier names rather than package pin numbers.

```text
5 V -- 10k -- VMID -- 10k -- analog GND
               |
            10uF || 100nF
               |
           analog GND

PCM5102A LOUT -- 1uF nonpolar -- A -- 2.00k -- B --> U1A (+)
                               |             |
                              100k          1.00nF C0G
                               |             |
                              VMID       analog GND

U1A OUT directly to U1A (-)       [unity-gain buffer]
U1A OUT -- 2.00k -- C --> U1B (+)
                   |
                  1.00nF C0G
                   |
               analog GND

U1B OUT directly to U1B (-)       [unity-gain buffer]
U1B OUT -- 47 ohm -- LINE_OUT --> scope 1 Mohm / power-stage input
```

Use 1% resistors and preferably 2% capacitors. The 1 µF input capacitor and 100 kΩ bias resistor place the coupling high-pass pole near 1.6 Hz. `LINE_OUT` idles at approximately 2.5 V; use AC coupling on the scope to inspect its waveform. A downstream power amplifier must accept this bias or provide appropriately sized AC coupling. Do not connect a 50 Ω scope termination, speaker, or piezo directly to this output. Keep short ground returns and isolate power-driver switching currents from the DAC and op-amp ground returns.

This circuit implements two independent, buffered passive RC low-pass poles. Each has `fc = 1 / (2*pi*2000*1e-9) = 79.6 kHz`. Ignoring op-amp and DAC response, the combined magnitude is `|H(f)| = 1 / (1 + (f/fc)^2)`:

| Frequency | Calculated combined gain |
| --- | --- |
| 40 kHz | approximately −2.0 dB |
| 42 kHz | approximately −2.1 dB |
| 51.2 kHz | approximately −3.0 dB |
| 342 kHz, an image location for 42 kHz at 384 ksample/s | approximately −25.8 dB |

These are calculated values, not measured performance. This modest filter smooths sample steps; its stopband rejection is limited, so a stricter spectral mask may require a higher-order filter. Include the DAC's onboard network and the next amplifier's input impedance in the final response calculation. Measure the assembled gain across the sweep before compensating it in firmware.

Start at a digital amplitude of 0.1. With a 5 V op-amp supply and amplitude at or below 0.8, the proposed 40 kHz input has approximately 2.38 V peak before the first RC pole and 2.12 V peak at U1A's input, centered on 2.5 V. The corresponding slew requirement is about 0.53 V/µs. This suggests useful nominal headroom; supply tolerance, load, distortion, and component variation still require measurement. Do not use these amplitude settings unchanged with a 3.3 V op-amp supply. Hold the power stage disabled while the bias supply settles and during reset or reconfiguration.

## Windowing and protection

The sample-array backend applies Hann, Blackman, or Hamming with an additional 5% raised-cosine edge taper. The Hamming taper is deliberate: ordinary Hamming has nonzero endpoints. The transmitted buffer starts and ends at digital zero. An analog low-pass filter smooths reconstruction steps; the digital envelope controls pulse turn-on and turn-off. Neither function guarantees zero sidelobes or protects an incorrectly rated power stage. Phase-coded pulses also contain intentional internal phase transitions.

The firmware restarts I2S clocks for each burst and prepends about 20 ms of zero samples before the pulse; GPIO16 starts after the same interval. The MAX98357A specifies up to 7.5 ms turn-on time. PCM5102A also needs clock recovery and analog startup, but its full restart-to-settled-output maximum is not specified. Treat the optional DAC's 20 ms interval as an initial engineering margin, then verify pulse onset and settling on the scope. Continuous clocks are an alternative when precise onset matters more than standby power. See the linked MAX98357A and PCM5102A datasheets for standby and startup behavior.

Reducing sidelobes trades against main-lobe width and transmitted energy. Compare windows at equal stated peak amplitude or equal energy, and report which normalization was used. Do not apply a second FFT analysis window and present its leakage improvement as a transmitter hardware improvement.

For a field payload, add a normally disabled power-stage enable, hardware current limiting, a correctly rated supply fuse, measured rail/current feedback, and a temperature sensor on the power stage. Choose a piezo driver and any matching network from the transducer's impedance and voltage limits. Do not infer this protection from MAX98357A's internal speaker protection or from a firmware duty limit. Verify that a stopped CPU or brownout cannot leave the output continuously energized.

## Bench validation before acoustic operation

1. Leave the transmitter power stage disabled. Check logic rails, ADC inputs, output idle state, and I2S clock rate; observe the serial-reported output profile.
2. On GPIO16, measure burst length and spacing at the minimum and maximum commands while sensors and all four displays are updating. Confirm output stops on a firmware fault and reset. This is a PWM measurement, not evidence of DAC sample playback.
3. For the MAX98357A audio path, use a suitable dummy load and a differential probe across OUTP/OUTN. **Neither output terminal is ground.** Do not ground either terminal with an oscilloscope clip or connect either terminal to the single-ended op-amp circuit above. Account for Class D switching when selecting measurement bandwidth and filtering.
4. For the optional line DAC, inspect `LINE_OUT` into a high-impedance load. Verify pulse endpoints, amplitude, chirp start/end frequency, geometric sweep curvature, and phase-code timing. Repeat at maximum pulse duration and update load; check for gaps, clipped samples, or repeated stale waveform blocks.
5. Capture enough samples at a scope sample rate above the signal band, with sufficient analog bandwidth and record length. Inspect a spectrogram for sweep direction and frequency law, and an FFT for harmonics, reconstruction images, and out-of-band energy. Record sample rate, FFT size, analysis window, probe, load, amplitude, and supply voltage with each capture.
6. Measure input current over a full ping interval with identical peripherals enabled when comparing firmware versions. DMA, lower display refresh, and idle waits can reduce CPU work; actual energy savings depend on the board, clocks, DAC, and output stage.
7. Connect the intended transducer only after electrical limits and driver behavior have been measured. Add pressure-rated housing, sealed connectors, strain relief, corrosion protection, and a verified thermal path before claiming a field-deployable AUV module. A 3D-printed cover alone does not establish a depth rating.
