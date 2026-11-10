// Saat dilimi hesabı — internetsiz ve cihazın saat diliminden bağımsız.
// src/data/world/tz.json, IANA veritabanından 2025–2040 için üretilmiştir
// (scripts/dunya-verisi.py). Böylece kullanıcı İstanbul'dayken Berlin'i seçse bile
// vakitler Berlin saatiyle, yaz/kış saati geçişleri dahil doğru gösterilir.
import TZ from '../data/world/tz.json';

type Rec = (number | [number, number])[];
const DB = TZ as unknown as Record<string, Rec>;

/** Cihazın kendi saat dilimi (bilinmiyorsa İstanbul). */
export function deviceTimeZone(): string {
  try {
    const z = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (z) return z;
  } catch {
    // eski motor
  }
  return 'Europe/Istanbul';
}

/** Verilen anda o saat diliminin UTC farkı (dakika, ör. İstanbul +180). */
export function tzOffset(tz: string | undefined, at: Date | number): number {
  const ms = typeof at === 'number' ? at : at.getTime();
  const rec = tz ? DB[tz] : undefined;
  if (!rec) return -new Date(ms).getTimezoneOffset();
  const min = Math.floor(ms / 60000);
  let off = rec[0] as number;
  for (let i = 1; i < rec.length; i++) {
    const [t, o] = rec[i] as [number, number];
    if (min >= t) off = o;
    else break;
  }
  return off;
}

export const hasTz = (tz?: string) => !!tz && !!DB[tz];

/** O şehirdeki duvar saati: döndürülen Date'in getUTC* alanları yerel saati verir. */
export function wall(d: Date, tz?: string): Date {
  return new Date(d.getTime() + tzOffset(tz, d) * 60000);
}

export type Ymd = { y: number; m: number; d: number };

/** O şehirde bugünün tarihi. */
export function ymdIn(d: Date, tz?: string): Ymd {
  const w = wall(d, tz);
  return { y: w.getUTCFullYear(), m: w.getUTCMonth() + 1, d: w.getUTCDate() };
}

export function addDays(v: Ymd, n: number): Ymd {
  const t = new Date(Date.UTC(v.y, v.m - 1, v.d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export const ymdKey = (v: Ymd) => `${v.y}-${String(v.m).padStart(2, '0')}-${String(v.d).padStart(2, '0')}`;

/** O şehrin yerel saatinde (y, m, d, h, dk) olan gerçek an. */
export function fromWall(v: Ymd, h: number, min: number, tz?: string): Date {
  const guess = Date.UTC(v.y, v.m - 1, v.d, h, min);
  const off1 = tzOffset(tz, guess);
  const off2 = tzOffset(tz, guess - off1 * 60000);
  return new Date(guess - off2 * 60000);
}

/** Takvim günü olarak kullanılacak sahte yerel Date (yalnız yıl/ay/gün anlamlı). */
export function ymdToLocalDate(v: Ymd): Date {
  return new Date(v.y, v.m - 1, v.d, 12);
}

/** Saat:dakika — şehrin saatiyle. */
/** Saat biçimi: 24 saat (varsayılan) ya da 12 saat (ÖÖ/ÖS ekleriyle) */
let saat12: { am: string; pm: string } | null = null;
export function setSaat12(on: boolean, am = 'AM', pm = 'PM') {
  saat12 = on ? { am, pm } : null;
}

export function hhmm(d: Date, tz?: string): string {
  const w = wall(d, tz);
  const h = w.getUTCHours();
  const m = String(w.getUTCMinutes()).padStart(2, '0');
  if (saat12) return `${h % 12 || 12}:${m} ${h < 12 ? saat12.am : saat12.pm}`;
  return `${String(h).padStart(2, '0')}:${m}`;
}

/** "UTC+3", "UTC−4:30" */
export function utcLabel(tz: string | undefined, at = new Date()): string {
  const o = tzOffset(tz, at);
  const sign = o < 0 ? '−' : '+';
  const a = Math.abs(o);
  return `UTC${sign}${Math.floor(a / 60)}${a % 60 ? `:${String(a % 60).padStart(2, '0')}` : ''}`;
}
