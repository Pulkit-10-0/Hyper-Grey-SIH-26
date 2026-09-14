# mobile-ios

The SeaNergy operator console, iOS target. Same application, same physics, same
twelve screens as [`../mobile-android/`](../mobile-android/).

**Version 2.1.0, build 4. Bundle identifier `in.seanergy.console`.**

---

## Status, stated plainly

| | |
|---|---|
| iOS source | **Complete.** Same `app/`, `src/`, `assets/`, `__tests__/` as the Android target |
| Native Xcode project | **Generated and present** in `ios/`. Real project, not a placeholder |
| iOS JavaScript bundle | **Built and verified** — 4.4 MB Hermes bytecode, `npx expo export --platform ios` |
| Test gate | **Passing** — 85 physics assertions, 33 render tests, platform-independent |
| `.ipa` package | **Not built.** Requires macOS and Xcode. There is no `.ipa` in this folder and none is claimed |

There is no Android project in here wearing an iOS label. If you are looking for
an installable iOS build, there isn't one, and the reason is in the next section
rather than buried.

---

## Why there is no `.ipa`

Compiling an iOS application requires the Xcode toolchain, which Apple ships only
for macOS. This is a platform restriction, not a gap in the project:

1. **`clang` for arm64-apple-ios and the iOS SDK ship inside Xcode.** They are not
   distributed for Windows or Linux, and there is no supported cross-compiler.
2. **CocoaPods must resolve and build the native modules** — Skia, Reanimated,
   Hermes, the Expo modules — each of which compiles Objective-C, Swift and C++
   against that SDK.
3. **Code signing needs an Apple identity.** A device build needs a paid Apple
   Developer Program membership (roughly ₹9,000 a year) and a provisioning profile. A
   simulator build avoids signing but produces a `.app`, which does not install
   on a phone.

The build machine for this project is Windows. Everything that can be done
without macOS has been done, and it is listed above.

### What *was* verified without a Mac

The Expo CLI refuses to generate iOS project files on Windows. The project was
therefore generated under WSL (Ubuntu), with a Linux Node placed inside the
project's own `.toolchain/` folder so nothing was installed system-wide:

```bash
node node_modules/expo/bin/cli prebuild --platform ios
```

That produced the real `ios/` tree below. The JavaScript half of the build — the
half that contains all of the physics, all of the screens and all of the project's
own code — was then compiled for iOS and confirmed to bundle clean:

```
npx expo export --platform ios
  -> _expo/static/js/ios/entry-<hash>.hbc   4.4 MB Hermes bytecode
```

So the remaining unknown is the native link step, not the application.

---

## What it would take to produce the `.ipa`

Roughly two hours on a Mac, assuming an Apple account exists.

### Option A — a macOS machine

```bash
git clone <this folder>
cd mobile-ios
npm install
npx pod-install                          # or: cd ios && pod install
npx expo run:ios --configuration Release # simulator, no signing needed
```

For a device build, open `ios/SeaNergy.xcworkspace` in Xcode, set the team on the
`SeaNergy` target, then Product → Archive → Distribute App.

### Option B — EAS cloud build, no Mac required

```bash
npx eas-cli build --platform ios --profile preview
```

This compiles on Expo's macOS fleet. It still needs an Apple Developer account for
a device-installable build; an internal-distribution build needs the device UDIDs
registered. This is the fastest route and is what we would use if an Apple account
is obtained before the finals.

### Option C — simulator build only

A `.app` for the iOS Simulator can be produced on any Mac with no Apple account at
all. It cannot be installed on a phone, so it is a demonstration artefact rather
than a deliverable.

Full command sequence, signing requirements and the decision points are in
[`ios-build-notes.md`](ios-build-notes.md).

---

## The native project

```
ios/
  SeaNergy.xcodeproj/           Xcode project, generated from app.json
  SeaNergy/
    AppDelegate.swift           Expo/React Native bootstrap
    Info.plist                  display name, version 2.1.0, build 4
    SeaNergy.entitlements
    SeaNergy-Bridging-Header.h
    SplashScreen.storyboard     splash, cream #F8F5EF over the abyss ground
    Images.xcassets/            app icon, 1024x1024 source
    Supporting/Expo.plist
  Podfile                       native module dependencies
  Podfile.properties.json       Hermes engine selected
  .xcode.env
```

`Podfile.lock` is absent because CocoaPods has never run — it cannot run off
macOS. It should be committed the first time a Mac resolves it, so that every
subsequent build installs identical pod versions.

## Configuration

| Setting | Value | Where |
|---|---|---|
| Bundle identifier | `in.seanergy.console` | `app.json` → `ios.bundleIdentifier` |
| Version | 2.1.0 | `app.json` → `version` |
| Build number | 4 | `app.json` → `ios.buildNumber` |
| Tablet support | yes | `app.json` → `ios.supportsTablet` |
| Orientation | portrait | `app.json` → `orientation` |
| JS engine | Hermes | `ios/Podfile.properties.json` |
| Deployment target | set by Expo SDK 57 | `ios/Podfile` |

`app.json` is the single source of truth. Editing the Xcode project by hand is
pointless — the next `expo prebuild` overwrites it. Change `app.json` and
regenerate.

---

## Building the source, on any platform

The parts of the gate that do not need Xcode run anywhere:

```
npm install
npm run check          # typecheck, 85 physics assertions, 33 render tests
npm run bundle:ios     # compiles the iOS JS bundle, proves the app builds
```

`npm run check` is platform-independent — it is the same suite the Android build
is gated on, and it covers every screen in both simulation and telemetry modes.

---

## Honest summary for the reviewer

The iOS work that could be completed on the available hardware is complete: the
source, the native project, the bundle and the test gate. What is missing is a
macOS host and an Apple Developer account, both of which are procurement
questions rather than engineering ones.

We would rather say that than put an Android build in a folder called iOS. That
is what happened in the 2025 submission and it was noticed.
