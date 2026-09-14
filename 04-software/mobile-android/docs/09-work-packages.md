# 09 — Work packages

Thirteen packages. Each one ends with something you could show a judge. If you stop at any
point, you still have a demo — that property is the whole reason for this ordering.

Effort is in focused half-days (≈4 h). Adjust to your team size, keep the sequence.

---

### WP0 — Prove the build pipeline · 1 half-day

Scaffold, `eas init`, `eas.json` with the APK profile, cloud build, install on a phone.
No features. See doc 08.

**Done when:** an APK from EAS opens on a physical phone.
**Why first:** every account, signing and queue problem surfaces now instead of the night
before the finale.

---

### WP1 — Design system and layout shell · 2 half-days

`tokens.ts`, `Screen.tsx`, `Text`, `Card`, `Button`, `Badge`, `StatRow`, `Segmented`.
Root providers in the right order. Five empty tabs. Light and dark.

**Done when:** all five tabs navigate, nothing is clipped by the status bar or gesture bar,
and the doc-04 checklist passes on an empty screen.
**Why second:** retrofitting insets across twenty built screens is miserable. Get the
container right while there is nothing in it.

---

### WP2 — Core physics and DSP · 3 half-days

Everything in `src/core`. Pure TypeScript with jest tests. No UI.

**Done when:** the test list at the end of doc 07 is green.
**Why here:** this is the intellectual content. It is also the part you can hand to whoever
on the team is strongest at maths, in parallel with WP1.

---

### WP3 — Transport abstraction and fixtures · 2 half-days

`Transport` interface, `ReplayTransport`, `SimTransport`, the 40-ping replay session,
scenarios, device profile, explanation templates.

**Done when:** a debug screen prints live telemetry from Replay and from Sim, and you can
switch between them at runtime.
**Why here:** from this point on, the whole app is buildable with no hardware.

---

### WP4 — Console screen · 3 half-days

Gauges, derived physics strip, waveform card, **the "why this waveform" explainer**, fire
button, mode selector, auto/manual, scenario chips.

**Done when:** you can tap Muddy Estuary, watch the parameters change, and read a correct
paragraph explaining why.
**This is the first genuinely presentable milestone.** It alone would demo acceptably.

---

### WP5 — Skia charts · 3 half-days

`WaveformPlot`, `Spectrogram`, `AScan`, `CorrelationPlot`, `Sparkline`. Measured parents, no
assumed widths, horizontal scroll wrappers.

**Done when:** the envelope and spectrogram redraw at 60 fps while a slider is dragged.

---

### WP6 — Waveform screen · 2 half-days

Envelope, spectrogram, override sliders, window selector with live PSL, compare mode,
range–resolution calculator, sonification.

**Done when:** toggling the window visibly changes the sidelobes and the displayed dB figure
matches the theoretical table.

---

### WP7 — Log and export · 2 half-days

FlashList history, ping detail route, CSV export, session summary.

**Done when:** forty pings scroll at 60 fps and a CSV lands in the share sheet.

---

### WP8 — Power screen · 2 half-days

Draw, energy per ping, endurance, state breakdown, DDS vs naive comparison, mission-mode
handover, health panel. Every figure badged `MODELLED`.

**Done when:** the mission handover animation runs and the modelled draw visibly drops.

---

### WP9 — Echo screen and the closed loop · 3 half-days

A-scan, matched filter output, result strip, predicted-vs-measured card, the feedback
correction.

**Done when:** firing into rising turbidity shows prediction, measurement, the gap, and the
retune — in that order, on one screen.
**This is the differentiating screen.** Do not let it get squeezed.

---

### WP10 — Polish pass · 3 half-days

Empty states everywhere. Loading and error states. Haptics. Keep-awake. Portrait lock.
Icon and splash. The full doc-04 checklist on every screen. 130% font scale. Both themes.
Three-button nav and gesture nav.

**Done when:** doc 10 passes end to end.
**Do not skip this.** It is the difference between "they built an app" and "that felt like a
product". Budget it as real work, not as leftover time.

---

### WP11 — BLE transport · 4 half-days

`BleTransport`, codec, permission flow, scan and connect modal, reconnect logic, version
guard, all the failure paths from doc 06.

**Done when:** the app runs identically on real hardware, and pulling the payload's power
falls back to Replay in one tap.
**Why this late:** the interface has existed since WP3, so this package touches no screen.
It is also the package most likely to be blocked by firmware, and putting it last means that
blockage costs you nothing.

---

### WP12 — Demo build and rehearsal · 2 half-days

Preview APK, installed on two phones. Guided tour mode if time allows. Run the six-minute
demo three times, including once where you deliberately kill the payload mid-demo and
recover on Replay.

**Done when:** three clean run-throughs, one of them from a deliberate failure.

---

## Totals and parallelism

Roughly **32 half-days** of focused work, about 128 hours.

Three obvious parallel tracks:

| Track | Packages |
|---|---|
| A — Physics | WP2, WP7 (core), then WP9 logic |
| B — UI | WP1, WP4, WP5, WP6, WP10 |
| C — Integration | WP0, WP3, WP8, WP11, WP12 |

## The cut line

If time collapses, ship **WP0–WP5 plus WP10**. That is a polished app with the Console and
Waveform screens working off replay data, and it demos well. Everything after WP5 deepens
it; nothing after WP5 is required for it to look finished.

What you must never cut: **WP10**. A half-built app that feels solid beats a fully-featured
app with clipped text and stuttering scroll, every time, in front of a judge who has forty
teams to see.
