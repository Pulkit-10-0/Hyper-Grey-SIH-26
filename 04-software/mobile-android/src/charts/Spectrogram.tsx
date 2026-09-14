import {
  AlphaType,
  Canvas,
  ColorType,
  Image,
  Skia,
  SkImage,
} from '@shopify/react-native-skia';
import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { spectrogram } from '../core/dsp';
import { c as C, r as R } from '../ui/tokens';

/**
 * Time-frequency view of the pulse.
 *
 * The whole grid is uploaded as a single Skia image rather than drawn as
 * thousands of rectangles, so the cost is one draw call regardless of resolution.
 */

type Props = {
  signal: Float32Array;
  height?: number;
  frames?: number;
  fftSize?: number;
  /** Fraction of the spectrum to display, from DC upward. */
  bandFraction?: number;
};


function colourise(v: number, out: Uint8Array, o: number) {
  const t = Math.max(0, Math.min(1, v));
  // stops: background -> deep teal -> mid teal -> sky -> near white
  // abyss -> ocean -> cyan -> bright cyan, matching the console accent ramp.
  const stops = [
    [6, 11, 18],
    [16, 44, 56],
    [30, 110, 140],
    [45, 212, 200],
    [94, 234, 224],
  ];
  const seg = t * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(seg));
  const f = seg - i;
  out[o] = stops[i][0] + (stops[i + 1][0] - stops[i][0]) * f;
  out[o + 1] = stops[i][1] + (stops[i + 1][1] - stops[i][1]) * f;
  out[o + 2] = stops[i][2] + (stops[i + 1][2] - stops[i][2]) * f;
  out[o + 3] = 255;
}

export function SpectrogramPlot({
  signal,
  height = 168,
  frames = 96,
  fftSize = 256,
  bandFraction = 0.55,
}: Props) {
  const [w, setW] = useState(0);

  const image: SkImage | null = useMemo(() => {
    if (signal.length < 16) return null;
    const spec = spectrogram(signal, fftSize, frames);
    const showBins = Math.max(8, Math.floor(spec.bins * bandFraction));

    const px = new Uint8Array(frames * showBins * 4);
    for (let x = 0; x < frames; x++) {
      for (let y = 0; y < showBins; y++) {
        // image rows run top-down; low frequency belongs at the bottom
        const bin = showBins - 1 - y;
        const v = spec.data[x * spec.bins + bin];
        colourise(v, px, (y * frames + x) * 4);
      }
    }

    const data = Skia.Data.fromBytes(px);
    return Skia.Image.MakeImage(
      {
        width: frames,
        height: showBins,
        colorType: ColorType.RGBA_8888,
        alphaType: AlphaType.Opaque,
      },
      data,
      frames * 4,
    );
  }, [signal, frames, fftSize, bandFraction]);

  const onLayout = (e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    if (next !== w) setW(next);
  };

  return (
    <View
      onLayout={onLayout}
      style={{
        height,
        borderRadius: R.row,
        overflow: 'hidden',
        backgroundColor: C.deep,
      }}
    >
      {w > 0 && image ? (
        <Canvas style={{ width: w, height }}>
          <Image image={image} x={0} y={0} width={w} height={height} fit="fill" />
        </Canvas>
      ) : null}
    </View>
  );
}
