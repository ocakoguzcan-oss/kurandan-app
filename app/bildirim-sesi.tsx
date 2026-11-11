// Bildirim sesi seçimi: tüm vakitler için tek ses. Zil seslerinin yanındaki ▶ ile önizleme.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import Svg, { Path, Rect } from 'react-native-svg';
import { Text } from '../src/components/Text';
import { Screen, Card } from '../src/components/ui';
import { SesCubugu } from '../src/components/SesCubugu';
import { colors, fonts } from '../src/theme';
import { useApp } from '../src/context/AppContext';
import { sesOf } from '../src/lib/notifications';
import { SESLER, SesId } from '../src/lib/bildirimSesleri';
import { SEVIYELER, seviyeKazanc } from '../src/lib/ezanSesleri';
import { t } from '../src/i18n';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const EZAN_ONIZLEME = require('../assets/sounds/ezan_ogle.caf');

export default function BildirimSesi() {
  const { reminders, setReminders } = useApp();
  const sel = sesOf(reminders);
  const player = useRef<AudioPlayer | null>(null);
  const [playing, setPlaying] = useState<SesId | null>(null);
  // Her yeni önizleme bir sıra numarası alır; araya başka dokunuş girdiyse eski önizleme hiç başlamaz
  const sira = useRef(0);

  const stop = useCallback(() => {
    sira.current++;
    const p = player.current;
    player.current = null;
    if (p) {
      try {
        p.pause();
      } catch {
        // zaten durmuş
      }
      p.remove();
    }
    setPlaying(null);
  }, []);

  // Ekrandan çıkınca (geri, sekme değişimi) ses susar
  useEffect(() => stop, [stop]);
  useFocusEffect(useCallback(() => stop, [stop]));

  const preview = async (id: SesId, asset: number) => {
    if (playing === id) return stop();
    stop();
    const benim = sira.current;
    await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    if (benim !== sira.current) return;
    const p = createAudioPlayer(asset);
    player.current = p;
    p.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish && player.current === p) stop();
    });
    p.play();
    setPlaying(id);
  };

  const seviyeIdx = Math.max(0, SEVIYELER.findIndex((v) => v.id === (reminders.sesSeviyesi ?? 'yuksek')));

  // Seviye önizlemesi: öğle ezanının ilk saniyeleri, seçilen seviyenin yüksekliğinde
  const previewEzan = async (i: number) => {
    stop();
    const benim = sira.current;
    await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    if (benim !== sira.current) return;
    const p = createAudioPlayer(EZAN_ONIZLEME);
    player.current = p;
    p.volume = seviyeKazanc(SEVIYELER[i].id);
    p.addListener('playbackStatusUpdate', (ps) => {
      if (ps.didJustFinish || ps.currentTime >= 8) {
        if (player.current === p) stop();
      }
    });
    p.play();
    setPlaying('ezan');
  };

  const choose = (id: SesId) => {
    setReminders({ ...reminders, ses: id, ezan: id === 'ezan' });
  };

  return (
    <Screen title={t('Bildirim sesi')}>
      <Text style={st.lead}>{t('Vakit girdiğinde bildirimle birlikte çalacak sesi seçin. Seçim bütün vakitler için geçerlidir.')}</Text>
      <View style={st.warn}>
        <Text style={st.warnIcon}>🔔</Text>
        <Text style={st.warnText}>{t('Ezanı duyabilmek için telefonunuz sessiz modda olmamalı. Telefon sessizdeyken hiçbir uygulamanın bildirim sesi çalmaz.')}</Text>
      </View>
      <Card style={{ padding: 0, paddingHorizontal: 14 }}>
        {SESLER.map((z, i) => {
          const on = z.id === sel;
          return (
            <View key={z.id} style={[st.row, i < SESLER.length - 1 && st.divider]}>
              <Pressable accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => choose(z.id)} style={st.main}>
                <View style={[st.radio, on && st.radioOn]}>{on && <View style={st.dot} />}</View>
                <View style={{ flex: 1 }}>
                  <Text style={[st.name, on && { color: colors.greenText, fontFamily: fonts.bodyBold }]}>{t(z.ad)}</Text>
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
                        <Rect x={6} y={5} width={4} height={14} rx={1} fill={colors.greenText} />
                        <Rect x={14} y={5} width={4} height={14} rx={1} fill={colors.greenText} />
                      </>
                    ) : (
                      <Path d="M8 5v14l11-7z" fill={colors.greenText} />
                    )}
                  </Svg>
                </Pressable>
              )}
            </View>
          );
        })}
      </Card>
      {sel === 'ezan' && (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={st.name}>{t('Ezan ses seviyesi')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('{ses} sesini dinle', { ses: t('Ezan') })}
              onPress={() => (playing === 'ezan' ? stop() : previewEzan(seviyeIdx))}
              hitSlop={8}
              style={st.play}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24">
                {playing === 'ezan' ? (
                  <>
                    <Rect x={6} y={5} width={4} height={14} rx={1} fill={colors.greenText} />
                    <Rect x={14} y={5} width={4} height={14} rx={1} fill={colors.greenText} />
                  </>
                ) : (
                  <Path d="M8 5v14l11-7z" fill={colors.greenText} />
                )}
              </Svg>
            </Pressable>
          </View>
          <SesCubugu
            steps={SEVIYELER.length}
            value={seviyeIdx}
            label={t('Ezan ses seviyesi')}
            onChange={(i) => setReminders({ ...reminders, sesSeviyesi: SEVIYELER[i].id })}
            onRelease={previewEzan}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={st.sub}>{t('Düşük')}</Text>
            <Text style={st.sub}>{t('Yüksek')}</Text>
          </View>
          <Text style={st.sub}>{t('Asıl ses düzeyini telefonun zil ve uyarı sesi belirler.')}</Text>
        </View>
      )}
      <Text style={st.note}>
        {t('“5/15/30 dk önce” hatırlatmalarında her zaman telefonun kendi sesi çalar.')}
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
  radioOn: { borderColor: colors.greenText },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.green },
  name: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink },
  sub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 1 },
  play: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.buttonBorder, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  warn: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card, padding: 12 },
  warnIcon: { fontSize: 18, lineHeight: 22 },
  warnText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 20, color: colors.ink },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: 'center' },
});
