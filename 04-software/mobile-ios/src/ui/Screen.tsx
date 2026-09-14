import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { engine, useEngine } from '../core/useEngine';
import { Pill, Tx } from './kit';
import { c, HIT, sp, TAB_STRIP_HEIGHT, type } from './tokens';

/**
 * Every screen goes through here.
 *
 * Android 16 makes edge-to-edge mandatory, so insets are applied in exactly one
 * place. The tab strip already consumes the bottom inset, so screens inside it
 * add the strip height instead — adding both is the classic dead-strip bug.
 */
export function Screen({
  title,
  subtitle,
  children,
  scroll = true,
  inTabs = true,
  headerRight,
  contentStyle,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
  inTabs?: boolean;
  headerRight?: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const source = useEngine((s) => s.source);

  const padBottom =
    (inTabs ? TAB_STRIP_HEIGHT + insets.bottom : insets.bottom) + sp.xl;

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: sp.base,
        paddingBottom: sp.base,
      }}
    >
      <View style={{ flex: 1 }}>
        <Tx style={type.screenTitle} numberOfLines={1} cap={1.15}>
          {title}
        </Tx>
        {subtitle ? (
          <Tx style={[type.screenSub, { marginTop: 2 }]} color={c.dim} numberOfLines={1}>
            {subtitle}
          </Tx>
        ) : null}
      </View>
      {headerRight ?? (
        <Pill
          text={source === 'live' ? 'telemetry' : 'simulation'}
          tone={source === 'live' ? 'live' : 'sim'}
        />
      )}
    </View>
  );

  const pad = {
    paddingTop: insets.top + sp.base,
    paddingLeft: insets.left + sp.base,
    paddingRight: insets.right + sp.base,
  };

  if (!scroll) {
    return (
      <View style={[{ flex: 1, backgroundColor: c.abyss }, pad, { paddingBottom: padBottom }]}>
        {header}
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.abyss }}
      contentContainerStyle={[
        pad,
        { paddingBottom: padBottom, gap: sp.md },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
      overScrollMode="never"
      keyboardShouldPersistTaps="handled"
    >
      {header}
      {children}
    </ScrollView>
  );
}

/** Header for pushed screens — back affordance instead of the mode pill. */
export function SubScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <Screen
      title={title}
      subtitle={subtitle}
      inTabs={false}
      headerRight={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={HIT}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          style={({ pressed }) => ({
            paddingHorizontal: sp.base,
            paddingVertical: sp.sm,
            borderWidth: 1,
            borderColor: c.line3,
            borderRadius: 9,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Tx style={type.pill} color={c.silver}>
            CLOSE
          </Tx>
        </Pressable>
      }
    >
      {children}
    </Screen>
  );
}

export { engine };
