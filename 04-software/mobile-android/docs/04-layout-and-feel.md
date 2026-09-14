# 04 — Layout, safe areas, keyboard, and smoothness

This is the doc that stops the app looking like a hackathon build. Nothing gets clipped
by a notch, a gesture bar, or a keyboard, and nothing stutters.

---

## The Android reality you are building against

Android 15 (API 35) **enforces edge-to-edge** for apps targeting it: your UI draws under the
status bar and the navigation bar whether you asked for it or not. Android 16 **removes the
opt-out entirely** — the `windowOptOutEdgeToEdgeEnforcement` escape hatch stops working.

So there is no "turn it off" path. Handle insets properly from the first commit, because
retrofitting them across twenty screens later is miserable.

Expo SDK 54+ handles the platform side for you (`edgeToEdgeEnabled: true` in `app.json`,
`expo-status-bar` and `expo-navigation-bar` now sit on `react-native-edge-to-edge`
underneath). Your job is the JS side: apply the insets.

---

## Rule 1 — One layout primitive, used everywhere

Never use bare `<SafeAreaView>`. It cannot express "pad the top but let the background
bleed", and it behaves differently across versions. Use `useSafeAreaInsets()` inside one
component and use that component on every screen.

```tsx
// src/ui/Screen.tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, ScrollView, ViewStyle } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { spacing, color } from './tokens';

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: { top?: boolean; bottom?: boolean };
  /** true when the screen sits inside the tab navigator */
  inTabs?: boolean;
  style?: ViewStyle;
};

export function Screen({
  children,
  scroll = true,
  edges = { top: true, bottom: true },
  inTabs = false,
  style,
}: Props) {
  const insets = useSafeAreaInsets();
  const tabH = inTabs ? useBottomTabBarHeight() : 0;

  const padTop = edges.top ? insets.top : 0;
  // tab bar already consumes the bottom inset; do not add it twice
  const padBottom = edges.bottom ? (inTabs ? tabH : insets.bottom) : 0;

  const pad = {
    paddingTop: padTop,
    paddingLeft: insets.left + spacing.md,
    paddingRight: insets.right + spacing.md,
  };

  if (!scroll) {
    return (
      <View style={[{ flex: 1, backgroundColor: color.bg }, pad, { paddingBottom: padBottom }, style]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={[{ flex: 1, backgroundColor: color.bg }, style]}
      contentContainerStyle={[
        pad,
        // the extra spacing.xl is breathing room, not an inset — content should never
        // end flush against the tab bar
        { paddingBottom: padBottom + spacing.xl, gap: spacing.lg },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
```

**The double-padding bug this prevents:** the tab bar already sits above the gesture bar and
consumes `insets.bottom`. If a screen inside the tabs *also* adds `insets.bottom`, you get a
fat dead strip. `useBottomTabBarHeight()` already includes the inset — use it instead of
adding them.

## Rule 2 — Left and right insets are not optional

Landscape on a notched phone puts the cutout on the side. Even locked to portrait, some
devices report non-zero horizontal insets. Always add `insets.left` / `insets.right` to your
horizontal padding rather than hardcoding `16`.

## Rule 3 — Root providers, in this order

Order matters. Gesture handler outermost, then safe area, then keyboard.

```tsx
// app/_layout.tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SystemBars } from 'react-native-edge-to-edge';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <SystemBars style="auto" />
          <TransportProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="connect"  options={{ presentation: 'modal' }} />
              <Stack.Screen name="scenario" options={{ presentation: 'modal' }} />
              <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
            </Stack>
          </TransportProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

`SystemBars style="auto"` picks light or dark bar icons from the current theme, so the
status bar text stays readable in both.

## Rule 4 — Keyboard

Use `react-native-keyboard-controller`, not React Native's `KeyboardAvoidingView`. RN's
version needs a different `behavior` per platform, needs a manual `keyboardVerticalOffset`
matched to your header height, and animates on the JS thread so it lags the keyboard.

For any screen with a text input (settings, manual parameter entry):

```tsx
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

<KeyboardAwareScrollView
  bottomOffset={spacing.xl}        // gap kept between input and keyboard
  contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
  keyboardShouldPersistTaps="handled"
