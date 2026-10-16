# Archived ESP-IDF payload

This is the previous ESP-IDF implementation and its design/evidence package. It uses a parallel LCD/i80 DAC architecture, a binary BLE interface and a different hardware baseline. It is retained for source history; the active bench projects are [ESP32-S3 TX](../../tx/README.md) and [ESP32 RX](../../rx/README.md).

| Folder | Contents |
|---|---|
| [Source](src/README.md) | ESP-IDF application, component CMake files and headers |
| [Documentation](docs/README.md) | Earlier architecture, BLE contract, memory/timing descriptions and diagrams |
| [Measurement material](measurements/README.md) | Original comparisons, projections and a sensor-session log |
| [Release procedure](releases/README.md) | Historical binary packaging instructions |

The source contains fixed-point DDS, envelopes, sensor/solver, BLE, power and DMA modules. Its documentation preserves the design assumptions, analytical comparisons, and evidence records for this architecture.

The [board companion sketch](../../../01-hardware/kicad/firmware/README.md) belongs to the earlier PCB snapshot. The current five-control TX wiring and output profiles are documented in [current architecture and compatibility](../../docs/architecture.md).
