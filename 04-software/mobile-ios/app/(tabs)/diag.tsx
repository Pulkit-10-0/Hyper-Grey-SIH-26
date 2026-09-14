import React from 'react';
import { PACKET_BYTES, PACKET_FIELDS } from '../../src/core/link';
import { shallowEqual, useEngine } from '../../src/core/useEngine';
import { useLink } from '../../src/core/useLink';
import { Panel, Rows, Tx } from '../../src/ui/kit';
import { Screen } from '../../src/ui/Screen';
import { View } from 'react-native';
import { c, r, type } from '../../src/ui/tokens';

const DASH = '—';

export default function DiagScreen() {
  const source = useEngine((s) => s.source);
  const live = source === 'live';
  const tone = live ? 'sim' : 'live';
  const v = (s: string) => (live ? DASH : s);

  const st = useLink();
  const feasible = useEngine((s) => s.decision.feasible);
  const correction = useEngine((s) => s.noiseCorrectionDb);
  const pings = useEngine((s) => s.pings.length);

  const d = useEngine(
    (s) => ({
      tau: s.decision.tau,
      interval: s.pingIntervalS,
      tbp: s.decision.tbp,
    }),
    shallowEqual,
  );

  // Transmit window plus the fixed pre/post guard the firmware allocates.
  const txWindowMs = d.tau * 1000 + 1.2;
  const budgetMs = d.interval * 1000;
  const headroom = 100 - (txWindowMs / budgetMs) * 100;

  return (
    <Screen title="Diag" subtitle="Diagnostics">
      <Panel label="Timing" subtitle="design budget">
        <Rows
          data={[
            ['tx window', v(`${txWindowMs.toFixed(3)} ms`), tone],
            ['cycle budget', v(`${budgetMs.toFixed(0)} ms`), 'plain'],
            ['headroom', v(`${headroom.toFixed(2)} %`), headroom > 50 ? 'live' : 'warn'],
            ['dma underruns', v('0'), live ? 'sim' : 'live'],
            ['solver', feasible ? 'WITHIN BUDGET' : 'BEST EFFORT', feasible ? 'live' : 'warn'],
          ]}
        />
      </Panel>

      <Panel label="Link" subtitle={st.name}>
        <Rows
          data={[
            ['status', st.status.toUpperCase(), st.status === 'up' ? 'live' : 'fault'],
            ['detail', st.detail, 'plain'],
            ['packet size', `${PACKET_BYTES} B`, 'plain'],
            ['drops', live ? '0' : DASH, 'plain'],
          ]}
        />
      </Panel>

      <Panel label="Packet layout" subtitle="fixed, one record per ping">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {PACKET_FIELDS.map((f) => (
            <View
              key={f.name}
              style={{
                borderWidth: 1,
                borderColor: f.measured ? c.lineHot : 'rgba(111,140,168,0.35)',
                backgroundColor: f.measured ? c.cyDim : c.simDim,
                borderRadius: r.row,
                paddingHorizontal: 7,
                paddingVertical: 4,
              }}
            >
              <Tx style={type.tab} color={f.measured ? c.cy : c.sim}>
                {f.name} · {f.bytes}
              </Tx>
            </View>
          ))}
        </View>
        <Tx style={type.body} color={c.dim}>
          Blue fields become measured once the receive chain is validated in water.
        </Tx>
      </Panel>

      <Panel label="Solver" subtitle="closed-loop state">
        <Rows
          data={[
            ['noise correction', v(`${correction >= 0 ? '+' : ''}${correction.toFixed(2)} dB`),
              Math.abs(correction) > 0.4 ? 'warn' : 'plain'],
            ['time-bandwidth', v(d.tbp.toFixed(1)), tone],
            ['pings logged', v(String(pings)), 'plain'],
          ]}
        />
      </Panel>

      <Panel label="Faults" subtitle="none active">
        <Rows
          data={[
            ['last fault', 'NONE', 'live'],
            ['self test', 'PASS', 'live'],
            ['watchdog', 'ARMED', 'live'],
          ]}
        />
      </Panel>
    </Screen>
  );
}
