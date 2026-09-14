import React, { useMemo } from 'react';
import { Contact, Ppi } from '../../src/charts/Ppi';
import { makeRandom } from '../../src/core/dsp';
import { useEngine } from '../../src/core/useEngine';
import { Axis } from '../../src/charts/Plot';
import { Banner, Panel, Rows } from '../../src/ui/kit';
import { Screen } from '../../src/ui/Screen';
import { fmtMetres } from '../../src/ui/format';

const DASH = '—';

export default function SonarScreen() {
  const source = useEngine((s) => s.source);
  const live = source === 'live';
  const tone = live ? 'sim' : 'live';

  const tick = useEngine((s) => s.tick);
  const maxRange = useEngine((s) => s.decision.maxRangeM);
  const pings = useEngine((s) => s.pings.length);
  const res = useEngine((s) => s.decision.resolutionM);

  // Bearing sweep runs off the engine tick so it moves at a steady 5 Hz.
  const sweepDeg = useMemo(() => ((tick * 3) % 120) - 60, [tick]);

  // Contacts are derived from the logged pings' measured ranges, spread across
  // the sector by a stable per-ping hash so they do not jitter between frames.
  const contacts = useEngine((s) => {
    if (s.source === 'live') return [] as Contact[];
    return s.pings.slice(0, 4).map((p) => {
      const rnd = makeRandom(p.id * 2654435761);
      rnd();
      return {
        range: p.measuredRangeM,
        bearing: (rnd() - 0.5) * 100,
        confidence: Math.max(0.25, Math.min(1, p.measuredSnrDb / 40)),
      };
    });
  }, (a, b) => a.length === b.length && a.every((x, i) => x.range === b[i].range));

  const ringStep = maxRange / 4;

  return (
    <Screen title="Sonar" subtitle="PPI · range / bearing">
      {live ? <Banner text="link down · no returns" tone="fault" /> : null}

      <Panel label="PPI" subtitle={`120° sector · ${fmtMetres(maxRange)} scale`}>
        <Ppi contacts={contacts} maxRange={maxRange} sweepDeg={sweepDeg} />
        <Axis left="port 60°" right="stbd 60°" />
      </Panel>

      <Panel label="Contacts" subtitle={live ? 'awaiting link' : `${contacts.length} held`}>
        {contacts.length === 0 ? (
          <Rows data={[['returns', live ? DASH : 'NONE — FIRE A PING', 'sim']]} />
        ) : (
          <Rows
            data={contacts.map(
              (k, i) =>
                [
                  `ret-${String(i + 1).padStart(2, '0')}`,
                  `${fmtMetres(k.range)} · ${(k.confidence * 100).toFixed(0)}%`,
                  'warn',
                ] as const,
            )}
          />
        )}
      </Panel>

      <Panel label="Display" subtitle="scale and discrimination">
        <Rows
          data={[
            ['scale', live ? DASH : fmtMetres(maxRange), tone],
            ['ring step', live ? DASH : fmtMetres(ringStep), 'plain'],
            ['range res', live ? DASH : fmtMetres(res), tone],
            ['sector', '120°', 'plain'],
            ['pings held', live ? DASH : String(pings), 'plain'],
          ]}
        />
      </Panel>
    </Screen>
  );
}
