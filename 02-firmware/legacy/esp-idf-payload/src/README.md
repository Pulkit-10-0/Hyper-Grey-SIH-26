# Archived ESP-IDF source project

[CMakeLists.txt](CMakeLists.txt) defines the previous `seanergy_payload` ESP-IDF project. [main](main/README.md) owns its application entry point and [components](components/README.md) contains the board, DDS, display, sensor, solver, output, link, power and window modules. [sdkconfig.defaults](sdkconfig.defaults) and [partitions.csv](partitions.csv) belong to that historical target.

From the repository root, with a matching ESP-IDF environment installed:

```sh
cd 02-firmware/legacy/esp-idf-payload/src
idf.py set-target esp32s3
idf.py build
```

These commands build the archived architecture, not the current [TX/RX projects](../../../README.md). Flashing requires the actual matching hardware and a deliberate device/port selection; use the [archived build notes](../docs/build-and-flash.md) for context. The optional naive-trigonometry build belongs to the archived DDS comparison.
