// Bildirim sesi seçimi: tüm vakitler için tek ses. Zil seslerinin yanındaki ▶ ile önizleme.
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import Svg, { Path, Rect } from 'react-native-svg';
import { Text } from '../src/components/Text';
import { Screen, Card } from '../src/components/ui';
import { colors, fonts } from '../src/theme';
import { useApp } from '../src/context/AppContext';
import { sesOf } from '../src/lib/notifications';
import { SESLER, SesId } from '../src/lib/bildirimSesleri';
import { t } from '../src/i18n';

export default function BildirimSesi() {
  const { reminders, setReminders } = useApp();
  const sel = sesOf(reminders);
  const player = useRef<AudioPlayer | null>(null);
  const [playing, setPlaying] = useState<SesId | null>(null);

  useEffect(() => () => player.current?.remove(), []);

  const stop = () => {
    player.current?.remove();
    player.current = null;
    setPlaying(null);
  };

  const preview = async (id: SesId, asset: number) => {
    if (playing === id) return stop();
    stop();
    await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    const p = createAudioPlayer(asset);
    player.current = p;
    p.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish) setPlaying(null);
    });
    p.play();
    setPlaying(id);
  };

  const choose = (id: SesId) => {
    setReminders({ ...reminders, ses: id, ezan: id === 'ezan' });
  };

  return (
    <Screen title={t('Bildirim sesi')}>
      <Text style={st.lead}>{t('Vakit girdiğinde bildirimle birlikte çalacak sesi seçin. Seçim bütün vakitler için geçerlidir.')}</Text>
      <Card style={{ padding: 0, paddingHorizontal: 14 }}>
        {SESLER.map((z, i) => {
          const on = z.id === sel;
          return (
            <View key={z.id} style={[st.row, i < SESLER.length - 1 && st.divider]}>
              <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => choose(z.id)} style={st.main}>
                <View style={[st.radio, on && st.radioOn]}>{on && <View style={st.dot} />}</View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.name, on && { color: colors.green, fontFamily: fonts.bodyBold }]}>{t(z.ad)}</Text>
                  <Text style={st.sub}>{t(z.aciklama)}</Text>
                </View>
              </Pressable>
              {z.asset != null && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('{ses} sesini dinle', { ses: t(z.ad) })}
                  onPress={() => preview(z.id, z.asset!)}
                  hitSlop={8}
                  style={st.play}
                >
                  <Svg width={18} height={18} viewBox="0 0 24 24">
                    {playing === z.id ? (
                      <>
                        <Rect x={6} y={5} width={4} height={14} rx={1} fill={colors.green} />
                        <Rect x={14} y={5} width={4} height={14} rx={1} fill={colors.green} />
                      </>
                    ) : (
                      <Path d="M8 5v14l11-7z" fill={colors.green} />
                    )}
                  </Svg>
                </Pressable>
              )}
            </View>
          );
        })}
      </Card>
      <Text style={st.note}>
        {t('“5/15/30 dk önce” hatırlatmalarında her zaman telefonun kendi sesi çalar. Sesli bildirimler için telefonun sessiz modda olmaması gerekir.')}
      </Text>
    </Screen>
  );
}

const st = StyleSheet.create({
  lead: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 62, gap: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.buttonBorder, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.green },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.green },
  name: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink },
  sub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 1 },
  play: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.buttonBorder, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: 'center' },
});
