// Uygulamanın tüm yazıları bu bileşenden geçer: "Büyük yazı" açıkken yazı boyutu ve satır
// aralığı birlikte büyür. Kullanımı React Native'in Text'iyle aynıdır.
import React from 'react';
import { StyleSheet, Text as RNText, TextProps } from 'react-native';
import { LARGE_TEXT_SCALE, usePrefs } from '../lib/prefs';

/**
 * Telefonun genel yazı boyutu: en fazla %10 büyütülür. Daha büyük ayarlarda (yaşlı kullanıcılarda sık)
 * vakit tablosu, sekme yazıları ve kartlar birbirine giriyordu. Daha büyük yazı isteyen uygulamadaki
 * "Büyük yazı" seçeneğini kullanır.
 */
export const EN_FAZLA_OLCEK = 1.1;

export function Text(props: TextProps) {
  const { largeText } = usePrefs();
  const p = { maxFontSizeMultiplier: EN_FAZLA_OLCEK, ...props };
  if (!largeText) return <RNText {...p} />;
  const flat = StyleSheet.flatten(props.style) || {};
  const scaled = {
    fontSize: (flat.fontSize ?? 14) * LARGE_TEXT_SCALE,
    ...(flat.lineHeight ? { lineHeight: flat.lineHeight * LARGE_TEXT_SCALE } : null),
  };
  return <RNText {...p} style={[props.style, scaled]} />;
}
