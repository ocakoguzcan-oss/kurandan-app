/**
 * Namaz vakti hesaplama — Diyanet İşleri Başkanlığı yöntemi.
 *
 * İnternet bağlantısı gerektirmez; konum ve tarihten astronomik olarak hesaplar.
 *   İmsak: güneş ufkun 18° altında      Yatsı: 17° altında
 *   İkindi: asr-ı evvel (gölge = boy + öğle gölgesi)
 *   Temkinler (dk): Güneş −7, Öğle +5, İkindi +4, Akşam +7
 * Diyanet ilçe bazında kendi koordinatlarını kullanır; il merkezinde fark genelde 0–1 dk'dır.
 */

export type VakitKey = 'imsak' | 'gunes' | 'ogle' | 'ikindi' | 'aksam' | 'yatsi';

export const VAKIT_KEYS: VakitKey[] = ['imsak', 'gunes', 'ogle', 'ikindi', 'aksam', 'yatsi'];

export const VAKIT_NAMES: Record<VakitKey, string> = {
  imsak: 'İmsak',
  gunes: 'Güneş',
  ogle: 'Öğle',
  ikindi: 'İkindi',
  aksam: 'Akşam',
  yatsi: 'Yatsı',
};

export type PrayerTimes = Record<VakitKey, Date>;

const DIYANET = {
  fajrAngle: 18,
  ishaAngle: 17,
  adjust: { imsak: 0, gunes: -7, ogle: 5, ikindi: 4, aksam: 7, yatsi: 0 } as Record<VakitKey, number>,
};

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const fixAngle = (a: number) => a - 360 * Math.floor(a / 360);
const fixHour = (h: number) => h - 24 * Math.floor(h / 24);

function julian(year: number, month: number, day: number): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

/** Güneşin sapma açısı ve zaman denklemi (saat cinsinden). */
function sunPosition(jd: number) {
  const D = jd - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g)));
  const e = 23.439 - 0.00000036 * D;
  const RA = deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15;
  const eqt = q / 15 - fixHour(RA);
  const decl = deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L))));
  return { decl, eqt };
}

/**
 * Tek bir günün vakitleri. `date` yalnızca yıl/ay/gün için kullanılır (cihazın yerel takvim günü).
 * Dönen Date nesneleri gerçek anlardır; ekranda cihazın saat dilimiyle gösterilir.
 */
export function getPrayerTimes(date: Date, lat: number, lng: number): PrayerTimes {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const jDate = julian(y, m, d) - lng / (15 * 24);

  // Saatler UTC cinsinden hesaplanır.
  const midDay = (t: number) => {
    const { eqt } = sunPosition(jDate + t / 24);
    return fixHour(12 - eqt);
  };
  const sunAngleTime = (angle: number, t: number, ccw: boolean) => {
    const { decl } = sunPosition(jDate + t / 24);
    const noon = midDay(t);
    const cosT =
      (-Math.sin(rad(angle)) - Math.sin(rad(decl)) * Math.sin(rad(lat))) /
      (Math.cos(rad(decl)) * Math.cos(rad(lat)));
    const T = deg(Math.acos(Math.max(-1, Math.min(1, cosT)))) / 15;
    return noon + (ccw ? -T : T);
  };
  const asrTime = (factor: number, t: number) => {
    const { decl } = sunPosition(jDate + t / 24);
    const angle = -deg(Math.atan(1 / (factor + Math.tan(rad(Math.abs(lat - decl))))));
    return sunAngleTime(angle, t, false);
  };

  // Yaklaşık saatlerle başla, iki tur hassaslaştır.
  let t = { imsak: 5, gunes: 6, ogle: 12, ikindi: 13, aksam: 18, yatsi: 18 } as Record<VakitKey, number>;
  for (let i = 0; i < 2; i++) {
    t = {
      imsak: sunAngleTime(DIYANET.fajrAngle, t.imsak, true),
      gunes: sunAngleTime(0.833, t.gunes, true),
      ogle: midDay(t.ogle),
      ikindi: asrTime(1, t.ikindi),
      aksam: sunAngleTime(0.833, t.aksam, false),
      yatsi: sunAngleTime(DIYANET.ishaAngle, t.yatsi, false),
    };
  }

  const tzOffset = -lng / 15; // yerel ortalama saatten UTC'ye
  const out = {} as PrayerTimes;
  for (const k of VAKIT_KEYS) {
    const utcHours = t[k] + tzOffset + DIYANET.adjust[k] / 60;
    const ms = Date.UTC(y, m - 1, d) + Math.round(utcHours * 60) * 60000;
    out[k] = new Date(ms);
  }
  return out;
}

/** Şu andan sonraki ilk vakit (gerekirse yarının imsakı). */
export function getNextPrayer(now: Date, lat: number, lng: number): { key: VakitKey; time: Date } {
  const today = getPrayerTimes(now, lat, lng);
  for (const k of VAKIT_KEYS) {
    if (today[k].getTime() > now.getTime()) return { key: k, time: today[k] };
  }
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { key: 'imsak', time: getPrayerTimes(tomorrow, lat, lng).imsak };
}

/** Kâbe yönü: kuzeyden saat yönünde derece. */
export function qiblaDirection(lat: number, lng: number): number {
  const kLat = 21.4225;
  const kLng = 39.8262;
  const dLng = rad(kLng - lng);
  const y = Math.sin(dLng);
  const x = Math.cos(rad(lat)) * Math.tan(rad(kLat)) - Math.sin(rad(lat)) * Math.cos(dLng);
  return fixAngle(deg(Math.atan2(y, x)));
}

/** Kâbe'ye büyük çember uzaklığı (km). */
export function distanceToKaaba(lat: number, lng: number): number {
  const R = 6371;
  const dLat = rad(21.4225 - lat);
  const dLng = rad(39.8262 - lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(21.4225)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
}
