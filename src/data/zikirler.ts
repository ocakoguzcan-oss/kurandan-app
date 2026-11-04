import { tx } from '../i18n';

// Adlar ve anlamlar Türkçe yazılır, ekranda t() ile çevrilir.
export type Zikir = { id: string; name: string; arabic: string; meaning: string; target: number };

export const ZIKIRLER: Zikir[] = [
  { id: 'subhanallah', name: tx('Sübhanallah'), arabic: 'سُبْحَانَ اللّٰهِ', meaning: tx('Allah her türlü eksiklikten münezzehtir'), target: 33 },
  { id: 'elhamdulillah', name: tx('Elhamdülillah'), arabic: 'اَلْحَمْدُ لِلّٰهِ', meaning: tx('Hamd Allah’a mahsustur'), target: 33 },
  { id: 'allahuekber', name: tx('Allahu Ekber'), arabic: 'اَللّٰهُ أَكْبَرُ', meaning: tx('Allah en büyüktür'), target: 34 },
  { id: 'tevhid', name: tx('Kelime-i Tevhid'), arabic: 'لَا إِلٰهَ إِلَّا اللّٰهُ', meaning: tx('Allah’tan başka ilah yoktur'), target: 100 },
  { id: 'estagfirullah', name: tx('Estağfirullah'), arabic: 'أَسْتَغْفِرُ اللّٰهَ', meaning: tx('Allah’tan bağışlanma dilerim'), target: 100 },
];
