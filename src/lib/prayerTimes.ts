/**
 * Namaz vakti hesaplama — internetsiz, cihazda.
 *
 * Varsayılan Diyanet İşleri Başkanlığı yöntemi:
 *   İmsak: güneş ufkun 18° altında      Yatsı: 17° altında
 *   İkindi: asr-ı evvel (gölge = boy + öğle gölgesi)
 *   Temkinler (dk): Güneş −7, Öğle +5, İkindi +4, Akşam +7
 * Diğer ülkeler için yaygın kurum yöntemleri (MWL, ISNA, Ümmü'l-Kurâ, Mısır, Karaçi…) aşağıda.
 * Yüksek enlemlerde (Kuzey Avrupa yazı) imsak/yatsı açısı hiç oluşmayabilir; o zaman
 * gecenin açıya orantılı bir bölümü kullanılır (açı tabanlı kural).
 */
import { tzOffset, ymdIn, Ymd, hhmm } from './tz';
import { toHijri } from './hijri';

export type VakitKey = 'imsak' | 'gunes' | 'ogle' | 'ikindi' | 'aksam' | 'yatsi';

export const VAKIT_KEYS: VakitKey[] = ['imsak', 'gunes', 'ogle', 'ikindi', 'aksam', 'yatsi'];

/** Türkçe adlar; ekranda t(VAKIT_NAMES[k]) ile çevrilir. */
export const VAKIT_NAMES: Record<VakitKey, string> = {
  imsak: 'İmsak',
  gunes: 'Güneş',
  ogle: 'Öğle',
  ikindi: 'İkindi',
  aksam: 'Akşam',
  yatsi: 'Yatsı',
};

export type PrayerTimes = Record<VakitKey, Date>;

export type MethodId =
  | 'diyanet' | 'mwl' | 'isna' | 'egypt' | 'ummalqura' | 'karachi' | 'dubai' | 'kuwait' | 'qatar'
  | 'singapore' | 'jakim' | 'kemenag' | 'tehran' | 'france' | 'russia' | 'algeria' | 'morocco' | 'tunisia';

type Method = {
  /** Ekranda görünen ad (kurumların kendi adı, çevrilmez) */
  name: string;
  fajr: number;
  /** Yatsı açısı ya da akşamdan sonra dakika */
  isha: number | { min: number; ramadan?: number };
  /** Akşam için açı (yalnız Tahran) */
  maghribAngle?: number;
  adjust?: Partial<Record<VakitKey, number>>;
};

export const METHODS: Record<MethodId, Method> = {
  diyanet: { name: 'Diyanet İşleri Başkanlığı', fajr: 18, isha: 17, adjust: { gunes: -7, ogle: 5, ikindi: 4, aksam: 7 } },
  mwl: { name: 'Muslim World League', fajr: 18, isha: 17, adjust: { ogle: 1 } },
  isna: { name: 'ISNA (North America)', fajr: 15, isha: 15, adjust: { ogle: 1 } },
  egypt: { name: 'Egyptian General Authority of Survey', fajr: 19.5, isha: 17.5, adjust: { ogle: 1 } },
  ummalqura: { name: 'Umm al-Qura, Makkah', fajr: 18.5, isha: { min: 90, ramadan: 120 } },
  karachi: { name: 'University of Islamic Sciences, Karachi', fajr: 18, isha: 18, adjust: { ogle: 1 } },
  dubai: { name: 'Dubai (UAE)', fajr: 18.2, isha: 18.2, adjust: { gunes: -3, ogle: 3, ikindi: 3, aksam: 3 } },
  kuwait: { name: 'Kuwait', fajr: 18, isha: 17.5 },
  qatar: { name: 'Qatar', fajr: 18, isha: { min: 90 } },
  singapore: { name: 'MUIS Singapore', fajr: 20, isha: 18, adjust: { ogle: 1 } },
  jakim: { name: 'JAKIM Malaysia', fajr: 20, isha: 18, adjust: { ogle: 1 } },
  kemenag: { name: 'Kemenag Indonesia', fajr: 20, isha: 18, adjust: { ogle: 1 } },
  tehran: { name: 'Institute of Geophysics, Tehran', fajr: 17.7, isha: 14, maghribAngle: 4.5 },
  france: { name: 'UOIF (France)', fajr: 12, isha: 12 },
  russia: { name: 'ДУМ России (Russia)', fajr: 16, isha: 15 },
  algeria: { name: 'Algeria', fajr: 18, isha: 17, adjust: { aksam: 3 } },
  morocco: { name: 'Morocco', fajr: 19, isha: 17, adjust: { gunes: -3, ogle: 5, aksam: 5 } },
  tunisia: { name: 'Tunisia', fajr: 18, isha: 18 },
};

