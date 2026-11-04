// Tarih ve sayı biçimleri — seçili dile göre.
import { getLang, LOCALE } from './index';
import type { Ymd } from '../lib/tz';

const AYLAR_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const GUNLER_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

function intl(v: Ymd, o: Intl.DateTimeFormatOptions): string | null {
  try {
    return new Intl.DateTimeFormat(LOCALE[getLang()], { ...o, timeZone: 'UTC' }).format(new Date(Date.UTC(v.y, v.m - 1, v.d, 12)));
  } catch {
    return null;
  }
}

const fromDate = (d: Date | Ymd): Ymd => (d instanceof Date ? { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() } : d);

/** "4 Kasım 2026" / "4 November 2026" */
export function formatDay(d: Date | Ymd, withYear = true): string {
  const v = fromDate(d);
  if (getLang() !== 'tr') {
    const r = intl(v, withYear ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' });
    if (r) return r;
  }
  return `${v.d} ${AYLAR_TR[v.m - 1]}${withYear ? ` ${v.y}` : ''}`;
}

/** "Perşembe" / "Thursday" */
export function formatWeekday(d: Date | Ymd, short = false): string {
  const v = fromDate(d);
  const dow = new Date(Date.UTC(v.y, v.m - 1, v.d)).getUTCDay();
  if (getLang() !== 'tr') {
    const r = intl(v, { weekday: short ? 'short' : 'long' });
    if (r) return r;
  }
  return short ? GUNLER_TR[dow].slice(0, 3) : GUNLER_TR[dow];
}

/** "Kasım 2026" */
export function formatMonth(d: Date | Ymd): string {
  const v = fromDate(d);
  if (getLang() !== 'tr') {
    const r = intl(v, { month: 'long', year: 'numeric' });
    if (r) return r;
  }
  return `${AYLAR_TR[v.m - 1]} ${v.y}`;
}

export function formatNumber(n: number): string {
  try {
    return n.toLocaleString(LOCALE[getLang()]);
  } catch {
    return String(n);
  }
}
