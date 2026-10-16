# iOS native project

This is the native project for the [iOS console](../README.md). It is tracked source, not an installable application. A native build needs a compatible Xcode/macOS environment, CocoaPods dependencies and the signing/provisioning appropriate to its destination.

| Path | Purpose |
|---|---|
| [Podfile](Podfile) and [Podfile.properties.json](Podfile.properties.json) | Native dependency resolution and Expo/Hermes build settings |
| [.xcode.env](.xcode.env) | Xcode shell environment configuration |
| [SeaNergy](SeaNergy/README.md) | App bootstrap, property lists, launch screen and artwork |
| [SeaNergy.xcodeproj/project.pbxproj](SeaNergy.xcodeproj/project.pbxproj) | Xcode targets, build settings and file references |
| [SeaNergy.xcodeproj/xcshareddata/xcschemes/SeaNergy.xcscheme](SeaNergy.xcodeproj/xcshareddata/xcschemes/SeaNergy.xcscheme) | Shared scheme |

Run CocoaPods from the app workflow to create `SeaNergy.xcworkspace`, then open the workspace in Xcode. The [project guide](SeaNergy.xcodeproj/README.md) and shared-scheme guides explain the checked-in Xcode configuration. Native generation may replace these files; keep [app.json](../app.json) and manual native changes in sync.

The local transport module is Android-only. This project does not provide an iOS USB/BLE native implementation, and JavaScript export success does not verify the native link or a device install.
