# Local toolchain helper

[env.ps1](env.ps1) is a Windows PowerShell environment helper. It looks for locally provisioned `node/`, `jdk/` and `android-sdk/` folders, and configures a local Gradle cache, optionally through the short `D:\sng` junction used by the recorded Windows build.

The downloaded tools and caches are ignored and are not included in Git. Dot-sourcing this script does not install Node, Java or the Android SDK. Inspect its paths before running it on another machine. Use the [app build guide](../README.md) for the build sequence.
