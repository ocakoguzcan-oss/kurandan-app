// Dua kütüphanesi. Dualar GitHub'daki content/dualar.json dosyasından okunur; o dosyaya eklenen
// dualar uygulama güncellemesi olmadan herkese gelir. Uygulamanın içinde de bir kopyası vardır,
// böylece ilk açılışta ve internetsiz de dualar görünür.
import { useEffect, useSyncExternalStore } from 'react';
import { load, save } from './storage';
import bundled from '../../content/dualar.json';

export type DuaKategori = { id: string; ad: string; aciklama: string };
export type Dua = {
  id: string;
  kategoriler: string[];
  neIcin: string;
  arabic: string;
  okunus: string;
  meal: string;
  kaynak: string;
};
export type DuaKutuphanesi = { surum: number; guncelleme: string; kategoriler: DuaKategori[]; dualar: Dua[] };

export const DUALAR_URL = 'https://raw.githubusercontent.com/ocakoguzcan-oss/kurandan-app/main/content/dualar.json';
const CACHE_KEY = 'kurandan.dualar.v1';
const FAV_KEY = 'kurandan.favDualar.v1';
const REFRESH_MS = 6 * 60 * 60 * 1000; // en fazla 6 saatte bir kontrol

function isValid(x: unknown): x is DuaKutuphanesi {
  const d = x as DuaKutuphanesi;
  return !!d && Array.isArray(d.dualar) && Array.isArray(d.kategoriler) && d.dualar.length > 0 &&
    d.dualar.every((a) => a && typeof a.id === 'string' && typeof a.arabic === 'string' && typeof a.meal === 'string');
}

let lib: DuaKutuphanesi = bundled as DuaKutuphanesi;
let favs: string[] = [];
let started = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function start() {
  if (started) return;
  started = true;
  const [cached, f] = await Promise.all([
    load<{ at: number; data: DuaKutuphanesi } | null>(CACHE_KEY, null),
    load<string[]>(FAV_KEY, []),
  ]);
  favs = Array.isArray(f) ? f : [];
  if (cached && isValid(cached.data) && cached.data.surum >= lib.surum) lib = cached.data;
  emit();
  if (!cached || Date.now() - cached.at > REFRESH_MS) refresh();
}

/** GitHub'daki güncel dua dosyasını indirir. */
export async function refresh() {
  try {
    const res = await fetch(`${DUALAR_URL}?t=${Math.floor(Date.now() / REFRESH_MS)}`);
    if (!res.ok) return;
    const data = await res.json();
    if (!isValid(data)) return;
    lib = data;
    save(CACHE_KEY, { at: Date.now(), data });
    emit();
  } catch {
    // internet yoksa kayıtlı kopya kullanılır
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  start();
  return () => {
    listeners.delete(cb);
  };
}

export function useDualar(): DuaKutuphanesi {
  return useSyncExternalStore(subscribe, () => lib);
}

export function useFavoriler(): string[] {
  useEffect(() => {
    start();
  }, []);
  return useSyncExternalStore(subscribe, () => favs);
}

export function toggleFavori(id: string) {
  favs = favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id];
  save(FAV_KEY, favs);
  emit();
}

/** Yılın gününe göre sabit sırayla dua seçer (herkes aynı gün aynı duayı görür). */
export function duaForDate(d: Date, list: Dua[] = lib.dualar): Dua {
  const start0 = new Date(d.getFullYear(), 0, 0);
  const day = Math.floor((d.getTime() - start0.getTime()) / 86400000);
  return list[(day + d.getFullYear() * 7) % list.length];
}

export function duaById(id: string | undefined): Dua | undefined {
  return id ? lib.dualar.find((x) => x.id === id) : undefined;
}
