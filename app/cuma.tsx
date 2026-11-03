import React, { useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import Constants from 'expo-constants';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library/legacy';
import { captureRef } from 'react-native-view-shot';
import { Screen, Button, Eyebrow } from '../src/components/ui';
import { IconInstagram } from '../src/components/Icons';
import { StoryCard } from '../src/components/StoryCard';
import { colors, fonts } from '../src/theme';
import { CUMA_AYETLERI, STORY_THEMES, nextFriday } from '../src/data/cuma';

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** react-native-share yalnızca geliştirme/mağaza derlemesinde vardır; Expo Go'da yoksa genel paylaşıma düşer. */
function loadRNShare(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-share').default;
  } catch {
    return null;
  }
}

export default function CumaScreen() {
  const ref = useRef<View>(null);
  const [themeIdx, setThemeIdx] = useState(0);
  const [ayetIdx, setAyetIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const fri = nextFriday();

  const render = async () =>
    captureRef(ref, { format: 'png', quality: 1, width: 1080, height: 1920, result: 'tmpfile' });

  const shareToInstagram = async () => {
    if (Platform.OS === 'web') return Alert.alert('Telefonda deneyin', 'Story paylaşımı yalnızca telefonda çalışır.');
    setBusy(true);
    try {
      const uri = await render();
      const RNShare = loadRNShare();
      const appId = (Constants.expoConfig?.extra as { facebookAppId?: string } | undefined)?.facebookAppId;
      if (RNShare && appId) {
        try {
          await RNShare.shareSingle({
            social: RNShare.Social.INSTAGRAM_STORIES,
            appId,
            backgroundImage: uri,
            backgroundTopColor: STORY_THEMES[themeIdx].bg,
            backgroundBottomColor: STORY_THEMES[themeIdx].bg,
          });
          return;
        } catch {
          // Instagram yüklü değilse ya da iptal edildiyse genel paylaşım menüsünü aç.
        }
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Hayırlı Cumalar' });
      }
    } catch (e) {
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
      if (!perm.granted) {
        Alert.alert('İzin gerekli', 'Görseli kaydetmek için galeri izni verin.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(await render());
      Alert.alert('Kaydedildi', 'Cuma görseli galerinize eklendi.');
    } catch {
      Alert.alert('Kaydedilemedi', 'Lütfen tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Cuma Story" right={<Text style={st.date}>{`${fri.getDate()} ${AYLAR[fri.getMonth()]} Cuma`}</Text>}>
      <View style={st.previewWrap}>
        <StoryCard ref={ref} theme={STORY_THEMES[themeIdx]} ayet={CUMA_AYETLERI[ayetIdx]} />
      </View>

      <View style={{ gap: 8 }}>
        <Eyebrow>Şablon</Eyebrow>
        <View style={st.row}>
          {STORY_THEMES.map((t, i) => (
            <Pressable
              key={t.id}
              accessibilityRole="button"
              accessibilityLabel={`${t.label} şablon`}
              accessibilityState={{ selected: i === themeIdx }}
              onPress={() => setThemeIdx(i)}
              style={[st.swatch, { backgroundColor: t.bg, borderWidth: i === themeIdx ? 2 : 1, borderColor: i === themeIdx ? colors.green : colors.buttonBorder }]}
            />
          ))}
          <Button
            style={{ flex: 1, minHeight: 48 }}
            variant="secondary"
            label="Ayeti değiştir"
            onPress={() => setAyetIdx((ayetIdx + 1) % CUMA_AYETLERI.length)}
          />
        </View>
      </View>

      <Button label={busy ? 'Hazırlanıyor…' : "Instagram Story'de paylaş"} icon={<IconInstagram />} disabled={busy} onPress={shareToInstagram} />
      <Button variant="text" label="Galeriye kaydet" disabled={busy} onPress={saveToGallery} />
    </Screen>
  );
}

const st = StyleSheet.create({
  date: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  previewWrap: {
    alignItems: 'center',
    shadowColor: '#1F2A24',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  swatch: { width: 48, height: 48, borderRadius: 12 },
});
