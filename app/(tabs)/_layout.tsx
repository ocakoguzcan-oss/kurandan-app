import React from 'react';
import { Tabs } from 'expo-router';
import { colors, fonts } from '../../src/theme';
import { t } from '../../src/i18n';
import { IconBook, IconCompass, IconHome, IconPlay, IconPlus, IconSettings } from '../../src/components/Icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.greenText,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.cardBorder },
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 10 },
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
