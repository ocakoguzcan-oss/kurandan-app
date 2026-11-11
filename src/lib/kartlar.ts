// Günün Kartları: her namaz gününde (imsakla yenilenir) 3 kapalı kart. Kullanıcı iyi niyet edip birini
// seçer; kartta bir ayet, hadis ya da dua ile kısa bir tefekkür notu çıkar. Şimdilik günde 1 kart açılır;
// diğerleri ileride ödüllü video ile açılacak (KILIT_VIDEO). Kaydedilen kartlar "Kart Sandığım"da birikir.
// İçerik: content/dualar.json (uygulamadaki kopya) ve content/vakit-sozleri.json; ikisi de kaynaklı ve doğrulanmış.
import { useSyncExternalStore } from 'react';
import dualarData from '../../content/dualar.json';
import sozData from '../../content/vakit-sozleri.json';
import { load, save } from './storage';
import { getLang, Lang } from '../i18n';
import { dayKey } from './namazTakip';

export type KartTur = 'ayet' | 'hadis' | 'dua';
export type Kart = {
  id: string;
  tur: KartTur;
  arabic?: string;
  metin: string;
  kaynak: string;
  /** Kısa tefekkür notu ya da "ne için okunur" */
  not?: string;
};

/** Gün başına açılabilecek kart: ilki ücretsiz; ileride 2. ve 3. için izlenecek video sayısı */
export const GUNLUK_KART = 3;
export const UCRETSIZ_KART = 1;
export const KILIT_VIDEO = [0, 1, 2];

type Soz = { id: string; tur: KartTur; metin: Record<string, string>; kaynak: Record<string, string>; not?: Record<string, string> };
type DuaHam = {
  id: string;
  arabic: string;
  meal: string;
  kaynak: string;
  neIcin: string;
  ceviri?: Partial<Record<string, { meal?: string; kaynak?: string; neIcin?: string }>>;
};

function havuz(lang: Lang): Kart[] {
  const sozler = (sozData as unknown as { liste: Soz[] }).liste
    .filter((s) => s.id !== 'bakara201') // dualar arasında da var
    .map<Kart>((s) => ({
      id: `s:${s.id}`,
      tur: s.tur,
      metin: s.metin[lang] ?? s.metin.tr,
      kaynak: s.kaynak[lang] ?? s.kaynak.tr,
      not: s.not ? s.not[lang] ?? s.not.tr : undefined,
      // Arapça asıl metin (Arapça arayüzde metnin kendisi zaten Arapça)
      arabic: lang !== 'ar' ? s.metin.ar : undefined,
    }));
  const dualar = (dualarData as unknown as { dualar: DuaHam[] }).dualar.map<Kart>((d) => {
    const c = lang === 'tr' ? undefined : d.ceviri?.[lang];
    return { id: `d:${d.id}`, tur: 'dua', arabic: d.arabic, metin: c?.meal ?? d.meal, kaynak: c?.kaynak ?? d.kaynak, not: c?.neIcin ?? d.neIcin };
  });
  // Türler karışsın diye sabit bir sırayla iç içe geçir
  const out: Kart[] = [];
  const n = Math.max(sozler.length, dualar.length);
  for (let i = 0; i < n; i++) {
    if (sozler[i]) out.push(sozler[i]);
    if (dualar[i]) out.push(dualar[i]);
  }
  return out;
}

let havuzOnbellek: { lang: Lang; list: Kart[] } | null = null;
export function kartHavuzu(): Kart[] {
  const lang = getLang();
  if (!havuzOnbellek || havuzOnbellek.lang !== lang) havuzOnbellek = { lang, list: havuz(lang) };
  return havuzOnbellek.list;
}

export function kartById(id: string | undefined): Kart | undefined {
  return id ? kartHavuzu().find((k) => k.id === id) : undefined;
}

/** O günün 3 kartı (aynı gün hep aynı; günden güne değişir, havuz bitene kadar tekrar etmez) */
export function gununKartlari(gun: Date): Kart[] {
  const list = kartHavuzu();
  const g = Math.floor(Date.UTC(gun.getFullYear(), gun.getMonth(), gun.getDate()) / 86400000);
  // Kullanıcı genelde günde 1 kart açtığı için her gün havuzda 1 adım ilerlenir; 3 kart ardışık değil, dağınık seçilir
  const adim = Math.max(1, Math.floor(list.length / 3));
  return [0, 1, 2].map((i) => list[(g + i * adim) % list.length]);
}

type State = {
  /** Namaz günü (YYYY-AA-GG) ve o gün açılan kart konumları (0, 1, 2) */
  gun: string;
  acilan: number[];
  /** Kart Sandığım: kaydedilen kart kimlikleri (en yeni başta) */
  sandik: string[];
};
const KEY = 'kurandan.kartlar.v1';
const initial: State = { gun: '', acilan: [], sandik: [] };
let state: State = initial;
let loaded = false;
const listeners = new Set<() => void>();

function emit(next: State) {
  state = next;
  save(KEY, state);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!loaded) {
    loaded = true;
    load<State>(KEY, initial).then((s) => {
      state = { gun: s.gun ?? '', acilan: s.acilan ?? [], sandik: s.sandik ?? [] };
      listeners.forEach((l) => l());
    });
  }
  return () => {
    listeners.delete(cb);
  };
}
const getSnapshot = () => state;

export function useKartlar(): State {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/** Bu namaz gününde açılan kartlar (gün değiştiyse boş) */
export function acilanlar(s: State, gun: Date): number[] {
  return s.gun === dayKey(gun) ? s.acilan : [];
}

/** Kart açılabilir mi: ücretsiz hak bitmediyse */
export function acabilir(s: State, gun: Date): boolean {
  return acilanlar(s, gun).length < UCRETSIZ_KART;
}

export function kartAc(gun: Date, konum: number) {
  const k = dayKey(gun);
  const acilan = state.gun === k ? state.acilan : [];
  if (acilan.includes(konum)) return;
  emit({ ...state, gun: k, acilan: [...acilan, konum] });
}

export function sandiktaMi(id: string): boolean {
  return state.sandik.includes(id);
}

export function sandigaEkle(id: string, ekle = true) {
  const rest = state.sandik.filter((x) => x !== id);
  emit({ ...state, sandik: ekle ? [id, ...rest] : rest });
}
