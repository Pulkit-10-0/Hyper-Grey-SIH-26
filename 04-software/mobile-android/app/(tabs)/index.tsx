import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { MODE_SHORT, WINDOW_LABEL } from '../../src/core/dsp';
import { Source } from '../../src/core/engine';
import { link } from '../../src/core/link';
import { engine, shallowEqual, useEngine } from '../../src/core/useEngine';
import { useLink } from '../../src/core/useLink';
import { Action, Banner, Panel, Rows, Segmented, Tx } from '../../src/ui/kit';
import { Screen } from '../../src/ui/Screen';
import { fmtHz, fmtMetres, fmtSeconds } from '../../src/ui/format';
import { c, sp, type } from '../../src/ui/tokens';

const MODE_OPTS: { value: Source; label: string }[] = [
  { value: 'sim', label: 'Simulation' },
  { value: 'live', label: 'Telemetry' },
];

function uptime(from: number): string {
  const s = Math.floor((Date.now() - from) / 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const [firing, setFiring] = useState(false);

  const source = useEngine((s) => s.source);
  const live = source === 'live';
  const tone = live ? 'live' : 'sim';

  const st = useLink();

  const d = useEngine(
    (s) => ({
      mode: s.decision.mode,
      window: s.decision.window,
      fCentre: s.decision.fCentre,
      bandwidth: s.decision.bandwidth,
      tau: s.decision.tau,
      resolutionM: s.decision.resolutionM,
      snr: s.decision.predictedSnrDb,
      feasible: s.decision.feasible,
      headline: s.explanation.headline,
      pings: s.pings.length,
      booted: s.bootedAt,
      medium: s.medium,
    }),
    shallowEqual,
  );

  const onFire = useCallback(() => {
    setFiring(true);
    setTimeout(() => {
      engine.fire();
      setFiring(false);
      router.navigate('/echo');
    }, 80);
  }, [router]);

  const dash = '—';

  return (
    <Screen title="Home" subtitle="Payload status">
      <Panel label="Data source" subtitle="Simulation computes. Telemetry receives.">
        <Segmented
          options={MODE_OPTS}
          value={source}
          onChange={(v) => engine.setSource(v)}
          tone={tone}
        />
        <Tx style={type.body} color={c.silver}>
          {live
            ? 'Read-only operator console fed by the payload link.'
            : 'Design tool. Every parameter is yours to move.'}
        </Tx>
      </Panel>

      {live && st.status !== 'up' ? (
        <>
          <Banner text={`link ${st.status} · ${st.detail}`} tone="fault" />
          <Action
            label={st.status === 'scanning' ? 'scanning' : 'scan for payload'}
            tone="live"
            busy={st.status === 'scanning'}
            onPress={() => link.scan()}
          />
        </>
      ) : null}

      <Panel label="System" subtitle={d.medium === 'water' ? 'underwater configuration' : 'air bench configuration'}>
        <Rows
          data={[
            ['link', live ? st.status.toUpperCase() : 'SIMULATED', live ? 'fault' : 'sim'],
            ['mode', live ? dash : `${MODE_SHORT[d.mode]} CHIRP`, live ? 'sim' : 'live'],
            ['ping', live ? dash : String(d.pings).padStart(4, '0'), tone],
            ['uptime', uptime(d.booted), 'plain'],
          ]}
        />
      </Panel>

      <Panel label="Last solve" subtitle={live ? 'awaiting link' : d.headline.toLowerCase()}>
        <Rows
          data={[
            ['fc', live ? dash : fmtHz(d.fCentre), tone],
            ['b', live ? dash : fmtHz(d.bandwidth), tone],
            ['window', live ? dash : WINDOW_LABEL[d.window].toUpperCase(), 'plain'],
            ['res', live ? dash : fmtMetres(d.resolutionM), tone],
            ['tau', live ? dash : fmtSeconds(d.tau), 'plain'],
          ]}
        />
      </Panel>

      <Panel label="Health" subtitle="self test">
        <Rows
          data={[
            ['rails', live ? dash : 'OK', live ? 'sim' : 'live'],
            ['dac loopback', live ? dash : 'OK', live ? 'sim' : 'live'],
            ['sensors', live ? dash : 'MODELLED', 'sim'],
            ['solver', d.feasible ? 'WITHIN MARGIN' : 'BEST EFFORT', d.feasible ? 'live' : 'warn'],
            ['radio', live ? st.status.toUpperCase() : 'OFF', live ? 'warn' : 'plain'],
          ]}
        />
      </Panel>

      {!live ? (
        <View style={{ flexDirection: 'row', gap: sp.md }}>
          <View style={{ flex: 1 }}>
            <Action label="scenarios" tone="sim" onPress={() => router.push('/scenario')} />
          </View>
          <View style={{ flex: 1.4 }}>
            <Action label="fire ping" tone="live" busy={firing} onPress={onFire} />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
