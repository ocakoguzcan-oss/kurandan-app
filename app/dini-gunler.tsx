import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { Screen, Card } from '../src/components/ui';
import { IconMoon, StarOrnament } from '../src/components/Icons';
import { colors, fonts } from '../src/theme';
import { upcomingDiniGunler } from '../src/data/diniGunler';
import { useApp } from '../src/context/AppContext';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const GUNLER = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export default function DiniGunler() {
  const list = upcomingDiniGunler();
  const { reminders } = useApp();
  const next = list[0];

  return (
    <Screen title="Dini Günler">
      {next && (
        <View style={st.hero}>
          <Text style={st.heroEyebrow}>Sıradaki</Text>
          <Text style={st.heroName}>{next.name}</Text>
          <Text style={st.heroDays}>{next.daysLeft === 0 ? (next.kind === 'kandil' ? 'Bu gece' : 'Bugün') : `${next.daysLeft} gün kaldı`}</Text>
          <Text style={st.heroDate}>{`${next.day.getDate()} ${AYLAR[next.day.getMonth()]} ${next.day.getFullYear()}, ${GUNLER[next.day.getDay()]}${next.kind === 'kandil' ? ' gecesi' : ''}`}</Text>
        </View>
      )}
      {list.slice(1).map((g) => (
        <Card key={g.date + g.name} style={st.row}>
          <View style={st.icon}>{g.kind === 'kandil' ? <IconMoon size={22} /> : <StarOrnament size={26} />}</View>
          <View style={{ flex: 1 }}>
            <Text style={st.name}>{g.name}</Text>
            <Text style={st.date}>
              {`${g.day.getDate()} ${AYLAR[g.day.getMonth()]} ${g.day.getFullYear()}, ${GUNLER[g.day.getDay()]}${g.kind === 'kandil' ? ' gecesi' : ''}${g.note ? ` · ${g.note}` : ''}`}
            </Text>
          </View>
          <Text style={st.days}>{`${g.daysLeft} gün`}</Text>
        </Card>
      ))}
      <Text style={st.note}>
        {reminders.diniGunler
          ? 'Bir gün önce akşam 20:00’de ve o gün 10:00’da hatırlatılır. Ayarlar sekmesinden kapatabilirsiniz.'
          : 'Hatırlatmalar kapalı. Ayarlar sekmesinden açabilirsiniz.'}
      </Text>
      <Text style={st.note}>Tarihler Diyanet İşleri Başkanlığı takvimine göredir.</Text>
    </Screen>
  );
}

const st = StyleSheet.create({
  hero: { backgroundColor: colors.green, borderRadius: 22, padding: 20, gap: 4 },
  heroEyebrow: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 0.9, textTransform: 'uppercase', color: colors.goldLight },
  heroName: { fontFamily: fonts.display, fontSize: 26, color: colors.paper },
  heroDays: { fontFamily: fonts.bodyBold, fontSize: 34, color: colors.paper },
  heroDate: { fontFamily: fonts.body, fontSize: 14, color: colors.mutedOnGreen },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.greenTint, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink },
  date: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
  days: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.goldText },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: 'center' },
});
