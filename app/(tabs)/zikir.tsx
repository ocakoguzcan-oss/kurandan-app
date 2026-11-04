import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/Text';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { Screen, Card, Chip, RoundButton } from '../../src/components/ui';
import { IconReset } from '../../src/components/Icons';
import { colors, fonts } from '../../src/theme';
import { ZIKIRLER } from '../../src/data/zikirler';
import { load, save, KEYS } from '../../src/lib/storage';
import { t } from '../../src/i18n';

type ZikirState = { sel: string; counts: Record<string, number>; day: string; total: number; rounds: number };

const today = () => new Date().toDateString();
const initial: ZikirState = { sel: ZIKIRLER[0].id, counts: {}, day: today(), total: 0, rounds: 0 };
const R = 128;
const CIRC = 2 * Math.PI * R;

export default function Zikirmatik() {
  const [st, setSt] = useState<ZikirState>(initial);

  useEffect(() => {
    load<ZikirState>(KEYS.zikir, initial).then((s) => {
      // Günlük toplam her gün sıfırlanır, devam eden sayım korunur.
      setSt(s.day === today() ? s : { ...s, day: today(), total: 0, rounds: 0 });
    });
  }, []);

  const update = (next: ZikirState) => {
    setSt(next);
    save(KEYS.zikir, next);
  };

  const zikir = ZIKIRLER.find((z) => z.id === st.sel) ?? ZIKIRLER[0];
  const count = st.counts[zikir.id] ?? 0;

  const tap = () => {
    const n = count + 1;
    if (n >= zikir.target) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      update({ ...st, counts: { ...st.counts, [zikir.id]: 0 }, total: st.total + 1, rounds: st.rounds + 1 });
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      update({ ...st, counts: { ...st.counts, [zikir.id]: n }, total: st.total + 1 });
    }
  };

  const reset = () =>
    Alert.alert(t('Sayaç sıfırlansın mı?'), t("{zikir} sayımı 0'a dönecek.", { zikir: t(zikir.name) }), [
      { text: t('Vazgeç'), style: 'cancel' },
      { text: t('Sıfırla'), style: 'destructive', onPress: () => update({ ...st, counts: { ...st.counts, [zikir.id]: 0 } }) },
    ]);

  return (
    <Screen
      title={t('Zikirmatik')}
      back={false}
      scroll={false}
      contentStyle={{ paddingHorizontal: 20, gap: 18 }}
      right={
        <RoundButton label={t('Sayacı sıfırla')} onPress={reset}>
          <IconReset />
        </RoundButton>
      }
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
        {ZIKIRLER.map((z) => (
          <Chip key={z.id} label={t(z.name)} selected={z.id === st.sel} onPress={() => update({ ...st, sel: z.id })} />
        ))}
      </ScrollView>

      <View style={s.center}>
        <Text style={s.ar}>{zikir.arabic}</Text>
        <Text style={s.meaning}>{t(zikir.meaning)}</Text>
      </View>

      <View style={[s.center, { flex: 1, justifyContent: 'center' }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('{zikir} say. Şu an {n}', { zikir: t(zikir.name), n: count })} onPress={tap} style={s.counter}>
          <Svg width={280} height={280} viewBox="0 0 280 280" style={StyleSheet.absoluteFill}>
            <Circle cx={140} cy={140} r={R} fill={colors.card} stroke={colors.cardBorder} strokeWidth={10} />
            <Circle
              cx={140}
              cy={140}
              r={R}
              fill="none"
              stroke={colors.gold}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={`${CIRC}`}
              strokeDashoffset={CIRC * (1 - count / zikir.target)}
              transform="rotate(-90 140 140)"
            />
            <Circle cx={140} cy={140} r={100} fill={colors.green} />
          </Svg>
          <Text style={s.count}>{count}</Text>
          <Text style={s.target}>/ {zikir.target}</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Card style={s.stat}>
          <Text style={s.statLabel}>{t('Bugün toplam')}</Text>
          <Text style={s.statVal}>{st.total}</Text>
        </Card>
        <Card style={s.stat}>
          <Text style={s.statLabel}>{t('Tamamlanan tur')}</Text>
          <Text style={s.statVal}>{st.rounds}</Text>
        </Card>
      </View>
      <Text style={s.hint}>{t('Daireye dokunun · hedefe ulaşınca titreşir')}</Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', gap: 2 },
  ar: { fontFamily: fonts.arabic, fontSize: 30, color: colors.green, writingDirection: 'rtl' },
  meaning: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center' },
  counter: { width: 280, height: 280, alignItems: 'center', justifyContent: 'center' },
  count: { fontFamily: fonts.bodyBold, fontSize: 64, color: colors.paper, fontVariant: ['tabular-nums'] },
  target: { fontFamily: fonts.body, fontSize: 14, color: colors.goldLight },
  stat: { flex: 1, paddingVertical: 12, gap: 2 },
  statLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  statVal: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.green },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textAlign: 'center' },
});
