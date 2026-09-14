import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tx } from '../../src/ui/kit';
import { c, r, sp, TAB_STRIP_HEIGHT, type } from '../../src/ui/tokens';

/** Eleven screens, in the dossier's order. Short labels — the strip scrolls. */
const TABS: { route: string; label: string }[] = [
  { route: 'index', label: 'Home' },
  { route: 'env', label: 'Env' },
  { route: 'wave', label: 'Wave' },
  { route: 'sonar', label: 'Sonar' },
  { route: 'spec', label: 'Spec' },
  { route: 'echo', label: 'Echo' },
  { route: 'power', label: 'Power' },
  { route: 'mission', label: 'Mission' },
  { route: 'diag', label: 'Diag' },
  { route: 'log', label: 'Log' },
  { route: 'settings', label: 'Set' },
];

const ORDER = TABS.map((t) => t.route);

/**
 * Horizontally scrollable tab strip, as in the reference. Eleven destinations do
 * not fit a fixed bar, and a scrolling strip reads as instrument navigation
 * rather than a consumer app.
 *
 * The strip absorbs the bottom safe-area inset itself; screens must not add it
 * again.
 */
function TabStrip({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const ref = React.useRef<ScrollView>(null);

  const activeRoute = state.routes[state.index]?.name;
  const activeIdx = ORDER.indexOf(activeRoute);

  // Keep the selected tab in view when navigation happens from elsewhere.
  React.useEffect(() => {
    if (activeIdx < 0) return;
    ref.current?.scrollTo({ x: Math.max(0, activeIdx * 62 - 110), animated: true });
  }, [activeIdx]);

  return (
    <View
      style={{
        backgroundColor: c.deep,
        borderTopWidth: 1,
        borderTopColor: c.line,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
        height: TAB_STRIP_HEIGHT + insets.bottom,
      }}
    >
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          alignItems: 'center',
          paddingHorizontal: sp.md,
          gap: sp.xs,
        }}
        style={{ height: TAB_STRIP_HEIGHT }}
      >
        {state.routes.map((route: { key: string; name: string }, index: number) => {
          const meta = TABS.find((t) => t.route === route.name);
          if (!meta) return null;
          const on = state.index === index;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={meta.label}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                const ev = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!on && !ev.defaultPrevented) navigation.navigate(route.name);
              }}
              style={{
                minWidth: 52,
                height: 30,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: sp.md,
                borderRadius: r.tab,
                backgroundColor: on ? c.cyFill : 'transparent',
              }}
            >
              <Tx style={type.tab} color={on ? c.cy : c.dim} numberOfLines={1}>
                {meta.label.toUpperCase()}
              </Tx>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(p) => <TabStrip {...p} />}
      screenOptions={{
        headerShown: false,
        animation: 'none',
        sceneStyle: { backgroundColor: c.abyss },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen key={t.route} name={t.route} />
      ))}
    </Tabs>
  );
}
