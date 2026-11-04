// Çeviri katmanı. Kaynak dil Türkçedir: ekrandaki Türkçe metin aynı zamanda anahtardır.
//   t('Konumumu kullan')                 → seçili dildeki karşılığı (yoksa Türkçesi)
//   t('{n} gün kaldı', { n: 3 })          → değişkenli metin
//   tx('...')                            → modül düzeyindeki sabit listeler için işaret (çevirmez;
//                                          ekranda gösterirken t() ile çevrilir)
// Yeni metin ekleyince scripts/ceviri-kontrol.py eksik çevirileri listeler.
// Dil değişince uygulama ağacı baştan çizilir; Arapçaya geçişte/çıkışta sağdan sola düzen için
// uygulama yeniden başlatılır.
import { DevSettings, I18nManager } from 'react-native';
import * as Updates from 'expo-updates';
import en from './en.json';
import de from './de.json';
import ar from './ar.json';
import fr from './fr.json';
import ru from './ru.json';

export type Lang = 'tr' | 'en' | 'de' | 'ar' | 'fr' | 'ru';

export const LANGS: { code: Lang; name: string; latin: string }[] = [
  { code: 'tr', name: 'Türkçe', latin: 'Turkish' },
  { code: 'en', name: 'English', latin: 'English' },
  { code: 'de', name: 'Deutsch', latin: 'German' },
  { code: 'ar', name: 'العربية', latin: 'Arabic' },
  { code: 'fr', name: 'Français', latin: 'French' },
  { code: 'ru', name: 'Русский', latin: 'Russian' },
];

const DICTS: Record<Exclude<Lang, 'tr'>, Record<string, string>> = { en, de, ar, fr, ru };

/** Intl biçimlendirme için yerel ayar */
export const LOCALE: Record<Lang, string> = { tr: 'tr-TR', en: 'en-GB', de: 'de-DE', ar: 'ar', fr: 'fr-FR', ru: 'ru-RU' };

let current: Lang = 'tr';

export const getLang = () => current;
export const isRTL = () => current === 'ar';

export function t(s: string, params?: Record<string, string | number>): string {
  let out = current === 'tr' ? s : DICTS[current][s] ?? s;
  if (params) for (const k in params) out = out.split(`{${k}}`).join(String(params[k]));
  return out;
}

/** Sabit listelerde çevrilecek metni işaretler; olduğu gibi döner. */
export const tx = (s: string) => s;

/** Cihaz dili desteklenenlerden biriyse o, değilse İngilizce (Türkçe cihazda Türkçe). */
export function deviceLang(): Lang {
  try {
    const loc = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    const code = loc.split(/[-_]/)[0] as Lang;
    if (LANGS.some((l) => l.code === code)) return code;
    return 'en';
  } catch {
    return 'tr';
  }
}

/** Uygulama açılırken, ilk çizimden önce çağrılır. RTL ayarı tutmuyorsa true döner (yeniden başlatılmalı). */
export function initLang(lang: Lang): boolean {
  current = lang;
  const rtl = lang === 'ar';
  I18nManager.allowRTL(rtl);
  if (I18nManager.isRTL !== rtl) {
    I18nManager.forceRTL(rtl);
    return true;
  }
  return false;
}

/** Dil değiştir. Yazı yönü değişiyorsa uygulamayı yeniden başlatır. */
export async function switchLang(lang: Lang, persist: (l: Lang) => void) {
  current = lang;
  persist(lang);
  const rtl = lang === 'ar';
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
    await restartApp();
  }
}

export async function restartApp() {
  try {
    await Updates.reloadAsync();
  } catch {
    try {
      DevSettings.reload();
    } catch {
      // Yeniden başlatılamazsa düzen bir sonraki açılışta düzelir.
    }
  }
}

/** Dile göre Kur'an meali (Quran Foundation çeviri kimlikleri). Arapçada meal yok. */
export const QURAN_TRANSLATION: Record<Lang, number | null> = {
  tr: 77, // Diyanet İşleri
  en: 20, // Saheeh International
  de: 27, // Frank Bubenheim & Nadeem Elyas
  fr: 31, // Muhammad Hamidullah
  ru: 45, // Elmir Kuliev
  ar: null,
};

export const QURAN_TRANSLATION_NAME: Record<Lang, string> = {
  tr: 'Diyanet İşleri Başkanlığı meali',
  en: 'Saheeh International',
  de: 'Bubenheim & Elyas',
  fr: 'Muhammad Hamidullah',
  ru: 'Эльмир Кулиев',
  ar: '',
};
