# Parallel-DAC DMA output

Initializes and schedules the archived LCD/i80 DMA transmit path.

Implementation: [sonar_dma.cpp](sonar_dma.cpp). Public declarations are in [include](include/README.md); [CMakeLists.txt](CMakeLists.txt) registers the component with ESP-IDF.

This component builds through the [archived ESP-IDF payload project](../../README.md) with its matching board configuration. The [firmware overview](../../../../../README.md) links to the active PlatformIO TX/RX projects.
