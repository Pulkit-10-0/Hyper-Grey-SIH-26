# Screen render tests

[screens.test.tsx](screens.test.tsx) exercises the operator screens with the Jest/React Native harness. Run `npm test` from the [app root](../README.md); `npm run check` also includes type checking and the numerical/protocol verifier.

The v2.2.0 [release record](../../releases/BUILDS.md) reports 33 render tests passing. These tests check rendered application behaviour with mocked platform boundaries. They do not replace device installation, Bluetooth/USB pairing, a real endpoint or underwater acoustic testing.
