// Story stüdyosu: Cuma / Kandil / Bayram görselleri ve dua paylaşımı.
// İçerik, arka plan (renk, desen, galeriden fotoğraf) ve yazı ayarları seçilir; görsel 1080×1920
// olarak hazırlanıp doğrudan Instagram Story'ye ya da paylaş menüsüne gönderilir.
import React, { useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';
import { Text } from '../src/components/Text';
import { Screen, Button, Chip, Eyebrow } from '../src/components/ui';
import { IconInstagram } from '../src/components/Icons';
import { StoryCard } from '../src/components/StoryCard';
import { colors, fonts } from '../src/theme';
import {
  DESENLER, Desen, ICERIKLER, ICERIK_TURLERI, IcerikTuru, KONULAR, Konu, PALETLER, YAZI_RENKLERI, YAZI_TIPLERI, YaziTipi,
} from '../src/data/story';
import { duaById, useDualar } from '../src/lib/dualar';

const SCALES = [
  { id: 0.85, ad: 'Küçük' },
  { id: 1, ad: 'Orta' },
  { id: 1.18, ad: 'Büyük' },
];

/** react-native-share yalnızca gerçek uygulamada (TestFlight / App Store) vardır; Expo Go'da paylaş menüsüne düşülür. */
function loadRNShare(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-share').default;
  } catch {
    return null;
  }
}

type Tab = 'icerik' | 'arka' | 'yazi';

