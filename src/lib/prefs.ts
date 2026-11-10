// Görünüm tercihleri (büyük yazı modu, izin ekranının gösterilip gösterilmediği).
import { useSyncExternalStore } from 'react';
import { load, save } from './storage';
import type { Lang } from '../i18n';
import type { AsrSchool, MethodId } from './prayerTimes';

export type MushafSize = 1 | 2 | 3;
/** İlk açılış akışı: dil → şehir seçimi → izinler → bölüm tanıtımı → bitti */
export type OnboardingPhase = 'lang' | 'city' | 'perm' | 'sections' | 'done';
export type TapMode = 'line' | 'word';
export type Prefs = {
  largeText: boolean;
  permissionIntroShown: boolean;
  mushafSize: MushafSize;
  onboarding: OnboardingPhase;
  /** Kur'an'da dokununca satır mı kelime mi okunsun */
  mushafTap: TapMode;
  /** Satırların altında meal */
  mushafMeal: boolean;
  /** Uygulama dili; boşsa cihaz dili */
  lang?: Lang;
  /** Vakit hesaplama yöntemi; boşsa ülkeye göre otomatik */
  method?: MethodId;
  asr?: AsrSchool;
  /** Gece modu: cihaza göre (varsayılan), hep koyu ya da hep açık */
  tema?: 'auto' | 'dark' | 'light';
  /** Hicri takvimi Diyanet'e uydurmak için gün düzeltmesi (−2 … +2) */
  hicriDuzelt?: number;
  /** Saatleri 12 saat biçiminde göster */
  saat12?: boolean;
  /** Ana ekranda iftar sayacı (Ramazan dışında da, nafile oruç için) */
  iftarSayaci?: boolean;
};

const KEY = 'kurandan.prefs.v1';
const initial: Prefs = { largeText: false, permissionIntroShown: false, mushafSize: 1, onboarding: 'lang', mushafTap: 'line', mushafMeal: false };
let state: Prefs = initial;
let loaded = false;
const listeners = new Set<() => void>();

let loading: Promise<Prefs> | null = null;
export function loadPrefs(): Promise<Prefs> {
  if (!loading)
    loading = load<Prefs>(KEY, initial).then((s) => {
      state = { ...s, ...pending };
      loaded = true;
      listeners.forEach((l) => l());
      return state;
    });
  return loading;
}
let pending: Partial<Prefs> = {};

function subscribe(cb: () => void) {
  listeners.add(cb);
  loadPrefs();
  return () => {
    listeners.delete(cb);
  };
}
const getSnapshot = () => state;

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export function setPrefs(p: Partial<Prefs>) {
  if (!loaded) pending = { ...pending, ...p };
  state = { ...state, ...p };
  save(KEY, state);
  listeners.forEach((l) => l());
}

/** Büyük yazı modunda tüm yazılar bu oranda büyür. */
export const LARGE_TEXT_SCALE = 1.25;
