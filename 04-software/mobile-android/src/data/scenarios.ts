/**
 * Operating scenarios, named with the problem statement's own vocabulary.
 * Selecting one sets the environment targets; the adaptation engine then works
 * out the waveform for itself.
 */

export type ScenarioId = 'reef' | 'coastal' | 'estuary' | 'deep';

export type Scenario = {
  id: ScenarioId;
  name: string;
  short: string;
  blurb: string;
  tempC: number;
  salinityPpt: number;
  turbidityNtu: number;
  depthM: number;
  /** pH units, as a probe would report for this water */
  ph: number;
};

export const SCENARIOS: Scenario[] = [
  {
    id: 'reef',
    name: 'Clear Shallow Reef',
    short: 'Reef',
    blurb:
      'Warm, clear, shallow. Almost no scattering, so there is loss budget to spend on bandwidth and the sweep opens right up.',
    tempC: 28.5,
    salinityPpt: 34.8,
    turbidityNtu: 12,
    depthM: 8,
    ph: 8.2,
  },
  {
    id: 'coastal',
    name: 'Coastal Shelf',
    short: 'Coastal',
    blurb:
      'Moderate sediment load over a shelf. The usual working condition, and the balance point between range and resolution.',
    tempC: 26.0,
    salinityPpt: 33.1,
    turbidityNtu: 180,
    depthM: 25,
    ph: 8.05,
  },
  {
    id: 'estuary',
    name: 'Muddy Estuary',
    short: 'Estuary',
    blurb:
      'Heavy suspended sediment and brackish water. Scattering climbs steeply with frequency, forcing the sweep downband and the pulse longer.',
    tempC: 24.2,
    salinityPpt: 12.4,
    turbidityNtu: 740,
    depthM: 6,
    ph: 7.6,
  },
  {
    id: 'deep',
    name: 'Deep Water',
    short: 'Deep',
    blurb:
      'Cold, clear and deep. Sound speed drops with temperature and rises with pressure, and the long stand-off range rewards a Doppler-tolerant sweep.',
    tempC: 6.8,
    salinityPpt: 34.9,
    turbidityNtu: 5,
    depthM: 220,
    ph: 7.9,
  },
];

export const SCENARIO_BY_ID: Record<ScenarioId, Scenario> = SCENARIOS.reduce(
  (acc, s) => {
    acc[s.id] = s;
    return acc;
  },
  {} as Record<ScenarioId, Scenario>,
);
