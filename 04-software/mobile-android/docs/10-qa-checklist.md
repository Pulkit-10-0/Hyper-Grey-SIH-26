# 10 — QA checklist

Run this before every preview build, and completely before the finale. It is a manual list
because for a project this size a manual list you actually run beats a test suite you do not.

---

## A. Layout and clipping

Test on the smallest phone you can find and the largest.

- [ ] No content under the status bar, on any screen
- [ ] No content under the gesture bar **or** the 3-button nav bar — test both
      (Settings → System → Gestures → Navigation mode)
- [ ] Content ends with breathing room above the tab bar, not flush against it
- [ ] No double bottom padding anywhere (the classic `tabBarHeight + insets.bottom` bug)
- [ ] Every scroll view reaches its true bottom with nothing cut off
- [ ] Horizontal insets applied — no text touching the screen edge
- [ ] Modals respect the top inset and their own bottom inset
- [ ] Charts never overflow their container; wide ones scroll horizontally, the page does not
- [ ] Long device names, long explanation paragraphs and 4-digit readings do not break rows

## B. Keyboard

- [ ] No text input is ever covered by the keyboard
- [ ] Keyboard animates smoothly with content, not in a jump after it
- [ ] Tapping a button while the keyboard is open works on the **first** tap
      (`keyboardShouldPersistTaps="handled"`)
- [ ] Numeric fields with `decimal-pad` have a visible way to dismiss — that keypad has no
      return key
- [ ] Keyboard dismisses on scroll and on background tap
- [ ] Nothing is clipped between the input and the keyboard top edge

## C. Text and accessibility

- [ ] Readable at 130% font scale, with no clipped or truncated text
- [ ] Still usable at 200% font scale, even if tight
- [ ] Every touch target at least 48 × 48 dp
- [ ] Contrast passes in both themes — especially the amber `REPLAY` badge
- [ ] All updating numbers use tabular figures and do not twitch as they change
- [ ] Screen reader reads the gauges as values, not as unlabelled views

## D. Theme

- [ ] Light theme correct on every screen
- [ ] Dark theme correct on every screen
- [ ] Status bar icons readable in both (`SystemBars style="auto"`)
- [ ] No colour defined only inside a theme branch and therefore missing in the other
- [ ] Charts legible in both — a plot tuned for dark often disappears on white

## E. Performance

- [ ] 60 fps scrolling on Console with live telemetry running
- [ ] Ping log scrolls smoothly at 200+ rows
- [ ] Dragging a waveform slider redraws the plot without dropped frames
- [ ] No visible lag between tapping Fire and the UI responding
- [ ] Tab switches are instant, no white flash
- [ ] Cold start under three seconds
- [ ] App survives ten minutes of continuous replay without memory growth

## F. State and data integrity

- [ ] `LIVE` / `REPLAY` / `SIM` badge is correct and visible on every screen
- [ ] `MODELLED` chip present on every power figure while no INA226 is fitted
- [ ] Switching transport at runtime works without a restart
- [ ] Backgrounding and returning does not lose session state
- [ ] Rotating (if ever unlocked) or resizing does not lose state
- [ ] Ping log persists across an app restart
- [ ] CSV export opens correctly in a spreadsheet

## G. BLE, once hardware exists

- [ ] Permission rationale shown before the first scan, not a bare system dialog
- [ ] Denied permission produces a clear explanation and a route to settings
- [ ] Bluetooth-off is detected and prompted, not shown as an empty list
- [ ] Scan finds the payload within five seconds
- [ ] MTU negotiation succeeds; app still works if it falls back to 23
- [ ] Firmware version mismatch is refused with a clear message, never mis-parsed
- [ ] Mid-session disconnect auto-reconnects, then offers a one-tap Replay fallback
- [ ] Dropped notifications are counted and surfaced, never silently interpolated
- [ ] `ENTER_MISSION` cannot be triggered accidentally

## H. Demo readiness

- [ ] Full six-minute demo runs on Replay with the payload switched off entirely
- [ ] Full demo runs on real hardware
- [ ] Demo runs with the phone in aeroplane mode — no network dependency anywhere
- [ ] Keep-awake active; screen never sleeps mid-pitch
- [ ] APK installed on two phones, both charged
- [ ] APK on a USB stick as well as in cloud storage
- [ ] Rehearsed once with a deliberate mid-demo hardware kill and a recovery on Replay
- [ ] Someone other than the primary presenter can run the whole demo

## I. Build hygiene

- [ ] `version` and `versionCode` bumped
- [ ] Build URL recorded in `BUILDS.md`
- [ ] Keystore backed up off this laptop
- [ ] No `console.log` spam in release
- [ ] No placeholder or lorem text anywhere
- [ ] App icon and splash are the real ones, not the Expo default

---

## The five-minute pre-demo check

When you have no time, do only these:

1. Open the app on both phones — does it launch clean?
2. Toggle to Replay — does the full story run?
3. Fire a ping — does the explainer paragraph read correctly?
4. Scroll every tab to the bottom — is anything clipped?
5. Check the badge says what you think it says.
