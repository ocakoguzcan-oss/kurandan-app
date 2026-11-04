// Ezan bildirimine dokunulunca açılan ekran: o vaktin ezanı (Cuma öğlesinde salâ), sözleri ve anlamı.
// Üstteki çiplerle bütün kayıtlar dinlenebilir.
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { Text } from '../src/components/Text';
import { Screen, Button, Card, Chip } from '../src/components/ui';
import { colors, fonts } from '../src/theme';
import { EZANLAR, ezanById, ezanFor, EzanId } from '../src/lib/ezanSesleri';
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
  const playerRef = useRef<AudioPlayer | null>(null);
  const [playing, setPlaying] = useState(false);
  // Bildirim vakit anahtarını (imsak, ogle…) gönderir; eski bildirimler Türkçe adı gönderiyordu.
  const key = (Object.keys(VAKIT_NAMES) as VakitKey[]).find((k) => k === vakit || VAKIT_NAMES[k] === vakit);
  const [sel, setSel] = useState<EzanId>((key && ezanFor(key, cuma === '1')) || 'ogle');
  const isSabah = sel === 'imsak';
  const kayit = ezanById(sel);

  useEffect(() => {
    return () => {
      playerRef.current?.remove();
    };
  }, []);

  const stop = () => {
    playerRef.current?.pause();
    setPlaying(false);
  };

  const play = async (id: EzanId) => {
    await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    playerRef.current?.remove();
    const p = createAudioPlayer(ezanById(id).asset);
    playerRef.current = p;
    p.addListener('playbackStatusUpdate', (st) => {
      if (st.didJustFinish) setPlaying(false);
    });
    p.play();
    setPlaying(true);
  };

  const choose = (id: EzanId) => {
    setSel(id);
    if (playing) play(id);
  };

  return (
    <Screen title={sel === 'cuma' ? t('Cuma salâsı') : t('{vakit} ezanı', { vakit: t(kayit.ad) })}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
        {EZANLAR.map((e) => (
          <Chip key={e.id} label={t(e.ad)} selected={e.id === sel} onPress={() => choose(e.id)} />
        ))}
      </ScrollView>
      <Button label={playing ? t('Durdur') : sel === 'cuma' ? t('Salâyı dinle') : t('Ezanı dinle')} onPress={() => (playing ? stop() : play(sel))} />
      {sel === 'cuma' ? (
        <Card>
          <Text style={st.note}>{t('Cuma günü öğle vaktinde, ezandan önce okunan salâ. Cuma günleri öğle bildiriminde salâ çalar.')}</Text>
        </Card>
      ) : null}
      {sel !== 'cuma' && SOZLER.filter((s) => !s.sabah || isSabah).map((s, i) => (
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
  note: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.inkSoft },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  times: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.goldText },
  ar: { flex: 1, fontFamily: fonts.arabic, fontSize: 24, color: colors.green, textAlign: 'right', writingDirection: 'rtl' },
  tr: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink },
  meal: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
});
