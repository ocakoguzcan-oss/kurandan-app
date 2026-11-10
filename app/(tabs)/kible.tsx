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
import { t, tx } from '../../src/i18n';
import { formatNumber } from '../../src/i18n/format';

const YONLER = [tx('Kuzey'), tx('Kuzeydoğu'), tx('Doğu'), tx('Güneydoğu'), tx('Güney'), tx('Güneybatı'), tx('Batı'), tx('Kuzeybatı')];
const yon = (deg: number) => t(YONLER[Math.round(deg / 45) % 8]);

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
  if (Platform.OS === 'web') status = t('Pusula yalnızca telefonda çalışır. Ok, kuzeye göre Kâbe yönünü gösterir.');
  else if (denied) status = t('Pusula için konum izni gerekli. Ayarlardan izin verebilirsiniz.');
  else if (heading == null) status = t('Pusula hazırlanıyor…');
  else if (aligned) status = t('Kıbleye yöneldiniz. Telefonu düz tutun, mıknatıslardan uzak durun.');
  else status = diff! > 0 ? t('{n}° sağa dönün.', { n: Math.abs(Math.round(diff!)) }) : t('{n}° sola dönün.', { n: Math.abs(Math.round(diff!)) });

  return (
    <Screen title={t('Kıble')} back={false}>
      <View style={st.center}>
        <Text style={st.muted}>{t('Kâbe yönü')}</Text>
        <Text style={st.deg}>{Math.round(qibla)}°</Text>
        <Text style={st.muted}>{t("{yon} · Kâbe'ye {km} km", { yon: yon(qibla), km: formatNumber(Math.round(km)) })}</Text>
      </View>

      <View style={st.center}>
        <Svg width={320} height={320} viewBox="0 0 320 320" accessibilityLabel={t('Kıble pusulası')}>
          <G transform={`rotate(${dialRotation} 160 160)`}>
            <Circle cx={160} cy={160} r={152} fill={colors.card} stroke={aligned ? colors.greenText : colors.gold} strokeWidth={aligned ? 4 : 2} />
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
              { t: t('K'), x: 160, y: 58, c: '#9A3A2A' },
              { t: t('G'), x: 160, y: 274, c: colors.muted },
              { t: t('D'), x: 268, y: 165, c: colors.muted },
              { t: t('B'), x: 52, y: 165, c: colors.muted },
            ].map((l) => (
              <SvgText key={l.t} x={l.x} y={l.y} fill={l.c} fontFamily={fonts.bodyBold} fontSize={15} textAnchor="middle">
                {l.t}
              </SvgText>
            ))}
            <G transform={`rotate(${qibla} 160 160)`}>
              <Path d="M160 46 L172 160 L160 172 L148 160 Z" fill={colors.greenText} />
              <Path d="M160 274 L170 160 L160 150 L150 160 Z" fill={colors.buttonBorder} />
              <G transform={`translate(160 30) rotate(${-qibla - dialRotation})`}>
                <Rect x={-13} y={-13} width={26} height={26} rx={3} fill={colors.ink} />
                <Rect x={-13} y={-6} width={26} height={4} fill="#C9A24E" />
              </G>
            </G>
          </G>
          <Path d="M160 2 L166 14 L154 14 Z" fill={colors.greenText} />
          <Circle cx={160} cy={160} r={8} fill={colors.gold} />
          <Circle cx={160} cy={160} r={3} fill={colors.card} />
        </Svg>
      </View>

      <View style={[st.status, { backgroundColor: aligned ? colors.green : colors.card, borderWidth: aligned ? 0 : 1 }]}>
        {aligned && <IconCheck />}
        <Text style={[st.statusText, { color: aligned ? colors.onGreen : colors.ink }]}>{status}</Text>
      </View>

      {Platform.OS !== 'web' && heading != null && accuracy < 2 && (
        <Text style={st.warn}>{t('Pusula hassasiyeti düşük. Telefonu havada 8 çizer gibi birkaç kez hareket ettirin.')}</Text>
      )}

      <Button
        variant="secondary"
        label={t('Haritada göster')}
        onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${place.lat},${place.lng}&destination=21.4225,39.8262`)}
      />
    </Screen>
  );
}

const st = StyleSheet.create({
  center: { alignItems: 'center', gap: 4 },
  muted: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  deg: { fontFamily: fonts.bodyBold, fontSize: 48, color: colors.greenText, letterSpacing: -1 },
  status: { borderRadius: radius.md + 2, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: colors.cardBorder },
  statusText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, flexShrink: 1 },
  warn: { fontFamily: fonts.body, fontSize: 13, color: colors.goldText, textAlign: 'center' },
});
