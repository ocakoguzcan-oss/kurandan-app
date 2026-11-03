// Hicri takvim (aritmetik/tablolu yöntem). Diyanet takviminden ±1 gün sapabilir;
// Ramazan gibi önemli tarihler aşağıda Diyanet'in ilan ettiği günlerle sabitlenmiştir.

const MONTHS_TR = [
  'Muharrem', 'Safer', 'Rebiülevvel', 'Rebiülahir', 'Cemaziyelevvel', 'Cemaziyelahir',
  'Recep', 'Şaban', 'Ramazan', 'Şevval', 'Zilkade', 'Zilhicce',
];
const MONTHS_AR = [
  'مُحَرَّم', 'صَفَر', 'رَبِيع الأَوَّل', 'رَبِيع الآخِر', 'جُمَادَى الأُولَى', 'جُمَادَى الآخِرَة',
  'رَجَب', 'شَعْبَان', 'رَمَضَان', 'شَوَّال', 'ذُو القَعْدَة', 'ذُو الحِجَّة',
];

export type HijriDate = { day: number; month: number; year: number };

export function toHijri(date: Date): HijriDate {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  // Gregoryen → Julian gün sayısı
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jd =
    d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  // Julian gün → tablolu hicri
  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
    Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;
  return { day, month, year };
}

const toArabicDigits = (n: number) => String(n).replace(/\d/g, (c) => '٠١٢٣٤٥٦٧٨٩'[Number(c)]);

export function formatHijriTr(h: HijriDate): string {
  return `${h.day} ${MONTHS_TR[h.month - 1]} ${h.year}`;
}

export function formatHijriAr(h: HijriDate): string {
  return `${toArabicDigits(h.day)} ${MONTHS_AR[h.month - 1]} ${toArabicDigits(h.year)}`;
}

/**
 * Diyanet'in ilan ettiği Ramazan dönemleri (ilk oruç günü, gün sayısı).
 * Her yıl Diyanet takvimi açıklandığında yeni satır ekleyin.
 */
export const RAMAZANLAR: { hicriYil: number; ilkOruc: string; gun: number }[] = [
  { hicriYil: 1448, ilkOruc: '2027-02-08', gun: 29 }, // Bayram: 9 Mart 2027
];

export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Bugün Ramazan'daysa kaçıncı gün olduğu, değilse null. */
export function ramazanDay(today: Date): number | null {
  for (const r of RAMAZANLAR) {
    const start = parseLocalDate(r.ilkOruc);
    const diff = Math.round(
      (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - start.getTime()) / 86400000
    );
    if (diff >= 0 && diff < r.gun) return diff + 1;
  }
  return null;
}

/** Bugünden sonraki (veya içinde bulunulan) Ramazan. */
export function currentOrNextRamazan(today: Date) {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return (
    RAMAZANLAR.find((r) => parseLocalDate(r.ilkOruc).getTime() + (r.gun - 1) * 86400000 >= t) ??
    RAMAZANLAR[RAMAZANLAR.length - 1]
  );
}
