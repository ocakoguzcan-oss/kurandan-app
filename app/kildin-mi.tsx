// "Namazını kıldın mı?" bildirimine dokununca açılan soru ekranı.
// Vakit sürerken: Kıldım / Henüz kılmadım (kazaya eklenmez). Vakit çıkarken ya da geçmiş bir gün için:
// Kıldım / Kılamadım, kazaya ekle.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Text } from '../src/components/Text';
import { Button, Screen, Card } from '../src/components/ui';
import { colors, fonts } from '../src/theme';
import { dayKey, FARZLAR, FarzKey, isaretle, kazayaEklendi, kilmadim, namazGunu, useNamaz } from '../src/lib/namazTakip';
import { useApp } from '../src/context/AppContext';
import { getPrayerTimes } from '../src/lib/prayerTimes';
import { formatDay } from '../src/i18n/format';
import { t } from '../src/i18n';

export default function KildinMi() {
  const p = useLocalSearchParams<{ gun?: string; farz?: string; son?: string }>();
  const s = useNamaz();
  const { place, calc } = useApp();
  const farz = FARZLAR.find((f) => f.key === p.farz);
  const gun = typeof p.gun === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.gun) ? p.gun : dayKey(new Date());
  const kapat = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!farz) {
    return (
      <Screen title={t('Namaz Takibi')}>
        <Button label={t('Namaz Takibi’ni aç')} onPress={() => router.replace('/namaz-takip')} />
      </Screen>
    );
  }
  const key = farz.key as FarzKey;
  const [y, m, d] = gun.split('-').map(Number);
  // Namaz günü imsakla değişir: gece yarısından sonra dünün yatsısı hâlâ vaktindedir
  const bugun = dayKey(namazGunu(new Date(), getPrayerTimes(new Date(), place.lat, place.lng, calc).imsak));
  const gecmis = gun < bugun || p.son === '1';
  const kildi = !!s.days[gun]?.[key];
  const kazada = kazayaEklendi(s, gun, key);
  const ad = t(farz.name);

  return (
    <Screen title={t('Namaz Takibi')}>
      <Card style={st.card}>
        <Text style={st.date}>{formatDay(new Date(y, m - 1, d))}</Text>
        <Text style={st.q}>{t('{vakit} namazını kıldınız mı?', { vakit: ad })}</Text>
        {kildi ? (
          <Text style={st.state}>{t('Kılındı olarak işaretli ✓')}</Text>
        ) : kazada ? (
          <Text style={st.state}>{t('Kaza borcuna eklendi')}</Text>
        ) : null}
      </Card>

      <View style={{ gap: 10 }}>
        <Button
          label={t('Kıldım ✓')}
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            isaretle(gun, key, true);
            kapat();
          }}
        />
        {gecmis ? (
          <Button
            label={t('Kılamadım, kazaya ekle')}
            variant="secondary"
            onPress={() => {
              kilmadim(gun, key);
              kapat();
            }}
          />
        ) : (
          <Button label={t('Henüz kılmadım')} variant="secondary" onPress={kapat} />
        )}
        <Button label={t('Namaz Takibi’ni aç')} variant="text" onPress={() => router.replace('/namaz-takip')} />
      </View>
      {!gecmis && <Text style={st.note}>{t('Vakit sürerken kaza borcuna bir şey eklenmez.')}</Text>}
    </Screen>
  );
}

const st = StyleSheet.create({
  card: { gap: 8, alignItems: 'center', paddingVertical: 24 },
  date: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  q: { fontFamily: fonts.display, fontSize: 24, lineHeight: 32, color: colors.ink, textAlign: 'center' },
  state: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.greenText },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: 'center' },
});
