import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import { Lora_400Regular_Italic, Lora_600SemiBold, Lora_700Bold } from '@expo-google-fonts/lora';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { AppProvider } from '../src/context/AppContext';
import { TourProvider } from '../src/tour/Tour';
import { colors } from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function useNotificationRouting() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const go = (n: Notifications.Notification) => {
      const url = n.request.content.data?.url;
      if (typeof url === 'string' && url !== '/') router.push(url as never);
    };
    Notifications.getLastNotificationResponseAsync().then((r) => r && go(r.notification));
    const sub = Notifications.addNotificationResponseReceivedListener((r) => go(r.notification));
    return () => sub.remove();
  }, []);
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Amiri_400Regular,
    Amiri_700Bold,
    Lora_400Regular_Italic,
    Lora_600SemiBold,
    Lora_700Bold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useNotificationRouting();

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <TourProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="dua" />
          <Stack.Screen name="cuma" />
          <Stack.Screen name="imsakiye" />
          <Stack.Screen name="konum" options={{ presentation: 'modal' }} />
          <Stack.Screen name="izin" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="ezan" />
          <Stack.Screen name="namaz-takip" />
          <Stack.Screen name="dini-gunler" />
        </Stack>
        </TourProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
