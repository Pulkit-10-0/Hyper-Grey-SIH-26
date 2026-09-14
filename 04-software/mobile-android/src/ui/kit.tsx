import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  Text as RNText,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { c, HIT, MIN_TAP, r, sp, Tone, toneColor, type } from './tokens';

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

type TxProps = {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  color?: string;
  numberOfLines?: number;
  /** Cap growth so dense numeric rows never reflow at large font scales. */
  cap?: number;
};

export const Tx = ({ children, style, color, numberOfLines, cap = 1.2 }: TxProps) => (
  <RNText
    numberOfLines={numberOfLines}
    maxFontSizeMultiplier={cap}
    style={[{ color: color ?? c.white }, style]}
  >
    {children}
  </RNText>
);

/* ------------------------------------------------------------------ */
/* Panel — the .sc card                                                */
/* ------------------------------------------------------------------ */

export function Panel({
  label,
  subtitle,
  children,
  right,
  flush = false,
  grow = false,
  style,
}: {
  label?: string;
  subtitle?: string;
  children?: React.ReactNode;
  right?: React.ReactNode;
  flush?: boolean;
  grow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: c.panel2,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: r.card,
          padding: flush ? 0 : sp.base,
          gap: sp.sm,
        },
        grow && { flex: 1 },
        style,
      ]}
    >
      {(label || right) && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: sp.md,
            paddingHorizontal: flush ? sp.base : 0,
            paddingTop: flush ? sp.base : 0,
          }}
        >
          <View style={{ flex: 1 }}>
            {label ? (
              <Tx style={type.cardLabel} color={c.cy}>
                {label.toUpperCase()}
              </Tx>
            ) : null}
            {subtitle ? (
              <Tx style={[type.cardSub, { marginTop: 3 }]} color={c.dim} numberOfLines={2} cap={1.3}>
                {subtitle}
              </Tx>
            ) : null}
          </View>
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Row — the .srow                                                     */
/* ------------------------------------------------------------------ */

