import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import Svg, { Circle, G, Rect } from 'react-native-svg';
import { Screen, Card, Eyebrow, RoundButton } from '../../src/components/ui';
import { IconAlarm, IconBell, IconCompass, IconMoon, IconPin, IconReels, IconStory, IconTasbih } from '../../src/components/Icons';
import { colors, fonts, radius } from '../../src/theme';
import { useApp, useNow } from '../../src/context/AppContext';
import { formatCountdown, formatTime, getNextPrayer, getPrayerTimes, VAKIT_KEYS, VAKIT_NAMES } from '../../src/lib/prayerTimes';
import { formatHijriAr, ramazanDay, toHijri } from '../../src/lib/hijri';
import { duaForDate } from '../../src/data/dualar';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const FEATURES = [
  { href: '/kible', label: 'Kıble', Icon: IconCompass },
  { href: '/zikir', label: 'Zikirmatik', Icon: IconTasbih },
  { href: '/cuma', label: 'Cuma Story', Icon: IconStory },
  { href: '/reels', label: 'Reels', Icon: IconReels },
  { href: '/imsakiye', label: 'İmsakiye', Icon: IconMoon },
  { href: '/ayarlar', label: 'Hatırlatma', Icon: IconAlarm },
] as const;

export default function Home() {
  const { place } = useApp();
  const now = useNow(1000);
  const dayKey = now.toDateString();

  const times = useMemo(() => getPrayerTimes(now, place.lat, place.lng), [dayKey, place.lat, place.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  const next = getNextPrayer(now, place.lat, place.lng);
  const { dua } = useMemo(() => duaForDate(now), [dayKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const hijri = useMemo(() => formatHijriAr(toHijri(now)), [dayKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const rDay = ramazanDay(now);

  return (
    <Screen>
      <View style={st.top}>
        <View style={st.topLeft}>
          <Image source={require('../../assets/logo.png')} style={st.logo} accessibilityLabel="Kurandan.ai logosu" />
          <View style={{ flexShrink: 1 }}>
            <Text style={st.greet}>Selâmün aleyküm</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Konumu değiştir" onPress={() => router.push('/konum')} style={st.placeRow}>
              <Text style={st.place} numberOfLines={1}>{place.label}</Text>
              <IconPin size={16} />
            </Pressable>
          </View>
        </View>
        <RoundButton label="Bildirim ayarları" onPress={() => router.push('/ayarlar')}>
          <IconBell />
        </RoundButton>
      </View>

      <View style={st.hero}>
        <Svg width={160} height={160} viewBox="0 0 100 100" style={st.heroStar}>
          <G fill="none" stroke={colors.goldLight} strokeWidth={2}>
            <Rect x={22} y={22} width={56} height={56} />
            <Rect x={22} y={22} width={56} height={56} transform="rotate(45 50 50)" />
            <Circle cx={50} cy={50} r={14} />
          </G>
        </Svg>
        <View style={st.heroHead}>
          <View>
            <Text style={st.heroEyebrow}>{rDay ? `Ramazan ${rDay}. gün · sıradaki vakit` : 'Sıradaki vakit'}</Text>
            <Text style={st.heroName}>{VAKIT_NAMES[next.key]}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={st.heroDate}>{`${now.getDate()} ${AYLAR[now.getMonth()]} ${now.getFullYear()}`}</Text>
            <Text style={st.heroHijri}>{hijri}</Text>
          </View>
        </View>
        <View style={st.countRow}>
          <Text style={st.count}>{formatCountdown(next.time.getTime() - now.getTime())}</Text>
          <Text style={st.countSub}>kaldı · {formatTime(next.time)}</Text>
        </View>
        <View style={st.timesRow}>
          {VAKIT_KEYS.map((k) => {
            const active = k === next.key && times[k].getTime() === next.time.getTime();
            return (
              <View key={k} style={[st.timeCell, active && st.timeCellOn]}>
                <Text style={[st.timeLabel, active && { color: colors.green, fontFamily: fonts.bodySemi }]}>{VAKIT_NAMES[k]}</Text>
                <Text style={[st.timeVal, active && { color: colors.green, fontFamily: fonts.bodyBold }]}>{formatTime(times[k])}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <Link href="/dua" asChild>
        <Pressable accessibilityRole="link">
          <Card style={{ gap: 8 }}>
            <View style={st.rowBetween}>
              <Eyebrow>Günün duası</Eyebrow>
              <Text style={st.muted}>{dua.kaynak}</Text>
            </View>
            <Text style={st.duaAr} numberOfLines={2}>{dua.arabic}</Text>
            <Text style={st.duaTr} numberOfLines={2}>{dua.meal}</Text>
          </Card>
        </Pressable>
      </Link>

      <View style={st.grid}>
        {FEATURES.map(({ href, label, Icon }) => (
          <Link key={href} href={href} asChild>
            <Pressable accessibilityRole="link" style={st.tile}>
              <Icon size={26} />
              <Text style={st.tileLabel}>{label}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  logo: { width: 46, height: 44, resizeMode: 'contain' },
  greet: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 28 },
  place: { fontFamily: fonts.display, fontSize: 18, color: colors.green, flexShrink: 1 },
  hero: { backgroundColor: colors.green, borderRadius: radius.xl, padding: 20, gap: 14, overflow: 'hidden' },
  heroStar: { position: 'absolute', right: -40, top: -40, opacity: 0.18 },
  heroHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroEyebrow: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 0.9, textTransform: 'uppercase', color: colors.goldLight },
  heroName: { fontFamily: fonts.display, fontSize: 30, color: colors.paper },
  heroDate: { fontFamily: fonts.body, fontSize: 12, color: colors.mutedOnGreen },
  heroHijri: { fontFamily: fonts.arabic, fontSize: 16, color: colors.goldLight },
  countRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  count: { fontFamily: fonts.bodyBold, fontSize: 44, color: colors.paper, fontVariant: ['tabular-nums'], letterSpacing: -0.8 },
  countSub: { fontFamily: fonts.body, fontSize: 13, color: colors.mutedOnGreen },
  timesRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 14, padding: 6, gap: 4 },
  timeCell: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4, borderRadius: 8 },
  timeCellOn: { backgroundColor: colors.goldLight },
  timeLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.mutedOnGreen },
  timeVal: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.paper },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  muted: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  duaAr: { fontFamily: fonts.arabic, fontSize: 20, lineHeight: 34, color: colors.green, textAlign: 'right', writingDirection: 'rtl' },
  duaTr: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.inkSoft },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '31.5%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
  },
  tileLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.ink },
});
