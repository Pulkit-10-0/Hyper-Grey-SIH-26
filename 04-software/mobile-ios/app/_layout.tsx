import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import {
  Rajdhani_600SemiBold,
  Rajdhani_700Bold,
} from '@expo-google-fonts/rajdhani';
import { useFonts } from 'expo-font';
import { useKeepAwake } from 'expo-keep-awake';
import { Stack } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { engine } from '../src/core/engine';
import { c } from '../src/ui/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * expo-router renders this instead of unmounting the tree when a route throws.
 * Without it a render error closes the app with no explanation, which is exactly
 * how a `this`-binding bug in a store subscription hid itself.
 */
export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => Promise<void>;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: c.abyss, padding: 24, paddingTop: 72 }}>
      <Text style={{ color: c.fault, fontSize: 18, fontWeight: '700', marginBottom: 6 }}>
        Render error
      </Text>
      <Text style={{ color: c.dim, fontSize: 12, marginBottom: 16 }}>
        {String(error?.name ?? 'Error')}
      </Text>
      <ScrollView style={{ flex: 1 }}>
        <Text style={{ color: c.white, fontSize: 13, lineHeight: 19 }}>
          {String(error?.message ?? error)}
        </Text>
        <Text style={{ color: c.faint, fontSize: 10, lineHeight: 15, marginTop: 16 }}>
          {String(error?.stack ?? '').slice(0, 2000)}
        </Text>
      </ScrollView>
      <Text
        onPress={() => retry()}
        style={{
          color: c.cy,
          fontSize: 14,
          paddingVertical: 16,
          textAlign: 'center',
        }}
      >
        RETRY
      </Text>
    </View>
  );
}

export default function RootLayout() {
  useKeepAwake();

  const [fontsReady] = useFonts({
    Rajdhani_600SemiBold,
    Rajdhani_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  // Never let font loading be able to hold the app on a blank splash. If the
  // faces have not arrived in three seconds, render with system fallbacks.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 3000);
    return () => clearTimeout(t);
  }, []);

  const show = fontsReady || timedOut;

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.abyss).catch(() => {});
    ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.PORTRAIT_UP,
    ).catch(() => {});
    engine.start();
    return () => engine.stop();
  }, []);

  // Hide the splash from an effect, not from an onLayout that only fires on a
  // subtree that may never mount.
  useEffect(() => {
    if (show) SplashScreen.hideAsync().catch(() => {});
  }, [show]);

  if (!show) return <View style={{ flex: 1, backgroundColor: c.abyss }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.abyss }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c.abyss },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="scenario" options={{ presentation: 'modal' }} />
          <Stack.Screen name="ping/[id]" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
