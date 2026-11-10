// Hatim takibi: 30 cüzün her biri için okunan sayfa oranı, tamamlanan hatimler, günlük hedef ve
// tahmini bitiş. Kur'an ekranında okunan sayfalar kendiliğinden işlenir; başka yerden (basılı Mushaf)
// okunan cüzler basılı tutularak işaretlenir.
import React, { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Text } from '../src/components/Text';
import { Button, Screen, Card, Chip, Eyebrow } from '../src/components/ui';
import { colors, fonts, radius } from '../src/theme';
import { completeHatim, juzPages, setGoal, setJuzRead, useHatim } from '../src/lib/hatim';
import { TOTAL_PAGES } from '../src/lib/quran';
import { t } from '../src/i18n';
import { formatDay, formatNumber } from '../src/i18n/format';

const HEDEFLER = [5, 10, 20, 40];

export default function Hatim() {
  const h = useHatim();
  const readSet = useMemo(() => new Set(h.read), [h.read]);
  const okunan = h.read.length;
  const kalan = TOTAL_PAGES - okunan;
  const gunKalan = Math.ceil(kalan / Math.max(1, h.goal));
  const bitis = new Date();
  bitis.setDate(bitis.getDate() + gunKalan);

  const juzler = Array.from({ length: 30 }, (_, i) => {
    const [from, to] = juzPages(i + 1);
    let n = 0;
    for (let p = from; p <= to; p++) if (readSet.has(p)) n++;
    return { juz: i + 1, from, oran: n / (to - from + 1) };
  });
  // Okumaya devam edilecek ilk eksik sayfa
  let devam = 1;
  while (devam <= TOTAL_PAGES && readSet.has(devam)) devam++;
  if (devam > TOTAL_PAGES) devam = 1;

  const juzMenu = (juz: number, full: boolean, from: number) =>
    Alert.alert(t('{n}. cüz', { n: juz }), undefined, [
      { text: t('Okumaya başla'), onPress: () => router.push({ pathname: '/kuran', params: { sayfa: String(from) } }) },
      full
        ? { text: t('Okunmadı işaretle'), onPress: () => setJuzRead(juz, false) }
        : { text: t('Okundu işaretle'), onPress: () => setJuzRead(juz, true) },
      { text: t('Vazgeç'), style: 'cancel' },
    ]);

  return (
    <Screen title={t('Hatim Takibi')}>
      <Card style={st.hero}>
        <View style={st.heroTop}>
          <View>
            <Eyebrow style={{ color: colors.goldLight }}>{t('Bu hatim')}</Eyebrow>
            <Text style={st.big}>{`%${Math.floor((okunan / TOTAL_PAGES) * 100)}`}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={st.heroNum}>{formatNumber(h.completed)}</Text>
            <Text style={st.heroSub}>{t('tamamlanan hatim')}</Text>
          </View>
        </View>
        <View style={st.bar}>
          <View style={[st.fill, { width: `${(okunan / TOTAL_PAGES) * 100}%` }]} />
        </View>
        <Text style={st.heroSub}>
          {t('{a} / {b} sayfa · günde {g} sayfayla tahmini bitiş {tarih}', {
            a: formatNumber(okunan),
            b: formatNumber(TOTAL_PAGES),
            g: h.goal,
            tarih: formatDay(bitis),
          })}
        </Text>
      </Card>

      <Button
        label={t('Okumaya devam et · sayfa {n}', { n: devam })}
        onPress={() => router.push({ pathname: '/kuran', params: { sayfa: String(devam) } })}
      />

      <Eyebrow>{t('Cüzler')}</Eyebrow>
      <View style={st.grid}>
        {juzler.map(({ juz, from, oran }) => {
          const full = oran >= 1;
          return (
            <Pressable
              key={juz}
              accessibilityRole="button"
              accessibilityLabel={t('{n}. cüz, yüzde {p} okundu', { n: juz, p: Math.round(oran * 100) })}
              onPress={() => juzMenu(juz, full, from)}
              onLongPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setJuzRead(juz, !full);
              }}
              style={[st.juz, full && st.juzFull]}
            >
              {!full && oran > 0 && <View style={[st.juzFill, { height: `${oran * 100}%` }]} />}
              <Text style={[st.juzN, full && { color: colors.paper }]}>{juz}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={st.note}>{t('Cüze dokunarak okumaya başlayın. Basılı Mushaftan okuduğunuz cüzü işaretlemek için basılı tutun.')}</Text>

      <Eyebrow>{t('Günlük hedef')}</Eyebrow>
      <View style={st.chips}>
        {HEDEFLER.map((g) => (
          <Chip key={g} label={g === 20 ? t('20 sayfa (1 cüz)') : t('{n} sayfa', { n: g })} selected={h.goal === g} onPress={() => setGoal(g)} style={{ flexGrow: 1 }} />
        ))}
      </View>
      <Text style={st.note}>{t('Bugün {a}/{b} sayfa okudunuz.', { a: h.todayPages.length, b: h.goal })}</Text>

      {okunan > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            Alert.alert(t('Hatim tamamlandı say'), t('Bu hatim tamamlanmış sayılacak ve yeni hatime başlanacak.'), [
              { text: t('Vazgeç'), style: 'cancel' },
              { text: t('Tamamla'), onPress: completeHatim },
            ])
          }
        >
          <Text style={st.link}>{t('Hatmi tamamladım, yenisine başla')}</Text>
        </Pressable>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  hero: { backgroundColor: colors.green, borderColor: colors.green, gap: 8 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  big: { fontFamily: fonts.bodyBold, fontSize: 44, color: colors.paper, fontVariant: ['tabular-nums'] },
  heroNum: { fontFamily: fonts.display, fontSize: 28, color: colors.goldLight },
  heroSub: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.mutedOnGreen },
  bar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.25)', overflow: 'hidden' },
  fill: { height: 8, backgroundColor: colors.goldLight },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  juz: {
    width: '17.5%',
    flexGrow: 1,
    aspectRatio: 1,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  juzFull: { backgroundColor: colors.green, borderColor: colors.green },
  juzFill: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.greenTint },
  juzN: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.green, fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted, textAlign: 'center' },
  link: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.green, textAlign: 'center' },
});
