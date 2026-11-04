import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { Screen, Card } from '../src/components/ui';
import { IconMoon, StarOrnament } from '../src/components/Icons';
import { colors, fonts } from '../src/theme';
import { upcomingDiniGunler } from '../src/data/diniGunler';
import { useApp } from '../src/context/AppContext';
import { t } from '../src/i18n';
import { formatDay, formatWeekday } from '../src/i18n/format';

type G = ReturnType<typeof upcomingDiniGunler>[number];
const dateLine = (g: G) => {
  const base = `${formatDay(g.day)}, ${formatWeekday(g.day)}`;
  return g.kind === 'kandil' ? t('{tarih} gecesi', { tarih: base }) : base;
};

export default function DiniGunler() {
  const list = upcomingDiniGunler();
  const { reminders } = useApp();
  const next = list[0];

  return (
    <Screen title={t('Dini Günler')}>
      {next && (
        <View style={st.hero}>
          <Text style={st.heroEyebrow}>{t('Sıradaki')}</Text>
          <Text style={st.heroName}>{t(next.name)}</Text>
          <Text style={st.heroDays}>{next.daysLeft === 0 ? (next.kind === 'kandil' ? t('Bu gece') : t('Bugün')) : t('{n} gün kaldı', { n: next.daysLeft })}</Text>
          <Text style={st.heroDate}>{dateLine(next)}</Text>
        </View>
      )}
      {list.slice(1).map((g) => (
        <Card key={g.date + g.name} style={st.row}>
          <View style={st.icon}>{g.kind === 'kandil' ? <IconMoon size={22} /> : <StarOrnament size={26} />}</View>
          <View style={{ flex: 1 }}>
            <Text style={st.name}>{t(g.name)}</Text>
            <Text style={st.date}>
              {`${dateLine(g)}${g.note ? ` · ${t(g.note)}` : ''}`}
            </Text>
          </View>
          <Text style={st.days}>{t('{n} gün', { n: g.daysLeft })}</Text>
        </Card>
      ))}
      <Text style={st.note}>
        {reminders.diniGunler
          ? t('Bir gün önce akşam 20:00’de ve o gün 10:00’da hatırlatılır. Ayarlar sekmesinden kapatabilirsiniz.')
          : t('Hatırlatmalar kapalı. Ayarlar sekmesinden açabilirsiniz.')}
      </Text>
      <Text style={st.note}>{t('Tarihler Diyanet İşleri Başkanlığı takvimine göredir.')}</Text>
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
