import React from 'react';
import { Tabs } from 'expo-router';
import { colors, fonts } from '../../src/theme';
import { IconCompass, IconHome, IconPlay, IconPlus, IconSettings } from '../../src/components/Icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.green,
        tabBarInactiveTintColor: '#6B6A5E',
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.cardBorder },
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 11 },
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Ana Sayfa', tabBarIcon: ({ color }) => <IconHome color={color} /> }} />
      <Tabs.Screen name="kible" options={{ title: 'Kıble', tabBarIcon: ({ color }) => <IconCompass color={color} /> }} />
      <Tabs.Screen name="zikir" options={{ title: 'Zikir', tabBarIcon: ({ color }) => <IconPlus color={color} /> }} />
      <Tabs.Screen name="reels" options={{ title: 'Reels', tabBarIcon: ({ color }) => <IconPlay color={color} /> }} />
      <Tabs.Screen name="ayarlar" options={{ title: 'Ayarlar', tabBarIcon: ({ color }) => <IconSettings color={color} /> }} />
    </Tabs>
  );
}
