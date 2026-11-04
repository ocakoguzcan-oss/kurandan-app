// Ülke ve şehir verisi. Türkiye için 81 il (src/data/iller.ts), diğer ülkeler için
// Natural Earth tabanlı şehir listesi (src/data/world/cities.json, MIT lisanslı city-timezones,
// ülke adları Unicode CLDR). Yeniden üretmek için: scripts/dunya-verisi.py
import CITIES from './world/cities.json';
import COUNTRIES from './world/countries.json';
import { ILLER } from './iller';
import type { Lang } from '../i18n';

export type Country = { c: string; n: Record<Lang, string> };
export type City = {
  /** Benzersiz kimlik: "DE:Berlin" ya da Türkiye için "TR:34" */
  id: string;
  country: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
  tz: string;
  plaka?: number;
};

type Row = [string, string, number, number, number, number];
const DATA = CITIES as unknown as { tz: string[]; c: Record<string, Row[]> };

export const COUNTRY_LIST = COUNTRIES as Country[];

export function countryName(code: string, lang: Lang): string {
  const c = COUNTRY_LIST.find((x) => x.c === code);
  return c ? c.n[lang] || c.n.en : code;
}

const cache = new Map<string, City[]>();

/** Ülkenin şehirleri (Türkiye: plaka sırasıyla 81 il; diğerleri: nüfusa göre). */
export function citiesOf(country: string): City[] {
  const hit = cache.get(country);
  if (hit) return hit;
  let list: City[];
  if (country === 'TR') {
    list = ILLER.map((i) => ({
      id: `TR:${i.plaka}`,
      country: 'TR',
      name: i.ad,
      province: '',
      lat: i.lat,
      lng: i.lng,
      tz: 'Europe/Istanbul',
      plaka: i.plaka,
    }));
  } else {
    list = (DATA.c[country] ?? []).map(([name, province, lat, lng, tzi]) => ({
      id: `${country}:${name}${province ? `/${province}` : ''}`,
      country,
      name,
      province,
      lat,
      lng,
      tz: DATA.tz[tzi],
    }));
  }
  cache.set(country, list);
  return list;
}

export function cityById(id: string | undefined): City | undefined {
  if (!id) return undefined;
  const country = id.split(':')[0];
  return citiesOf(country).find((c) => c.id === id);
}

const dist = (a: { lat: number; lng: number }, lat: number, lng: number) =>
  (a.lat - lat) ** 2 + ((a.lng - lng) * Math.cos((lat * Math.PI) / 180)) ** 2;

/** Konuma en yakın şehir; ülke biliniyorsa o ülkenin içinde aranır. */
export function nearestCity(lat: number, lng: number, country?: string): City {
  const pool = country && (country === 'TR' || DATA.c[country]) ? citiesOf(country) : allCities();
  let best = pool[0];
  let bestD = Infinity;
  for (const c of pool) {
    const d = dist(c, lat, lng);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

let all: City[] | null = null;
function allCities(): City[] {
  if (!all) all = [...citiesOf('TR'), ...Object.keys(DATA.c).flatMap((c) => citiesOf(c))];
  return all;
}

/** Arama için: küçük harf, aksansız. */
export const normalize = (s: string) =>
  s
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i');
