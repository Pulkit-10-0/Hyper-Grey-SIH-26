import { Canvas, Group, Line, Path, Skia, vec } from '@shopify/react-native-skia';
import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { c, r, sp, type } from '../ui/tokens';
import { Tx } from '../ui/kit';

/**
 * The single line/area plot used everywhere. Cyan hairline on a dark inset,
 * matching the dossier's chart language.
 */
export function Plot({
  data,
  height = 96,
  yMin,
  yMax,
  fill = false,
  color = c.cy,
  width: strokeWidth = 1.2,
  grid = [],
  markers = [],
  blankUntil = 0,
}: {
  data: ArrayLike<number>;
  height?: number;
  yMin: number;
  yMax: number;
  fill?: boolean;
  color?: string;
  width?: number;
  grid?: number[];
  markers?: { x: number; color?: string }[];
  blankUntil?: number;
}) {
  const [w, setW] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const n = Math.round(e.nativeEvent.layout.width);
    if (n !== w) setW(n);
  };

  const toY = useMemo(() => {
    const span = yMax - yMin || 1;
    return (v: number) => height - ((v - yMin) / span) * height;
  }, [yMin, yMax, height]);

  const path = useMemo(() => {
    if (w <= 0 || data.length === 0) return null;
    const p = Skia.Path.Make();
    const n = data.length;
    const dx = n > 1 ? w / (n - 1) : w;
    p.moveTo(0, toY(data[0]));
    for (let i = 1; i < n; i++) p.lineTo(i * dx, toY(data[i]));
    if (fill) {
      p.lineTo((n - 1) * dx, height);
      p.lineTo(0, height);
      p.close();
    }
    return p;
  }, [data, w, toY, fill, height]);

  const blank = useMemo(() => {
    if (blankUntil <= 0 || w <= 0) return null;
    const p = Skia.Path.Make();
    p.addRect(Skia.XYWHRect(0, 0, w * blankUntil, height));
    return p;
  }, [blankUntil, w, height]);

  return (
    <View
      onLayout={onLayout}
      style={{
        height,
        backgroundColor: c.deep,
        borderRadius: r.row,
        borderWidth: 1,
        borderColor: c.line2,
        overflow: 'hidden',
      }}
    >
      {w > 0 && path ? (
        <Canvas style={{ width: w, height }}>
          <Group>
            {grid.map((g, i) => (
              <Line
                key={`g${i}`}
                p1={vec(0, toY(g))}
                p2={vec(w, toY(g))}
                color={c.line2}
                strokeWidth={1}
              />
            ))}
            {blank ? <Path path={blank} color={c.line2} /> : null}
            <Path
              path={path}
              color={color}
              style={fill ? 'fill' : 'stroke'}
              strokeWidth={strokeWidth}
              strokeJoin="round"
              strokeCap="round"
              opacity={fill ? 0.35 : 1}
            />
            {fill ? (
              <Path
                path={path}
                color={color}
                style="stroke"
                strokeWidth={strokeWidth}
              />
            ) : null}
            {markers.map((m, i) => (
              <Line
                key={`m${i}`}
                p1={vec(w * m.x, 0)}
                p2={vec(w * m.x, height)}
                color={m.color ?? c.amber}
                strokeWidth={1}
              />
            ))}
          </Group>
        </Canvas>
      ) : null}
    </View>
  );
}

/** Tiny caption row under a plot. */
export function Axis({ left, right }: { left: string; right: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: sp.xs,
      }}
    >
      <Tx style={type.tab} color={c.faint}>
        {left.toUpperCase()}
      </Tx>
      <Tx style={type.tab} color={c.faint}>
        {right.toUpperCase()}
      </Tx>
    </View>
  );
}
