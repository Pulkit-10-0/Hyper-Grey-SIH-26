# Historical ESP32-S3 board companion project

This PlatformIO source snapshot accompanies the PCB release. It is retained for divider-patch traceability; current development is in [02-firmware/tx](../../../../02-firmware/tx/) and [02-firmware/rx](../../../../02-firmware/rx/).

- [platformio.ini](platformio.ini): original board target and dependency configuration.
- [src/main.cpp](src/main.cpp): companion sketch with TDS/turbidity divider compensation, three analog controls, continuous 40 kHz output and a 1 kHz audio test tone.

Read the [companion firmware notes](../README.md) before using this snapshot. The current TX has different analog-control and sensor-voltage assumptions; see [compatibility notes](../../../../02-firmware/docs/architecture.md). This retained copy has no claimed hardware test or successful toolchain build as part of the PCB packaging operation.

[Hardware overview](../../../README.md)