export const METHOD_IDS = Object.keys(METHODS) as MethodId[];

/** İkindi: standart (Şâfiî/Mâlikî/Hanbelî, Diyanet) ya da Hanefî (gölge iki boy). */
export type AsrSchool = 'standard' | 'hanafi';

const COUNTRY_METHOD: Record<string, MethodId> = {
  TR: 'diyanet', CY: 'diyanet',
  SA: 'ummalqura', YE: 'ummalqura', OM: 'ummalqura', BH: 'ummalqura',
  AE: 'dubai', KW: 'kuwait', QA: 'qatar',
  EG: 'egypt', SD: 'egypt', LY: 'egypt', SY: 'egypt', LB: 'egypt', JO: 'egypt', IQ: 'egypt', PS: 'egypt',
  PK: 'karachi', IN: 'karachi', BD: 'karachi', AF: 'karachi',
  US: 'isna', CA: 'isna',
  SG: 'singapore', BN: 'singapore', MY: 'jakim', ID: 'kemenag',
  IR: 'tehran', FR: 'france', RU: 'russia',
  DZ: 'algeria', MA: 'morocco', TN: 'tunisia',
};
const HANAFI_COUNTRIES = new Set(['PK', 'IN', 'BD', 'AF']);

/**
 * Ülkenin yaygın yöntemi. Uygulama Türkçe kullanılıyorsa her ülkede Diyanet
 * (Diyanet yurt dışı şehirleri için de vakit yayınlar; gurbetçiler bunu bekler).
 */
export function defaultMethod(country: string | undefined, lang: string): MethodId {
  if (lang === 'tr') return 'diyanet';
  return (country && COUNTRY_METHOD[country]) || 'mwl';
}
export function defaultAsr(country: string | undefined, lang: string): AsrSchool {
  if (lang === 'tr') return 'standard';
  return country && HANAFI_COUNTRIES.has(country) ? 'hanafi' : 'standard';
}

export type CalcOptions = { tz?: string; method?: MethodId; asr?: AsrSchool };

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
 * Tek bir günün vakitleri. `date` Date ise o anın, seçili şehrin saat dilimindeki takvim günü alınır.
 * Dönen Date nesneleri gerçek anlardır; ekranda formatTime(d, tz) ile şehrin saatiyle gösterilir.
 */
