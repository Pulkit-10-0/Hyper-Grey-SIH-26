# Application documentation

Start with the [current app README](../README.md) and [package.json](../package.json). This collection preserves implementation notes and the original design plan. The app README and package manifest describe the current screens, transports and build commands.

| Material | How to use it |
|---|---|
| [00 — What changed](00-what-changed.md) and [V2 plan](V2-PLAN.md) | Design history and reasons for the instrument-style console |
| [01 — Stack](01-stack.md), [02 — Architecture](02-architecture.md), [03 — Screens](03-screens.md) | Original planning notes; actual source now uses Expo SDK 57 and eleven tabs plus Scenario |
| [04 — Layout](04-layout-and-feel.md) and [05 — Data](05-data-and-hardcoding.md) | Earlier UI/fixture rationale; inspect the engine for the actual simulation and telemetry paths |
| [06 — BLE](06-ble-protocol.md) | Superseded binary protocol proposal |
| [07 — Physics/DSP](07-physics-and-dsp.md) | Numerical design notes; compare with [current core source](../src/core/README.md) |
| [08 — Build/APK](08-build-and-apk.md) and [09 — Work packages](09-work-packages.md) | Original build investigation and work plan; use the app README for current commands |
| [10 — QA](10-qa-checklist.md) | Manual device checks, separate from automated tests |
| [11 — Link protocol](11-link-protocol.md) | App-side NDJSON integration contract |
| [12 — Firmware Wi-Fi](12-firmware-wifi.md) | Endpoint integration reference; compare with current firmware when adapting |

The app-side [NDJSON contract](11-link-protocol.md) defines compatible endpoint records. Android uses the native USB/BLE module and shared Wi-Fi client; iOS uses Wi-Fi. See the [current firmware guide](../../../02-firmware/README.md) for TX/RX interfaces. Echo, range and energy examples describe the numerical model.
