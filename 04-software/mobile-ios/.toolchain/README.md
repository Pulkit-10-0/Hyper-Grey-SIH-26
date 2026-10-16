# Local toolchain helper

[env.ps1](env.ps1) is a Windows PowerShell environment helper. It looks for locally provisioned `node/`, `jdk/` and `android-sdk/` folders, and configures a local Gradle cache, optionally through the short `D:\sng` junction used by the recorded Windows build.

Provision Node, Java and the Android SDK in the expected local directories before dot-sourcing the helper. Inspect its paths on a new machine; downloaded tools and caches remain local. Use the [app build guide](../README.md) for the build sequence.
