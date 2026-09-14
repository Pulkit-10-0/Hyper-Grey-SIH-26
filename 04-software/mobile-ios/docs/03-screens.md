# 03 — Screens

Five tabs, four modals. Every feature from the agreed list is placed here, tagged
**[T0]** basic need, **[T1]** nice to have, **[T2]** extra.

Global chrome present on every screen:

- **Header badge** — `LIVE` (green) / `REPLAY` (amber) / `SIM` (blue). Never hidden.
  This is a correctness requirement, not decoration: nobody should ever be able to mistake
  canned data for a live reading.
- **Mode pill** — `DECK` / `MISSION`.
- **Connection dot** — colour + RSSI bars, tap to open the connect modal.

---

## Tab 1 — Console  `app/(tabs)/index.tsx`

The screen you open on. Everything a judge needs in the first fifteen seconds.

| # | Feature | Tier | Notes |
|---|---|---|---|
| 1 | Connection state strip | T0 | Device name, firmware version, RSSI, transport kind. Tap for the modal. |
| 2 | Environment panel | T0 | Three gauges: temperature, salinity/TDS, turbidity. Needle driven by a Reanimated shared value, not state. Show raw sensor value **and** the mapped physical unit. |
| 3 | Derived physics strip | T1 | Sound speed (m/s), absorption at current f (dB/km), predicted max range. Small, monospaced, tabular figures. |
| 4 | Current waveform card | T0 | Mode, f-start → f-stop, bandwidth, pulse duration, amplitude, PRI. Tabular numerals, aligned. |
| 5 | **"Why this waveform"** | T0 | One plain-English paragraph. **The most valuable screen in the app.** Templated from `explainTemplates.ts`. See doc 05. |
| 6 | Fire ping | T0 | Large primary button, 56 dp tall, haptic on press, disabled + spinner while in flight. |
| 7 | Mode selector | T0 | Segmented control: Chirp / Sweep / Coded. |
| 8 | Scenario preset row | T1 | Four chips: Clear Reef · Coastal · Muddy Estuary · Deep. One tap sets everything. Enormous demo value for almost no work. |
| 9 | Auto ↔ Manual toggle | T0 | Switching to Manual reveals the override sliders inline. |

Layout: single `ScrollView`, cards separated by `spacing.lg`. The fire button is the last
card, not floating — a floating action button over a scroll view is exactly the thing that
collides with the gesture-nav bar.

---

## Tab 2 — Waveform  `app/(tabs)/waveform.tsx`

| # | Feature | Tier | Notes |
|---|---|---|---|
| 10 | Envelope plot | T0 | Skia. The windowed pulse envelope, time on x. |
| 11 | Spectrogram | T0 | Skia. Computed on-phone by `dsp/fft.ts` from the parameter set. Works with no hardware. |
| 12 | Manual override sliders | T0 | f-centre, bandwidth, duration, amplitude. Gesture-handler based, updating a shared value; the plot redraws on the UI thread. |
| 13 | Window selector | T1 | Rect / Hann / Hamming / Blackman. Live peak-sidelobe figure updates: −13.3 / −31.5 / −42.7 / −58 dB. |
| 14 | Compare mode | T1 | Split view: fixed-frequency CW vs chirp, with range resolution under each. **This is your core argument as one screen.** |
| 15 | Range–resolution calculator | T1 | Drag bandwidth and duration, watch resolution (c/2B) and max range respond instantly. Pure maths. Judges reach for this one. |
| 16 | Sonification | T1 | "Hear it" button — plays the chirp scaled into the audible band via `expo-audio`. Cheap to build, disproportionately memorable. |

---

## Tab 3 — Echo  `app/(tabs)/echo.tsx`

| # | Feature | Tier | Notes |
|---|---|---|---|
| 17 | A-scan | T1 | Raw received trace, Skia, with the transmit blanking region shaded. |
| 18 | Matched filter output | T1 | Correlation plot with the peak marked. |
| 19 | Result strip | T1 | Detected range, correlation peak SNR, compression gain (dB), time-bandwidth product. |
| 20 | Predicted vs measured | T1 | The closed loop, made visible: `predicted 14 dB → measured 9 dB → retuning`. This is the intellectual core of the whole project; give it a full-width card. |
| 21 | Waterfall | T2 | Scrolling spectrogram of successive pings. |

Empty state matters here: before the first ping, show a clear "No echo captured yet —
fire a ping from Console" with a button, not a blank chart.

---

## Tab 4 — Power  `app/(tabs)/power.tsx`

**Every figure on this screen carries a `MODELLED` badge until an INA226 is fitted.**
No current-sense hardware was ordered, so these are computed estimates. Say so on screen.

| # | Feature | Tier | Notes |
|---|---|---|---|
| 22 | Instantaneous draw | T0 | Big number + sparkline. |
| 23 | Energy per ping | T0 | mJ, from `core/power/model.ts`. Breaks down: idle / compute / transmit. |
| 24 | Endurance estimate | T0 | Pings remaining and mission hours at the configured battery capacity. |
| 25 | State breakdown | T0 | Table: sleeping / idle / sampling / transmitting, mA and duty. |
| 26 | DDS vs naive comparison | T1 | Side-by-side bars: lookup-table DDS vs live `sinf()`. Ties directly to the report's headline low-power claim. |
| 27 | **Mission mode handover** | T1 | The screen that says "radio off, payload autonomous", with the draw visibly dropping. Answers the Bluetooth question before it is asked. |
| 28 | Health panel | T1 | Battery, thermal, transducer continuity, fault list. |

---

## Tab 5 — Log  `app/(tabs)/log.tsx`

| # | Feature | Tier | Notes |
|---|---|---|---|
| 29 | Ping history | T0 | FlashList. Row: timestamp, mode, f-range, range result, energy. |
| 30 | Ping detail | T0 | `app/ping/[id].tsx` — full parameter set, environment at fire time, echo trace, explanation text. |
| 31 | Export CSV | T1 | `expo-file-system` write + `expo-sharing` share sheet. |
| 32 | Session summary | T2 | Count, total energy, mean SNR, adaptation events. |
| 33 | Auto report | T2 | Generate the compliance/test PDF from logged data. |

---

## Modals

| Route | Contents |
|---|---|
| `connect.tsx` | Scan list, RSSI, pair, transport switcher (Replay / Sim / BLE), permission rationale. |
| `scenario.tsx` | The four presets with a description and the parameters each will apply. |
| `settings.tsx` | Battery capacity, units, theme, demo-tour toggle, keep-awake, reset. |
| `ping/[id].tsx` | Ping detail, pushed not modal. |

---

## Tier 2, parked for the underwater version

Live waterfall (21), on-phone digital twin, mission planner, OTA firmware update,
deployment map with GPS, auto report (33), guided judge-tour mode, 3D pod viewer,
Hindi localisation, multi-payload fleet view.

Of these, **guided judge-tour mode** is the one worth pulling forward if time allows: a
scripted walkthrough the app runs itself, so a nervous team member can still deliver a
clean demo.

---

## Screen budget

Build in this order. Each row is independently demoable — if you stop at any point, you
still have something to show.

1. Console (T0 only) — the app is already presentable
2. Waveform (T0) — now it is convincing
3. Log (T0) — now it has depth
4. Power (T0) — now it answers the PS
5. Echo (T1) — now it is differentiated
6. Everything T1 remaining
7. T2 only if genuinely spare
