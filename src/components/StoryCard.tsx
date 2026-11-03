import React, { forwardRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import Svg, { G, Rect } from 'react-native-svg';
import { CumaAyet, StoryTheme } from '../data/cuma';
import { fonts } from '../theme';

/** Instagram Story görseli (9:16). Ekranda küçük gösterilir, 1080×1920 olarak dışa aktarılır. */
export const STORY_W = 272;
export const STORY_H = Math.round((STORY_W * 16) / 9);

export const StoryCard = forwardRef<View, { theme: StoryTheme; ayet: CumaAyet }>(({ theme, ayet }, ref) => (
  <View ref={ref} collapsable={false} style={[st.root, { backgroundColor: theme.bg }]}>
    <View style={[st.frame1, { borderColor: theme.frame }]}>
      <View style={[st.frame2, { borderColor: theme.frame }]}>
        <Svg width={34} height={34} viewBox="0 0 100 100">
          <G fill="none" stroke={theme.accent} strokeWidth={4}>
            <Rect x={25} y={25} width={50} height={50} />
            <Rect x={25} y={25} width={50} height={50} transform="rotate(45 50 50)" />
          </G>
        </Svg>
        <Text style={[st.ar, { color: theme.accent }]}>جُمُعَة مُبَارَكَة</Text>
        <Text style={[st.title, { color: theme.title }]}>Hayırlı Cumalar</Text>
        <View style={[st.rule, { backgroundColor: theme.accent }]} />
        <Text style={[st.meal, { color: theme.text }]}>{`“${ayet.meal}”`}</Text>
        <Text style={[st.kaynak, { color: theme.accent }]}>{ayet.kaynak.toLocaleUpperCase('tr')}</Text>
        <Image source={require('../../assets/logo.png')} style={st.logo} />
      </View>
    </View>
  </View>
));
StoryCard.displayName = 'StoryCard';

const st = StyleSheet.create({
  root: { width: STORY_W, height: STORY_H, borderRadius: 18, padding: 10, overflow: 'hidden' },
  frame1: { flex: 1, borderWidth: 1.5, borderRadius: 10, padding: 4 },
  frame2: { flex: 1, borderWidth: 0.75, borderRadius: 7, paddingTop: 22, paddingHorizontal: 16, paddingBottom: 14, alignItems: 'center', gap: 12 },
  ar: { fontFamily: fonts.arabic, fontSize: 30, lineHeight: 44, textAlign: 'center' },
  title: { fontFamily: fonts.displayBold, fontSize: 30, lineHeight: 34, textAlign: 'center' },
  rule: { width: 60, height: 1 },
  meal: { fontFamily: fonts.displayItalic, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  kaynak: { fontFamily: fonts.bodySemi, fontSize: 10, letterSpacing: 0.6 },
  logo: { width: 74, height: 70, resizeMode: 'contain', marginTop: 'auto' },
});
