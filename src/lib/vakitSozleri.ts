// Vakit bildirimlerinde gösterilen kısa ayet, hadis ve dualar (content/vakit-sozleri.json).
// Sabahta sabah/bereket, ikindide orta namaz, akşam ve yatsıda huzur, bereket, rızık ve sağlık temalı.
// Her gün ve her vakit için sabit (tekrar hesaplansa da aynı söz) ama günden güne değişen bir seçim yapılır.
import data from '../../content/vakit-sozleri.json';
import type { VakitKey } from './prayerTimes';
import type { Ymd } from './tz';
import { getLang, Lang } from '../i18n';

type Soz = {
  id: string;
  havuz: string[];
  tur: 'ayet' | 'hadis' | 'dua';
  metin: Record<Lang, string>;
  kaynak: Record<Lang, string>;
};

const LISTE = (data as { liste: Soz[] }).liste;

const HAVUZ: Record<VakitKey, string[]> = {
  imsak: ['sabah', 'genel'],
  gunes: ['genel'],
  ogle: ['genel'],
  ikindi: ['ikindi', 'genel'],
  aksam: ['aksam'],
  yatsi: ['yatsi', 'aksam'],
};

const SIRA: Record<VakitKey, number> = { imsak: 0, gunes: 1, ogle: 2, ikindi: 3, aksam: 4, yatsi: 5 };

/** “Söz” (Kaynak) biçiminde, uygulamanın dilinde */
export function vakitSozu(key: VakitKey, day: Ymd): string {
  const havuz = LISTE.filter((s) => s.havuz.some((h) => HAVUZ[key].includes(h)));
  if (!havuz.length) return '';
  const gun = Math.floor(Date.UTC(day.y, day.m - 1, day.d) / 86400000);
  const s = havuz[(gun + SIRA[key] * 3) % havuz.length];
  const lang = getLang();
  const metin = s.metin[lang] ?? s.metin.tr;
  const kaynak = s.kaynak[lang] ?? s.kaynak.tr;
  return lang === 'ar' ? `«${metin}» (${kaynak})` : `“${metin}” (${kaynak})`;
}
