# Binary BLE interface

Implements the archived NimBLE service, packet serialization, command queue and radio control.

Implementation: [link.cpp](link.cpp). Public declarations are in [include](include/README.md); [CMakeLists.txt](CMakeLists.txt) registers the component with ESP-IDF.

This component builds through the [archived ESP-IDF payload project](../../README.md) with its matching board configuration. The [firmware overview](../../../../../README.md) links to the active PlatformIO TX/RX projects.
