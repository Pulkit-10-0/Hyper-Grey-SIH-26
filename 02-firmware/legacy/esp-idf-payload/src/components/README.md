# Archived ESP-IDF components

The [archived project](../README.md) registers these components through their CMake files. They are retained for design history; the active projects are [TX and RX](../../../../README.md).

| Component | Responsibility |
|---|---|
| [board](board/README.md) | Initializes board interfaces and controls the transmit, potentiometer and timing-marker GPIOs. |
| [dds](dds/README.md) | Provides the archived fixed-point phase accumulator and sine-table sample generation. |
| [hmi](hmi/README.md) | Updates the archived OLED/operator display view. |
| [link](link/README.md) | Implements the archived NimBLE service, packet serialization, command queue and radio control. |
| [physics](physics/README.md) | Contains the archived sound-speed and loss calculations used by its solver. |
| [power](power/README.md) | Contains the archived current/energy accounting and power-state functions. |
| [sensors](sensors/README.md) | Reads the archived board sensor and control inputs. |
| [solver](solver/README.md) | Selects an archived transmit plan using the physics and operating constraints. |
| [sonar_dma](sonar_dma/README.md) | Initializes and schedules the archived LCD/i80 DMA transmit path. |
| [window](window/README.md) | Calculates the archived transmit envelope/window coefficients. |
