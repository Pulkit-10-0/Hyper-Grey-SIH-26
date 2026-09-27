import React from 'react';
import { SCENARIOS, ScenarioId } from '../../src/data/scenarios';
import {
  absorptionTermsDbPerKm,
  francoisGarrisonDbPerKm,
} from '../../src/core/physics';
import { engine, shallowEqual, useEngine } from '../../src/core/useEngine';
import { Chips, Panel, Rows, Slider } from '../../src/ui/kit';
import { Screen } from '../../src/ui/Screen';

const DASH = '—';

/** Hydrostatic pressure at depth, bar. */
const pressureBar = (depthM: number) => 1.01325 + depthM * 0.100693;

export default function EnvScreen() {
  const source = useEngine((s) => s.source);
  const live = source === 'live';
  // In telemetry mode these readings come from the payload's own sensors, so
  // they are shown exactly as in simulation. Only the wait for the first packet
  // is blank, because until then there is genuinely nothing to report.
  const waiting = useEngine((s) => s.source === 'live' && s.telemetry === null);
  const tone = waiting ? 'sim' : 'live';

  const env = useEngine((s) => s.env, shallowEqual);
  const target = useEngine((s) => s.envTarget, shallowEqual);
  const scenario = useEngine((s) => s.scenario);
  const medium = useEngine((s) => s.medium);
  const dec = useEngine(
    (s) => ({
      c: s.decision.soundSpeed,
      alpha: s.decision.absorptionDbPerM,
      excess: s.decision.excessLossDbPerM,
      fc: s.decision.fCentre,
    }),
    shallowEqual,
  );

  // The two new sensors earn their place here: the boric term is the only
  // one pH touches, and the pressure effect is what the depth probe buys
  // over the assumed-constant depth this used to run on.
  const fkHz = dec.fc / 1000;
  const terms = absorptionTermsDbPerKm(
    fkHz, env.tempC, env.salinityPpt, env.depthM, env.ph,
  );
  const atSurface = francoisGarrisonDbPerKm(
    fkHz, env.tempC, env.salinityPpt, 0, env.ph,
  );
  const atDepth = terms.boric + terms.magnesium + terms.water;
  const depthEffect = (1 - atDepth / Math.max(atSurface, 1e-9)) * 100;

  const v = (s: string) => (waiting ? DASH : s);

  return (
    <Screen title="Env" subtitle="Sensed medium">
      <Panel
        label="Sensed medium"
        subtitle={live ? 'from the payload' : '10-sample moving average'}
      >
        <Rows
          data={[
            ['temperature', v(`${env.tempC.toFixed(1)} °C`), tone, env.tempC / 35],
            ['salinity', v(`${env.salinityPpt.toFixed(1)} ppt`), tone, env.salinityPpt / 40],
            ['turbidity', v(`${env.turbidityNtu.toFixed(0)} NTU`),
              env.turbidityNtu > 600 ? 'fault' : env.turbidityNtu > 260 ? 'warn' : tone,
              env.turbidityNtu / 1000],
            ['depth', v(`${env.depthM.toFixed(1)} m`), tone, env.depthM / 250],
            ['pH', v(env.ph.toFixed(2)),
              env.ph < 7.4 || env.ph > 8.6 ? 'warn' : tone,
              (env.ph - 6) / 3.5],
          ]}
        />
      </Panel>

      <Panel label="Derived" subtitle="Mackenzie · Francois-Garrison · hydrostatic">
        <Rows
          data={[
            ['sound speed', v(`${dec.c.toFixed(1)} m/s`), tone],
            [`α @ ${(dec.fc / 1000).toFixed(0)} k`, v(`${(dec.alpha * 1000).toFixed(1)} dB/km`), tone],
            ['scatter excess', v(`${(dec.excess * 1000).toFixed(1)} dB/km`),
              dec.excess > dec.alpha ? 'warn' : tone],
            ['total loss', v(`${((dec.alpha + dec.excess) * 1000).toFixed(1)} dB/km`), tone],
            ['pressure', v(`${pressureBar(env.depthM).toFixed(2)} bar`), tone],
            ['boric term', v(`${terms.boric.toFixed(2)} dB/km`), tone],
            ['MgSO₄ term', v(`${terms.magnesium.toFixed(1)} dB/km`), tone],
            ['pressure effect', v(`${depthEffect >= 0 ? '-' : '+'}${Math.abs(depthEffect).toFixed(1)} %`), tone],
            ['medium', medium === 'water' ? 'SEA WATER' : 'AIR', 'plain'],
          ]}
        />
      </Panel>

      {live ? null : (
        <>
          <Panel label="Scenario" subtitle="sets the environment targets">
            <Chips
              options={SCENARIOS.map((s) => ({ value: s.id, label: s.short }))}
              value={scenario === 'custom' ? null : (scenario as ScenarioId)}
              onChange={(id) => engine.setScenario(id)}
            />
          </Panel>

          <Panel label="Manual environment" subtitle="drive the solver directly">
            <Slider
              label="temperature"
              value={target.tempC}
              min={0}
              max={35}
              onChange={(x) => engine.setEnvTarget({ tempC: x })}
              format={(x) => `${x.toFixed(1)} °C`}
            />
            <Slider
              label="salinity"
              value={target.salinityPpt}
              min={0}
              max={40}
              onChange={(x) => engine.setEnvTarget({ salinityPpt: x })}
              format={(x) => `${x.toFixed(1)} ppt`}
            />
            <Slider
              label="turbidity"
              value={target.turbidityNtu}
              min={0}
              max={1000}
              onChange={(x) => engine.setEnvTarget({ turbidityNtu: x })}
              format={(x) => `${x.toFixed(0)} NTU`}
            />
            <Slider
              label="pH"
              value={target.ph}
              min={6.5}
              max={9}
              step={0.05}
              onChange={(x) => engine.setEnvTarget({ ph: x })}
              format={(x) => x.toFixed(2)}
            />
            <Slider
              label="depth"
              value={target.depthM}
              min={0}
              max={250}
              onChange={(x) => engine.setEnvTarget({ depthM: x })}
              format={(x) => `${x.toFixed(0)} m`}
            />
          </Panel>
        </>
      )}
    </Screen>
  );
}
