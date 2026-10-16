# Application documentation

Start with the [current app README](../README.md) and [package.json](../package.json). This collection includes both implementation notes and the original design plan, so old screen counts, transport sketches and build-machine assumptions are not current requirements.

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
| [12 — Firmware Wi-Fi](12-firmware-wifi.md) | Historical endpoint integration sketch; rework against the current firmware before applying |

The [current TX/RX firmware](../../../02-firmware/README.md) does not implement the console's NDJSON transport contract. The native USB/BLE module is Android-only; iOS currently has shared Wi-Fi client source. Numerical echo, range and energy figures in these notes are not proof of physical underwater or power performance.
