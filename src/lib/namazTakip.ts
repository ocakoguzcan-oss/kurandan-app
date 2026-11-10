// Namaz takip çizelgesi: günlük beş vakit işaretleme ve kaza namazı sayacı.
import { useSyncExternalStore } from 'react';
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
};
const KEY = 'kurandan.namaz.v1';
const initial: State = { days: {}, kaza: { sabah: 0, ogle: 0, ikindi: 0, aksam: 0, yatsi: 0, vitir: 0 }, kilinan: 0 };
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

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!loaded) {
    loaded = true;
    load<State>(KEY, initial).then((s) => {
      state = { days: s.days ?? {}, kaza: { ...initial.kaza, ...s.kaza }, kilinan: s.kilinan ?? 0 };
      listeners.forEach((l) => l());
    });
  }
  return () => {
    listeners.delete(cb);
  };
}
const getSnapshot = () => state;

export function useNamaz(): State {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function toggleVakit(day: string, key: FarzKey) {
  const cur = state.days[day] ?? {};
  emit({ ...state, days: { ...state.days, [day]: { ...cur, [key]: !cur[key] } } });
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
  emit({ ...state, kaza: { ...initial.kaza }, kilinan: 0 });
}

export function countDay(s: State, day: string) {
  const d = s.days[day] ?? {};
  return GUNLUK_VAKITLER.filter((k) => d[k]).length;
}
