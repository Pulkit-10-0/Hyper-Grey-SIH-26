# Archived application entry point

[main.cpp](main.cpp) owns the previous payload application's tasks and lifecycle. [Kconfig.projbuild](Kconfig.projbuild) defines its configuration option; [CMakeLists.txt](CMakeLists.txt) registers the application component.

Use the [archived project root](../README.md) for its ESP-IDF build. It contains the parallel-DAC configuration and binary BLE contract for that development stage. The [PlatformIO TX/RX projects](../../../../README.md) provide the active bench implementation.
