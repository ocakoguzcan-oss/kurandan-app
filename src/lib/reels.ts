import Constants from 'expo-constants';
import { load, save, KEYS } from './storage';
import { tx } from '../i18n';

export type Reel = {
  id: string;
  caption: string;
  thumbnailUrl: string;
  videoUrl: string;
  permalink: string;
  timestamp: string;
};

export type ReelCategory = 'tumu' | 'kuran' | 'siyer' | 'ibadet' | 'aile';

// Kategoriler, Instagram açıklamasındaki etiketlere göre (ör. #kuran, #hadis) belirlenir.
export const REEL_CATEGORIES: { id: ReelCategory; label: string; tags: string[] }[] = [
  { id: 'tumu', label: tx('Tümü'), tags: [] },
  { id: 'kuran', label: tx('Kur’an'), tags: ['kuran', 'kurankerim', 'ayet', 'ayetelkursi', 'ayetelkürsi', 'fatiha', 'fatihasuresi', 'sure'] },
  { id: 'siyer', label: tx('Hadis & Siyer'), tags: ['hadis', 'peygamberimiz', 'hzmuhammed', 'sünnet', 'salavat', 'şefaat', 'sonvasiyet', 'hzhatice'] },
  { id: 'ibadet', label: tx('İbadet'), tags: ['namaz', 'sabahnamazı', 'hac', 'umre', 'tavaf', 'kabe', 'ihram', 'dua', 'tövbe', 'zikir'] },
  { id: 'aile', label: tx('Aile'), tags: ['evlilik', 'hayırlıeş', 'nasip'] },
];

/** Açıklamadaki etiketler (küçük harf, # olmadan). "#kurandanai" "#kuran" sayılmaz. */
function hashtags(caption: string): Set<string> {
  return new Set((caption.match(/#[\p{L}\p{N}_]+/gu) ?? []).map((t) => t.slice(1).toLocaleLowerCase('tr')));
}

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
    const tags = hashtags(r.caption);
    return c.tags.some((t) => tags.has(t));
  });
}

/** Açıklamanın ilk satırını (hashtag'ler olmadan) başlık olarak kullanır. */
export function reelTitle(r: Reel): string {
  const first = (r.caption || '').split('\n')[0].replace(/#\S+/g, '').trim();
  return first || 'Kurandan.ai';
}
