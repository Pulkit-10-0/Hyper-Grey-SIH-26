# Energy per ping

The INA226 is configured for a 0.1 ohm shunt and 0.1 mA current LSB. Firmware
integrates each ping using:

`energy_uJ = bus_mV x current_0.1mA x duration_us / 10,000,000`

| Mode | Duration | Baseline current | Baseline energy at 3.70 V |
|---|---:|---:|---:|
| Detail | 1.024 ms | 68 mA | 0.258 mJ |
| Balanced | 1.536 ms | 68 mA | 0.386 mJ |
| Range | 2.048 ms | 68 mA | 0.515 mJ |

For final integration, include the 50 us driver-settle period and post-ping
INA226 read. Report mean, median, standard deviation and 95% interval over at
least 30 pings. Use INR only for costing documents; energy remains in SI units.
