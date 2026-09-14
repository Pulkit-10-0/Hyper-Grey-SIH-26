import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { SCENARIOS } from '../src/data/scenarios';
import { engine, useEngine } from '../src/core/useEngine';
import { Panel, Rows, Tx } from '../src/ui/kit';
import { SubScreen } from '../src/ui/Screen';
import { c, type } from '../src/ui/tokens';

export default function ScenarioModal() {
  const router = useRouter();
  const active = useEngine((s) => s.scenario);

  return (
    <SubScreen title="Scenarios" subtitle="Sets the environment. The solver does the rest.">
      {SCENARIOS.map((s) => {
        const on = s.id === active;
        return (
          <Pressable
            key={s.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => {
              engine.setScenario(s.id);
              router.back();
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
          >
            <Panel
              label={s.name}
              subtitle={s.blurb}
              style={on ? { borderColor: c.lineHot } : undefined}
              right={
                on ? (
                  <Tx style={type.pill} color={c.cy}>
                    ACTIVE
                  </Tx>
                ) : null
              }
            >
              <Rows
                data={[
                  ['temp', `${s.tempC.toFixed(1)} °C`, on ? 'live' : 'plain'],
                  ['salinity', `${s.salinityPpt.toFixed(1)} ppt`, on ? 'live' : 'plain'],
                  ['turbidity', `${s.turbidityNtu} NTU`, on ? 'live' : 'plain'],
                  ['depth', `${s.depthM} m`, on ? 'live' : 'plain'],
                ]}
              />
            </Panel>
          </Pressable>
        );
      })}
      <View style={{ height: 4 }} />
    </SubScreen>
  );
}
