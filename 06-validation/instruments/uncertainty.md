# Measurement uncertainty budget

| Quantity | Primary contributors | Standard uncertainty | Expanded uncertainty, k=2 |
|---|---|---:|---:|
| Frequency at 40 kHz | Scope timebase 50 ppm, FFT interpolation | 18 Hz | 36 Hz |
| Spectral level | Window correction, ADC amplitude accuracy, noise | 0.30 dB | 0.60 dB |
| THD | Harmonic-bin integration and noise subtraction | 0.04 percentage point | 0.08 point |
| Current below 2 mA | Shunt tolerance, offset, INA226 quantisation | 0.07 mA | 0.14 mA |
| Current from 20-100 mA | Shunt tolerance and gain | 0.65% | 1.30% |
| Complete-ping energy | Voltage, current and timing propagation | 2.1% | 4.2% |
| Water temperature | Probe accuracy and spatial gradient | 0.29 deg C | 0.58 deg C |
| Tape range at 10 m | Reading, alignment and target plane | 5.8 mm | 11.6 mm |
| Sonar range at 10 m | Sound speed, peak interpolation, timing | 7.4 mm | 14.8 mm |
| Turbidity | Sensor repeatability and settling | 3.2% + 0.6 NTU | 6.4% + 1.2 NTU |
| Salinity preparation | Scale resolution and tank volume | 0.012 ppt | 0.024 ppt |
| Enclosure mass | Scale resolution and surface water removal | 0.10 g | 0.20 g |

Combined uncertainty uses root-sum-square propagation. Range uncertainty uses
`R = c t / 2`, with the temperature-derived sound-speed term and the measured
round-trip timing term treated as independent.
