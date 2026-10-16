# Archived application entry point

[main.cpp](main.cpp) owns the previous payload application's tasks and lifecycle. [Kconfig.projbuild](Kconfig.projbuild) defines its configuration option; [CMakeLists.txt](CMakeLists.txt) registers the application component.

Use the [archived project root](../README.md) for its ESP-IDF build. Its parallel-DAC pins, BLE contract and timing assumptions do not describe the current [PlatformIO TX/RX projects](../../../../README.md).
