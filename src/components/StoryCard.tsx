// Instagram Story görseli (9:16). Ekranda küçük gösterilir, 1080×1920 olarak dışa aktarılır.
import React, { forwardRef } from 'react';
import { Image, StyleSheet, Text as RNText, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import { Desen, Palet, YaziTipi } from '../data/story';
import { fonts } from '../theme';

export const STORY_W = 270;
export const STORY_H = 480;

export type StoryProps = {
  palet: Palet;
  desen: Desen;
  photoUri?: string | null;
  font: YaziTipi;
  /** 0.85 / 1 / 1.18 */
  scale: number;
  textColor: string; // 'auto' = paletin rengi
  arabicTitle?: string;
  title?: string;
  arabicBody?: string;
  body: string;
  kaynak?: string;
};

const W = STORY_W;
const H = STORY_H;

function bodySize(len: number) {
  if (len > 220) return 12.5;
  if (len > 150) return 14;
  if (len > 95) return 15.5;
  if (len > 55) return 17.5;
  return 20;
}
function arabicSize(len: number) {
  if (len > 220) return 15;
  if (len > 140) return 17;
  if (len > 70) return 20;
  return 24;
}

export const StoryCard = forwardRef<View, StoryProps>((p, ref) => {
  const photo = !!p.photoUri;
  const titleColor = p.textColor === 'auto' ? (photo ? '#FFFFFF' : p.palet.title) : p.textColor;
  const textColor = p.textColor === 'auto' ? (photo ? '#F3F0EA' : p.palet.text) : p.textColor;
  const accent = photo ? '#E2C27A' : p.palet.accent;
  const bodyFont = p.font === 'sans' ? fonts.bodySemi : p.font === 'arabic' ? fonts.arabic : fonts.displayItalic;
  const titleFont = p.font === 'sans' ? fonts.bodyBold : p.font === 'arabic' ? fonts.arabicBold : fonts.displayBold;
  const bs = bodySize(p.body.length) * p.scale;
  const as = p.arabicBody ? arabicSize(p.arabicBody.length) * p.scale : 0;

  return (
    <View ref={ref} collapsable={false} style={st.root}>
      {photo ? (
        <>
          <Image source={{ uri: p.photoUri! }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.42)' }]} />
        </>
      ) : (
        <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
              {p.palet.bg.map((c, i) => (
                <Stop key={i} offset={p.palet.bg.length === 1 ? 0 : i / (p.palet.bg.length - 1)} stopColor={c} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={W} height={H} fill="url(#bg)" />
        </Svg>
      )}
      <Pattern desen={p.desen} color={accent} />

      <View style={st.content}>
        {p.arabicTitle ? (
          <RNText allowFontScaling={false} style={[st.arTitle, { color: accent, fontSize: 26 * p.scale, lineHeight: 40 * p.scale }]}>
            {p.arabicTitle}
          </RNText>
        ) : null}
        {p.title ? (
          <RNText allowFontScaling={false} style={[st.title, { color: titleColor, fontFamily: titleFont, fontSize: 27 * p.scale, lineHeight: 33 * p.scale }]}>
            {p.title}
          </RNText>
        ) : null}
        <View style={[st.rule, { backgroundColor: accent }]} />
        {p.arabicBody ? (
          <RNText allowFontScaling={false} style={[st.arBody, { color: titleColor, fontSize: as, lineHeight: as * 1.75 }]}>
            {p.arabicBody}
          </RNText>
        ) : null}
        <RNText allowFontScaling={false} style={[st.body, { color: textColor, fontFamily: bodyFont, fontSize: bs, lineHeight: bs * (p.font === 'arabic' ? 1.6 : 1.42) }]}>
          {p.kaynak ? `“${p.body}”` : p.body}
        </RNText>
        {p.kaynak ? (
          <RNText allowFontScaling={false} style={[st.kaynak, { color: accent }]}>{p.kaynak.toLocaleUpperCase('tr')}</RNText>
        ) : null}
      </View>

      <Image source={require('../../assets/logo.png')} style={st.logo} />
    </View>
  );
});
StoryCard.displayName = 'StoryCard';

function star(cx: number, cy: number, r: number) {
  // Sekiz köşeli yıldız: iki iç içe kare
  const pts = (rot: number) =>
    [0, 1, 2, 3].map((i) => {
      const a = rot + (i * Math.PI) / 2;
      return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
    }).join(' ');
  return [pts(Math.PI / 4), pts(0)];
}

/** Arka plan desenleri (yazının arkasında, düşük opaklıkta). */
function Pattern({ desen, color }: { desen: Desen; color: string }) {
  if (desen === 'yok') return null;
  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
      {desen === 'yildiz' && (
        <G stroke={color} strokeWidth={1} fill="none" opacity={0.28}>
          {Array.from({ length: 6 }).flatMap((_, row) =>
            Array.from({ length: 4 }).map((__, col) => {
              const cx = 34 + col * 68 + (row % 2) * 34;
              const cy = 30 + row * 84;
              const [a, b] = star(cx, cy, 18);
              return (
                <G key={`${row}-${col}`}>
                  <Polygon points={a} />
                  <Polygon points={b} />
                  <Circle cx={cx} cy={cy} r={5} />
                </G>
              );
            })
          )}
        </G>
      )}
      {desen === 'kemer' && (
        <G fill="none" stroke={color}>
          <Path d={`M22 ${H - 20} V180 Q22 62 135 26 Q248 62 248 180 V${H - 20}`} strokeWidth={2} opacity={0.75} />
          <Path d={`M32 ${H - 20} V184 Q32 74 135 40 Q238 74 238 184 V${H - 20}`} strokeWidth={0.8} opacity={0.6} />
          <Path d={`M10 ${H - 20} H${W - 10}`} strokeWidth={2} opacity={0.6} />
          <Circle cx={135} cy={60} r={4} fill={color} opacity={0.8} />
        </G>
      )}
      {desen === 'hilal' && (
        <G fill={color}>
          <Path d="M222 36 A30 30 0 1 0 222 96 A24 24 0 1 1 222 36 Z" opacity={0.85} />
          {[
            [40, 60, 3], [70, 34, 2], [110, 70, 2.5], [180, 120, 2], [36, 140, 2], [240, 170, 2.5], [60, 420, 2], [220, 430, 2.5],
          ].map(([x, y, r], i) => {
            const [a, b] = star(x, y, r * 2.2);
            return (
              <G key={i} opacity={0.75}>
                <Polygon points={a} />
                <Polygon points={b} />
              </G>
            );
          })}
        </G>
      )}
      {desen === 'cami' && (
        <G fill={color} opacity={0.32}>
          {/* Minareler */}
          <Rect x={28} y={330} width={10} height={150} />
          <Polygon points={`26,330 33,296 40,330`} />
          <Rect x={232} y={330} width={10} height={150} />
          <Polygon points={`230,330 237,296 244,330`} />
          {/* Ana kubbe ve yan kubbeler */}
          <Path d={`M70 400 Q70 330 135 322 Q200 330 200 400 Z`} />
          <Rect x={133} y={300} width={4} height={24} />
          <Path d={`M48 430 Q48 396 82 394 Q116 396 116 430 Z`} />
          <Path d={`M154 430 Q154 396 188 394 Q222 396 222 430 Z`} />
          <Rect x={44} y={400} width={182} height={80} />
        </G>
      )}
      {desen === 'kafes' && (
        <G stroke={color} strokeWidth={0.8} opacity={0.25}>
          {Array.from({ length: Math.ceil((W + H) / 30) + 1 }).map((_, i) => {
            const x = -H + i * 30;
            return <Line key={`a${i}`} x1={x} y1={0} x2={x + H} y2={H} />;
          })}
          {Array.from({ length: Math.ceil((W + H) / 30) + 1 }).map((_, i) => {
            const x = i * 30;
            return <Line key={`b${i}`} x1={x} y1={0} x2={x - H} y2={H} />;
          })}
        </G>
      )}
      {desen === 'isik' && (
        <G fill={color} opacity={0.14}>
          {Array.from({ length: 9 }).map((_, i) => {
            // Yukarıdan aşağı yelpaze gibi açılan ışık huzmeleri
            const a = Math.PI / 2 - 0.9 + (i * 1.8) / 8;
            const a2 = a + 0.08;
            const L = 760;
            return (
              <Polygon key={i} points={`135,-10 ${135 + L * Math.cos(a)},${-10 + L * Math.sin(a)} ${135 + L * Math.cos(a2)},${-10 + L * Math.sin(a2)}`} />
            );
          })}
        </G>
      )}
    </Svg>
  );
}

const st = StyleSheet.create({
  root: { width: W, height: H, borderRadius: 18, overflow: 'hidden', backgroundColor: '#000' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingBottom: 64, paddingTop: 30, gap: 10 },
  arTitle: { fontFamily: fonts.arabic, textAlign: 'center' },
  title: { textAlign: 'center' },
  rule: { width: 56, height: 1.5, borderRadius: 1, marginVertical: 2 },
  arBody: { fontFamily: fonts.arabic, textAlign: 'center', writingDirection: 'rtl' },
  body: { textAlign: 'center' },
  kaynak: { fontFamily: fonts.bodySemi, fontSize: 10, letterSpacing: 0.6, textAlign: 'center' },
  logo: { position: 'absolute', bottom: 14, alignSelf: 'center', width: 64, height: 60, resizeMode: 'contain' },
});
