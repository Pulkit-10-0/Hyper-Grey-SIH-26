import React from 'react';
import { SCENARIOS, ScenarioId } from '../../src/data/scenarios';
import { absorptionDbPerM } from '../../src/core/physics';
import { engine, shallowEqual, useEngine } from '../../src/core/useEngine';
import { Chips, Panel, Rows, Slider } from '../../src/ui/kit';
import { Screen } from '../../src/ui/Screen';

const DASH = '—';

/** Hydrostatic pressure at depth, bar. */
const pressureBar = (depthM: number) => 1.01325 + depthM * 0.100693;

export default function EnvScreen() {
  const source = useEngine((s) => s.source);
  const live = source === 'live';
  const tone = live ? 'sim' : 'live';

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

  const v = (s: string) => (live ? DASH : s);

  return (
    <Screen title="Env" subtitle="Sensed medium">
      <Panel label="Sensed medium" subtitle="10-sample moving average">
        <Rows
          data={[
            ['temperature', v(`${env.tempC.toFixed(1)} °C`), tone, env.tempC / 35],
            ['salinity', v(`${env.salinityPpt.toFixed(1)} ppt`), tone, env.salinityPpt / 40],
            ['turbidity', v(`${env.turbidityNtu.toFixed(0)} NTU`),
              env.turbidityNtu > 600 ? 'fault' : env.turbidityNtu > 260 ? 'warn' : tone,
              env.turbidityNtu / 1000],
            ['depth', v(`${env.depthM.toFixed(1)} m`), tone, env.depthM / 250],
          ]}
        />
      </Panel>

      <Panel label="Derived" subtitle="Mackenzie · Thorp · hydrostatic">
        <Rows
          data={[
            ['sound speed', v(`${dec.c.toFixed(1)} m/s`), live ? 'sim' : 'live'],
            [`α @ ${(dec.fc / 1000).toFixed(0)} k`, v(`${(dec.alpha * 1000).toFixed(1)} dB/km`), tone],
            ['scatter excess', v(`${(dec.excess * 1000).toFixed(1)} dB/km`),
              dec.excess > dec.alpha ? 'warn' : tone],
            ['total loss', v(`${((dec.alpha + dec.excess) * 1000).toFixed(1)} dB/km`), tone],
            ['pressure', v(`${pressureBar(env.depthM).toFixed(2)} bar`), tone],
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
