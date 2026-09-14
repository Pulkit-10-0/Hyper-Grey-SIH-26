# 08 — Build and APK

## Short answer

Yes, you get a real installable `.apk`. Use **EAS Build (cloud)** — it needs no Android SDK
on this machine, which matters because yours is missing.

## Why not local first

Two blockers on this machine right now:

| Problem | Detail |
|---|---|
| Android SDK absent | `ANDROID_HOME` is set to `%LOCALAPPDATA%\Android\Sdk`, but that directory does not exist. Stale variable pointing at nothing. |
| JDK 25 | Android Gradle Plugin supports JDK 17 and 21. 25 will fail, and the failure messages are unhelpful. |

Both are fixable, neither is worth fixing in week one. EAS builds on Expo's machines with a
correct toolchain.

---

## Setup, once

```bash
npm i -g eas-cli@latest      # you have 16.19.3; refresh it
eas login                    # free Expo account
eas init                     # creates the project, writes projectId into app.json
```

## eas.json

```jsonc
{
  "cli": { "version": ">= 16.0.0", "appVersionSource": "remote" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "channel": "preview"
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": { "production": {} }
}
```

Three profiles, three jobs:

- **development** — the dev client. Install once, then iterate over Wi-Fi with
  `npx expo start --dev-client`. You rebuild this only when native dependencies change.
- **preview** — the APK you hand out. Standalone, no Metro needed, works on any phone.
  **This is your demo build.**
- **production** — AAB, only if you ever put it on Play. You will not need it.

By default EAS produces an `.aab`, which will not sideload. `"buildType": "apk"` is what
makes it an APK. Get this wrong and you will discover it the night before.

---

## The two commands you will actually use

```bash
# once, and again only when native deps change
eas build -p android --profile development

# the shareable demo APK
eas build -p android --profile preview
```

Each prints a download URL when it finishes. Builds take roughly 10–20 minutes on the free
tier queue. Free tier is about 15 Android builds a month, which is comfortable if you use
the dev client for day-to-day work and only cut preview APKs at milestones.

## Day-to-day loop

```bash
npx expo start --dev-client
```

Metro serves JS to the installed dev client over Wi-Fi. Fast refresh, no rebuild.
You only pay the 15-minute build cost when you add a native module.

---

## Local build, if you want it later

```bash
# 1. install JDK 17 (Temurin), set JAVA_HOME to it
# 2. install Android Studio, then SDK Platform 35/36 + Build-Tools + Platform-Tools
# 3. fix ANDROID_HOME to the real path
npx expo prebuild --platform android
npx expo run:android --variant release
# APK lands in android/app/build/outputs/apk/release/
```

Or `eas build -p android --profile preview --local`, which uses the same EAS config on your
own machine. Same prerequisites.

Worth doing eventually so you are not dependent on internet access at the venue — but that
is a week-six task, not a week-one task.

---

## Work package 0: prove the pipeline on day one

Before a single feature exists:

1. `npx create-expo-app` → add nothing
2. `eas init`, write `eas.json`
3. `eas build -p android --profile preview`
4. Download the APK, install it on a phone, watch it open

If anything is going to go wrong with accounts, signing, queue times or package names, it
goes wrong here, when there is time to fix it. Teams that leave the first build to the end
lose a night to it. **Do not be that team.**

---

## Signing

EAS generates and stores a keystore for you on first build. Accept it. Then:

```bash
eas credentials
```

and back the keystore up somewhere off this laptop. If you lose it you cannot ship an update
that overwrites an already-installed APK — installs will fail with a signature mismatch,
which is a confusing thing to debug at a judging table.

---

## Distributing at the venue

- Put the APK on a **USB stick and a phone**, not only in cloud storage. Assume no internet.
- Have it **pre-installed on two phones**, so a judge can hold one while you drive the other.
- Generate a QR code to the download URL for the poster, as a bonus rather than a dependency.
- Note that Android will warn about installing from an unknown source. Walk a judge through
  that once, calmly, or better: hand them a phone with it already installed.

## Version discipline

Bump `version` and `android.versionCode` in `app.json` for every preview build, and note the
build URL in a `BUILDS.md`. When someone says "it worked yesterday", you want to be able to
reinstall yesterday.
