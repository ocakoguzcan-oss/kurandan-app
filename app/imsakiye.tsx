import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Screen, Chip, Button } from '../src/components/ui';
import { IlPicker } from '../src/components/IlPicker';
import { colors, fonts, radius } from '../src/theme';
import { ilByPlaka, useApp, useNow } from '../src/context/AppContext';
import { ILLER, Il } from '../src/data/iller';
import { currentOrNextRamazan, parseLocalDate, ramazanDay } from '../src/lib/hijri';
import { formatCountdown, formatTime, getPrayerTimes } from '../src/lib/prayerTimes';

const AYLAR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const GUNLER = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const POPULER = [34, 6, 35, 16, 42, 1, 7, 21]; // hızlı seçim çipleri

export default function Imsakiye() {
  const { place } = useApp();
  const insets = useSafeAreaInsets();
  const now = useNow(1000);
  const [il, setIl] = useState<Il>(ilByPlaka(place.ilPlaka));
  const [picker, setPicker] = useState(false);

  const ramazan = currentOrNextRamazan(now);
  const start = parseLocalDate(ramazan.ilkOruc);
  const rows = useMemo(
    () =>
      Array.from({ length: ramazan.gun }).map((_, i) => {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const t = getPrayerTimes(d, il.lat, il.lng);
        return { i, d, imsak: t.imsak, iftar: t.aksam };
      }),
    [il, ramazan.ilkOruc, ramazan.gun] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const rDay = ramazanDay(now);
  const todayRow = rDay ? rows[rDay - 1] : null;
  const chips = POPULER.includes(il.plaka) ? POPULER : [il.plaka, ...POPULER.slice(0, -1)];

  let heroLabel: string;
  let heroCount: string;
  if (todayRow) {
    const beforeImsak = now.getTime() < todayRow.imsak.getTime();
    const target = beforeImsak ? todayRow.imsak : todayRow.iftar;
    heroLabel = beforeImsak ? `Sahurun bitmesine · ${il.ad}` : `İftara kalan · ${il.ad}`;
    heroCount = now.getTime() < target.getTime() ? formatCountdown(target.getTime() - now.getTime()) : 'Hayırlı iftarlar';
  } else {
    const days = Math.ceil((start.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
    heroLabel = `Ramazan ${ramazan.hicriYil} · ${il.ad}`;
    heroCount = days > 0 ? `${days} gün kaldı` : 'Hayırlı bayramlar';
  }

  return (
    <Screen title="Ramazan İmsakiyesi">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {chips.map((p) => {
          const c = ILLER.find((x) => x.plaka === p)!;
          return <Chip key={p} label={c.ad} selected={il.plaka === p} onPress={() => setIl(c)} />;
        })}
        <Chip label="Tüm iller ›" selected={false} onPress={() => setPicker(true)} />
      </ScrollView>

      <View style={st.hero}>
        <Svg width={120} height={120} viewBox="0 0 24 24" style={st.moon}>
          <Path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill={colors.goldLight} />
        </Svg>
        <View style={st.heroHead}>
          <Text style={st.heroEyebrow}>{heroLabel}</Text>
          <Text style={st.heroSmall}>{rDay ? `Ramazan ${rDay}. gün` : `İlk oruç ${start.getDate()} ${AYLAR[start.getMonth()]}`}</Text>
        </View>
        <Text style={st.heroCount}>{heroCount}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={st.heroBox}>
            <Text style={st.heroBoxLabel}>İmsak (sahur sonu)</Text>
            <Text style={st.heroBoxVal}>{formatTime((todayRow ?? rows[0]).imsak)}</Text>
          </View>
          <View style={st.heroBox}>
            <Text style={st.heroBoxLabel}>İftar (akşam ezanı)</Text>
            <Text style={st.heroBoxVal}>{formatTime((todayRow ?? rows[0]).iftar)}</Text>
          </View>
        </View>
      </View>

      <View style={st.table}>
        <View style={[st.tr, st.th]}>
          <Text style={[st.c1, st.thText]}>Gün</Text>
          <Text style={[st.c2, st.thText]}>İmsak</Text>
          <Text style={[st.c2, st.thText]}>İftar</Text>
        </View>
        {rows.map((r) => {
          const today = rDay === r.i + 1;
          return (
            <View key={r.i} style={[st.tr, st.td, today && { backgroundColor: colors.greenTint }]}>
              <Text style={[st.c1, st.tdText, today && st.todayText]}>
                {`${r.i + 1}. gün · ${r.d.getDate()} ${AYLAR[r.d.getMonth()]} ${GUNLER[r.d.getDay()]}`}
              </Text>
              <Text style={[st.c2, st.tdText, today && st.todayText]}>{formatTime(r.imsak)}</Text>
              <Text style={[st.c2, st.tdText, { fontFamily: fonts.bodySemi }, today && st.todayText]}>{formatTime(r.iftar)}</Text>
            </View>
          );
        })}
      </View>
      <Text style={st.note}>Saatler Diyanet yöntemiyle il merkezine göre hesaplanır; ilçelerde 1–2 dakika fark olabilir.</Text>

      <Modal visible={picker} animationType="slide" onRequestClose={() => setPicker(false)}>
        <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top + 12 }}>
          <IlPicker
            selected={il.plaka}
            onSelect={(x) => {
              setIl(x);
              setPicker(false);
            }}
            header={
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.green }}>İl seçin</Text>
                <Button variant="text" label="Kapat" onPress={() => setPicker(false)} />
              </View>
            }
          />
        </View>
      </Modal>
    </Screen>
  );
}

const st = StyleSheet.create({
  hero: { backgroundColor: colors.green, borderRadius: radius.xl - 2, padding: 18, gap: 12, overflow: 'hidden' },
  moon: { position: 'absolute', right: -16, top: -16, opacity: 0.16 },
  heroHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  heroEyebrow: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 0.9, textTransform: 'uppercase', color: colors.goldLight, flexShrink: 1 },
  heroSmall: { fontFamily: fonts.body, fontSize: 12, color: colors.mutedOnGreen },
  heroCount: { fontFamily: fonts.bodyBold, fontSize: 40, color: colors.paper, fontVariant: ['tabular-nums'] },
  heroBox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, gap: 2 },
  heroBoxLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.mutedOnGreen },
  heroBoxVal: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.paper },
  table: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.md + 2, overflow: 'hidden' },
  tr: { flexDirection: 'row', paddingHorizontal: 14 },
  th: { backgroundColor: '#EFE4CB', paddingVertical: 10 },
  td: { paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.divider },
  c1: { flex: 1.6 },
  c2: { flex: 1, textAlign: 'right' },
  thText: { fontFamily: fonts.bodyBold, fontSize: 12, color: '#5C4110' },
  tdText: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, fontVariant: ['tabular-nums'] },
  todayText: { color: colors.green, fontFamily: fonts.bodyBold },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: 'center' },
});
