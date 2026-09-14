import React, { useMemo } from 'react';
import { Axis, Plot } from '../../src/charts/Plot';
import { SpectrogramPlot } from '../../src/charts/Spectrogram';
import {
  decimate,
  instantaneousFrequency,
  magnitudeSpectrumDb,
  synthesise,
} from '../../src/core/dsp';
import { shallowEqual, useEngine } from '../../src/core/useEngine';
import { Panel, Rows } from '../../src/ui/kit';
import { Screen } from '../../src/ui/Screen';
import { fmtHz } from '../../src/ui/format';

const N = 1024;
const DASH = '—';

export default function SpecScreen() {
  const source = useEngine((s) => s.source);
  const live = source === 'live';
  const tone = live ? 'sim' : 'live';
  const v = (s: string) => (live ? DASH : s);

  const win = useEngine((s) => s.decision.window);
  const d = useEngine(
    (s) => ({
      mode: s.decision.mode,
      fStart: s.decision.fStart,
      fStop: s.decision.fStop,
      fCentre: s.decision.fCentre,
      bandwidth: s.decision.bandwidth,
      tau: s.decision.tau,
    }),
    shallowEqual,
  );

  const swept = d.mode === 'lfm' || d.mode === 'geometric';

  const pulse = useMemo(() => {
    const fs = N / d.tau;
    const carrier = fs / 9;
    const half = swept ? Math.min(carrier * 0.7, (N / 26) / d.tau) : 0;
    return synthesise(
      {
        mode: d.mode,
        window: win,
        fStart: carrier - half,
        fStop: carrier + half,
        tau: d.tau,
        amplitude: 1,
      },
      fs,
    );
  }, [d.mode, d.tau, win, swept]);

  const spectrum = useMemo(() => {
    const s = magnitudeSpectrumDb(pulse, N);
    return decimate(s.subarray(0, Math.floor(s.length * 0.45)), 260);
  }, [pulse]);

  const ift = useMemo(() => {
    const f = instantaneousFrequency(
      { mode: d.mode, window: win, fStart: d.fStart, fStop: d.fStop, tau: d.tau, amplitude: 1 },
      160,
    );
    return f;
  }, [d.mode, d.fStart, d.fStop, d.tau, win]);

  const fMin = Math.min(d.fStart, d.fStop);
  const fMax = Math.max(d.fStart, d.fStop);

  return (
    <Screen title="Spec" subtitle="Occupied band">
      <Panel label="Spectrum" subtitle="|X(f)| — swept shoulder">
        <Plot
          data={spectrum}
          height={104}
          yMin={-72}
          yMax={4}
          fill
          grid={[0, -20, -40, -60]}
        />
        <Axis left="dc" right="fs / 2" />
      </Panel>

      <Panel label="Time / frequency" subtitle="instantaneous f(t)">
        <Plot
          data={ift}
          height={54}
          yMin={fMin - (fMax - fMin) * 0.15 - 1}
          yMax={fMax + (fMax - fMin) * 0.15 + 1}
        />
        <Axis left="0" right={`${(d.tau * 1000).toFixed(2)} ms`} />
      </Panel>

      <Panel label="Spectrogram" subtitle="hann · 50% overlap">
        <SpectrogramPlot signal={pulse} height={128} />
        <Axis left="time →" right="↑ freq" />
      </Panel>

      <Panel label="Band" subtitle="occupied spectrum">
        <Rows
          data={[
            ['centre', v(fmtHz(d.fCentre)), tone],
            ['start', v(fmtHz(fMin)), 'plain'],
            ['stop', v(fmtHz(fMax)), 'plain'],
            ['bandwidth', v(fmtHz(d.bandwidth)), tone],
            ['fractional', v(`${((d.bandwidth / d.fCentre) * 100).toFixed(0)} %`), 'plain'],
          ]}
        />
      </Panel>
    </Screen>
  );
}