>
  {...}
</KeyboardAwareScrollView>
```

Rules that go with it:

- `keyboardShouldPersistTaps="handled"` on every scroll view, or the first tap after typing
  only dismisses the keyboard and the button appears dead.
- Set `returnKeyType` and `onSubmitEditing` so the keyboard can be dismissed from itself.
- Numeric fields get `keyboardType="decimal-pad"` — and remember the decimal pad has **no
  return key**, so those screens need a visible Done control or a `KeyboardToolbar`.
- Never put a submit button in a fixed footer without accounting for the IME inset.

## Rule 5 — Spacing scale, no magic numbers

```ts
// src/ui/tokens.ts
export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
} as const;

export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

export const type = {
  display: { fontSize: 32, lineHeight: 36, fontWeight: '700' },
  title:   { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  body:    { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  label:   { fontSize: 11, lineHeight: 14, letterSpacing: 0.8, fontWeight: '500' },
  data:    { fontSize: 16, lineHeight: 20, fontVariant: ['tabular-nums'] },
} as const;
```

- Every gap in the app comes from `spacing`. If you type a raw number, you have made a bug.
- **Use `gap` on flex containers**, not margins on children. Margins collapse and double in
  ways that are hard to trace; `gap` cannot.
- **`fontVariant: ['tabular-nums']` on every number that updates.** Without it, a reading
  changing from `199` to `211` visibly shifts width and the whole row twitches. This one
  line is the difference between "instrument" and "toy".

## Rule 6 — Touch targets and text scaling

- Minimum tappable area **48 × 48 dp**. Use `hitSlop` when the visual is smaller.
- Test at **130% font scale** (Settings → Display → Font size). This is where fixed-height
  rows clip their own text. Prefer `minHeight` over `height` everywhere.
- Set `allowFontScaling` thoughtfully: allow it on body text, but cap it on dense numeric
  tables with `maxFontSizeMultiplier={1.3}` so columns do not collapse.

## Rule 7 — Never clip a chart

Skia canvases have a fixed pixel size. Measure the parent with `onLayout` and pass real
dimensions down; never assume a width. Wrap wide plots in a horizontal `ScrollView` with its
own `contentContainerStyle` so the *chart* scrolls, never the page.

---

## Smoothness

The New Architecture is always on in SDK 56, which helps, but it does not save you from
these five:

1. **Nothing high-rate goes through `setState`.** Telemetry arrives at up to 20 Hz. Feed
   Reanimated `SharedValue`s from the transport callback and let gauges and traces read them
   on the UI thread. Push only a 5 Hz summary into zustand for the parts React must render.

2. **Select narrowly from the store.** `useTelemetry(s => s.latest.turbidity)` re-renders one
   gauge. `useTelemetry()` re-renders the screen sixty times a second. This single mistake is
   the most common cause of a janky RN app.

3. **All plots are Skia.** Chart libraries built on `react-native-svg` re-render the React
   tree per frame and will drop frames on a live trace. Skia draws on the GPU.

4. **FlashList for the log**, with a real `estimatedItemSize`. FlatList starts stuttering a
   few hundred rows in.

5. **Memoise deliberately.** `React.memo` on card components, `useCallback` on anything
   passed to a memoised child, `useMemo` for derived physics values. Verify with the
   re-render highlighter in dev tools, do not guess.

Two more that cost nothing:

- **`expo-keep-awake`** active during a demo session, so the screen never sleeps mid-pitch.
- **Lock to portrait.** One layout to test instead of two.

---

## Definition of done, per screen

A screen is not finished until all of these pass:

- [ ] Nothing under the status bar or the gesture/3-button nav bar
- [ ] Content ends with breathing room above the tab bar, not flush against it
- [ ] Scrolls to the true bottom with nothing cut off
- [ ] Keyboard covers no input, and dismisses cleanly
- [ ] Readable at 130% font scale with no clipped text
- [ ] Correct in light and dark
- [ ] Every touch target at least 48 dp
- [ ] All updating numbers are tabular
- [ ] No frame drops while scrolling with live telemetry running
