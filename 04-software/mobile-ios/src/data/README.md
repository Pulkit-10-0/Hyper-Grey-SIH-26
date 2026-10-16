# Simulation scenarios

[scenarios.ts](scenarios.ts) defines the named operating environments used by the [Scenario screen](../../app/scenario.tsx) and [simulation engine](../core/engine.ts).

These are input presets for the numerical model, not recorded sensor sessions or measured sea trials. Keep field units aligned with [physics.ts](../core/physics.ts) and verify that scenario changes preserve expected adaptation behaviour with `npm run check` from the app root.
