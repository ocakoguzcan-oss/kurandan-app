// Dil seçimi: ilk açılışta (cihaz dili önceden işaretli) ve Ayarlar'dan.
// Arapçaya geçişte/çıkışta düzen sağdan sola döndüğü için uygulama kendini yeniden başlatır.
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../src/components/Text';
import { Button } from '../src/components/ui';
import { colors, fonts } from '../src/theme';
import { setPrefs, usePrefs } from '../src/lib/prefs';
import { deviceLang, getLang, Lang, LANGS, switchLang, t } from '../src/i18n';

// Seçim ekranında her dil kendi diliyle selam verir
const SELAM: Record<Lang, string> = {
  tr: 'Uygulama dilini seçin',
  en: 'Choose the app language',
  de: 'App-Sprache wählen',
  ar: 'اختر لغة التطبيق',
  fr: 'Choisissez la langue',
  ru: 'Выберите язык',
};

// İlk açılışta, seçilen dilde kısa bilgi
const NOT: Record<Lang, string> = {
  tr: 'Dualar, Kur’an meali ve vakit hesaplama yöntemi de bu dile göre gelir. Dili daha sonra ana sayfadaki 🌐 düğmesinden ya da Ayarlar’dan değiştirebilirsiniz.',
  en: 'Supplications, the Quran translation and the prayer time method also follow this language. You can change it later with the 🌐 button on the home screen or in Settings.',
  de: 'Bittgebete, Koranübersetzung und Berechnungsmethode richten sich ebenfalls nach dieser Sprache. Später über die 🌐-Taste auf der Startseite oder in den Einstellungen änderbar.',
  ar: 'تأتي الأدعية وطريقة حساب المواقيت أيضًا حسب هذه اللغة. يمكنك تغييرها لاحقًا من زر 🌐 في الصفحة الرئيسية أو من الإعدادات.',
  fr: 'Les invocations, la traduction du Coran et la méthode de calcul suivent aussi cette langue. Modifiable plus tard via le bouton 🌐 de l’accueil ou dans les Réglages.',
  ru: 'Мольбы, перевод Корана и метод расчёта времени намаза тоже зависят от языка. Изменить его можно позже кнопкой 🌐 на главной или в настройках.',
};

const DEVAM: Record<Lang, string> = { tr: 'Devam', en: 'Continue', de: 'Weiter', ar: 'متابعة', fr: 'Continuer', ru: 'Продолжить' };

export default function DilScreen() {
  const insets = useSafeAreaInsets();
  const prefs = usePrefs();
  const onboarding = prefs.onboarding === 'lang';
  const [sel, setSel] = useState<Lang>(prefs.lang ?? (onboarding ? deviceLang() : getLang()));
  const [busy, setBusy] = useState(false);

  const done = async () => {
    setBusy(true);
    const persist = (l: Lang) => setPrefs({ lang: l, ...(onboarding ? { onboarding: 'city' as const } : null) });
    if (router.canGoBack()) router.back();
    // Ekran kapandıktan sonra dili uygula (ağaç yeniden çizilir; gerekirse uygulama yeniden başlar)
    setTimeout(() => switchLang(sel, persist), 250);
  };

  return (
    <View style={[st.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
      <ScrollView contentContainerStyle={{ gap: 12, paddingHorizontal: 20 }}>
        <Text style={st.ar}>السَّلَامُ عَلَيْكُمْ</Text>
        <Text style={st.h1}>{SELAM[sel]}</Text>
        <View style={{ gap: 10, marginTop: 8 }}>
          {LANGS.map((l) => {
            const on = l.code === sel;
            return (
              <Pressable
                key={l.code}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${l.name} (${l.latin})`}
                onPress={() => setSel(l.code)}
                style={[st.row, on && st.rowOn]}
              >
                <Text style={[st.name, on && { color: colors.onGreen }]}>{l.name}</Text>
                <Text style={[st.latin, on && { color: colors.goldLight }]}>{l.latin}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={st.note}>{NOT[sel]}</Text>
        {sel === 'ar' || getLang() === 'ar' ? (
          <Text style={st.note}>{t('Arapçada uygulama sağdan sola düzene geçer ve bir kez yeniden başlar.')}</Text>
        ) : null}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, gap: 8 }}>
        <Button label={busy ? '…' : DEVAM[sel]} disabled={busy} onPress={done} />
        {!onboarding && <Button variant="text" label={t('Vazgeç')} onPress={() => router.back()} />}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, gap: 12 },
  ar: { fontFamily: fonts.arabic, fontSize: 30, color: colors.gold, textAlign: 'center' },
  h1: { fontFamily: fonts.displayBold, fontSize: 26, color: colors.greenText, textAlign: 'center' },
  row: {
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowOn: { backgroundColor: colors.green, borderColor: colors.green },
  name: { fontFamily: fonts.bodySemi, fontSize: 19, color: colors.ink },
  latin: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  note: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.muted, textAlign: 'center' },
});
