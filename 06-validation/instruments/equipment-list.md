# Equipment list

| Asset ID | Instrument specification | Key capability | Custodian | Control status |
|---|---|---|---|---|
| HG-SCOPE-01 | 100 MHz, 4-channel digital oscilloscope | 1 GSa/s, 10 Mpoint, FFT | Hyper Grey Lab | Reference check at run start |
| HG-LA-01 | 16-channel logic analyser | 100 MSa/s digital capture | Hyper Grey Lab | Clock-reference check |
| HG-GEN-01 | 20 MHz arbitrary/function generator | 1 uHz resolution, sweep mode | Hyper Grey Lab | Frequency-counter check |
| HG-LCR-01 | Impedance/LCR analyser | 100 Hz-100 kHz, magnitude and phase | Hyper Grey Lab | 412 ohm reference check |
| HG-DMM-01 | 6,000-count true-RMS DMM | 0.8% AC, 0.5% DC voltage | Hyper Grey Lab | Zero and reference-voltage check |
| HG-PWR-01 | INA226 logging fixture | 0.1 ohm shunt, 0.1 mA LSB | Hyper Grey Lab | DMM cross-check |
| HG-TAPE-01 | 10 m Class II steel tape | 1 mm divisions | Hyper Grey Lab | Endpoint inspection |
| HG-MASS-01 | Digital scale | 0.1 g resolution, 5 kg capacity | Hyper Grey Lab | 500 g reference check |
| HG-TEMP-01 | DS18B20 stainless probe | +/-0.5 deg C | Payload fixture | Ice/ambient two-point check |
| HG-TDS-01 | Conductivity/TDS channel | 0-1,000 mg/L | Payload fixture | 342 ppm reference solution |
| HG-TURB-01 | Optical turbidity channel | 0-1,000 NTU | Payload fixture | Zero and prepared standard |
| HG-RX-01 | Receive reference channel | Fixed-gain relative acoustic level | Tank fixture | Same geometry and gain each run |

The oscilloscope FFT uses 262,144 points. At 1 MSa/s this gives 3.815 Hz bin
spacing; at 10 MSa/s it gives 38.15 Hz. Acoustic source level is reported in
relative dB referenced to the fixed tank run because the validation objective
is repeatable comparison across waveform and water conditions.
