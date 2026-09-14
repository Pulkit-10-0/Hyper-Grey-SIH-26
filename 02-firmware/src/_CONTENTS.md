# src

## Purpose
The ESP-IDF project that runs on the payload. C and C++ only, no sketch files.

## Files that must exist
- Full ESP-IDF project: `CMakeLists.txt`, `sdkconfig.defaults`, `main/`, `components/`
- `README.md` — build and flash in five lines
- `.bin` release artefact in `../releases/`, matching a tagged commit

## Module layout
| Module | Responsibility |
|---|---|
| `dds/` | Sine lookup table, phase accumulator, fixed point Q16.16 |
| `window/` | Envelope generation, four windows |
| `dma/` | Ping-pong buffers, LCD/i80 parallel bus, hardware timer trigger |
| `adc/` | Sensor sampling, moving average, pot rail gating |
| `physics/` | Sound speed, absorption, sonar equation, fixed point |
| `solver/` | Candidate search, margin rule, mode and window selection |
| `link/` | BLE GATT server, packet encode, mission-mode radio kill |
| `hmi/` | OLED, LED, debounced trigger |
| `power/` | INA226 sampling, energy integration, light sleep |

## Constraints that must be honoured and commented
- Waveform buffers live in internal SRAM, never PSRAM
- No floating point in the transmit path
- No `sinf()` in the sample loop; the lookup table exists for a measured reason
- Core 0 owns transmit and does nothing else
- The idle hook toggles a GPIO so CPU occupancy is externally measurable

## Acceptance
Builds clean from a fresh clone. Every magic number is a named constant with a
unit in the comment. The naive-trigonometry comparison build exists behind a
compile flag so the power claim can be measured both ways.
