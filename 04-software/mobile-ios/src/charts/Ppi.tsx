import { Canvas, Circle, Group, Line, Path, Skia, vec } from '@shopify/react-native-skia';
import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { c, r } from '../ui/tokens';

export type Contact = {
  /** metres */
  range: number;
  /** degrees, 0 = ahead */
  bearing: number;
  /** 0..1 */
  confidence: number;
};

/**
 * Plan-position indicator. A forward-looking 120-degree sector with range rings,
 * contacts plotted by range and bearing.
 */
export function Ppi({
  contacts,
  maxRange,
  sweepDeg,
  height = 210,
}: {
  contacts: Contact[];
  maxRange: number;
  /** current sweep angle, degrees, for the moving bearing line */
  sweepDeg: number;
  height?: number;
}) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const n = Math.round(e.nativeEvent.layout.width);
    if (n !== w) setW(n);
  };

  const HALF = 60; // sector half-angle
  const cx = w / 2;
  const cy = height - 8;
  const rad = Math.max(1, Math.min(w / 2 - 6, height - 18));

  // maxRange can legitimately be 0 when no parameter set clears the detection
  // threshold. Dividing by it would push Infinity into Skia, so clamp first.
  const scale = maxRange > 0 && Number.isFinite(maxRange) ? maxRange : 1;

  const toXY = (rangeM: number, bearingDeg: number) => {
    const safe = Number.isFinite(rangeM) ? rangeM : 0;
    const rr = (Math.max(0, Math.min(scale, safe)) / scale) * rad;
    const a = ((bearingDeg - 90) * Math.PI) / 180;
    return { x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a) };
  };

  const sector = useMemo(() => {
    if (w <= 0) return null;
    const p = Skia.Path.Make();
    p.moveTo(cx, cy);
    const a0 = ((-HALF - 90) * Math.PI) / 180;
    const a1 = ((HALF - 90) * Math.PI) / 180;
    p.lineTo(cx + rad * Math.cos(a0), cy + rad * Math.sin(a0));
    p.addArc(
      Skia.XYWHRect(cx - rad, cy - rad, rad * 2, rad * 2),
      (a0 * 180) / Math.PI,
      2 * HALF,
    );
    p.lineTo(cx, cy);
    p.close();
    return p;
  }, [w, cx, cy, rad]);

  const rings = useMemo(() => {
    if (w <= 0) return [];
    return [0.25, 0.5, 0.75, 1].map((f) => {
      const p = Skia.Path.Make();
      p.addArc(
        Skia.XYWHRect(cx - rad * f, cy - rad * f, rad * f * 2, rad * f * 2),
        -HALF - 90,
        2 * HALF,
      );
      return p;
    });
  }, [w, cx, cy, rad]);

  const sweep = useMemo(() => {
    if (w <= 0) return null;
    const a = ((sweepDeg - 90) * Math.PI) / 180;
    return { x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a) };
  }, [w, cx, cy, rad, sweepDeg]);

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
      {w > 0 && sector ? (
        <Canvas style={{ width: w, height }}>
          <Group>
            <Path path={sector} color={c.cy} opacity={0.05} />
            {rings.map((p, i) => (
              <Path
                key={i}
                path={p}
                color={c.line3}
                style="stroke"
                strokeWidth={1}
              />
            ))}
            {[-HALF, -30, 0, 30, HALF].map((deg, i) => {
              const a = ((deg - 90) * Math.PI) / 180;
              return (
                <Line
                  key={`s${i}`}
                  p1={vec(cx, cy)}
                  p2={vec(cx + rad * Math.cos(a), cy + rad * Math.sin(a))}
                  color={deg === 0 ? c.line3 : c.line2}
                  strokeWidth={1}
                />
              );
            })}
            {sweep ? (
              <Line
                p1={vec(cx, cy)}
                p2={vec(sweep.x, sweep.y)}
                color={c.cy}
                strokeWidth={1.5}
                opacity={0.75}
              />
            ) : null}
            {contacts.map((k, i) => {
              const { x, y } = toXY(k.range, k.bearing);
              if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
              return (
                <Group key={`c${i}`}>
                  <Circle
                    cx={x}
                    cy={y}
                    r={7}
                    color={c.amber}
                    opacity={0.16 * k.confidence + 0.06}
                  />
                  <Circle cx={x} cy={y} r={2.6} color={c.amber} />
                </Group>
              );
            })}
            <Circle cx={cx} cy={cy} r={2.5} color={c.cy} />
          </Group>
        </Canvas>
      ) : null}
    </View>
  );
}
