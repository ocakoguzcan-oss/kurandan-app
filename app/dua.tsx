// Dualar: üstte seçili dua (açılışta günün duası), altında kategoriler ve dua listesi.
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from '../src/components/Text';
import { Screen, Button, Chip, Eyebrow } from '../src/components/ui';
import { IconBookmark, IconInstagram, IconShare, StarOrnament } from '../src/components/Icons';
import { colors, fonts, radius } from '../src/theme';
import { Dua, duaForDate, duaText, kategoriText, toggleFavori, useDualar, useFavoriler } from '../src/lib/dualar';
import { isRTL, t } from '../src/i18n';

const FAV = '__fav';

/** Listede başlık olarak okunuşun ilk birkaç kelimesi */
const kisaAd = (d: Dua) => {
  const w = d.okunus.replace(/[.,;:]/g, '').split(/\s+/);
  return w.slice(0, 4).join(' ') + (w.length > 4 ? '…' : '');
};

export default function DuaScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const lib = useDualar();
  const favs = useFavoriler();
  const today = useMemo(() => duaForDate(new Date(), lib.dualar), [lib]);
  const [selectedId, setSelectedId] = useState<string | undefined>(params.id);
  const [kat, setKat] = useState<string>('hepsi');
  const scrollRef = useRef<ScrollView>(null);

  const dua = lib.dualar.find((d) => d.id === selectedId) ?? today;
  const isToday = dua.id === today.id;
  const isFav = favs.includes(dua.id);
  const katAd = (id: string) => {
    const k = lib.kategoriler.find((x) => x.id === id);
    return k ? kategoriText(k).ad : id;
  };
  const tr = duaText(dua);

  const list = useMemo(() => {
    if (kat === FAV) return lib.dualar.filter((d) => favs.includes(d.id));
    if (kat === 'hepsi') return lib.dualar;
    return lib.dualar.filter((d) => d.kategoriler.includes(kat));
  }, [kat, lib, favs]);

  const select = (d: Dua) => {
    setSelectedId(d.id);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const shareText = () =>
    Share.share({ message: `${dua.arabic}\n\n${isRTL() ? '' : `${dua.okunus}\n\n${tr.meal}\n`}(${tr.kaynak})\n\nKurandan.ai` }).catch(() => {});

  return (
    <Screen title={isToday ? t('Günün Duası') : t('Dua')} scrollRef={scrollRef}>
      <View style={st.outer}>
        <View style={st.inner}>
          <View style={st.tags}>
            {dua.kategoriler.map((k) => (
              <View key={k} style={st.tag}>
                <Text style={st.tagText}>{katAd(k)}</Text>
              </View>
            ))}
          </View>
          <View style={st.neIcin}>
            <Text style={st.neIcinLabel}>{t('Ne için okunur?')}</Text>
            <Text style={st.neIcinText}>{tr.neIcin}</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <StarOrnament />
          </View>
          <Text style={st.ar}>{dua.arabic}</Text>
          {!isRTL() && (
            <View style={{ gap: 6 }}>
              <Eyebrow>{t('Okunuşu')}</Eyebrow>
              <Text style={st.okunus}>{dua.okunus}</Text>
            </View>
          )}
          {!isRTL() && (
            <View style={{ gap: 6 }}>
              <Eyebrow>{t('Anlamı')}</Eyebrow>
              <Text style={st.meal}>{tr.meal}</Text>
            </View>
          )}
          <Text style={st.kaynak}>{tr.kaynak}</Text>
        </View>
      </View>

      <Button
        label={t('Instagram Story\'de paylaş')}
        icon={<IconInstagram />}
        onPress={() => router.push({ pathname: '/cuma', params: { dua: dua.id } })}
      />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button
          style={{ flex: 1 }}
          variant="secondary"
          label={isFav ? t('Favorilerde') : t('Favorilere ekle')}
          icon={<IconBookmark color={isFav ? colors.gold : colors.greenText} />}
          onPress={() => toggleFavori(dua.id)}
        />
        <Button style={{ flex: 1 }} variant="secondary" label={t('Metin paylaş')} icon={<IconShare />} onPress={shareText} />
      </View>
      {!isToday && <Button variant="text" label={t('Günün duasına dön')} onPress={() => setSelectedId(undefined)} />}

      <Text style={st.h2}>{t('Dualar')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label={t('Hepsi')} selected={kat === 'hepsi'} onPress={() => setKat('hepsi')} />
        <Chip label={`★ ${t('Favorilerim')}${favs.length ? ` (${favs.length})` : ''}`} selected={kat === FAV} onPress={() => setKat(FAV)} />
        {lib.kategoriler.map((k) => (
          <Chip key={k.id} label={kategoriText(k).ad} selected={kat === k.id} onPress={() => setKat(k.id)} />
        ))}
      </ScrollView>
      {kat !== 'hepsi' && kat !== FAV && (
        <Text style={st.katDesc}>{(() => {
            const k = lib.kategoriler.find((x) => x.id === kat);
            return k ? kategoriText(k).aciklama : '';
          })()}</Text>
      )}

      <View style={st.list}>
        {list.length === 0 && (
          <Text style={st.empty}>{t('Henüz favori duanız yok. Bir duanın altındaki “Favorilere ekle”ye dokunun.')}</Text>
        )}
        {list.map((d, i) => {
          const on = d.id === dua.id;
          return (
            <Pressable
              key={d.id}
              accessibilityRole="button"
              onPress={() => select(d)}
              style={[st.row, i < list.length - 1 && st.divider, on && st.rowOn]}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={st.rowTitle} numberOfLines={1}>
                  {favs.includes(d.id) ? '★ ' : ''}
                  {kisaAd(d)}
                </Text>
                <Text style={st.rowSub} numberOfLines={2}>{duaText(d).neIcin}</Text>
              </View>
              <Text style={st.rowAr} numberOfLines={1}>{d.arabic.split(' ').slice(0, 3).join(' ')}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={st.note}>{t('Yeni dualar düzenli olarak eklenir; uygulamayı güncellemenize gerek yoktur.')}</Text>
    </Screen>
  );
}

const st = StyleSheet.create({
  outer: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.xl, padding: 6 },
  inner: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 19, paddingVertical: 20, paddingHorizontal: 18, gap: 16 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: colors.greenTint, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontFamily: fonts.bodySemi, fontSize: 12, color: colors.greenText },
  neIcin: { backgroundColor: colors.creamBox, borderRadius: 14, padding: 12, gap: 2 },
  neIcinLabel: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.goldText, textTransform: 'uppercase', letterSpacing: 0.8 },
  neIcinText: { fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 22, color: colors.ink },
  ar: { fontFamily: fonts.arabic, fontSize: 26, lineHeight: 50, color: colors.greenText, textAlign: 'center', writingDirection: 'rtl' },
  okunus: { fontFamily: fonts.displayItalic, fontSize: 16, lineHeight: 25, color: colors.inkSoft },
  meal: { fontFamily: fonts.body, fontSize: 15, lineHeight: 24, color: colors.ink },
  kaynak: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  h2: { fontFamily: fonts.display, fontSize: 22, color: colors.greenText, marginTop: 8 },
  katDesc: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  list: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.lg, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, minHeight: 64 },
  rowOn: { backgroundColor: 'rgba(226,194,122,0.22)', marginHorizontal: -14, paddingHorizontal: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  rowSub: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted },
  rowAr: { fontFamily: fonts.arabic, fontSize: 17, color: colors.greenText, maxWidth: 110, textAlign: 'right' },
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, paddingVertical: 16 },
  note: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textAlign: 'center' },
});
