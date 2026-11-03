import React, { useEffect, useRef, useState } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/Text';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Screen, Button } from '../../src/components/ui';
import { IconCheck } from '../../src/components/Icons';
import { colors, fonts, radius } from '../../src/theme';
import { useApp } from '../../src/context/AppContext';
import { distanceToKaaba, qiblaDirection } from '../../src/lib/prayerTimes';

const YONLER = ['Kuzey', 'Kuzeydoğu', 'Doğu', 'Güneydoğu', 'Güney', 'Güneybatı', 'Batı', 'Kuzeybatı'];
const yon = (deg: number) => YONLER[Math.round(deg / 45) % 8];

export default function Kible() {
  const { place } = useApp();
  const qibla = qiblaDirection(place.lat, place.lng);
  const km = distanceToKaaba(place.lat, place.lng);
  const [heading, setHeading] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number>(3);
  const [denied, setDenied] = useState(false);
  const wasAligned = useRef(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let sub: Location.LocationSubscription | null = null;
    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setDenied(true);
        return;
      }
      sub = await Location.watchHeadingAsync((h) => {
        setHeading(h.trueHeading >= 0 ? h.trueHeading : h.magHeading);
        setAccuracy(h.accuracy);
      });
    })();
    return () => sub?.remove();
  }, []);

  const diff = heading == null ? null : ((qibla - heading + 540) % 360) - 180;
  const aligned = diff != null && Math.abs(diff) <= 4;

  useEffect(() => {
    if (aligned && !wasAligned.current) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    wasAligned.current = aligned;
  }, [aligned]);

  // Kadran cihazla birlikte döner: kuzey her zaman gerçek kuzeyi gösterir.
  const dialRotation = heading == null ? 0 : -heading;

  let status: string;
  if (Platform.OS === 'web') status = 'Pusula yalnızca telefonda çalışır. Ok, kuzeye göre Kâbe yönünü gösterir.';
  else if (denied) status = 'Pusula için konum izni gerekli. Ayarlardan izin verebilirsiniz.';
  else if (heading == null) status = 'Pusula hazırlanıyor…';
  else if (aligned) status = 'Kıbleye yöneldiniz. Telefonu düz tutun, mıknatıslardan uzak durun.';
  else status = `${Math.abs(Math.round(diff!))}° ${diff! > 0 ? 'sağa' : 'sola'} dönün.`;

  return (
    <Screen title="Kıble" back={false}>
      <View style={st.center}>
        <Text style={st.muted}>Kâbe yönü</Text>
        <Text style={st.deg}>{Math.round(qibla)}°</Text>
        <Text style={st.muted}>{`${yon(qibla)} · Kâbe'ye ${Math.round(km).toLocaleString('tr-TR')} km`}</Text>
      </View>

      <View style={st.center}>
        <Svg width={320} height={320} viewBox="0 0 320 320" accessibilityLabel="Kıble pusulası">
          <G transform={`rotate(${dialRotation} 160 160)`}>
            <Circle cx={160} cy={160} r={152} fill={colors.card} stroke={aligned ? colors.green : colors.gold} strokeWidth={aligned ? 4 : 2} />
            <Circle cx={160} cy={160} r={142} fill="none" stroke={colors.cardBorder} strokeWidth={1} />
            <G stroke="#B9A57A" strokeWidth={1.5}>
              {Array.from({ length: 36 }).map((_, i) => {
                const a = (i * 10 * Math.PI) / 180;
                const r1 = i % 9 === 0 ? 128 : 136;
                return (
                  <Line key={i} x1={160 + Math.sin(a) * r1} y1={160 - Math.cos(a) * r1} x2={160 + Math.sin(a) * 142} y2={160 - Math.cos(a) * 142} />
                );
              })}
            </G>
            {[
              { t: 'K', x: 160, y: 58, c: '#9A3A2A' },
              { t: 'G', x: 160, y: 274, c: colors.muted },
              { t: 'D', x: 268, y: 165, c: colors.muted },
              { t: 'B', x: 52, y: 165, c: colors.muted },
            ].map((l) => (
              <SvgText key={l.t} x={l.x} y={l.y} fill={l.c} fontFamily={fonts.bodyBold} fontSize={15} textAnchor="middle">
                {l.t}
              </SvgText>
            ))}
            <G transform={`rotate(${qibla} 160 160)`}>
              <Path d="M160 46 L172 160 L160 172 L148 160 Z" fill={colors.green} />
              <Path d="M160 274 L170 160 L160 150 L150 160 Z" fill={colors.buttonBorder} />
              <G transform={`translate(160 30) rotate(${-qibla - dialRotation})`}>
                <Rect x={-13} y={-13} width={26} height={26} rx={3} fill={colors.ink} />
                <Rect x={-13} y={-6} width={26} height={4} fill="#C9A24E" />
              </G>
            </G>
          </G>
          <Path d="M160 2 L166 14 L154 14 Z" fill={colors.green} />
          <Circle cx={160} cy={160} r={8} fill={colors.gold} />
          <Circle cx={160} cy={160} r={3} fill={colors.card} />
        </Svg>
      </View>

      <View style={[st.status, { backgroundColor: aligned ? colors.green : colors.card, borderWidth: aligned ? 0 : 1 }]}>
        {aligned && <IconCheck />}
        <Text style={[st.statusText, { color: aligned ? colors.paper : colors.ink }]}>{status}</Text>
      </View>

      {Platform.OS !== 'web' && heading != null && accuracy < 2 && (
        <Text style={st.warn}>Pusula hassasiyeti düşük. Telefonu havada 8 çizer gibi birkaç kez hareket ettirin.</Text>
      )}

      <Button
        variant="secondary"
        label="Haritada göster"
        onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${place.lat},${place.lng}&destination=21.4225,39.8262`)}
      />
    </Screen>
  );
}

const st = StyleSheet.create({
  center: { alignItems: 'center', gap: 4 },
  muted: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  deg: { fontFamily: fonts.bodyBold, fontSize: 48, color: colors.green, letterSpacing: -1 },
  status: { borderRadius: radius.md + 2, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: colors.cardBorder },
  statusText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, flexShrink: 1 },
  warn: { fontFamily: fonts.body, fontSize: 13, color: colors.goldText, textAlign: 'center' },
});
