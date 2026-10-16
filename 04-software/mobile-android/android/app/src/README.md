# Android source sets

[main](main/README.md) supplies the production manifest, bootstrap classes and resources. [debug](debug/README.md) and [debugOptimized](debugOptimized/README.md) supply build-variant manifest overlays.

Gradle merges these source sets and the manifests contributed by dependencies and the local transport module. Inspect the merged build result when auditing actual permissions. Application screens and numerical logic live in the [TypeScript app](../../../src/README.md), not in these native bootstrap files.
