// Hatim ve okuma takibi: kaldığı sayfa, bu hatimde okunan sayfalar, günlük hedef.
import { useSyncExternalStore } from 'react';
import { load, save } from './storage';
import { TOTAL_PAGES } from './quran';

export type HatimState = {
  lastPage: number;
  read: number[]; // bu hatimde okunan sayfalar
  goal: number; // günlük sayfa hedefi
  day: string; // bugünün tarihi (toDateString)
  todayPages: number[];
  completed: number; // tamamlanan hatim sayısı
};

const KEY = 'kurandan.hatim.v1';
const initial: HatimState = { lastPage: 1, read: [], goal: 5, day: new Date().toDateString(), todayPages: [], completed: 0 };

let state: HatimState = initial;
const listeners = new Set<() => void>();
let loaded = false;

function emit(next: HatimState) {
  if (!loaded) return; // kayıtlı durum yüklenmeden yazma (eski veriyi ezmesin)
  state = next;
  save(KEY, state);
  listeners.forEach((l) => l());
}

let loading: Promise<HatimState> | null = null;
/** Kayıtlı durumu bir kez yükler; aynı anda gelen çağrılar aynı yüklemeyi bekler. */
export function loadHatim(): Promise<HatimState> {
  if (!loading)
    loading = load<HatimState>(KEY, initial).then((s) => {
      const today = new Date().toDateString();
      state = s.day === today ? s : { ...s, day: today, todayPages: [] };
      loaded = true;
      listeners.forEach((l) => l());
      return state;
    });
  return loading;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  loadHatim();
  return () => {
    listeners.delete(cb);
  };
}
const getSnapshot = () => state;

export function useHatim(): HatimState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function setLastPage(page: number) {
  if (state.lastPage !== page) emit({ ...state, lastPage: page });
}

/** Sayfa okundu say (ekranda yeterince kalındığında ya da tilavet bitince). */
export function markPageRead(page: number) {
  const today = new Date().toDateString();
  const base = state.day === today ? state : { ...state, day: today, todayPages: [] };
  const read = base.read.includes(page) ? base.read : [...base.read, page];
  const todayPages = base.todayPages.includes(page) ? base.todayPages : [...base.todayPages, page];
  if (read.length >= TOTAL_PAGES) {
    emit({ ...base, read: [], todayPages, completed: base.completed + 1 });
  } else if (read !== base.read || todayPages !== base.todayPages || base !== state) {
    emit({ ...base, read, todayPages });
  }
}

export function setGoal(goal: number) {
  emit({ ...state, goal });
}

export function resetHatim() {
  emit({ ...state, read: [] });
}

/** Medine Mushafı'nda (604 sayfa) cüzlerin başladığı sayfalar */
export const JUZ_START = [1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582];

/** Cüzün sayfa aralığı (1–30) */
export function juzPages(juz: number): [number, number] {
  const from = JUZ_START[juz - 1];
  const to = juz === 30 ? TOTAL_PAGES : JUZ_START[juz] - 1;
  return [from, to];
}

/** Bir cüzü toptan okundu ya da okunmadı işaretle (başka yerden okuyanlar için) */
export function setJuzRead(juz: number, read: boolean) {
  const [from, to] = juzPages(juz);
  const set = new Set(state.read);
  for (let p = from; p <= to; p++) (read ? set.add(p) : set.delete(p));
  const list = [...set].sort((a, b) => a - b);
  if (list.length >= TOTAL_PAGES) emit({ ...state, read: [], completed: state.completed + 1 });
  else emit({ ...state, read: list });
}

/** Bu hatmi tamamlandı say ve yenisine başla */
export function completeHatim() {
  emit({ ...state, read: [], completed: state.completed + 1 });
}
