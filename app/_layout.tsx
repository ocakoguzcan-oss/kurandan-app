import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { loadPrefs, usePrefs } from '../src/lib/prefs';
import { deviceLang, initLang, restartApp } from '../src/i18n';

SplashScreen.preventAutoHideAsync().catch(() => {});
const RTL_RELOAD_KEY = 'kurandan.rtlReloadAt';

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

  // Dil, ilk çizimden önce belli olmalı (t() eşzamanlı çalışır).
  const [langReady, setLangReady] = useState(false);
  useEffect(() => {
    loadPrefs().then(async (p) => {
      const needsRestart = initLang(p.lang ?? deviceLang());
      if (needsRestart) {
        // Sağdan sola düzen ancak yeniden başlatınca uygulanır. Döngüye girmemek için
        // son bir dakikada denendiyse tekrar başlatma.
        const last = Number((await AsyncStorage.getItem(RTL_RELOAD_KEY).catch(() => null)) ?? 0);
        if (Date.now() - last > 60000) {
          await AsyncStorage.setItem(RTL_RELOAD_KEY, String(Date.now())).catch(() => {});
          restartApp();
          return;
        }
      }
      setLangReady(true);
    });
  }, []);
  const prefs = usePrefs();
  const lang = prefs.lang ?? deviceLang();

  useEffect(() => {
    if ((loaded || error) && langReady) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error, langReady]);

  if ((!loaded && !error) || !langReady) return null;

  return (
    <SafeAreaProvider>
      <AppProvider key={lang}>
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
          <Stack.Screen name="kaza" />
          <Stack.Screen name="hatim" />
          <Stack.Screen name="camiler" />
          <Stack.Screen name="hicri-takvim" />
          <Stack.Screen name="zekat" />
          <Stack.Screen name="dini-gunler" />
          <Stack.Screen name="kabe-yolu" />
          <Stack.Screen name="dil" options={{ presentation: 'modal' }} />
          <Stack.Screen name="vakit-yontemi" />
          <Stack.Screen name="bildirim-sesi" />
          <Stack.Screen name="kilit-ekrani" options={{ presentation: 'modal' }} />
        </Stack>
        </TourProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
