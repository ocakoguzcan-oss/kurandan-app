// "Kilit ekranında dinleme" satın alma ekranı: telefon kilitliyken ve başka uygulamadayken
// Kur'an okunmaya devam eder, kilit ekranından durdurulup başlatılabilir. Tek seferlik ödeme.
import React from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { Text } from '../src/components/Text';
import { Button } from '../src/components/ui';
import { IconCheck } from '../src/components/Icons';
import { colors, fonts } from '../src/theme';
import { buy, restore, usePremium } from '../src/lib/premium';
import { t, tx } from '../src/i18n';

const MADDELER = [
  tx('Telefon kilitliyken de tilavet sayfa sayfa devam eder'),
  tx('Başka bir uygulamaya geçince okuma durmaz'),
  tx('Kilit ekranından durdurup yeniden başlatabilirsiniz'),
  tx('Tek seferlik ödeme; abonelik yok'),
];

export default function KilitEkrani() {
  const insets = useSafeAreaInsets();
  const p = usePremium();

  const onBuy = async () => {
    const r = await buy();
    if (r === 'ok') {
      Alert.alert(t('Teşekkürler!'), t('Artık ekran kilitliyken de Kur’an dinleyebilirsiniz.'));
      router.back();
    } else if (r === 'unavailable') {
      Alert.alert(t('Şu an satın alınamıyor'), t('Mağazaya bağlanılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.'));
    } else if (r === 'error') {
      Alert.alert(t('Satın alma tamamlanmadı'), t('Lütfen tekrar deneyin.'));
    }
  };

  const onRestore = async () => {
    const ok = await restore();
    Alert.alert(ok ? t('Geri yüklendi') : t('Satın alım bulunamadı'), ok ? t('Artık ekran kilitliyken de Kur’an dinleyebilirsiniz.') : t('Bu mağaza hesabıyla yapılmış bir satın alım bulunamadı.'));
    if (ok) router.back();
  };

  return (
    <View style={[st.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, gap: 18, alignItems: 'center' }}>
        <View style={st.phone}>
          <Svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke={colors.goldLight} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <Rect x={5} y={11} width={14} height={10} rx={2} />
            <Path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </Svg>
          <Text style={st.ar}>﴿ وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا ﴾</Text>
        </View>
        <Text style={st.h1}>{t('Ekran kilitliyken Kur’an dinleyin')}</Text>
        <Text style={st.lead}>{t('Telefonu cebinize koyun, ekranı kapatın; Husarî’nin tilaveti kaldığınız yerden devam etsin.')}</Text>
        <View style={{ gap: 12, alignSelf: 'stretch' }}>
          {MADDELER.map((m) => (
            <View key={m} style={st.li}>
              <View style={st.tick}>
                <IconCheck size={16} color={colors.paper} strokeWidth={3} />
              </View>
              <Text style={st.liText}>{t(m)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 24, gap: 8 }}>
        {p.owned ? (
          <View style={st.owned}>
            <IconCheck size={20} color={colors.green} strokeWidth={3} />
            <Text style={st.ownedText}>{t('Satın alındı · kilit ekranında dinleme açık')}</Text>
          </View>
        ) : (
          <Button
            label={p.busy ? t('Bekleyin…') : p.price ? t('{fiyat} · Satın al', { fiyat: p.price }) : t('Satın al')}
            disabled={p.busy}
            onPress={onBuy}
          />
        )}
        {!p.owned && <Button variant="text" label={t('Satın alımları geri yükle')} disabled={p.busy} onPress={onRestore} />}
        <Button variant="text" label={p.owned ? t('Kapat') : t('Şimdi değil')} onPress={() => router.back()} />
        {!p.owned && <Text style={st.fine}>{t('Ödeme App Store ya da Google Play hesabınızdan bir kez alınır. Uygulamanın diğer bütün bölümleri ücretsizdir.')}</Text>}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, gap: 12 },
  phone: { width: '100%', borderRadius: 26, backgroundColor: colors.green, paddingVertical: 26, alignItems: 'center', gap: 12 },
  ar: { fontFamily: fonts.arabic, fontSize: 24, color: colors.paper, writingDirection: 'rtl' },
  h1: { fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 32, color: colors.green, textAlign: 'center' },
  lead: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.inkSoft, textAlign: 'center' },
  li: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tick: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  liText: { flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.ink },
  owned: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 56, borderRadius: 16, backgroundColor: colors.greenTint },
  ownedText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.green },
  fine: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted, textAlign: 'center' },
});
