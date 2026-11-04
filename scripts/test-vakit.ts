// Vakit hesaplamasını Diyanet'in yayımladığı İstanbul vakitleriyle karşılaştırır.
// Çalıştırma:  npm run test:vakit   (cihaz saat diliminden bağımsızdır; TZ=UTC ile de aynı sonuç)
import { getPrayerTimes, formatTime, VAKIT_KEYS, qiblaDirection, MethodId } from '../src/lib/prayerTimes.ts';
import { toHijri, formatHijriTr } from '../src/lib/hijri.ts';

const ISTANBUL = { lat: 41.0082, lng: 28.9784 };
// Diyanet, İstanbul (kaynak: CNN Türk namaz vakitleri sayfası, Kasım 2026)
const REF: Record<string, string[]> = {
  '2026-11-03': ['06:04', '07:30', '12:53', '15:39', '18:05', '19:26'],
  '2026-11-15': ['06:16', '07:44', '12:54', '15:29', '17:53', '19:16'],
  '2026-12-01': ['06:31', '08:02', '12:58', '15:22', '17:44', '19:09'],
};

const toMin = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
let worst = 0;
for (const [day, ref] of Object.entries(REF)) {
  const [y, m, d] = day.split('-').map(Number);
  const t = getPrayerTimes({ y, m, d }, ISTANBUL.lat, ISTANBUL.lng, { tz: 'Europe/Istanbul', method: 'diyanet' });
  const got = VAKIT_KEYS.map((k) => formatTime(t[k], 'Europe/Istanbul'));
  got.forEach((g, i) => (worst = Math.max(worst, Math.abs(toMin(g) - toMin(ref[i])))));
  console.log(day, 'hesap:', got.join(' '), '| Diyanet:', ref.join(' '));
}
console.log('En büyük fark:', worst, 'dk');
console.log('İstanbul kıble:', qiblaDirection(ISTANBUL.lat, ISTANBUL.lng).toFixed(1), '°');
console.log('Hicri (3 Kasım 2026):', formatHijriTr(toHijri(new Date(2026, 10, 3))));

// Diğer ülkeler: sıra ve makul aralık kontrolü (cihaz saat diliminden bağımsız olmalı)
const DIS: { ad: string; lat: number; lng: number; tz: string; method: MethodId; asr?: 'hanafi'; day: { y: number; m: number; d: number } }[] = [
  { ad: 'Mekke', lat: 21.4225, lng: 39.8262, tz: 'Asia/Riyadh', method: 'ummalqura', day: { y: 2026, m: 11, d: 4 } },
  { ad: 'Berlin', lat: 52.52, lng: 13.405, tz: 'Europe/Berlin', method: 'mwl', day: { y: 2026, m: 11, d: 4 } },
  { ad: 'Berlin (Diyanet)', lat: 52.52, lng: 13.405, tz: 'Europe/Berlin', method: 'diyanet', day: { y: 2026, m: 11, d: 4 } },
  { ad: 'Londra yazın', lat: 51.5074, lng: -0.1278, tz: 'Europe/London', method: 'mwl', day: { y: 2027, m: 6, d: 21 } },
  { ad: 'Oslo yazın', lat: 59.91, lng: 10.75, tz: 'Europe/Oslo', method: 'mwl', day: { y: 2027, m: 6, d: 21 } },
  { ad: 'Paris', lat: 48.8566, lng: 2.3522, tz: 'Europe/Paris', method: 'france', day: { y: 2026, m: 11, d: 4 } },
  { ad: 'Moskova', lat: 55.7558, lng: 37.6173, tz: 'Europe/Moscow', method: 'russia', day: { y: 2026, m: 11, d: 4 } },
  { ad: 'Kahire', lat: 30.0444, lng: 31.2357, tz: 'Africa/Cairo', method: 'egypt', day: { y: 2026, m: 11, d: 4 } },
  { ad: 'Karaçi (Hanefî)', lat: 24.8607, lng: 67.0011, tz: 'Asia/Karachi', method: 'karachi', asr: 'hanafi', day: { y: 2026, m: 11, d: 4 } },
  { ad: 'New York', lat: 40.7128, lng: -74.006, tz: 'America/New_York', method: 'isna', day: { y: 2026, m: 11, d: 4 } },
  { ad: 'Cakarta', lat: -6.2088, lng: 106.8456, tz: 'Asia/Jakarta', method: 'kemenag', day: { y: 2026, m: 11, d: 4 } },
  { ad: 'Los Angeles', lat: 34.05, lng: -118.24, tz: 'America/Los_Angeles', method: 'isna', day: { y: 2026, m: 11, d: 4 } },
  { ad: 'Auckland', lat: -36.85, lng: 174.76, tz: 'Pacific/Auckland', method: 'mwl', day: { y: 2026, m: 11, d: 4 } },
];
for (const c of DIS) {
  const t = getPrayerTimes(c.day, c.lat, c.lng, { tz: c.tz, method: c.method, asr: c.asr });
  const got = VAKIT_KEYS.map((k) => formatTime(t[k], c.tz));
  const ok = VAKIT_KEYS.every((k, i) => i === 0 || t[k].getTime() > t[VAKIT_KEYS[i - 1]].getTime()) && got.every((g) => /^\d\d:\d\d$/.test(g));
  console.log(c.ad.padEnd(18), got.join(' '), ok ? '' : '  ← SIRA HATASI');
  if (!ok) worst = 99;
}
if (worst > 2) {
  console.error('HATA: Fark 2 dakikayı geçti');
  process.exit(1);
}
