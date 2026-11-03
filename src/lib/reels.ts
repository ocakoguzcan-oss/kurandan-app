import Constants from 'expo-constants';
import { load, save, KEYS } from './storage';

export type Reel = {
  id: string;
  caption: string;
  thumbnailUrl: string;
  videoUrl: string;
  permalink: string;
  timestamp: string;
};

export type ReelCategory = 'tumu' | 'sure' | 'dua' | 'hadis';

export const REEL_CATEGORIES: { id: ReelCategory; label: string; tags: string[] }[] = [
  { id: 'tumu', label: 'Tümü', tags: [] },
  { id: 'sure', label: 'Sureler', tags: ['#sure', '#ayet', '#kuran'] },
  { id: 'dua', label: 'Dualar', tags: ['#dua'] },
  { id: 'hadis', label: 'Hadisler', tags: ['#hadis'] },
];

/** Reels sunucusunun adresi: app.json → expo.extra.reelsApiUrl. */
function apiUrl(): string {
  const fromConfig = (Constants.expoConfig?.extra as { reelsApiUrl?: string } | undefined)?.reelsApiUrl;
  return (fromConfig || '').replace(/\/$/, '');
}

export function isReelsConfigured() {
  return apiUrl().length > 0;
}

export async function getCachedReels(): Promise<Reel[]> {
  return load<Reel[]>(KEYS.reelsCache, []);
}

/** Sunucudan güncel Reels listesini alır; başarısızsa önbellekteki listeyi döner. */
export async function fetchReels(): Promise<{ reels: Reel[]; fromCache: boolean }> {
  const base = apiUrl();
  if (!base) return { reels: await getCachedReels(), fromCache: true };
  try {
    const res = await fetch(`${base}/api/reels`);
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as { reels: Reel[] };
    await save(KEYS.reelsCache, json.reels);
    return { reels: json.reels, fromCache: false };
  } catch {
    return { reels: await getCachedReels(), fromCache: true };
  }
}

export function filterReels(reels: Reel[], cat: ReelCategory): Reel[] {
  const c = REEL_CATEGORIES.find((x) => x.id === cat);
  if (!c || c.tags.length === 0) return reels;
  return reels.filter((r) => {
    const cap = r.caption.toLocaleLowerCase('tr');
    return c.tags.some((t) => cap.includes(t));
  });
}

/** Açıklamanın ilk satırını (hashtag'ler olmadan) başlık olarak kullanır. */
export function reelTitle(r: Reel): string {
  const first = (r.caption || '').split('\n')[0].replace(/#\S+/g, '').trim();
  return first || 'Kurandan.ai';
}
