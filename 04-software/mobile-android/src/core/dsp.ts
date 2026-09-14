/**
 * Signal generation and analysis. Pure functions, no React.
 */

export type WindowKind = 'rect' | 'hann' | 'hamming' | 'blackman';
export type WaveMode = 'cw' | 'lfm' | 'geometric' | 'barker13';

/** Theoretical peak sidelobe level of each window, dB. */
export const WINDOW_PSL_DB: Record<WindowKind, number> = {
  rect: -13.3,
  hann: -31.5,
  hamming: -42.7,
  blackman: -58.0,
};

export const WINDOW_LABEL: Record<WindowKind, string> = {
  rect: 'Rectangular',
  hann: 'Hann',
  hamming: 'Hamming',
  blackman: 'Blackman',
};

export const MODE_LABEL: Record<WaveMode, string> = {
  cw: 'Fixed tone',
  lfm: 'LFM chirp',
  geometric: 'Geometric sweep',
  barker13: 'Barker-13 coded',
};

export const MODE_SHORT: Record<WaveMode, string> = {
  cw: 'CW',
  lfm: 'LFM',
  geometric: 'GEO',
  barker13: 'BRK',
};

/** Barker code of length 13. Peak-to-sidelobe ratio 22.3 dB. */
export const BARKER_13 = [1, 1, 1, 1, 1, -1, -1, 1, 1, -1, 1, -1, 1] as const;

/* ------------------------------------------------------------------ */
/* Windows                                                             */
/* ------------------------------------------------------------------ */

export function windowFunction(kind: WindowKind, n: number): Float32Array {
  const w = new Float32Array(n);
  if (n <= 1) {
    w.fill(1);
    return w;
  }
  const N = n - 1;
  for (let i = 0; i < n; i++) {
    const x = (2 * Math.PI * i) / N;
    switch (kind) {
      case 'rect':
        w[i] = 1;
        break;
      case 'hann':
        w[i] = 0.5 - 0.5 * Math.cos(x);
        break;
      case 'hamming':
        w[i] = 0.54 - 0.46 * Math.cos(x);
        break;
      case 'blackman':
        w[i] = 0.42 - 0.5 * Math.cos(x) + 0.08 * Math.cos(2 * x);
        break;
    }
  }
  return w;
}

/* ------------------------------------------------------------------ */
/* Waveform synthesis                                                  */
/* ------------------------------------------------------------------ */

export type WaveParams = {
  mode: WaveMode;
  window: WindowKind;
  /** Hz */
  fStart: number;
  /** Hz. Ignored for cw and barker13. */
  fStop: number;
  /** seconds */
  tau: number;
  /** 0..1 */
  amplitude: number;
};

/**
 * Generate the transmit pulse.
 *
 * Frequency is integrated into phase with an accumulator rather than evaluated
 * as sin(2*pi*f*t). The naive form produces a phase discontinuity every time f
 * changes, which shows up as spectral splatter. This mirrors what the firmware's
 * DDS does, so the preview and the hardware output agree.
 */
export function synthesise(p: WaveParams, sampleRate: number): Float32Array {
  const n = Math.max(8, Math.round(p.tau * sampleRate));
  const out = new Float32Array(n);
  const win = windowFunction(p.window, n);
  const twoPiOverFs = (2 * Math.PI) / sampleRate;

  const fStart = Math.max(1, p.fStart);
  const fStop = Math.max(1, p.fStop);
  let phase = 0;

  for (let i = 0; i < n; i++) {
    const frac = i / n;
    let f: number;
    switch (p.mode) {
      case 'cw':
      case 'barker13':
        f = fStart;
        break;
      case 'lfm':
        f = fStart + (fStop - fStart) * frac;
        break;
      case 'geometric':
        f = fStart * Math.pow(fStop / fStart, frac);
        break;
    }
    phase += twoPiOverFs * f;

    let sign = 1;
    if (p.mode === 'barker13') {
      const chip = Math.min(BARKER_13.length - 1, Math.floor(frac * BARKER_13.length));
      sign = BARKER_13[chip];
    }

    out[i] = Math.sin(phase) * sign * win[i] * p.amplitude;
  }
  return out;
}

