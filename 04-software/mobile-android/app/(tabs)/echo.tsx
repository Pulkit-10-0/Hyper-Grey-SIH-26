import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Axis, Plot } from '../../src/charts/Plot';
import { MODE_LABEL } from '../../src/core/dsp';
import { engine, useEngine } from '../../src/core/useEngine';
import { Action, Banner, Metric, Panel, Rows } from '../../src/ui/kit';
import { Screen } from '../../src/ui/Screen';
import { fmtHz, fmtMetres } from '../../src/ui/format';
import { c, sp } from '../../src/ui/tokens';

const DASH = '—';

export default function EchoScreen() {
  const [firing, setFiring] = useState(false);

  const source = useEngine((s) => s.source);
  const live = source === 'live';

  const ping = useEngine((s) => s.lastPing);
  const correction = useEngine((s) => s.noiseCorrectionDb);
  const required = useEngine((s) => s.config.requiredRangeM);
  const window = useEngine((s) => s.config.maxRangeBoundM * 0.5);

  const fire = useCallback(() => {
    setFiring(true);
    setTimeout(() => {
      engine.fire();
      setFiring(false);
    }, 80);
  }, []);

  if (live) {
    return (
      <Screen title="Echo" subtitle="Matched filter">
        <Banner text="link down · no echo stream" tone="fault" />
        <Panel label="Result" subtitle="awaiting link">
          <Rows
            data={[
              ['range', DASH, 'sim'],
              ['measured snr', DASH, 'sim'],
              ['pslr', DASH, 'sim'],
              ['predicted snr', DASH, 'sim'],
            ]}
          />
        </Panel>
      </Screen>
    );
  }

  if (!ping) {
    return (
      <Screen title="Echo" subtitle="Matched filter">
        <Panel label="No capture" subtitle="fire a ping to populate this screen">
          <Rows
            data={[
              ['returns', 'NONE', 'sim'],
              ['required range', fmtMetres(required), 'plain'],
            ]}
          />
          <View style={{ marginTop: sp.sm }}>
            <Action label="fire ping" busy={firing} onPress={fire} />
          </View>
        </Panel>
      </Screen>
    );
  }

  const err = Math.abs(ping.errorDb);
  const errTone = err < 2 ? 'live' : err < 5 ? 'warn' : 'fault';
  const rangeErr = Math.abs(ping.measuredRangeM - ping.trueRangeM);

  return (
    <Screen title="Echo" subtitle={`Ping ${String(ping.id).padStart(4, '0')} · ${MODE_LABEL[ping.mode]}`}>
      <Panel label="Result">
        <View style={{ flexDirection: 'row', gap: sp.base }}>
          <Metric label="range" value={fmtMetres(ping.measuredRangeM)} tone="live" />
          <Metric
            label="snr"
            value={ping.measuredSnrDb.toFixed(1)}
            unit="dB"
            tone="live"
          />
        </View>
      </Panel>

      <Panel label="Received trace" subtitle="raw return, pre-compression">
        <Plot
          data={ping.rx}
          height={86}
          yMin={-1.6}
          yMax={1.6}
          color={c.faint}
          grid={[0]}
          blankUntil={0.04}
        />
        <Axis left="0" right={fmtMetres(window)} />
      </Panel>

      <Panel label="Matched filter" subtitle="correlated against replica">
        <Plot
          data={ping.correlation}
          height={112}
          yMin={0}
          yMax={1.06}
          fill
          grid={[0.25, 0.5, 0.75]}
          markers={[
            { x: Math.max(0, Math.min(1, ping.measuredRangeM / window)), color: c.amber },
          ]}
        />
        <Axis left="0" right={fmtMetres(window)} />
      </Panel>

      <Panel label="Detection">
        <Rows
          data={[
            ['target at', fmtMetres(ping.trueRangeM), 'plain'],
            ['range error', fmtMetres(rangeErr), rangeErr < ping.resolutionM * 2 ? 'live' : 'warn'],
            ['range res', fmtMetres(ping.resolutionM), 'live'],
            ['pslr', `${ping.peakToSidelobeDb.toFixed(1)} dB`, 'live'],
            ['compression', `${ping.compressionGainDb.toFixed(2)} dB`, 'live'],
            ['tbp', ping.tbp.toFixed(1), 'plain'],
          ]}
        />
      </Panel>

      <Panel label="Closed loop" subtitle="predicted against measured">
        <View style={{ flexDirection: 'row', gap: sp.base }}>
          <Metric label="pred" value={ping.predictedSnrDb.toFixed(1)} unit="dB" />
          <Metric label="meas" value={ping.measuredSnrDb.toFixed(1)} unit="dB" />
          <Metric
            label="Δ"
            value={`${ping.errorDb >= 0 ? '−' : '+'}${err.toFixed(1)}`}
            unit="dB"
            tone={errTone}
          />
        </View>
        <Rows
          data={[
            [
              'noise correction',
              `${correction >= 0 ? '+' : ''}${correction.toFixed(2)} dB`,
              Math.abs(correction) > 0.4 ? 'warn' : 'plain',
            ],
            ['fc at fire', fmtHz(ping.fCentre), 'plain'],
            ['turbidity', `${ping.env.turbidityNtu.toFixed(0)} NTU`, 'plain'],
          ]}
        />
      </Panel>

      <View style={{ flexDirection: 'row', gap: sp.md }}>
        <View style={{ flex: 1 }}>
          <Action label="reset loop" tone="sim" onPress={() => engine.resetLoop()} />
        </View>
        <View style={{ flex: 1.4 }}>
          <Action label="fire again" busy={firing} onPress={fire} />
        </View>
      </View>
    </Screen>
  );
}
