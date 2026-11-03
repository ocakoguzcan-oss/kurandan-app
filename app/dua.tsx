import React, { useEffect, useMemo, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { Screen, Button, Eyebrow } from '../src/components/ui';
import { IconBookmark, IconShare, StarOrnament } from '../src/components/Icons';
import { colors, fonts, radius } from '../src/theme';
import { DUALAR, duaForDate } from '../src/data/dualar';
import { load, save, KEYS } from '../src/lib/storage';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export default function DuaScreen() {
  const today = useMemo(() => new Date(), []);
  const todayIndex = useMemo(() => duaForDate(today).index, [today]);
  const [offset, setOffset] = useState(0); // 0 = bugün, -1 = dün…
  const [saved, setSaved] = useState<number[]>([]);

  useEffect(() => {
    load<number[]>(KEYS.savedDuas, []).then(setSaved);
  }, []);

  const index = (todayIndex + offset + DUALAR.length * 10) % DUALAR.length;
  const dua = DUALAR[index];
  const shown = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
  const isSaved = saved.includes(index);

  const toggleSave = () => {
    const next = isSaved ? saved.filter((i) => i !== index) : [...saved, index];
    setSaved(next);
    save(KEYS.savedDuas, next);
  };

  const share = () =>
    Share.share({ message: `${dua.arabic}\n\n${dua.okunus}\n\n${dua.meal}\n(${dua.kaynak})\n\nKurandan.ai` }).catch(() => {});

  return (
    <Screen title="Günün Duası" right={<Text style={st.date}>{`${shown.getDate()} ${AYLAR[shown.getMonth()]}`}</Text>}>
      <View style={st.outer}>
        <View style={st.inner}>
          <View style={{ alignItems: 'center' }}>
            <StarOrnament />
          </View>
          <Text style={st.ar}>{dua.arabic}</Text>
          <View style={{ gap: 6 }}>
            <Eyebrow>Okunuşu</Eyebrow>
            <Text style={st.okunus}>{dua.okunus}</Text>
          </View>
          <View style={{ gap: 6 }}>
            <Eyebrow>Anlamı</Eyebrow>
            <Text style={st.meal}>{dua.meal}</Text>
          </View>
          <Text style={st.kaynak}>{dua.kaynak}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button
          style={{ flex: 1 }}
          variant="secondary"
          label={isSaved ? 'Kaydedildi' : 'Kaydet'}
          icon={<IconBookmark />}
          onPress={toggleSave}
        />
        <Button style={{ flex: 1 }} label="Paylaş" icon={<IconShare color={colors.paper} />} onPress={share} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button style={{ flex: 1 }} variant="text" label="‹ Önceki dua" onPress={() => setOffset(offset - 1)} />
        <Button style={{ flex: 1 }} variant="text" label="Bugüne dön" disabled={offset === 0} onPress={() => setOffset(0)} />
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  date: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  outer: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.xl, padding: 6 },
  inner: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 19, paddingVertical: 22, paddingHorizontal: 20, gap: 18 },
  ar: { fontFamily: fonts.arabic, fontSize: 26, lineHeight: 50, color: colors.green, textAlign: 'center', writingDirection: 'rtl' },
  okunus: { fontFamily: fonts.displayItalic, fontSize: 16, lineHeight: 25, color: colors.inkSoft },
  meal: { fontFamily: fonts.body, fontSize: 15, lineHeight: 24, color: colors.ink },
  kaynak: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
});
