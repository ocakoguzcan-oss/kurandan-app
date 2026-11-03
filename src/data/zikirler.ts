export type Zikir = { id: string; name: string; arabic: string; meaning: string; target: number };

export const ZIKIRLER: Zikir[] = [
  { id: 'subhanallah', name: 'Sübhanallah', arabic: 'سُبْحَانَ اللّٰهِ', meaning: 'Allah her türlü eksiklikten münezzehtir', target: 33 },
  { id: 'elhamdulillah', name: 'Elhamdülillah', arabic: 'اَلْحَمْدُ لِلّٰهِ', meaning: 'Hamd Allah’a mahsustur', target: 33 },
  { id: 'allahuekber', name: 'Allahu Ekber', arabic: 'اَللّٰهُ أَكْبَرُ', meaning: 'Allah en büyüktür', target: 34 },
  { id: 'tevhid', name: 'Kelime-i Tevhid', arabic: 'لَا إِلٰهَ إِلَّا اللّٰهُ', meaning: 'Allah’tan başka ilah yoktur', target: 100 },
  { id: 'estagfirullah', name: 'Estağfirullah', arabic: 'أَسْتَغْفِرُ اللّٰهَ', meaning: 'Allah’tan bağışlanma dilerim', target: 100 },
];
