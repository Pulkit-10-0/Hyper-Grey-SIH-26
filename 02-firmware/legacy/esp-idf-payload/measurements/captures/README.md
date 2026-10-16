# Capture register

| Prefix | Channels | Required exports |
|---|---|---|
| `cpu-idle-transmit` | GPIO 2, GPIO 3 | Native scope, CSV, PNG |
| `dma-timing` | GPIO 47, GPIO 3 | Native analyser, CSV, PNG |
| `adaptation-latency` | ADC marker, first DAC sample | Native scope, CSV, PNG |
| `dds-fixed` | INA226, GPIO 3 | CSV, PNG |
| `dds-naive` | INA226, GPIO 3 | CSV, PNG |
| `power-states` | INA226 current and voltage | CSV |

Model graphics in this folder provide consistent expected axes and timing for
test setup. Instrument exports should retain the same filename prefix.
