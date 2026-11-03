// Görünüm tercihleri (büyük yazı modu, izin ekranının gösterilip gösterilmediği).
import { useSyncExternalStore } from 'react';
import { load, save } from './storage';

export type MushafSize = 1 | 2 | 3;
export type Prefs = { largeText: boolean; permissionIntroShown: boolean; mushafSize: MushafSize };

const KEY = 'kurandan.prefs.v1';
const initial: Prefs = { largeText: false, permissionIntroShown: false, mushafSize: 1 };
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
