# Existing ESP32-S3 sensor session

The inherited bench log demonstrates one connected DS18B20 and both ADS1115
devices operating with the original firmware.

| Channel | Observed values |
|---|---|
| Temperature | 28.69 to 28.75 deg C after initial disconnected sample |
| TDS ADC | 4,561 to 4,583 counts; 0.5701 to 0.5729 V |
| Turbidity ADC | 4,587 to 4,602 counts; 0.5734 to 0.5753 V |
| Potentiometer sweep | Approximately 0 to 3.272 V |
| Legacy audio | 1,000 Hz at 44.1 ksample/s through MAX98357A |

The raw session is preserved as `captures/legacy-sensor-session.txt`.