export default function StoryStudio() {
  const params = useLocalSearchParams<{ dua?: string }>();
  useDualar(); // dua kütüphanesini yükle
  const dua = duaById(params.dua);
  const ref = useRef<View>(null);

  const [tab, setTab] = useState<Tab>('icerik');
  const [konu, setKonu] = useState<Konu>('cuma');
  const [tur, setTur] = useState<IcerikTuru>('soz');
  const [idx, setIdx] = useState(0);
  const [serbestBaslik, setSerbestBaslik] = useState('Hayırlı Cumalar');
  const [serbestMetin, setSerbestMetin] = useState('');
  const [showTitle, setShowTitle] = useState(true);
  const [paletIdx, setPaletIdx] = useState(dua ? 1 : 0);
  const [desen, setDesen] = useState<Desen>(dua ? 'kemer' : 'yildiz');
  const [photo, setPhoto] = useState<string | null>(null);
  const [font, setFont] = useState<YaziTipi>('serif');
  const [scale, setScale] = useState(1);
  const [textColor, setTextColor] = useState('auto');
  const [busy, setBusy] = useState(false);

  const konuBilgi = KONULAR.find((k) => k.id === konu)!;
  const list = tur === 'serbest' ? [] : ICERIKLER[konu][tur];
  const item = list.length ? list[idx % list.length] : undefined;
  const palet = PALETLER[paletIdx];

  const card = useMemo(() => {
    if (dua) {
      return { arabicTitle: undefined, title: showTitle ? 'Günün Duası' : undefined, arabicBody: dua.arabic, body: dua.meal, kaynak: dua.kaynak };
    }
    if (tur === 'serbest') {
      return { arabicTitle: konuBilgi.arabic, title: serbestBaslik.trim() || undefined, body: serbestMetin.trim() || 'Buraya kendi sözünüzü yazın.', kaynak: undefined };
    }
    return { arabicTitle: konuBilgi.arabic, title: showTitle ? konuBilgi.baslik : undefined, body: item?.metin ?? '', kaynak: item?.kaynak };
  }, [dua, tur, konuBilgi, serbestBaslik, serbestMetin, item, showTitle]);

  const render = () => captureRef(ref, { format: 'png', quality: 1, width: 1080, height: 1920, result: 'tmpfile' });

  const pickPhoto = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [9, 16], quality: 0.9 });
      if (!r.canceled && r.assets?.[0]?.uri) setPhoto(r.assets[0].uri);
    } catch {
      Alert.alert('Fotoğraf açılamadı', 'Lütfen tekrar deneyin.');
    }
  };

  const shareToInstagram = async () => {
    if (Platform.OS === 'web') return Alert.alert('Telefonda deneyin', 'Story paylaşımı yalnızca telefonda çalışır.');
    setBusy(true);
    try {
      const uri = await render();
      const RNShare = loadRNShare();
      const appId = (Constants.expoConfig?.extra as { facebookAppId?: string } | undefined)?.facebookAppId;
      if (RNShare?.shareSingle && appId) {
        try {
          await RNShare.shareSingle({
            social: RNShare.Social.INSTAGRAM_STORIES,
            appId,
            backgroundImage: uri,
            backgroundTopColor: palet.bg[0],
            backgroundBottomColor: palet.bg[palet.bg.length - 1],
          });
          return;
        } catch {
          // Instagram yüklü değilse ya da iptal edildiyse paylaş menüsünü aç.
        }
      }
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Story olarak paylaş' });
    } catch {
      Alert.alert('Paylaşılamadı', 'Görsel hazırlanırken bir sorun oldu. Lütfen tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  };

  const saveToGallery = async () => {
    if (Platform.OS === 'web') return;
    setBusy(true);
    try {
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) return Alert.alert('İzin gerekli', 'Görseli kaydetmek için galeri izni verin.');
      await MediaLibrary.saveToLibraryAsync(await render());
      Alert.alert('Kaydedildi', 'Görsel galerinize eklendi.');
    } catch {
      Alert.alert('Kaydedilemedi', 'Lütfen tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={dua ? 'Duayı Paylaş' : 'Story Hazırla'}>
      <View style={st.previewWrap}>
        <StoryCard
          ref={ref}
          palet={palet}
          desen={desen}
          photoUri={photo}
          font={font}
          scale={scale}
          textColor={textColor}
          {...card}
        />
      </View>

      <View style={st.tabs}>
        {([
          ['icerik', 'İçerik'],
          ['arka', 'Arka plan'],
          ['yazi', 'Yazı'],
        ] as [Tab, string][]).map(([id, ad]) => (
          <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: tab === id }} onPress={() => setTab(id)} style={[st.tab, tab === id && st.tabOn]}>
            <Text style={[st.tabText, tab === id && st.tabTextOn]}>{ad}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'icerik' && (
        <View style={{ gap: 12 }}>
          {dua ? (
            <Text style={st.hint}>{`Bu görselde “${dua.kaynak}” duası paylaşılacak. Arka planı ve yazıyı diğer sekmelerden değiştirebilirsiniz.`}</Text>
          ) : (
            <>
              <Eyebrow>Konu</Eyebrow>
              <Row>
                {KONULAR.map((k) => (
                  <Chip key={k.id} label={k.ad} selected={konu === k.id} onPress={() => { setKonu(k.id); setIdx(0); setSerbestBaslik(k.baslik); }} />
                ))}
              </Row>
              <Eyebrow>Ne yazsın?</Eyebrow>
              <Row>
                {ICERIK_TURLERI.map((t) => (
                  <Chip key={t.id} label={t.ad} selected={tur === t.id} onPress={() => { setTur(t.id); setIdx(0); }} />
                ))}
              </Row>
              {tur === 'serbest' ? (
                <View style={{ gap: 8 }}>
                  <TextInput value={serbestBaslik} onChangeText={setSerbestBaslik} maxLength={40} placeholder="Başlık" placeholderTextColor={colors.muted} style={st.input} accessibilityLabel="Başlık" />
                  <TextInput
                    value={serbestMetin}
                    onChangeText={setSerbestMetin}
                    maxLength={220}
                    multiline
                    placeholder="Sözünüzü yazın"
                    placeholderTextColor={colors.muted}
                    style={[st.input, { minHeight: 96, textAlignVertical: 'top', paddingTop: 12 }]}
                    accessibilityLabel="Söz"
                  />
                  <Text style={st.hint}>{`${serbestMetin.length}/220`}</Text>
                </View>
              ) : (
                <View style={st.pager}>
                  <Button variant="secondary" label="‹" style={st.pagerBtn} onPress={() => setIdx((idx - 1 + list.length) % list.length)} />
                  <Text style={st.pagerText}>{`${(idx % list.length) + 1} / ${list.length}`}</Text>
                  <Button variant="secondary" label="›" style={st.pagerBtn} onPress={() => setIdx((idx + 1) % list.length)} />
                </View>
              )}
            </>
          )}
          {tur !== 'serbest' && (
            <Pressable accessibilityRole="switch" accessibilityState={{ checked: showTitle }} onPress={() => setShowTitle(!showTitle)} style={st.check}>
              <View style={[st.box, showTitle && st.boxOn]} />
              <Text style={st.checkText}>{dua ? '“Günün Duası” başlığını göster' : `“${konuBilgi.baslik}” başlığını göster`}</Text>
            </Pressable>
          )}
        </View>
      )}

      {tab === 'arka' && (
        <View style={{ gap: 12 }}>
          <Eyebrow>Renk</Eyebrow>
          <Row>
            {PALETLER.map((pl, i) => (
              <Pressable
                key={pl.id}
                accessibilityRole="button"
                accessibilityLabel={`${pl.ad} renk`}
                accessibilityState={{ selected: !photo && i === paletIdx }}
                onPress={() => { setPaletIdx(i); setPhoto(null); }}
                style={[st.swatch, { backgroundColor: pl.bg[0], borderColor: !photo && i === paletIdx ? colors.green : colors.buttonBorder, borderWidth: !photo && i === paletIdx ? 3 : 1 }]}
              >
                <View style={[st.swatchHalf, { backgroundColor: pl.bg[pl.bg.length - 1] }]} />
              </Pressable>
            ))}
          </Row>
          <Eyebrow>Desen</Eyebrow>
          <Row>
            {DESENLER.map((d) => (
              <Chip key={d.id} label={d.ad} selected={desen === d.id} onPress={() => setDesen(d.id)} />
            ))}
          </Row>
          <Eyebrow>Fotoğraf</Eyebrow>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button style={{ flex: 1 }} variant="secondary" label={photo ? 'Fotoğrafı değiştir' : 'Galeriden seç'} onPress={pickPhoto} />
            {photo && <Button style={{ flex: 1 }} variant="secondary" label="Fotoğrafı kaldır" onPress={() => setPhoto(null)} />}
          </View>
          <Text style={st.hint}>Fotoğrafın üzerine yazı okunaklı olsun diye hafif koyu bir perde eklenir.</Text>
        </View>
      )}

      {tab === 'yazi' && (
        <View style={{ gap: 12 }}>
          <Eyebrow>Yazı tipi</Eyebrow>
          <Row>
            {YAZI_TIPLERI.map((f) => (
              <Chip key={f.id} label={f.ad} selected={font === f.id} onPress={() => setFont(f.id)} />
            ))}
          </Row>
          <Eyebrow>Boyut</Eyebrow>
          <Row>
            {SCALES.map((s) => (
              <Chip key={s.id} label={s.ad} selected={scale === s.id} onPress={() => setScale(s.id)} />
            ))}
          </Row>
          <Eyebrow>Renk</Eyebrow>
          <Row>
            {YAZI_RENKLERI.map((c) => (
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={c === 'auto' ? 'Otomatik renk' : `Yazı rengi ${c}`}
                accessibilityState={{ selected: textColor === c }}
                onPress={() => setTextColor(c)}
                style={[st.dot, { backgroundColor: c === 'auto' ? colors.card : c, borderWidth: textColor === c ? 3 : 1, borderColor: textColor === c ? colors.green : colors.buttonBorder }]}
              >
                {c === 'auto' && <Text style={st.auto}>A</Text>}
              </Pressable>
            ))}
          </Row>
        </View>
      )}

      <Button label={busy ? 'Hazırlanıyor…' : "Instagram Story'de paylaş"} icon={<IconInstagram />} disabled={busy} onPress={shareToInstagram} />
      <Button variant="text" label="Galeriye kaydet" disabled={busy} onPress={saveToGallery} />
    </Screen>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
      {children}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  previewWrap: { alignItems: 'center', shadowColor: '#1F2A24', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  tabs: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.cardBorder, padding: 4 },
  tab: { flex: 1, minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: colors.green },
  tabText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.green },
  tabTextOn: { color: colors.paper },
  hint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.muted },
  input: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.buttonBorder, backgroundColor: colors.card, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  pager: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pagerBtn: { width: 64, minHeight: 48 },
  pagerText: { flex: 1, textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.buttonBorder, backgroundColor: colors.paper },
  boxOn: { backgroundColor: colors.green, borderColor: colors.green },
  checkText: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, flexShrink: 1 },
  swatch: { width: 48, height: 48, borderRadius: 12, overflow: 'hidden' },
  swatchHalf: { position: 'absolute', right: 0, bottom: 0, width: 48, height: 24 },
  dot: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  auto: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.green },
});
