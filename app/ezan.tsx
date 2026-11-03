// Ezan bildirimine dokunulunca açılan ekran: vakit adı, ezanın sözleri ve anlamı, ezanı dinle.
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { Text } from '../src/components/Text';
import { Screen, Button, Card } from '../src/components/ui';
import { colors, fonts } from '../src/theme';
import { EZAN_KAYDI_HAZIR } from '../src/config';

const SOZLER: { ar: string; tr: string; meal: string; tekrar: number; sabah?: boolean }[] = [
  { ar: 'اَللّٰهُ أَكْبَرُ', tr: 'Allâhu ekber', meal: 'Allah en büyüktür', tekrar: 4 },
  { ar: 'أَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللّٰهُ', tr: 'Eşhedü en lâ ilâhe illallâh', meal: 'Şahitlik ederim ki Allah’tan başka ilah yoktur', tekrar: 2 },
  { ar: 'أَشْهَدُ أَنَّ مُحَمَّدًا رَسُولُ اللّٰهِ', tr: 'Eşhedü enne Muhammeden Resûlullâh', meal: 'Şahitlik ederim ki Muhammed Allah’ın elçisidir', tekrar: 2 },
  { ar: 'حَيَّ عَلَى الصَّلَاةِ', tr: 'Hayye ale’s-salâh', meal: 'Haydi namaza', tekrar: 2 },
  { ar: 'حَيَّ عَلَى الْفَلَاحِ', tr: 'Hayye ale’l-felâh', meal: 'Haydi kurtuluşa', tekrar: 2 },
  { ar: 'اَلصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ', tr: 'Es-salâtü hayrun mine’n-nevm', meal: 'Namaz uykudan hayırlıdır (sabah ezanında)', tekrar: 2, sabah: true },
  { ar: 'اَللّٰهُ أَكْبَرُ', tr: 'Allâhu ekber', meal: 'Allah en büyüktür', tekrar: 2 },
  { ar: 'لَا إِلٰهَ إِلَّا اللّٰهُ', tr: 'Lâ ilâhe illallâh', meal: 'Allah’tan başka ilah yoktur', tekrar: 1 },
];

export default function EzanScreen() {
  const { vakit } = useLocalSearchParams<{ vakit?: string }>();
  const playerRef = useRef<AudioPlayer | null>(null);
  const [playing, setPlaying] = useState(false);
  const isSabah = vakit === 'İmsak';

  useEffect(() => {
    return () => {
      playerRef.current?.remove();
    };
  }, []);

  const toggle = async () => {
    if (!playerRef.current) {
      await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
      playerRef.current = createAudioPlayer(require('../assets/sounds/ezan.wav'));
    }
    const p = playerRef.current;
    if (playing) {
      p.pause();
      setPlaying(false);
    } else {
      await p.seekTo(0);
      p.play();
      setPlaying(true);
    }
  };

  return (
    <Screen title={vakit ? `${vakit} ezanı` : 'Ezan'}>
      {EZAN_KAYDI_HAZIR ? (
        <Button label={playing ? 'Durdur' : 'Ezanı dinle'} onPress={toggle} />
      ) : (
        <Card>
          <Text style={st.note}>Ezan kaydı yakında eklenecek. Şimdilik ezanın sözlerini ve anlamını okuyabilirsiniz.</Text>
        </Card>
      )}
      {SOZLER.filter((s) => !s.sabah || isSabah).map((s, i) => (
        <Card key={i} style={{ gap: 4 }}>
          <View style={st.row}>
            <Text style={st.times}>{`${s.tekrar}×`}</Text>
            <Text style={st.ar}>{s.ar}</Text>
          </View>
          <Text style={st.tr}>{s.tr}</Text>
          <Text style={st.meal}>{s.meal}</Text>
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
