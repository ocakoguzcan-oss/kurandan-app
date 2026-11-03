// Cuma story görselinde kullanılan ayetler. Kullanıcı "Ayeti değiştir" ile aralarında gezer.
export type CumaAyet = { meal: string; kaynak: string };

export const CUMA_AYETLERI: CumaAyet[] = [
  {
    meal: 'Ey iman edenler! Cuma günü namaz için çağrıldığınızda Allah’ı anmaya koşun.',
    kaynak: 'Cuma Suresi · 9',
  },
  {
    meal: 'Namaz kılınınca yeryüzüne dağılın, Allah’ın lütfundan rızık arayın ve Allah’ı çok anın ki kurtuluşa eresiniz.',
    kaynak: 'Cuma Suresi · 10',
  },
  {
    meal: 'Bilesiniz ki kalpler ancak Allah’ı anmakla huzur bulur.',
    kaynak: 'Ra‘d Suresi · 28',
  },
  {
    meal: 'Allah ve melekleri Peygamber’e salât eder. Ey iman edenler! Siz de ona salât ve selâm edin.',
    kaynak: 'Ahzâb Suresi · 56',
  },
];

export type StoryTheme = { id: string; label: string; bg: string; frame: string; title: string; text: string; accent: string };

export const STORY_THEMES: StoryTheme[] = [
  { id: 'krem', label: 'Krem', bg: '#F0E7D4', frame: '#A87628', title: '#18583C', text: '#3B3A33', accent: '#A87628' },
  { id: 'yesil', label: 'Yeşil', bg: '#18583C', frame: '#E2C27A', title: '#F3ECDC', text: '#E6EFE7', accent: '#E2C27A' },
  { id: 'gece', label: 'Gece', bg: '#1F2A24', frame: '#C9A24E', title: '#F3ECDC', text: '#DCD5C4', accent: '#C9A24E' },
  { id: 'altin', label: 'Altın', bg: '#C9A24E', frame: '#18583C', title: '#0F3D29', text: '#2A2416', accent: '#0F3D29' },
];

/** Bu haftanın (ya da bugünün) Cuma günü. */
export function nextFriday(from: Date = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const diff = (5 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}
