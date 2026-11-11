// Namaz takip çizelgesi: günlük beş vakit işaretleme ve kaza namazı sayacı.
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { load, save } from './storage';
import { tx } from '../i18n';

export const FARZLAR = [
  { key: 'sabah', name: tx('Sabah') },
  { key: 'ogle', name: tx('Öğle') },
  { key: 'ikindi', name: tx('İkindi') },
  { key: 'aksam', name: tx('Akşam') },
  { key: 'yatsi', name: tx('Yatsı') },
  { key: 'vitir', name: tx('Vitir') },
] as const;
export type FarzKey = (typeof FARZLAR)[number]['key'];
export const GUNLUK_VAKITLER: FarzKey[] = ['sabah', 'ogle', 'ikindi', 'aksam', 'yatsi'];

type State = {
  days: Record<string, Partial<Record<FarzKey, boolean>>>;
  kaza: Record<FarzKey, number>;
  /** Toplam kılınan kaza namazı (ilerlemeyi göstermek için) */
  kilinan: number;
  /** "Kılmadım" denip kaza borcuna eklenen vakitler (gün → vakitler); sonradan "kıldım" denirse geri alınır */
  kazaGun: Record<string, FarzKey[]>;
  /** İşaretlenmemiş vakitleri sorma ekranında ele alınmış günler */
  kontrol: Record<string, true>;
  /** "Kıldınız mı?" takibinin başladığı gün (daha eski günler sorulmaz) */
  baslangic?: string;
};
const KEY = 'kurandan.namaz.v1';
const initial: State = { days: {}, kaza: { sabah: 0, ogle: 0, ikindi: 0, aksam: 0, yatsi: 0, vitir: 0 }, kilinan: 0, kazaGun: {}, kontrol: {} };
let state: State = initial;
let loaded = false;
const listeners = new Set<() => void>();

export const dayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function emit(next: State) {
  state = next;
  save(KEY, state);
  listeners.forEach((l) => l());
}

let yukleniyor: Promise<void> | null = null;
/** Kayıtlı çizelgeyi yükler (bildirim kurarken de gerekir) */
export function namazYukle(): Promise<void> {
  if (!yukleniyor) {
    loaded = true;
    yukleniyor = load<State>(KEY, initial).then((s) => {
      state = { days: s.days ?? {}, kaza: { ...initial.kaza, ...s.kaza }, kilinan: s.kilinan ?? 0, kazaGun: s.kazaGun ?? {}, kontrol: s.kontrol ?? {}, baslangic: s.baslangic };
      listeners.forEach((l) => l());
    });
  }
  return yukleniyor;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!loaded) namazYukle();
  return () => {
    listeners.delete(cb);
  };
}
const getSnapshot = () => state;
/** Bileşen dışından anlık durum (bildirim kurarken) */
export const namazDurum = () => state;

export function useNamaz(): State {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function toggleVakit(day: string, key: FarzKey) {
  const cur = state.days[day] ?? {};
  isaretle(day, key, !cur[key]);
}

export function isaretliMi(day: string, key: FarzKey): boolean {
  return !!state.days[day]?.[key];
}

/** O vakit için kurulmuş "kıldınız mı?" ve "vakit çıkıyor" bildirimlerini iptal eder */
function soruIptal(day: string, key: FarzKey) {
  if (Platform.OS === 'web') return;
  Notifications.cancelScheduledNotificationAsync(`kildin:${day}:${key}`).catch(() => {});
  Notifications.cancelScheduledNotificationAsync(`sonuyari:${day}:${key}`).catch(() => {});
}

/**
 * Vakti kılındı / kılınmadı olarak işaretler. Kılındıysa bekleyen sorular iptal edilir; daha önce
 * "kılmadım" denip kazaya eklendiyse o kaza geri alınır.
 */
export function isaretle(day: string, key: FarzKey, val: boolean) {
  const cur = state.days[day] ?? {};
  let next: State = { ...state, days: { ...state.days, [day]: { ...cur, [key]: val } } };
  if (val && (state.kazaGun[day] ?? []).includes(key)) {
    next = {
      ...next,
      kaza: { ...next.kaza, [key]: Math.max(0, (next.kaza[key] ?? 0) - 1) },
      kazaGun: { ...next.kazaGun, [day]: next.kazaGun[day].filter((k) => k !== key) },
    };
  }
  emit(next);
  if (val) soruIptal(day, key);
}

/** "Kılmadım": vakit kaza borcuna bir kez eklenir (aynı gün için ikinci kez eklenmez) */
export function kilmadim(day: string, key: FarzKey) {
  soruIptal(day, key);
  if (state.days[day]?.[key] || (state.kazaGun[day] ?? []).includes(key)) return;
  emit({
    ...state,
    kaza: { ...state.kaza, [key]: (state.kaza[key] ?? 0) + 1 },
    kazaGun: { ...state.kazaGun, [day]: [...(state.kazaGun[day] ?? []), key] },
  });
}

/** Bu vakit için kazaya eklendi mi */
export const kazayaEklendi = (s: State, day: string, key: FarzKey) => (s.kazaGun[day] ?? []).includes(key);

/** "Kıldınız mı?" açıldığında takibin başladığı günü kaydeder (eski günler sorulmaz) */
export function takipBaslat(day: string) {
  if (!state.baslangic || state.baslangic > day) emit({ ...state, baslangic: day });
}

/** Önceki günlerde hiç işaretlenmemiş vakitler (en fazla son 7 gün, takip başladıktan sonra) */
export function isaretsizler(s: State, today: Date): { day: string; date: Date; keys: FarzKey[] }[] {
  if (!s.baslangic) return [];
  const out: { day: string; date: Date; keys: FarzKey[] }[] = [];
  for (let i = 7; i >= 1; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const k = dayKey(d);
    if (k < s.baslangic || s.kontrol[k]) continue;
    const keys = GUNLUK_VAKITLER.filter((v) => !s.days[k]?.[v] && !(s.kazaGun[k] ?? []).includes(v));
    if (keys.length) out.push({ day: k, date: d, keys });
  }
  return out;
}

/** Gün ele alındı (soru bir daha gösterilmez) */
export function gunKontrolEdildi(day: string) {
  emit({ ...state, kontrol: { ...state.kontrol, [day]: true } });
}

export function changeKaza(key: FarzKey, delta: number) {
  const cur = state.kaza[key] ?? 0;
  const next = Math.max(0, cur + delta);
  emit({ ...state, kaza: { ...state.kaza, [key]: next } });
}

/** Bir kaza namazı kılındı: borçtan düşer, kılınan sayısı artar */
export function kazaKildim(key: FarzKey) {
  const cur = state.kaza[key] ?? 0;
  if (cur <= 0) return;
  emit({ ...state, kaza: { ...state.kaza, [key]: cur - 1 }, kilinan: (state.kilinan ?? 0) + 1 });
}

/** Kılınmamış gün sayısına göre her vakte (vitir dahil) borç ekler */
export function kazaGunEkle(gun: number) {
  if (gun <= 0) return;
  const kaza = { ...state.kaza };
  for (const f of FARZLAR) kaza[f.key] = (kaza[f.key] ?? 0) + gun;
  emit({ ...state, kaza });
}

export function kazaSifirla() {
  emit({ ...state, kaza: { ...initial.kaza }, kilinan: 0, kazaGun: {} });
}

export function countDay(s: State, day: string) {
  const d = s.days[day] ?? {};
  return GUNLUK_VAKITLER.filter((k) => d[k]).length;
}
