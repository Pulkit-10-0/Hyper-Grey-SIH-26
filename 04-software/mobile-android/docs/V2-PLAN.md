# V2 — Instrument console

V1 works but reads as generated: paragraphs of explanation on every screen, soft
rounded cards, a light theme, and five broad tabs. V2 rebuilds the surface to match
the dossier's own mobile telemetry layer (`wiiiiiiiiiiiiiiii/3.html`, section 10.2)
and splits the app into two modes with distinct jobs.

The physics engine is **not** rewritten. It passes 85/85 and stays exactly as is.
V2 is a presentation and architecture change.

---

## 1. The diagnosis

| V1 problem | V2 fix |
|---|---|
| Long explanatory paragraphs on every card | Max 2 lines of prose per screen. Everything else is label/value rows. |
| "Why this waveform" as a 600-character essay | A **SOLVE** card: one-line verdict + the deciding numbers as rows |
| Soft 14px radii, light cream theme | Sharp 3px rows / 7px cards, dark instrument ground |
| 5 broad tabs | 11 focused screens on a scrollable strip, as in the reference |
| No distinction between simulated and live data | Two explicit modes, plus a colour convention on every value |
| Body-text-sized numbers | Monospace data type, tiny uppercase labels |

---

## 2. Design tokens — lifted from 3.html

Dark only. A single committed instrument look, no light variant.

```
GROUND      abyss   #060B12    app background
            deep    #0A121C    inset / sunk
            panel   #101C28    card
            panel2  #14212F    card raised, row fill
            panel3  #182838

LINES       line    rgba(159,176,191,.13)
            line3   rgba(159,176,191,.20)
            lineHot rgba(45,212,200,.30)

TEXT        white   #EAF1F6    primary values
            silver  #9FB0BF    secondary
            dim     #6D7E8C    row labels
            faint   #4A5A68    disabled

ACCENT      cy      #2DD4C8    live / measured / good      ← primary
            cy2     #5EEAE0
            ocean   #1E6E8C
            amber   #F0A63C    attention / derived-with-caveat
            sim     #6F8CA8    simulated value             ← mode convention
            fault   #E05A6B    error / link down
```

Radii: row **3**, card **7**, pill **9**. Nothing softer.

**Type** — Rajdhani for display, JetBrains Mono for all data, system sans for the
little body text that remains. Both custom faces ship inside the APK via
`@expo-google-fonts/*`; nothing is fetched at runtime.

The reference's px values (6–8px) are for a *miniature* phone drawn on a web page.
Scaled to a real handset:

| Role | Size | Family |
|---|---|---|
| Screen title | 20 | Rajdhani 700 |
| Screen subtitle | 11 | system |
| Card label (`sc-l`) | 10, +1.4 tracking, uppercase, cyan | Mono |
| Card sublabel (`sc-s`) | 10, dim | system |
| Row label | 11, +0.4 tracking, dim | Mono |
| Row value | 12.5 | Mono |
| Big readout | 26 | Mono |
| Tab | 10 | Mono |

---

## 3. Two modes

This is the structural change, and the switch has to earn its place.

| | **SIMULATION** | **TELEMETRY** |
|---|---|---|
| Job | Design tool. Prove the adaptation algorithm and explore the trade space. | Operator console. Watch the real payload. |
| Data | Computed by the on-device physics engine | Decoded from the payload's packet stream |
| Controls | Everything adjustable — scenarios, sliders, modes, windows | Read-only. The payload decides. |
| Without hardware | Fully functional | Shows `LINK DOWN` and the packet layout it expects |
| Value tint | `sim` blue `#6F8CA8` | cyan `#2DD4C8` |

The colour convention does the work that paragraphs used to: a blue number is
computed, a cyan number came off the wire. No disclaimer text needed anywhere.

Mode lives in the header as a two-position segmented control and is the first card
on Home. Switching is instant and never loses state.

`TELEMETRY` ships with no radio dependency — the link layer is an interface with a
`NoLink` implementation. Every screen renders its real layout with `—` placeholders
and an `AWAITING LINK` banner, which is exactly the operator interface, honestly
shown. Adding a BLE implementation later touches one file.

---

## 4. Screens — 11, following the reference

Bottom navigation is a horizontally scrollable strip, not a fixed 5-tab bar.

| # | Tab | Title / subtitle | Content |
|---|---|---|---|
| 1 | Home | Payload status | Mode switch · SYSTEM · LAST SOLVE · HEALTH |
| 2 | Env | Sensed medium | Sensor rows · DERIVED (sound speed, absorption, pressure) |
| 3 | Wave | Transmit pulse | Pulse plot · sweep/TBP/compression rows |
| 4 | Sonar | PPI · range / bearing | **New.** Polar sweep display + contact list |
| 5 | Spec | Occupied band | Spectrum plot · instantaneous f(t) plot |
| 6 | Echo | Matched filter | Correlation plot · range/SNR/PSLR rows |
| 7 | Power | Per-burst budget | Current-draw plot · energy and endurance rows |
| 8 | Mission | Survey progress | **New.** Elapsed/track/detections · next waypoint |
| 9 | Diag | Diagnostics | **New.** Timing budget · DMA underruns · faults · self-test |
| 10 | Log | Ping history | Dense mono log lines · export |
| 11 | Set | Settings | Mode · medium · display · about |

Every screen: header (title + subtitle left, mode pill right), body of `Panel`
cards, each card a small cyan label plus rows.

---

## 5. Component set

Five primitives replace V1's card/text sprawl.

```
<Panel label subtitle>        the .sc card
<Row label value tone>        the .srow — tone: 'live' | 'sim' | 'warn' | 'fault' | null
<Metric label value unit>     large monospace readout
<Pill text tone>              status chip
<TabStrip>                    the scrollable bottom nav
```

Plots keep the existing Skia layer, restyled: cyan stroke, no fill except where the
reference fills, 1px hairlines, dark inset ground.

---

## 6. What gets deleted

- The light palette and every `useColorScheme` branch
- `explanation.body` as displayed prose — the engine still computes it, but the UI
  shows `explanation.headline` as a one-line verdict plus the deciding rows
- Every "This means…" / "That factor is the whole argument…" sentence
- `Gauge` with its big bars — replaced by rows with an inline micro-bar
- Rounded 14px cards, cream, and the `brandSoft` tinted card style

---

## 7. Order of work

1. Tokens, theme, fonts
2. Primitives: Panel, Row, Metric, Pill, TabStrip
3. Mode layer in the engine (`source: 'sim' | 'live'`, `LinkState`)
4. Navigation shell with 11 routes
5. Screens 1–3 (Home, Env, Wave) — first presentable milestone
6. Screens 4–7 (Sonar, Spec, Echo, Power)
7. Screens 8–11 (Mission, Diag, Log, Set)
8. Restyle the Skia plots + new PPI
9. Typecheck, verify, build APK

The engine, physics, DSP and verification suite are untouched throughout.
