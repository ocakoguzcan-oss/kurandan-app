// Ezan bildirimine dokunulunca açılan ekran: ezanın sözleri ve anlamı (ses bildirimde çalar).
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '../src/components/Text';
import { Screen, Card } from '../src/components/ui';
import { colors, fonts } from '../src/theme';
import { VAKIT_NAMES, VakitKey } from '../src/lib/prayerTimes';
import { t, tx, isRTL } from '../src/i18n';

const SOZLER: { ar: string; tr: string; meal: string; tekrar: number; sabah?: boolean }[] = [
  { ar: 'اَللّٰهُ أَكْبَرُ', tr: 'Allâhu ekber', meal: tx('Allah en büyüktür'), tekrar: 4 },
  { ar: 'أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللّٰهُ', tr: 'Eşhedü en lâ ilâhe illallâh', meal: tx('Şahitlik ederim ki Allah’tan başka ilah yoktur'), tekrar: 2 },
  { ar: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللّٰهِ', tr: 'Eşhedü enne Muhammeden Resûlullâh', meal: tx('Şahitlik ederim ki Muhammed Allah’ın elçisidir'), tekrar: 2 },
  { ar: 'حَيَّ عَلَى الصَّلَاةِ', tr: 'Hayye ale’s-salâh', meal: tx('Haydi namaza'), tekrar: 2 },
  { ar: 'حَيَّ عَلَى الْفَلَاحِ', tr: 'Hayye ale’l-felâh', meal: tx('Haydi kurtuluşa'), tekrar: 2 },
  { ar: 'اَلصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ', tr: 'Es-salâtü hayrun mine’n-nevm', meal: tx('Namaz uykudan hayırlıdır (sabah ezanında)'), tekrar: 2, sabah: true },
  { ar: 'اَللّٰهُ أَكْبَرُ', tr: 'Allâhu ekber', meal: tx('Allah en büyüktür'), tekrar: 2 },
  { ar: 'لَا إِلٰهَ إِلَّا اللّٰهُ', tr: 'Lâ ilâhe illallâh', meal: tx('Allah’tan başka ilah yoktur'), tekrar: 1 },
];

export default function EzanScreen() {
  const { vakit, cuma } = useLocalSearchParams<{ vakit?: string; cuma?: string }>();
  // Bildirim vakit anahtarını (imsak, ogle…) gönderir; eski bildirimler Türkçe adı gönderiyordu.
  const key = (Object.keys(VAKIT_NAMES) as VakitKey[]).find((k) => k === vakit || VAKIT_NAMES[k] === vakit);
  const isSabah = key === 'imsak';
  const isCuma = cuma === '1' && key === 'ogle';
  const title = isCuma ? t('Hayırlı Cumalar') : key ? t('{vakit} ezanı', { vakit: t(VAKIT_NAMES[key]) }) : t('Ezan');

  return (
    <Screen title={title}>
      {SOZLER.filter((s) => !s.sabah || isSabah).map((s, i) => (
        <Card key={i} style={{ gap: 4 }}>
          <View style={st.row}>
            <Text style={st.times}>{`${s.tekrar}×`}</Text>
            <Text style={st.ar}>{s.ar}</Text>
          </View>
          {!isRTL() && <Text style={st.tr}>{s.tr}</Text>}
          {!isRTL() && <Text style={st.meal}>{t(s.meal)}</Text>}
        </Card>
      ))}
    </Screen>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  times: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.goldText },
  ar: { flex: 1, fontFamily: fonts.arabic, fontSize: 24, color: colors.green, textAlign: 'right', writingDirection: 'rtl' },
  tr: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink },
  meal: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
});
