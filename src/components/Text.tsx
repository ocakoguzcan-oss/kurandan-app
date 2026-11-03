// Uygulamanın tüm yazıları bu bileşenden geçer: "Büyük yazı" açıkken yazı boyutu ve satır
// aralığı birlikte büyür. Kullanımı React Native'in Text'iyle aynıdır.
import React from 'react';
import { StyleSheet, Text as RNText, TextProps } from 'react-native';
import { LARGE_TEXT_SCALE, usePrefs } from '../lib/prefs';

export function Text(props: TextProps) {
  const { largeText } = usePrefs();
  if (!largeText) return <RNText {...props} />;
  const flat = StyleSheet.flatten(props.style) || {};
  const scaled = {
    fontSize: (flat.fontSize ?? 14) * LARGE_TEXT_SCALE,
    ...(flat.lineHeight ? { lineHeight: flat.lineHeight * LARGE_TEXT_SCALE } : null),
  };
  return <RNText {...props} style={[props.style, scaled]} />;
}
