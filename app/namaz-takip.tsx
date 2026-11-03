import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '../src/components/Text';
import { Screen, Card, Eyebrow } from '../src/components/ui';
import { IconCheck } from '../src/components/Icons';
import { colors, fonts } from '../src/theme';
import { changeKaza, countDay, dayKey, FARZLAR, GUNLUK_VAKITLER, toggleVakit, useNamaz } from '../src/lib/namazTakip';

const GUN_KISA = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export default function NamazTakip() {
  const s = useNamaz();
  const today = new Date();
  const todayKey = dayKey(today);
  const done = s.days[todayKey] ?? {};
  const week = Array.from({ length: 7 }, (_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6 + i));
  const weekTotal = week.reduce((n, d) => n + countDay(s, dayKey(d)), 0);
  const kazaTotal = Object.values(s.kaza).reduce((a, b) => a + b, 0);

  return (
    <Screen title="Namaz Takibi">
      <Eyebrow>Bugün kıldıklarım</Eyebrow>
      <Card style={{ padding: 0, paddingHorizontal: 14 }}>
        {FARZLAR.map((f, i) => {
          const on = !!done[f.key];
          return (
            <Pressable
              key={f.key}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${f.name} namazı`}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                toggleVakit(todayKey, f.key);
              }}
              style={[st.row, i < FARZLAR.length - 1 && st.divider]}
            >
              <Text style={st.name}>{f.name}</Text>
              <View style={[st.box, on ? st.boxOn : st.boxOff]}>{on && <IconCheck size={22} color={colors.paper} strokeWidth={3} />}</View>
            </Pressable>
          );
        })}
      </Card>

      <Eyebrow>Son 7 gün</Eyebrow>
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
                <Text style={[st.dayL, dayKey(d) === todayKey && { color: colors.green, fontFamily: fonts.bodyBold }]}>{GUN_KISA[d.getDay()]}</Text>
              </View>
            );
          })}
        </View>
        <Text style={st.muted}>{`Bu hafta ${weekTotal} / 35 vakit kılındı`}</Text>
      </Card>

      <Eyebrow>Kaza namazlarım</Eyebrow>
      <Card style={{ padding: 0, paddingHorizontal: 14 }}>
        {FARZLAR.map((f, i) => (
          <View key={f.key} style={[st.row, i < FARZLAR.length - 1 && st.divider]}>
            <Text style={st.name}>{f.name}</Text>
            <View style={st.counter}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${f.name} kazası bir azalt (kıldım)`} onPress={() => changeKaza(f.key, -1)} style={st.cBtn}>
                <Text style={st.cBtnText}>−</Text>
              </Pressable>
              <Text style={st.cVal}>{s.kaza[f.key] ?? 0}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`${f.name} kazası bir artır`} onPress={() => changeKaza(f.key, 1)} style={st.cBtn}>
                <Text style={st.cBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </Card>
      <Pressable
        accessibilityRole="button"
        onPress={() => Alert.alert('Kaza namazı', 'Borcunuzu + ile ekleyin. Her kıldığınız kaza namazında − ile bir azaltın.')}
      >
        <Text style={st.muted}>{`Toplam kaza borcu: ${kazaTotal} · Nasıl kullanılır?`}</Text>
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
  cBtnText: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.green },
  cVal: { minWidth: 36, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink },
});
