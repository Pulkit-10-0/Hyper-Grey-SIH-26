# Binary BLE interface

Implements the archived NimBLE service, packet serialization, command queue and radio control.

Implementation: [link.cpp](link.cpp). Public declarations are in [include](include/README.md); [CMakeLists.txt](CMakeLists.txt) registers the component with ESP-IDF.

This is historical source for the [archived payload project](../../README.md), not the active Arduino TX/RX firmware. Build it only through the archived project and its matching hardware assumptions. For the active implementation, use the [firmware overview](../../../../../README.md).
