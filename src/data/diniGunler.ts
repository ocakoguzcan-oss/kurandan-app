// Diyanet takvimine göre dini günler ve geceler. Kandiller, tarihi verilen günün akşamı (gecesi) idrak edilir.
// Adlar Türkçe yazılır, ekranda t() ile çevrilir.
// Her yıl Diyanet yeni takvimi açıkladığında listeye ekleyin.
export type DiniGun = { date: string; name: string; kind: 'kandil' | 'bayram' | 'ramazan' | 'gun'; note?: string };

export const DINI_GUNLER: DiniGun[] = [
  { date: '2026-12-10', name: 'Üç Ayların Başlangıcı', kind: 'gun' },
  { date: '2026-12-10', name: 'Regaip Kandili', kind: 'kandil' },
  { date: '2027-01-04', name: 'Miraç Kandili', kind: 'kandil' },
  { date: '2027-01-22', name: 'Berat Kandili', kind: 'kandil' },
  { date: '2027-02-08', name: 'Ramazan Başlangıcı', kind: 'ramazan', note: 'İlk sahur 7 Şubat gecesi' },
  { date: '2027-03-05', name: 'Kadir Gecesi', kind: 'kandil' },
  { date: '2027-03-08', name: 'Ramazan Bayramı Arefesi', kind: 'bayram' },
  { date: '2027-03-09', name: 'Ramazan Bayramı', kind: 'bayram', note: '9–11 Mart' },
  { date: '2027-05-15', name: 'Kurban Bayramı Arefesi', kind: 'bayram' },
  { date: '2027-05-16', name: 'Kurban Bayramı', kind: 'bayram', note: '16–19 Mayıs' },
];

export function parseDay(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Bugün dahil, yaklaşan dini günler. */
export function upcomingDiniGunler(from: Date = new Date()) {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  return DINI_GUNLER.map((g) => ({ ...g, day: parseDay(g.date), daysLeft: Math.round((parseDay(g.date).getTime() - today) / 86400000) }))
    .filter((g) => g.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}
