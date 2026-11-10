// Kaza namazı takibi: borcu yıl/ay/gün ile toplu ekleme, her vakit için "Kıldım" ile düşme,
// kılınan toplam ve ilerleme. Veri namaz takibiyle ortaktır (src/lib/namazTakip.ts).
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '../src/components/Text';
import { Button, Screen, Card, Eyebrow } from '../src/components/ui';
import { colors, fonts, radius } from '../src/theme';
import { changeKaza, FARZLAR, kazaGunEkle, kazaKildim, kazaSifirla, useNamaz } from '../src/lib/namazTakip';
import { t } from '../src/i18n';
import { formatNumber } from '../src/i18n/format';

const n = (v: string) => Math.max(0, Math.floor(Number(v.replace(/\D/g, '')) || 0));

export default function Kaza() {
  const s = useNamaz();
  const [yil, setYil] = useState('');
  const [ay, setAy] = useState('');
  const [gun, setGun] = useState('');
  const borc = Object.values(s.kaza).reduce((a, b) => a + b, 0);
  const kilinan = s.kilinan ?? 0;
  const oran = borc + kilinan > 0 ? kilinan / (borc + kilinan) : 0;
  const eklenecek = n(yil) * 365 + n(ay) * 30 + n(gun);

  const ekle = () => {
    if (!eklenecek) return;
    Alert.alert(
      t('Kaza borcu eklensin mi?'),
      t('Her vakte (vitir dahil) {n} namaz eklenecek. Toplam {t} namaz.', { n: formatNumber(eklenecek), t: formatNumber(eklenecek * FARZLAR.length) }),
      [
        { text: t('Vazgeç'), style: 'cancel' },
        {
          text: t('Ekle'),
          onPress: () => {
            kazaGunEkle(eklenecek);
            setYil('');
            setAy('');
            setGun('');
          },
        },
      ]
    );
  };

  return (
    <Screen title={t('Kaza Namazı')}>
      <Card style={st.hero}>
        <Eyebrow style={{ color: colors.goldLight }}>{t('Kalan kaza borcu')}</Eyebrow>
        <Text style={st.big}>{formatNumber(borc)}</Text>
        <View style={st.bar}>
          <View style={[st.fill, { width: `${Math.round(oran * 100)}%` }]} />
        </View>
        <Text style={st.heroSub}>{t('Kılınan: {n} · İlerleme %{p}', { n: formatNumber(kilinan), p: Math.round(oran * 100) })}</Text>
      </Card>

      <Eyebrow>{t('Vakitler')}</Eyebrow>
      <Card style={{ padding: 0, paddingHorizontal: 14 }}>
        {FARZLAR.map((f, i) => {
          const val = s.kaza[f.key] ?? 0;
          return (
            <View key={f.key} style={[st.row, i < FARZLAR.length - 1 && st.divider]}>
              <View style={{ flex: 1 }}>
                <Text style={st.name}>{t(f.name)}</Text>
                <Text style={st.count}>{t('{n} borç', { n: formatNumber(val) })}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('{vakit} kazası bir artır', { vakit: t(f.name) })}
                onPress={() => changeKaza(f.key, 1)}
                style={st.small}
              >
                <Text style={st.smallText}>+</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('{vakit} kazası kıldım', { vakit: t(f.name) })}
                disabled={val === 0}
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                  kazaKildim(f.key);
                }}
                style={[st.kildim, val === 0 && { opacity: 0.4 }]}
              >
                <Text style={st.kildimText}>{t('Kıldım')}</Text>
              </Pressable>
            </View>
          );
        })}
      </Card>

      <Eyebrow>{t('Borcu hesapla')}</Eyebrow>
      <Card style={{ gap: 12 }}>
        <Text style={st.info}>{t('Namaz kılmadığınız süreyi yazın. Her gün için beş vakit ve vitir borç olarak eklenir.')}</Text>
        <View style={st.inputs}>
          {(
            [
              [yil, setYil, t('Yıl')],
              [ay, setAy, t('Ay')],
              [gun, setGun, t('Gün')],
            ] as const
          ).map(([val, set, label]) => (
            <View key={label} style={{ flex: 1, gap: 4 }}>
              <Text style={st.inLabel}>{label}</Text>
              <TextInput
                value={val}
                onChangeText={(x) => set(x.replace(/\D/g, ''))}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={colors.muted}
                accessibilityLabel={label}
                style={st.input}
              />
            </View>
          ))}
        </View>
        <Button label={eklenecek ? t('{n} günlük borç ekle', { n: formatNumber(eklenecek) }) : t('Borç ekle')} onPress={ekle} disabled={!eklenecek} />
      </Card>

      <Card style={{ gap: 8 }}>
        <Text style={st.infoTitle}>{t('Kaza namazı nasıl kılınır?')}</Text>
        <Text style={st.info}>
          {t(
            'Kaza namazı, vaktinde kılınamayan farz namazların sonradan kılınmasıdır. Yalnızca farzlar ve vitir kaza edilir; sünnetler kaza edilmez. Kerahat vakitleri (güneş doğarken, tam tepedeyken ve batarken) dışında her zaman kılınabilir. Niyet ederken hangi vaktin kazası olduğu belirtilir.'
          )}
        </Text>
        <Text style={st.info}>{t('Kaynak: Diyanet İşleri Başkanlığı.')}</Text>
      </Card>

      {borc + kilinan > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            Alert.alert(t('Kaza kayıtları sıfırlansın mı?'), t('Borç ve kılınan sayıları silinecek.'), [
              { text: t('Vazgeç'), style: 'cancel' },
              { text: t('Sıfırla'), style: 'destructive', onPress: kazaSifirla },
            ])
          }
        >
          <Text style={st.reset}>{t('Kayıtları sıfırla')}</Text>
        </Pressable>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  hero: { backgroundColor: colors.green, borderColor: colors.green, gap: 6 },
  big: { fontFamily: fonts.bodyBold, fontSize: 44, color: colors.onGreen, fontVariant: ['tabular-nums'] },
  bar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.25)', overflow: 'hidden' },
  fill: { height: 8, backgroundColor: colors.goldLight },
  heroSub: { fontFamily: fonts.body, fontSize: 13, color: colors.mutedOnGreen },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 66 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  name: { fontFamily: fonts.bodySemi, fontSize: 17, color: colors.ink },
  count: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, fontVariant: ['tabular-nums'] },
  small: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.buttonBorder, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  smallText: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.greenText },
  kildim: { minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  kildimText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.onGreen },
  inputs: { flexDirection: 'row', gap: 10 },
  inLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.muted },
  input: {
    minHeight: 48,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.buttonBorder,
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    fontFamily: fonts.bodySemi,
    fontSize: 18,
    color: colors.ink,
    textAlign: 'center',
  },
  infoTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  info: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  reset: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.muted, textAlign: 'center' },
});
