# Parallel-DAC DMA output

Initializes and schedules the archived LCD/i80 DMA transmit path.

Implementation: [sonar_dma.cpp](sonar_dma.cpp). Public declarations are in [include](include/README.md); [CMakeLists.txt](CMakeLists.txt) registers the component with ESP-IDF.

This is historical source for the [archived payload project](../../README.md), not the active Arduino TX/RX firmware. Build it only through the archived project and its matching hardware assumptions. For the active implementation, use the [firmware overview](../../../../../README.md).
