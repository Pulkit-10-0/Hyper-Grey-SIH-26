# iOS native project

This is the native project for the [iOS console](../README.md). It includes the checked-in native source and configuration. Native compilation uses a compatible Xcode/macOS environment, CocoaPods dependencies and the signing/provisioning appropriate to its destination.

| Path | Purpose |
|---|---|
| [Podfile](Podfile) and [Podfile.properties.json](Podfile.properties.json) | Native dependency resolution and Expo/Hermes build settings |
| [.xcode.env](.xcode.env) | Xcode shell environment configuration |
| [SeaNergy](SeaNergy/README.md) | App bootstrap, property lists, launch screen and artwork |
| [SeaNergy.xcodeproj/project.pbxproj](SeaNergy.xcodeproj/project.pbxproj) | Xcode targets, build settings and file references |
| [SeaNergy.xcodeproj/xcshareddata/xcschemes/SeaNergy.xcscheme](SeaNergy.xcodeproj/xcshareddata/xcschemes/SeaNergy.xcscheme) | Shared scheme |

Run CocoaPods from the app workflow to create `SeaNergy.xcworkspace`, then open the workspace in Xcode. The [project guide](SeaNergy.xcodeproj/README.md) and shared-scheme guides explain the checked-in Xcode configuration. Native generation may replace these files; keep [app.json](../app.json) and manual native changes in sync.

iOS telemetry uses the shared Wi-Fi client. The local transport module targets Android USB/BLE; use a compatible NDJSON endpoint for Wi-Fi sessions.
