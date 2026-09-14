import React from 'react';
import { View } from 'react-native';
import { shallowEqual, useEngine } from '../../src/core/useEngine';
import { Banner, Metric, Panel, Rows } from '../../src/ui/kit';
import { Screen } from '../../src/ui/Screen';
import { fmtHours, fmtMetres } from '../../src/ui/format';
import { sp } from '../../src/ui/tokens';

const DASH = '—';

/** Lawn-mower survey geometry derived from the current solve. */
export default function MissionScreen() {
  const source = useEngine((s) => s.source);
  const live = source === 'live';
  const tone = live ? 'sim' : 'live';
  const v = (s: string) => (live ? DASH : s);

  const pings = useEngine((s) => s.pings.length);
  const booted = useEngine((s) => s.bootedAt);
  const interval = useEngine((s) => s.pingIntervalS);
  const end = useEngine((s) => s.endurance, shallowEqual);

  const d = useEngine(
    (s) => ({
      swath: s.decision.maxRangeM,
      res: s.decision.resolutionM,
      depth: s.env.depthM,
      energy: s.energy.totalMj,
    }),
    shallowEqual,
  );

  const elapsedS = Math.floor((Date.now() - booted) / 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  const elapsed = `${p(Math.floor(elapsedS / 60))}:${p(elapsedS % 60)}`;

  // A survey advances one ping interval at a nominal 1.5 m/s vehicle speed.
  const SPEED = 1.5;
  const track = pings * interval * SPEED;
  const swathWidth = d.swath * 2;
  const areaKm2 = (track * swathWidth) / 1e6;
  const detections = Math.floor(pings / 4);

  const lineSpacing = swathWidth * 0.8;
  const waypoint = Math.min(10, Math.floor(pings / 3) + 1);

  return (
    <Screen title="Mission" subtitle="Survey progress">
      {live ? <Banner text="link down · no mission state" tone="fault" /> : null}

      <Panel label="Progress" subtitle="lawn-mower survey">
        <View style={{ flexDirection: 'row', gap: sp.base }}>
          <Metric label="elapsed" value={v(elapsed)} tone={tone} />
          <Metric label="track" value={v(fmtMetres(track))} tone={tone} />
        </View>
        <View style={{ flexDirection: 'row', gap: sp.base }}>
          <Metric label="detections" value={v(String(detections))} tone="warn" />
          <Metric label="pings" value={v(String(pings))} />
        </View>
      </Panel>

      <Panel label="Coverage" subtitle="derived from the current solve">
        <Rows
          data={[
            ['swath', v(fmtMetres(swathWidth)), tone],
            ['line spacing', v(fmtMetres(lineSpacing)), 'plain'],
            ['along-track res', v(fmtMetres(d.res)), tone],
            ['area covered', v(`${areaKm2.toFixed(4)} km²`), 'plain'],
            ['speed', v(`${SPEED.toFixed(1)} m/s`), 'plain'],
          ]}
        />
      </Panel>

      <Panel label="Next waypoint">
        <Rows
          data={[
            ['wp', v(`${String(waypoint).padStart(2, '0')} / 10`), tone],
            ['bearing', v('270°'), 'plain'],
            ['depth hold', v(`${d.depth.toFixed(1)} m`), 'plain'],
            ['ping rate', v(`${(1 / interval).toFixed(2)} Hz`), 'plain'],
          ]}
        />
      </Panel>

      <Panel label="Endurance" subtitle="at the current ping rate">
        <Rows
          data={[
            ['remaining', v(fmtHours(end.missionHours)), tone],
            ['pings left', v(String(end.pingsRemaining)), 'plain'],
            [
              'track remaining',
              v(fmtMetres(end.pingsRemaining * interval * SPEED)),
              'plain',
            ],
          ]}
        />
      </Panel>
    </Screen>
  );
}
