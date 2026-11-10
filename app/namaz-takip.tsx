import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Text } from '../src/components/Text';
import { Screen, Card, Eyebrow } from '../src/components/ui';
import { IconCheck } from '../src/components/Icons';
import { colors, fonts } from '../src/theme';
import { countDay, dayKey, FARZLAR, GUNLUK_VAKITLER, toggleVakit, useNamaz } from '../src/lib/namazTakip';
import { t } from '../src/i18n';
import { formatWeekday } from '../src/i18n/format';


export default function NamazTakip() {
  const s = useNamaz();
  const today = new Date();
  const todayKey = dayKey(today);
  const done = s.days[todayKey] ?? {};
  const week = Array.from({ length: 7 }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6 + i));
  const weekTotal = week.reduce((n, d) => n + countDay(s, dayKey(d)), 0);
  const kazaTotal = Object.values(s.kaza).reduce((a, b) => a + b, 0);

  return (
    <Screen title={t('Namaz Takibi')}>
      <Eyebrow>{t('Bugün kıldıklarım')}</Eyebrow>
      <Card style={{ padding: 0, paddingHorizontal: 14 }}>
        {FARZLAR.map((f, i) => {
          const on = !!done[f.key];
          return (
            <Pressable
              key={f.key}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={t('{vakit} namazı', { vakit: t(f.name) })}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                toggleVakit(todayKey, f.key);
              }}
              style={[st.row, i < FARZLAR.length - 1 && st.divider]}
            >
              <Text style={st.name}>{t(f.name)}</Text>
              <View style={[st.box, on ? st.boxOn : st.boxOff]}>{on && <IconCheck size={22} color={colors.onGreen} strokeWidth={3} />}</View>
            </Pressable>
          );
        })}
      </Card>

      <Eyebrow>{t('Son 7 gün')}</Eyebrow>
      <Card style={{ gap: 12 }}>
        <View style={st.weekRow}>
          {week.map((d) => {
            const n = countDay(s, dayKey(d));
            const full = n === GUNLUK_VAKITLER.length;
            return (
              <View key={dayKey(d)} style={st.dayCol}>
                <View style={st.barBg}>
                  <View style={[st.bar, { height: `${(n / GUNLUK_VAKITLER.length) * 100}%`, backgroundColor: full ? colors.green : colors.gold }]} />
                </View>
                <Text style={st.dayN}>{n}</Text>
                <Text style={[st.dayL, dayKey(d) === todayKey && { color: colors.greenText, fontFamily: fonts.bodyBold }]}>{formatWeekday(d, true)}</Text>
              </View>
            );
          })}
        </View>
        <Text style={st.muted}>{t('Bu hafta {a} / {b} vakit kılındı', { a: weekTotal, b: 35 })}</Text>
      </Card>

      <Pressable accessibilityRole="link" onPress={() => router.push('/kaza')}>
        <Card style={st.kazaCard}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={st.name}>{t('Kaza Namazı')}</Text>
            <Text style={st.mutedLeft}>{t('Kalan borç: {n} · Kılınan: {k}', { n: kazaTotal, k: s.kilinan ?? 0 })}</Text>
          </View>
          <Text style={st.more}>{t('Aç ›')}</Text>
        </Card>
      </Pressable>
    </Screen>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 60 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  name: { fontFamily: fonts.bodySemi, fontSize: 17, color: colors.ink },
  box: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.green },
  boxOff: { borderWidth: 2, borderColor: colors.buttonBorder, backgroundColor: colors.paper },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 4, flex: 1 },
  barBg: { width: 18, height: 70, borderRadius: 9, backgroundColor: colors.divider, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: 18, borderRadius: 9 },
  dayN: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.ink },
  dayL: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  muted: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'center' },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.buttonBorder, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  cBtnText: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.greenText },
  kazaCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mutedLeft: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  more: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.greenText },
  cVal: { minWidth: 36, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink },
});
