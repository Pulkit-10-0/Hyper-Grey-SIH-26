# Simulation scenarios

[scenarios.ts](scenarios.ts) defines the named operating environments used by the [Scenario screen](../../app/scenario.tsx) and [simulation engine](../core/engine.ts).

The presets provide repeatable numerical-model inputs for clear water, sediment and other operating conditions. Keep field units aligned with [physics.ts](../core/physics.ts) and verify that scenario changes preserve expected adaptation behaviour with `npm run check` from the app root.
