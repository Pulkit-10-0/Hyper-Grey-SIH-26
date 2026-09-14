# SeaNergy test-point register

Document ID: HW-ASM-004  
Status: Rev A targets. Record measured mean, min/max and instrument ID beside each point.

| TP | Net | Location / reference | Expected voltage or waveform | Tolerance / acceptance | Stage |
|---|---|---|---|---|---:|
| TP01 | BAT_RAW | After battery connector | 9.0-12.6 VDC | Supply setting +/-0.10 V | 2 |
| TP02 | BAT_PROT | After fuse and reverse protection | BAT_RAW minus <0.20 V | No reverse conduction | 2 |
| TP03 | +5V_DIG | Buck output | 5.00 VDC | +/-2%; ripple <50 mVpp | 2 |
| TP04 | +3V3 | MCU/sensor rail | 3.30 VDC | +/-2%; ripple <30 mVpp | 2 |
| TP05 | AGND_STAR | DAC ground join | <10 mV from DGND under idle | No signal return through sensor cable | 2 |
| TP06 | VREF_2V5 | DAC reference | 2.500 VDC | +/-0.5%; noise <2 mVrms | 4 |
| TP07 | DAC_SCLK | U3 to U4 | 0-3.3 V, 20.0 MHz during stream | +/-2%; clean edges | 4 |
| TP08 | DAC_MOSI | U3 to U4 | 16-bit SPI frames | Decode without framing error | 4 |
| TP09 | DAC_OUT | U4 output | 0.10-4.90 V chirp/ramp | No missing codes; unclipped | 4 |
| TP10 | LPF_OUT | U6A output | Filtered DAC waveform | Gain +/-0.5 dB; no oscillation | 5 |
| TP11 | DRV_GATE_A | U7 output A | 0-12 V gate drive | Dead time >=100 ns | 6 |
| TP12 | TX_OUT | Transformer primary / load | Burst waveform | No DC; amplitude per test card | 6 |
| TP13 | RX_LIMIT | After limiter | +/-0.30 V during TX transient | Recovery <100 us target | 5/6 |
| TP14 | ADC_IN | ADS1115 input | 0.10-3.20 V | Never outside rails +/-0.3 V | 5 |
| TP15 | I2C_SDA | Sensor bus | 0-3.3 V, 400 kHz target | Rise time <300 ns | 3/5 |
| TP16 | ONEWIRE | DS18B20 bus | 0-3.3 V | Valid reset and presence pulse | 3/5 |
| TP17 | SHUNT_P | INA226 positive sense | 0-12 mV typical | Kelvin connection required | 6 |
| TP18 | SHUNT_N | INA226 negative sense | TP17 minus load drop | Integrated energy within 10% repeatability | 6 |

## Probe safety

Use a differential probe at TP12. A grounded bench-scope clip must never be attached across a floating bridge or transformer node. Connect the probe before enabling the driver.
