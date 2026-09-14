import React from 'react';
import { Medium } from '../../src/core/physics';
import { Source } from '../../src/core/engine';
import { link } from '../../src/core/link';
import { engine, shallowEqual, useEngine } from '../../src/core/useEngine';
import { useLink } from '../../src/core/useLink';
import { Action, Panel, Rows, Segmented, Slider, Tx } from '../../src/ui/kit';
import { Screen } from '../../src/ui/Screen';
import { fmtHz, fmtMetres, fmtSeconds } from '../../src/ui/format';
import { c, type } from '../../src/ui/tokens';

export default function SettingsScreen() {
  const source = useEngine((s) => s.source);
  const live = source === 'live';
  const medium = useEngine((s) => s.medium);
  const cfg = useEngine((s) => s.config, shallowEqual);
  const interval = useEngine((s) => s.pingIntervalS);
  const correction = useEngine((s) => s.noiseCorrectionDb);
  const st = useLink();

  return (
    <Screen title="Settings" subtitle="Configuration">
      <Panel label="Data source">
        <Segmented<Source>
          options={[
            { value: 'sim', label: 'Simulation' },
            { value: 'live', label: 'Telemetry' },
          ]}
          value={source}
          onChange={(v) => engine.setSource(v)}
          tone={live ? 'live' : 'sim'}
        />
        <Rows
          data={[
            ['current', live ? 'TELEMETRY' : 'SIMULATION', live ? 'live' : 'sim'],
            ['transport', st.name, 'plain'],
            ['status', st.status.toUpperCase(), st.status === 'up' ? 'live' : 'fault'],
          ]}
        />
        {live ? (
          <Action
            label={st.status === 'scanning' ? 'scanning' : 'scan'}
            busy={st.status === 'scanning'}
            onPress={() => link.scan()}
          />
        ) : null}
      </Panel>

      <Panel label="Medium" subtitle="same engine, different constants">
        <Segmented<Medium>
          options={[
            { value: 'water', label: 'Underwater' },
            { value: 'air', label: 'Air bench' },
          ]}
          value={medium}
          onChange={(m) => engine.setMedium(m)}
        />
        <Rows
          data={[
            ['band', `${fmtHz(cfg.bandLow)} – ${fmtHz(cfg.bandHigh)}`, 'live'],
            ['required range', fmtMetres(cfg.requiredRangeM), 'plain'],
            ['detection threshold', `${cfg.detectionThresholdDb} dB`, 'plain'],
            ['pulse range', `${fmtSeconds(cfg.tauMin)} – ${fmtSeconds(cfg.tauMax)}`, 'plain'],
            ['energy budget', `${cfg.energyBudgetMj.toFixed(0)} mJ`, 'plain'],
          ]}
        />
      </Panel>

      {live ? null : (
        <Panel label="Ping rate">
          <Slider
            label="interval"
            value={interval}
            min={0.5}
            max={60}
            step={0.5}
            onChange={(x) => engine.setPingInterval(x)}
            format={fmtSeconds}
          />
        </Panel>
      )}

      <Panel label="Adaptation loop">
        <Rows
          data={[
            [
              'noise correction',
              `${correction >= 0 ? '+' : ''}${correction.toFixed(2)} dB`,
              Math.abs(correction) > 0.4 ? 'warn' : 'plain',
            ],
          ]}
        />
        <Action label="reset loop" tone="sim" onPress={() => engine.resetLoop()} />
      </Panel>

      <Panel label="Session">
        <Action label="clear ping log" tone="fault" onPress={() => engine.clearLog()} />
      </Panel>

      <Panel label="About">
        <Rows
          data={[
            ['build', 'SEANERGY 2.0.0', 'plain'],
            ['ps', 'SIH26058 · MoES / NIOT', 'plain'],
            ['packet', 'FIXED LAYOUT', 'plain'],
            ['units', 'METRIC', 'plain'],
          ]}
        />
        <Tx style={type.body} color={c.dim}>
          Sound speed, absorption, synthesis, compression and the adaptation solver
          all run on the device.
        </Tx>
      </Panel>
    </Screen>
  );
}
