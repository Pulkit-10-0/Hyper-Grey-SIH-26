# Power settings

- INA226 shunt: 0.1 ohm; current LSB 0.1 mA.
- Bus voltage and current sampled at 1 ms during a ping and 100 ms in sleep states.
- Complete-ping integration begins at TX-enable assertion and ends after telemetry encoding.
- Thirty range-mode pings form the reported energy distribution.
- DDS and naive-trig builds use the same board, supply, frequency, amplitude, window and sample count.
