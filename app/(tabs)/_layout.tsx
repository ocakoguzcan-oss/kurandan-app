import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EzanNative } from '../../modules/ezan-native';
import { colors, fonts } from '../../src/theme';
import { t } from '../../src/i18n';
import { IconBook, IconCompass, IconHome, IconPlay, IconPlus, IconSettings } from '../../src/components/Icons';

/** Android: üç tuşlu sistem çubuğu bazı telefonlarda güvenli alana eksik yansıyor; yerel ölçümle düzelt */
function androidAlt(): number {
  if (Platform.OS !== 'android') return 0;
  try {
    return EzanNative?.altBosluk?.() ?? 0;
  } catch {
    return 0;
  }
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const yerel = useMemo(androidAlt, [insets.bottom]);
  const alt = Math.max(insets.bottom, yerel);
  return (
    <Tabs
      safeAreaInsets={{ ...insets, bottom: alt }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.greenText,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.cardBorder },
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 10 },
        tabBarAllowFontScaling: false,
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('Ana Sayfa'), tabBarIcon: ({ color }) => <IconHome color={color} /> }} />
      <Tabs.Screen name="kuran" options={{ title: t('Kur’ân'), tabBarIcon: ({ color }) => <IconBook color={color} /> }} />
      <Tabs.Screen name="kible" options={{ title: t('Kıble'), tabBarIcon: ({ color }) => <IconCompass color={color} /> }} />
      <Tabs.Screen name="zikir" options={{ title: t('Zikir'), tabBarIcon: ({ color }) => <IconPlus color={color} /> }} />
      <Tabs.Screen name="reels" options={{ title: t('Reels'), tabBarIcon: ({ color }) => <IconPlay color={color} /> }} />
      <Tabs.Screen name="ayarlar" options={{ title: t('Ayarlar'), tabBarIcon: ({ color }) => <IconSettings color={color} /> }} />
    </Tabs>
  );
}
