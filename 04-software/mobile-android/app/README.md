# Application routes

Expo Router loads [_layout.tsx](_layout.tsx) as the application layout. The [tab group](%28tabs%29/README.md) contains eleven operator destinations; [scenario.tsx](scenario.tsx) selects modelled environments, and [ping/](ping/README.md) opens a saved ping record.

Screens consume the [shared engine](../src/core/README.md), [UI primitives](../src/ui/README.md) and [charts](../src/charts/README.md). Keep numerical calculations and packet parsing in the shared source layer so screens display one consistent state. Simulation traces and live telemetry records have different provenance; the current firmware needs protocol integration before a live session.