export function Row({
  label,
  value,
  tone = 'plain',
  bar,
  onPress,
}: {
  label: string;
  value: string;
  tone?: Tone;
  /** 0..1 — draws a hairline meter under the row. */
  bar?: number;
  onPress?: () => void;
}) {
  const body = (
    <View
      style={{
        backgroundColor: c.rowFill,
        borderRadius: r.row,
        paddingVertical: 7,
        paddingHorizontal: sp.md,
        gap: bar === undefined ? 0 : 5,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: sp.md,
        }}
      >
        <Tx style={type.rowLabel} color={c.dim} numberOfLines={1}>
          {label.toUpperCase()}
        </Tx>
        <Tx style={type.rowValue} color={toneColor[tone]} numberOfLines={1}>
          {value}
        </Tx>
      </View>
      {bar !== undefined ? (
        <View style={{ height: 2, backgroundColor: c.line2, borderRadius: 1 }}>
          <View
            style={{
              width: `${Math.max(0, Math.min(1, bar)) * 100}%`,
              height: 2,
              backgroundColor: toneColor[tone === 'plain' ? 'live' : tone],
              borderRadius: 1,
            }}
          />
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${value}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
    >
      {body}
    </Pressable>
  );
}

/** Convenience: render a list of rows from tuples. */
export function Rows({
  data,
}: {
  data: (readonly [string, string, Tone?] | readonly [string, string, Tone, number])[];
}) {
  return (
    <View style={{ gap: 3 }}>
      {data.map((d, i) => (
        <Row
          key={`${d[0]}-${i}`}
          label={d[0]}
          value={d[1]}
          tone={(d[2] as Tone) ?? 'plain'}
          bar={d[3] as number | undefined}
        />
      ))}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Metric — large readout                                              */
/* ------------------------------------------------------------------ */

export function Metric({
  label,
  value,
  unit,
  tone = 'plain',
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: Tone;
}) {
  return (
    <View style={{ flex: 1, minWidth: 84, gap: 4 }}>
      <Tx style={type.cardLabel} color={c.dim}>
        {label.toUpperCase()}
      </Tx>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
        <Tx style={type.metric} color={toneColor[tone]} numberOfLines={1}>
          {value}
        </Tx>
        {unit ? (
          <Tx style={type.metricUnit} color={c.dim}>
            {unit}
          </Tx>
        ) : null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Pill                                                                */
/* ------------------------------------------------------------------ */

export function Pill({
  text,
  tone = 'sim',
  onPress,
}: {
  text: string;
  tone?: Tone;
  onPress?: () => void;
}) {
  const col = toneColor[tone];
  const body = (
    <View
      style={{
        borderWidth: 1,
        borderColor: col + '61',
        borderRadius: r.pill,
        paddingHorizontal: sp.md,
        paddingVertical: 4,
      }}
    >
      <Tx style={type.pill} color={col}>
        {text.toUpperCase()}
      </Tx>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={HIT}
      accessibilityRole="button"
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {body}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented                                                           */
/* ------------------------------------------------------------------ */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  tone = 'live',
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  tone?: Tone;
}) {
  const col = toneColor[tone];
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: c.deep,
        borderRadius: r.card,
        borderWidth: 1,
        borderColor: c.line,
        padding: 3,
        gap: 3,
      }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(o.value);
            }}
            style={{
              flex: 1,
              minHeight: 34,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: r.tab,
              backgroundColor: on ? col + '20' : 'transparent',
              borderWidth: 1,
              borderColor: on ? col + '55' : 'transparent',
            }}
          >
            <Tx
              style={[type.tab, { fontSize: 10.5 }]}
              color={on ? col : c.dim}
              numberOfLines={1}
            >
              {o.label.toUpperCase()}
            </Tx>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Chip row                                                            */
/* ------------------------------------------------------------------ */

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: sp.sm, paddingRight: sp.lg }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(o.value);
            }}
            style={{
              minHeight: 32,
              justifyContent: 'center',
              paddingHorizontal: sp.base,
              borderRadius: r.tab,
              backgroundColor: on ? c.cyFill : c.panel,
              borderWidth: 1,
              borderColor: on ? c.lineHot : c.line,
            }}
          >
            <Tx style={type.tab} color={on ? c.cy : c.silver}>
              {o.label.toUpperCase()}
            </Tx>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ */
/* Action button                                                       */
/* ------------------------------------------------------------------ */

export function Action({
  label,
  onPress,
  tone = 'live',
  disabled = false,
  busy = false,
  large = false,
}: {
  label: string;
  onPress: () => void;
  tone?: Tone;
  disabled?: boolean;
  busy?: boolean;
  large?: boolean;
}) {
  const col = toneColor[tone];
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off, busy }}
      disabled={off}
      onPress={() => {
        Haptics.impactAsync(
          large ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
        ).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => ({
        minHeight: large ? 50 : MIN_TAP,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: r.card,
        backgroundColor: col + (large ? '24' : '18'),
        borderWidth: 1,
        borderColor: col + '66',
        opacity: off ? 0.4 : pressed ? 0.7 : 1,
        paddingHorizontal: sp.lg,
      })}
    >
      <Tx
        style={[type.tab, { fontSize: large ? 13 : 11, letterSpacing: 1.6 }]}
        color={col}
        numberOfLines={1}
      >
        {busy ? 'WORKING' : label.toUpperCase()}
      </Tx>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Slider                                                              */
/* ------------------------------------------------------------------ */

export { Slider } from './Slider';

/* ------------------------------------------------------------------ */
/* Banner                                                              */
/* ------------------------------------------------------------------ */

export function Banner({ text, tone = 'warn' }: { text: string; tone?: Tone }) {
  const col = toneColor[tone];
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: col + '4D',
        backgroundColor: col + '12',
        borderRadius: r.card,
        paddingVertical: sp.md,
        paddingHorizontal: sp.base,
        flexDirection: 'row',
        alignItems: 'center',
        gap: sp.md,
      }}
    >
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: col }} />
      <Tx style={[type.tab, { letterSpacing: 1 }]} color={col} numberOfLines={2}>
        {text.toUpperCase()}
      </Tx>
    </View>
  );
}
