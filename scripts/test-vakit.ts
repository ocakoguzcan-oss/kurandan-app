// Vakit hesaplamasını Diyanet'in yayımladığı İstanbul vakitleriyle karşılaştırır.
// Çalıştırma:  TZ=Europe/Istanbul npm run test:vakit
import { getPrayerTimes, formatTime, VAKIT_KEYS, qiblaDirection } from '../src/lib/prayerTimes.ts';
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
  const t = getPrayerTimes(new Date(y, m - 1, d), ISTANBUL.lat, ISTANBUL.lng);
  const got = VAKIT_KEYS.map((k) => formatTime(t[k]));
  got.forEach((g, i) => (worst = Math.max(worst, Math.abs(toMin(g) - toMin(ref[i])))));
  console.log(day, 'hesap:', got.join(' '), '| Diyanet:', ref.join(' '));
}
console.log('En büyük fark:', worst, 'dk');
console.log('İstanbul kıble:', qiblaDirection(ISTANBUL.lat, ISTANBUL.lng).toFixed(1), '°');
console.log('Hicri (3 Kasım 2026):', formatHijriTr(toHijri(new Date(2026, 10, 3))));
if (worst > 2) {
  console.error('HATA: Fark 2 dakikayı geçti');
  process.exit(1);
}
