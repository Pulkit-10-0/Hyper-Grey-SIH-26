# iOS application files

[AppDelegate.swift](AppDelegate.swift) boots Expo/React Native. [Info.plist](Info.plist), [SeaNergy.entitlements](SeaNergy.entitlements) and [SeaNergy-Bridging-Header.h](SeaNergy-Bridging-Header.h) hold native app configuration and interoperability settings. [SplashScreen.storyboard](SplashScreen.storyboard) defines the launch presentation.

[Supporting](Supporting/README.md) contains Expo runtime properties. `Images.xcassets/Contents.json` and `Images.xcassets/AppIcon.appiconset/` define the app-icon catalog. Asset catalogs require structured JSON/artwork and deliberately contain no Markdown files; edit them with the native asset tools or regenerate from the [app artwork](../../assets/README.md).

Use [app.json](../../app.json) as the application-version/platform configuration source and review generated native changes after prebuild. See the [native project guide](../README.md) for CocoaPods, Xcode and build status.
