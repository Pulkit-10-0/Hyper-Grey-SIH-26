import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Tx } from './kit';
import { c, HIT, r, sp, type } from './tokens';

/**
 * Gesture-driven slider. There is no TextInput anywhere in this app, which
 * removes every keyboard-overlap and IME-inset failure mode.
 */
export function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  disabled = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const [w, setW] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setW(e.nativeEvent.layout.width);
  }, []);

  const commit = useCallback(
    (px: number) => {
      if (w <= 0) return;
      const f = Math.max(0, Math.min(1, px / w));
      let v = min + (max - min) * f;
      if (step && step > 0) v = Math.round(v / step) * step;
      onChange(Math.max(min, Math.min(max, v)));
    },
    [w, min, max, step, onChange],
  );

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .minDistance(0)
    .onBegin((e) => {
      'worklet';
      runOnJS(commit)(e.x);
    })
    .onUpdate((e) => {
      'worklet';
      runOnJS(commit)(e.x);
    });

  const frac = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;

  return (
    <View style={{ gap: 5, opacity: disabled ? 0.4 : 1 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: sp.md,
        }}
      >
        <Tx style={type.rowLabel} color={c.dim} numberOfLines={1}>
          {label.toUpperCase()}
        </Tx>
        <Tx style={type.rowValue} color={c.cy}>
          {format(value)}
        </Tx>
      </View>

      <GestureDetector gesture={pan}>
        <View
          onLayout={onLayout}
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ text: format(value) }}
          hitSlop={HIT}
          style={{ height: 30, justifyContent: 'center' }}
        >
          <View
            style={{
              height: 3,
              backgroundColor: c.deep,
              borderRadius: 2,
              borderWidth: 1,
              borderColor: c.line2,
            }}
          >
            <View
              style={{ width: `${frac * 100}%`, height: 1, backgroundColor: c.cy }}
            />
          </View>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: `${frac * 100}%`,
              marginLeft: -6,
              width: 12,
              height: 12,
              borderRadius: r.row,
              backgroundColor: c.panel3,
              borderWidth: 1,
              borderColor: c.cy,
            }}
          />
        </View>
      </GestureDetector>
    </View>
  );
}
