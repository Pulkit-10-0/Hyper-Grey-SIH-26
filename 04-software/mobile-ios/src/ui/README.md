# Console UI primitives

[tokens.ts](tokens.ts) defines colours, spacing, type and the shared tab-strip height. [Screen.tsx](Screen.tsx) handles page framing and safe-area spacing; [kit.tsx](kit.tsx) and [Slider.tsx](Slider.tsx) provide reusable controls. [format.ts](format.ts) formats numerical values at the UI boundary.

Use these primitives in [routes](../../app/README.md) to keep small-screen layout and value provenance consistent. Avoid embedding acoustic calculations in visual components. Run the render tests and check long labels, safe areas and chart sizing on a physical device after layout changes.