/** Instantaneous frequency at each sample, for drawing the sweep. */
export function instantaneousFrequency(p: WaveParams, points: number): Float32Array {
  const out = new Float32Array(points);
  const fStart = Math.max(1, p.fStart);
  const fStop = Math.max(1, p.fStop);
  for (let i = 0; i < points; i++) {
    const frac = i / Math.max(1, points - 1);
    switch (p.mode) {
      case 'cw':
      case 'barker13':
        out[i] = fStart;
        break;
      case 'lfm':
        out[i] = fStart + (fStop - fStart) * frac;
        break;
      case 'geometric':
        out[i] = fStart * Math.pow(fStop / fStart, frac);
        break;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* FFT                                                                 */
/* ------------------------------------------------------------------ */

/** Next power of two at or above n. */
export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/**
 * In-place iterative radix-2 Cooley-Tukey FFT.
 * `re` and `im` must have the same power-of-two length.
 */
export function fftInPlace(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  if (n <= 1) return;

  // bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i];
      re[i] = re[j];
      re[j] = t;
      t = im[i];
      im[i] = im[j];
      im[j] = t;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      const half = len >> 1;
      for (let k = 0; k < half; k++) {
        const uRe = re[i + k];
        const uIm = im[i + k];
        const vRe = re[i + k + half] * curRe - im[i + k + half] * curIm;
        const vIm = re[i + k + half] * curIm + im[i + k + half] * curRe;
        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[i + k + half] = uRe - vRe;
        im[i + k + half] = uIm - vIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

/**
 * Magnitude spectrum in dB, normalised so the peak sits at 0 dB.
 * Returns only the first half (the real-signal bins).
 */
export function magnitudeSpectrumDb(signal: Float32Array, fftSize: number): Float32Array {
  const n = nextPow2(fftSize);
  const re = new Float32Array(n);
  const im = new Float32Array(n);
  const copy = Math.min(signal.length, n);
  for (let i = 0; i < copy; i++) re[i] = signal[i];

  fftInPlace(re, im);

  const half = n >> 1;
  const out = new Float32Array(half);
  let peak = 1e-12;
  for (let i = 0; i < half; i++) {
    const m = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
    out[i] = m;
    if (m > peak) peak = m;
  }
  for (let i = 0; i < half; i++) {
    out[i] = 20 * Math.log10(Math.max(out[i] / peak, 1e-7));
  }
  return out;
}

/**
 * Spectrogram: sliding Hann window, 50% overlap, magnitude in dB.
 * Returns `frames` columns each of `bins` rows, values normalised 0..1.
 */
export function spectrogram(
  signal: Float32Array,
  fftSize: number,
  frames: number,
  floorDb = -60,
): { data: Float32Array; frames: number; bins: number } {
  const n = nextPow2(fftSize);
  const bins = n >> 1;
  const win = windowFunction('hann', n);
  const out = new Float32Array(frames * bins);

  const maxStart = Math.max(1, signal.length - n);
  for (let f = 0; f < frames; f++) {
    const start = Math.floor((f / Math.max(1, frames - 1)) * maxStart);
    const re = new Float32Array(n);
    const im = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const s = start + i;
      re[i] = (s < signal.length ? signal[s] : 0) * win[i];
    }
    fftInPlace(re, im);
    for (let b = 0; b < bins; b++) {
      const m = Math.sqrt(re[b] * re[b] + im[b] * im[b]);
      const db = 20 * Math.log10(Math.max(m, 1e-7));
      out[f * bins + b] = Math.max(0, Math.min(1, (db - floorDb) / -floorDb));
    }
  }
  return { data: out, frames, bins };
}

/* ------------------------------------------------------------------ */
/* Matched filter                                                      */
/* ------------------------------------------------------------------ */

export type MatchedFilterResult = {
  /** Normalised correlation magnitude, 0..1 at the peak. */
  correlation: Float32Array;
  peakIndex: number;
  peakValue: number;
  /** Peak-to-sidelobe ratio in dB. */
  peakToSidelobeDb: number;
};

/**
 * Direct time-domain cross-correlation of `rx` against `replica`.
 * Inputs here are a few thousand samples at most, so this is fast enough;
 * an FFT-based version would be premature.
 */
export function matchedFilter(rx: Float32Array, replica: Float32Array): MatchedFilterResult {
  const n = rx.length;
  const m = replica.length;
  const lags = Math.max(1, n - m + 1);
  const corr = new Float32Array(lags);

  let energy = 0;
  for (let j = 0; j < m; j++) energy += replica[j] * replica[j];
  const norm = Math.sqrt(Math.max(energy, 1e-12));

  for (let i = 0; i < lags; i++) {
    let acc = 0;
    for (let j = 0; j < m; j++) acc += rx[i + j] * replica[j];
    corr[i] = Math.abs(acc) / norm;
  }

  let peakIndex = 0;
  let peakValue = 0;
  for (let i = 0; i < lags; i++) {
    if (corr[i] > peakValue) {
      peakValue = corr[i];
      peakIndex = i;
    }
  }

  // Sidelobe search excludes the main lobe around the peak.
  const guard = Math.max(4, Math.floor(m / 8));
  let sidelobe = 0;
  for (let i = 0; i < lags; i++) {
    if (Math.abs(i - peakIndex) <= guard) continue;
    if (corr[i] > sidelobe) sidelobe = corr[i];
  }

  const psl =
    peakValue > 0 && sidelobe > 0
      ? 20 * Math.log10(peakValue / sidelobe)
      : 40;

  // Normalise for display
  if (peakValue > 0) {
    for (let i = 0; i < lags; i++) corr[i] /= peakValue;
  }

  return {
    correlation: corr,
    peakIndex,
    peakValue,
    peakToSidelobeDb: Math.min(psl, 60),
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Reduce a long series to `target` points by peak-preserving decimation. */
export function decimate(src: Float32Array, target: number): Float32Array {
  if (src.length <= target) return src;
  const out = new Float32Array(target);
  const step = src.length / target;
  for (let i = 0; i < target; i++) {
    const a = Math.floor(i * step);
    const b = Math.min(src.length, Math.floor((i + 1) * step));
    let best = 0;
    for (let j = a; j < b; j++) {
      if (Math.abs(src[j]) > Math.abs(best)) best = src[j];
    }
    out[i] = best;
  }
  return out;
}

/** Deterministic pseudo-random generator, so traces are stable across renders. */
export function makeRandom(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

/** Box-Muller normal deviate from a uniform source. */
export function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