export function getPrayerTimes(date: Date | Ymd, lat: number, lng: number, opts: CalcOptions = {}): PrayerTimes {
  const { y, m, d } = date instanceof Date ? ymdIn(date, opts.tz) : date;
  const method = METHODS[opts.method ?? 'diyanet'];
  const asrFactor = opts.asr === 'hanafi' ? 2 : 1;
  const jDate = julian(y, m, d) - lng / (15 * 24);

  // Saatler yerel ortalama güneş saatiyle hesaplanır, sonra UTC'ye çevrilir.
  const midDay = (t: number) => {
    const { eqt } = sunPosition(jDate + t / 24);
    return fixHour(12 - eqt);
  };
  /** Açı hiç oluşmuyorsa (yüksek enlem) NaN */
  const sunAngleTime = (angle: number, t: number, ccw: boolean) => {
    const { decl } = sunPosition(jDate + t / 24);
    const noon = midDay(t);
    const cosT =
      (-Math.sin(rad(angle)) - Math.sin(rad(decl)) * Math.sin(rad(lat))) /
      (Math.cos(rad(decl)) * Math.cos(rad(lat)));
    if (cosT < -1 || cosT > 1) return NaN;
    const T = deg(Math.acos(cosT)) / 15;
    return noon + (ccw ? -T : T);
  };
  const asrTime = (factor: number, t: number) => {
    const { decl } = sunPosition(jDate + t / 24);
    const angle = -deg(Math.atan(1 / (factor + Math.tan(rad(Math.abs(lat - decl))))));
    return sunAngleTime(angle, t, false);
  };
  const keep = (v: number, prev: number) => (Number.isFinite(v) ? v : prev);

  // Yaklaşık saatlerle başla, iki tur hassaslaştır.
  let t = { imsak: 5, gunes: 6, ogle: 12, ikindi: 13, aksam: 18, yatsi: 18 } as Record<VakitKey, number>;
  let raw = { ...t };
  for (let i = 0; i < 2; i++) {
    raw = {
      imsak: sunAngleTime(method.fajr, t.imsak, true),
      gunes: sunAngleTime(0.833, t.gunes, true),
      ogle: midDay(t.ogle),
      ikindi: asrTime(asrFactor, t.ikindi),
      aksam: sunAngleTime(method.maghribAngle ?? 0.833, t.aksam, false),
      yatsi: typeof method.isha === 'number' ? sunAngleTime(method.isha, t.yatsi, false) : NaN,
    };
    t = {
      imsak: keep(raw.imsak, t.imsak),
      gunes: keep(raw.gunes, t.gunes),
      ogle: raw.ogle,
      ikindi: keep(raw.ikindi, t.ikindi),
      aksam: keep(raw.aksam, t.aksam),
      yatsi: keep(raw.yatsi, t.yatsi),
    };
  }

  // Güneşin hiç doğmadığı/batmadığı kutup günleri: öğleden ±6 saat varsay.
  if (!Number.isFinite(raw.gunes)) t.gunes = raw.ogle - 6;
  if (!Number.isFinite(raw.aksam)) t.aksam = raw.ogle + 6;
  const sunset = method.maghribAngle ? sunAngleTime(0.833, t.aksam, false) : t.aksam;

  // Yatsı dakikayla tanımlıysa (Ümmü'l-Kurâ, Katar)
  if (typeof method.isha !== 'number') {
    const ramazan = toHijri(new Date(y, m - 1, d, 12)).month === 9;
    t.yatsi = (Number.isFinite(sunset) ? sunset : t.aksam) + ((ramazan && method.isha.ramadan) || method.isha.min) / 60;
  }

  // Yüksek enlem: açı oluşmuyorsa ya da gece yarısını aşıyorsa açı tabanlı kural
  const night = 24 - (t.aksam - t.gunes);
  const fajrPart = (method.fajr / 60) * night;
  if (!Number.isFinite(raw.imsak) || (Math.abs(lat) >= 48 && t.gunes - t.imsak > fajrPart)) t.imsak = t.gunes - fajrPart;
  if (typeof method.isha === 'number') {
    const ishaPart = (method.isha / 60) * night;
    if (!Number.isFinite(raw.yatsi) || (Math.abs(lat) >= 48 && t.yatsi - t.aksam > ishaPart)) t.yatsi = t.aksam + ishaPart;
  }

  const lmtToUtc = -lng / 15;
  const out = {} as PrayerTimes;
  for (const k of VAKIT_KEYS) {
    const utcHours = t[k] + lmtToUtc + (method.adjust?.[k] ?? 0) / 60;
    out[k] = new Date(Date.UTC(y, m - 1, d) + Math.round(utcHours * 60) * 60000);
  }

  // Çok doğuda/batıda UTC günü ile yerel gün kayabilir: öğleyi şehrin o gününe yerleştir,
  // diğer vakitleri öğleye göre ±12 saat içinde tut (yatsı gece yarısını geçebilir).
  if (opts.tz) {
    const dayStart = Date.UTC(y, m - 1, d) - tzOffset(opts.tz, Date.UTC(y, m - 1, d, 12)) * 60000;
    let noon = out.ogle.getTime();
    while (noon < dayStart) noon += 86400000;
    while (noon >= dayStart + 86400000) noon -= 86400000;
    for (const k of VAKIT_KEYS) {
      let v = out[k].getTime();
      while (v < noon - 43200000) v += 86400000;
      while (v > noon + 43200000) v -= 86400000;
      out[k] = new Date(v);
    }
    out.ogle = new Date(noon);
  }
  return out;
}

/** Şu andan sonraki ilk vakit (gerekirse yarının imsakı). */
export function getNextPrayer(now: Date, lat: number, lng: number, opts: CalcOptions = {}): { key: VakitKey; time: Date } {
  const today = getPrayerTimes(now, lat, lng, opts);
  for (const k of VAKIT_KEYS) {
    if (today[k].getTime() > now.getTime()) return { key: k, time: today[k] };
  }
  const tomorrow = getPrayerTimes(new Date(now.getTime() + 86400000), lat, lng, opts);
  return { key: 'imsak', time: tomorrow.imsak };
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

/** Saat:dakika — tz verilirse o şehrin saatiyle, yoksa cihaz saatiyle. */
export function formatTime(d: Date, tz?: string): string {
  return hhmm(d, tz);
}

export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
}
