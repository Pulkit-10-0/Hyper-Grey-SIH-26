import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/** The insets a real handset reports. Screens compute padding from these. */
const METRICS = {
  frame: { x: 0, y: 0, width: 412, height: 915 },
  insets: { top: 48, left: 0, right: 0, bottom: 24 },
};

/**
 * Mount a screen under the same providers the app installs, and fail loudly if
 * the render pass throws.
 */
function render(el: React.ReactElement) {
  let tree: TestRenderer.ReactTestRenderer | undefined;
  act(() => {
    tree = TestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>{el}</SafeAreaProvider>,
    );
  });
  act(() => {
    tree?.unmount();
  });
  return tree;
}

import { engine } from '../src/core/engine';
import { link } from '../src/core/link';

import Home from '../app/(tabs)/index';
import Env from '../app/(tabs)/env';
import Wave from '../app/(tabs)/wave';
import Sonar from '../app/(tabs)/sonar';
import Spec from '../app/(tabs)/spec';
import Echo from '../app/(tabs)/echo';
import Power from '../app/(tabs)/power';
import Mission from '../app/(tabs)/mission';
import Diag from '../app/(tabs)/diag';
import Log from '../app/(tabs)/log';
import Settings from '../app/(tabs)/settings';
import Scenario from '../app/scenario';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    navigate: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: () => true,
  }),
  useLocalSearchParams: () => ({ id: '1' }),
  Stack: Object.assign(() => null, { Screen: () => null }),
  Tabs: Object.assign(() => null, { Screen: () => null }),
}));

const SCREENS: [string, React.ComponentType][] = [
  ['Home', Home],
  ['Env', Env],
  ['Wave', Wave],
  ['Sonar', Sonar],
  ['Spec', Spec],
  ['Echo', Echo],
  ['Power', Power],
  ['Mission', Mission],
  ['Diag', Diag],
  ['Log', Log],
  ['Settings', Settings],
  ['Scenario', Scenario],
];

afterEach(() => {
  engine.setSource('sim');
  engine.clearLog();
  engine.resetLoop();
});

describe('every screen mounts', () => {
  it.each(SCREENS)('%s renders in SIMULATION', (_name: string, C: React.ComponentType) => {
    engine.setSource('sim');
    expect(() => render(<C />)).not.toThrow();
  });

  it.each(SCREENS)('%s renders in TELEMETRY', (_name: string, C: React.ComponentType) => {
    engine.setSource('live');
    expect(() => render(<C />)).not.toThrow();
    engine.setSource('sim');
  });
});

describe('screens survive real state', () => {
  it('renders with pings in the log', () => {
    engine.setSource('sim');
    act(() => {
      for (let i = 0; i < 5; i++) engine.fire();
    });
    for (const [, C] of SCREENS) {
      expect(() => render(<C />)).not.toThrow();
    }
  });

  it('renders in the air configuration', () => {
    act(() => engine.setMedium('air'));
    for (const [, C] of SCREENS) {
      expect(() => render(<C />)).not.toThrow();
    }
    act(() => engine.setMedium('water'));
  });

  it('renders with every waveform mode', () => {
    for (const m of ['cw', 'lfm', 'geometric', 'barker13'] as const) {
      act(() => engine.setMode(m));
      expect(() => render(<Wave />)).not.toThrow();
      expect(() => render(<Spec />)).not.toThrow();
    }
    act(() => engine.setMode(null));
  });

  it('renders with every window', () => {
    for (const w of ['rect', 'hann', 'hamming', 'blackman'] as const) {
      act(() => engine.setWindow(w));
      expect(() => render(<Wave />)).not.toThrow();
    }
    act(() => engine.setWindow(null));
  });

  it('renders under manual override', () => {
    act(() => {
      engine.setAuto(false);
      engine.setManual({ fCentre: 200_000, bandwidth: 40_000, tau: 0.004, amplitude: 0.5 });
    });
    expect(() => render(<Wave />)).not.toThrow();
    expect(() => render(<Home />)).not.toThrow();
    act(() => engine.setAuto(true));
  });

  it('renders when no parameter set is feasible', () => {
    // Drive the environment somewhere the solver cannot satisfy, which makes
    // maxRange collapse to zero — the PPI must not divide by it.
    act(() => {
      engine.setEnvTarget({ turbidityNtu: 1000, tempC: 2, salinityPpt: 0, depthM: 250 });
      for (let i = 0; i < 60; i++) (engine as unknown as { step(): void }).step();
    });
    expect(() => render(<Sonar />)).not.toThrow();
    expect(() => render(<Home />)).not.toThrow();
    act(() => engine.setScenario('coastal'));
  });
});

describe('the telemetry link', () => {
  it('subscribes without losing its receiver', () => {
    // The v2.0.0 startup crash: `useSyncExternalStore(link.onChange, ...)` calls
    // the subscriber with no receiver. An unbound method threw on first render.
    const bare = link.onChange;
    let fired = 0;
    const unsub = bare(() => {
      fired++;
    });
    expect(typeof unsub).toBe('function');
    act(() => link.scan());
    expect(fired).toBeGreaterThan(0);
    unsub();
    link.disconnect();
  });

  it('exposes status and detail unbound', () => {
    const s = link.status;
    const d = link.detail;
    expect(() => s()).not.toThrow();
    expect(() => d()).not.toThrow();
  });

  it('shows the scanning state on Home', () => {
    engine.setSource('live');
    act(() => link.scan());
    expect(() => render(<Home />)).not.toThrow();
    act(() => link.disconnect());
    engine.setSource('sim');
  });
});
