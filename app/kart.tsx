// Açılan kart: ayet, hadis ya da dua; kaynak ve kısa tefekkür notu. Kart Sandığı'na kaydet,
// Instagram Story'de ya da metin olarak paylaş.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Share, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '../src/components/Text';
import { Button, Screen, Card } from '../src/components/ui';
import { IconBookmark, IconInstagram, IconShare, StarOrnament } from '../src/components/Icons';
import { colors, fonts, radius } from '../src/theme';
import { kartById, KartTur, sandigaEkle, useKartlar } from '../src/lib/kartlar';
import { isRTL, t } from '../src/i18n';

const TUR_AD: Record<KartTur, string> = { ayet: 'Ayet', hadis: 'Hadis', dua: 'Dua' };

export default function KartEkrani() {
  const p = useLocalSearchParams<{ id?: string; yeni?: string }>();
  const kart = kartById(p.id);
  const s = useKartlar();
  const kayitli = !!kart && s.sandik.includes(kart.id);

  const gir = useRef(new Animated.Value(p.yeni === '1' ? 0 : 1)).current;
  useEffect(() => {
    Animated.timing(gir, { toValue: 1, duration: 520, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
  }, [gir]);

  if (!kart) {
    return (
      <Screen title={t('Günün Kartı')}>
        <Text style={st.not}>{t('Kart bulunamadı.')}</Text>
      </Screen>
    );
  }

  const metinPaylas = () =>
    Share.share({ message: `${kart.arabic && !isRTL() ? `${kart.arabic}\n\n` : ''}“${kart.metin}”\n(${kart.kaynak})\n\nKurandan.ai` }).catch(() => {});

  return (
    <Screen title={t('Günün Kartı')}>
      <Animated.View style={{ opacity: gir, transform: [{ scale: gir.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }}>
        <Card style={st.kart}>
          <View style={st.rozet}>
            <Text style={st.rozetYazi}>{t(TUR_AD[kart.tur])}</Text>
          </View>
          <StarOrnament size={30} />
          {kart.arabic ? <Text style={st.arapca}>{kart.arabic}</Text> : null}
          <Text style={st.metin}>{`“${kart.metin}”`}</Text>
          <Text style={st.kaynak}>{`— ${kart.kaynak}`}</Text>
          {kart.not ? (
            <View style={st.tefekkur}>
              <Text style={st.tefBaslik}>{kart.tur === 'dua' ? t('Ne için okunur') : t('Tefekkür')}</Text>
              <Text style={st.tefMetin}>{kart.not}</Text>
            </View>
          ) : null}
        </Card>
      </Animated.View>

      <View style={{ gap: 10 }}>
        <Button
          label={kayitli ? t('Kart Sandığında ✓') : t('Kart Sandığına kaydet')}
          variant={kayitli ? 'secondary' : 'primary'}
          icon={<IconBookmark color={kayitli ? colors.greenText : colors.onGreen} />}
          onPress={() => sandigaEkle(kart.id, !kayitli)}
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button style={{ flex: 1 }} variant="secondary" label={t('Story’de paylaş')} icon={<IconInstagram color={colors.greenText} />} onPress={() => router.push({ pathname: '/cuma', params: { kart: kart.id } })} />
          <Button style={{ flex: 1 }} variant="secondary" label={t('Metin paylaş')} icon={<IconShare />} onPress={metinPaylas} />
        </View>
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  kart: { alignItems: 'center', gap: 10, paddingVertical: 24, borderColor: colors.gold, borderWidth: 1.5, borderRadius: radius.xl },
  rozet: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.greenTint },
  rozetYazi: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, color: colors.greenText, textTransform: 'uppercase' },
  arapca: { fontFamily: fonts.arabic, fontSize: 24, lineHeight: 44, color: colors.ink, textAlign: 'center', writingDirection: 'rtl' },
  metin: { fontFamily: fonts.displayItalic, fontSize: 19, lineHeight: 28, color: colors.ink, textAlign: 'center' },
  kaynak: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.goldText },
  tefekkur: { alignSelf: 'stretch', marginTop: 8, padding: 14, borderRadius: radius.md, backgroundColor: colors.creamBox, gap: 4 },
  tefBaslik: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, color: colors.goldText, textTransform: 'uppercase' },
  tefMetin: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.inkSoft },
  not: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: 'center' },
});
