// Namaz takip çizelgesi: günlük beş vakit işaretleme ve kaza namazı sayacı.
import { useSyncExternalStore } from 'react';
import { load, save } from './storage';

export const FARZLAR = [
  { key: 'sabah', name: 'Sabah' },
  { key: 'ogle', name: 'Öğle' },
  { key: 'ikindi', name: 'İkindi' },
  { key: 'aksam', name: 'Akşam' },
  { key: 'yatsi', name: 'Yatsı' },
  { key: 'vitir', name: 'Vitir' },
] as const;
export type FarzKey = (typeof FARZLAR)[number]['key'];
export const GUNLUK_VAKITLER: FarzKey[] = ['sabah', 'ogle', 'ikindi', 'aksam', 'yatsi'];

type State = { days: Record<string, Partial<Record<FarzKey, boolean>>>; kaza: Record<FarzKey, number> };
const KEY = 'kurandan.namaz.v1';
const initial: State = { days: {}, kaza: { sabah: 0, ogle: 0, ikindi: 0, aksam: 0, yatsi: 0, vitir: 0 } };
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
      state = { days: s.days ?? {}, kaza: { ...initial.kaza, ...s.kaza } };
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
  emit({ ...state, kaza: { ...state.kaza, [key]: Math.max(0, (state.kaza[key] ?? 0) + delta) } });
}

export function countDay(s: State, day: string) {
  const d = s.days[day] ?? {};
  return GUNLUK_VAKITLER.filter((k) => d[k]).length;
}
