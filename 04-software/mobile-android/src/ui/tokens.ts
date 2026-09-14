/**
 * Instrument console design tokens.
 *
 * Palette and proportions lifted from the engineering dossier's mobile telemetry
 * layer. Dark only — a single committed look, no light variant.
 *
 * The dossier's own px values (6-8px) describe a miniature phone drawn inside a
 * web page. Everything here is the same design scaled to a real handset.
 */

export const c = {
  /* ground */
  abyss: '#060B12',
  deep: '#0A121C',
  panel: '#101C28',
  panel2: '#14212F',
  panel3: '#182838',

  /* hairlines */
  line: 'rgba(159,176,191,0.13)',
  line2: 'rgba(159,176,191,0.07)',
  line3: 'rgba(159,176,191,0.20)',
  lineHot: 'rgba(45,212,200,0.30)',

  /* text */
  white: '#EAF1F6',
  silver: '#9FB0BF',
  dim: '#6D7E8C',
  faint: '#4A5A68',

  /* accents */
  cy: '#2DD4C8',
  cy2: '#5EEAE0',
  cyDim: 'rgba(45,212,200,0.09)',
  cyFill: 'rgba(45,212,200,0.12)',
  ocean: '#1E6E8C',
  amber: '#F0A63C',
  amberDim: 'rgba(240,166,60,0.10)',
  sim: '#6F8CA8',
  simDim: 'rgba(111,140,168,0.10)',
  fault: '#E05A6B',
  faultDim: 'rgba(224,90,107,0.10)',

  /* row fill */
  rowFill: 'rgba(159,176,191,0.045)',
} as const;

export type Tone = 'live' | 'sim' | 'warn' | 'fault' | 'plain';

/** Value colour by provenance. This convention replaces explanatory prose. */
export const toneColor: Record<Tone, string> = {
  live: c.cy,
  sim: c.sim,
  warn: c.amber,
  fault: c.fault,
  plain: c.white,
};

export const font = {
  display: 'Rajdhani_700Bold',
  displayMed: 'Rajdhani_600SemiBold',
  mono: 'JetBrainsMono_400Regular',
  monoMed: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
} as const;

export const sp = {
  xxs: 2,
  xs: 4,
  sm: 6,
  md: 9,
  base: 12,
  lg: 16,
  xl: 22,
  xxl: 32,
} as const;

/** Sharp. Nothing softer than this. */
export const r = {
  row: 3,
  card: 7,
  pill: 9,
  tab: 3,
} as const;

export const type = {
  screenTitle: { fontFamily: font.display, fontSize: 21, letterSpacing: 0.2 },
  screenSub: { fontSize: 11, letterSpacing: 0.1 },
  cardLabel: {
    fontFamily: font.monoMed,
    fontSize: 10,
    letterSpacing: 1.4,
  },
  cardSub: { fontSize: 10.5 },
  rowLabel: { fontFamily: font.mono, fontSize: 11, letterSpacing: 0.4 },
  rowValue: { fontFamily: font.monoMed, fontSize: 12.5, letterSpacing: 0.2 },
  metric: { fontFamily: font.monoMed, fontSize: 26, letterSpacing: -0.4 },
  metricUnit: { fontFamily: font.mono, fontSize: 11 },
  tab: { fontFamily: font.mono, fontSize: 10, letterSpacing: 0.3 },
  pill: { fontFamily: font.mono, fontSize: 9, letterSpacing: 0.9 },
  body: { fontSize: 12, lineHeight: 18 },
  log: { fontFamily: font.mono, fontSize: 10.5, lineHeight: 17 },
} as const;

export const HIT = { top: 8, bottom: 8, left: 8, right: 8 };
export const MIN_TAP = 44;
export const TAB_STRIP_HEIGHT = 46;
