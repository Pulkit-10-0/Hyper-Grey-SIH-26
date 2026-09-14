/** Shared number formatting. Keeps units consistent across every screen. */

export function fmtHz(hz: number): string {
  if (hz >= 1_000_000) return `${(hz / 1_000_000).toFixed(2)} MHz`;
  if (hz >= 1000) return `${(hz / 1000).toFixed(1)} kHz`;
  return `${hz.toFixed(0)} Hz`;
}

export function fmtHzCompact(hz: number): string {
  if (hz >= 1_000_000) return (hz / 1_000_000).toFixed(2);
  return (hz / 1000).toFixed(1);
}

export function fmtSeconds(s: number): string {
  if (s >= 1) return `${s.toFixed(2)} s`;
  if (s >= 0.001) return `${(s * 1000).toFixed(2)} ms`;
  return `${(s * 1e6).toFixed(0)} µs`;
}

export function fmtMetres(m: number): string {
  if (!isFinite(m)) return '—';
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  if (m >= 1) return `${m.toFixed(m >= 10 ? 1 : 2)} m`;
  if (m >= 0.01) return `${(m * 100).toFixed(1)} cm`;
  return `${(m * 1000).toFixed(1)} mm`;
}

export function fmtDb(db: number, digits = 1): string {
  return `${db >= 0 ? '' : ''}${db.toFixed(digits)} dB`;
}

export function fmtMj(mj: number): string {
  if (mj >= 1000) return `${(mj / 1000).toFixed(2)} J`;
  if (mj >= 1) return `${mj.toFixed(2)} mJ`;
  return `${(mj * 1000).toFixed(0)} µJ`;
}

export function fmtMa(ma: number): string {
  if (ma >= 1000) return `${(ma / 1000).toFixed(2)} A`;
  if (ma >= 1) return `${ma.toFixed(1)} mA`;
  return `${(ma * 1000).toFixed(0)} µA`;
}

export function fmtHours(h: number): string {
  if (!isFinite(h) || h <= 0) return '—';
  if (h >= 48) return `${(h / 24).toFixed(1)} days`;
  if (h >= 1) return `${h.toFixed(1)} h`;
  return `${(h * 60).toFixed(0)} min`;
}

export function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${Math.round(n)}`;
}

export function fmtClock(ms: number): string {
  const d = new Date(ms);
  const p = (v: number) => v.toString().padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
