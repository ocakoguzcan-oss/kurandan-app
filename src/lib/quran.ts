// Kur'an-ı Kerim verisi: Medine Mushafı sayfa düzeni, kelimeler, sure adları ve
// Husarî tilavetinin kelime zamanlamaları. Kaynak: Quran Foundation (api.quran.com v4).
// Her şey ilk açılışta indirilir ve cihazda saklanır; sonraki açılışlar internetsiz çalışır.
import * as Font from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SURE_ADLARI } from '../data/sureler';
import { getLang, QURAN_TRANSLATION, QURAN_TRANSLATION_NAME, t } from '../i18n';

const API = 'https://api.quran.com/api/v4';
const FONT_URL = (page: number) => `https://verses.quran.foundation/fonts/quran/hafs/v2/ttf/p${page}.ttf`;
export const RECITER_ID = 6; // Mahmud Halil el-Husarî (Murattal)
export const TOTAL_PAGES = 604;

/** Seçili dilin meali (Türkçe: Diyanet; Arapçada meal yok, Türkçe veri kullanılır ama gösterilmez) */
const translationId = () => QURAN_TRANSLATION[getLang()] ?? 77;
export const hasMeal = () => QURAN_TRANSLATION[getLang()] != null;
export function attribution(): string {
  const base = t('Mushaf sayfaları, Kur’an fontları ve Husarî tilaveti Quran Foundation (quran.com) tarafından sağlanmaktadır.');
  return hasMeal() ? `${base} ${t('Meal')}: ${QURAN_TRANSLATION_NAME[getLang()]}.` : base;
}

export type QWord = {
  id: number;
  line: number;
  code: string; // QCF V2 glif kodu (sayfa fontuyla çizilir)
  text: string; // Uthmani metin (yedek gösterim)
  isEnd: boolean; // ayet sonu işareti
  verseKey: string; // "2:255"
  chapter: number;
  verse: number;
  position: number; // ayet içindeki sıra (1'den)
};

export type QPage = {
  page: number;
  juz: number;
  words: QWord[];
  lineCount: number; // 1–2. sayfa 8, diğerleri 15
  /** Sure başlığı / besmele için boş bırakılan satırlar */
  headers: { line: number; kind: 'surah' | 'bismillah'; chapter: number }[];
  firstChapter: number;
  /** Ayet anahtarı → Türkçe meal */
  meals: Record<string, string>;
};

export type Chapter = { id: number; nameTr: string; nameAr: string; nameSimple?: string; pages: [number, number]; verses: number };

/** Surenin seçili dildeki adı: Türkçe (Diyanet yazımı), Arapça ya da Latin harfli uluslararası ad */
export function chapterName(c: Chapter): string {
  const l = getLang();
  if (l === 'tr') return c.nameTr;
  if (l === 'ar') return c.nameAr;
  return c.nameSimple ?? c.nameTr;
}

export type VerseTiming = { from: number; to: number; segments: [number, number, number][] };
export type ChapterAudio = { chapter: number; url: string; timings: Record<string, VerseTiming> };

// Medine Mushafı cüz başlangıç sayfaları
export const JUZ_START_PAGES = [
  1, 22, 42, 62, 82, 102, 121, 142, 162, 182, 201, 222, 242, 262, 282,
  302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582,
];
export const juzOfPage = (page: number) => {
  let j = 1;
  JUZ_START_PAGES.forEach((p, i) => {
    if (page >= p) j = i + 1;
  });
  return j;
};

const mem = new Map<string, unknown>();
async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (mem.has(key)) return mem.get(key) as T;
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const v = JSON.parse(raw) as T;
      mem.set(key, v);
      return v;
    }
  } catch {
    // önbellek okunamazsa ağdan alınır
  }
  const v = await load();
  mem.set(key, v);
  AsyncStorage.setItem(key, JSON.stringify(v)).catch(() => {});
  return v;
}

async function getJson(url: string) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function getChapters(): Promise<Chapter[]> {
  return cached('quran.chapters.v3', async () => {
    const json = await getJson(`${API}/chapters?language=tr`);
    return (json.chapters as any[]).map((c) => ({
      id: c.id,
      nameTr: SURE_ADLARI[c.id - 1] ?? c.name_simple,
      nameAr: c.name_arabic,
      nameSimple: c.name_simple,
      pages: c.pages as [number, number],
      verses: c.verses_count,
    }));
  });
}

export function getPage(page: number): Promise<QPage> {
  const tid = translationId();
  // Türkçe sayfalar eski anahtarla saklı (yeniden indirilmesin)
  const key = tid === 77 ? `quran.page.v2.${page}` : `quran.page.v3.${tid}.${page}`;
  return cached(key, async () => {
    const json = await getJson(
      `${API}/verses/by_page/${page}?words=true&per_page=50&word_fields=line_number,code_v2,text_uthmani,page_number&translations=${tid}`
    );
    const words: QWord[] = [];
    const meals: Record<string, string> = {};
    for (const v of json.verses as any[]) {
      const tr = (v.translations as any[] | undefined)?.find((x) => x.resource_id === tid) ?? v.translations?.[0];
      if (tr?.text) meals[v.verse_key] = cleanMeal(tr.text);
      const [c, n] = String(v.verse_key).split(':').map(Number);
      for (const w of v.words as any[]) {
        if (w.page_number && w.page_number !== page) continue;
        words.push({
          id: w.id,
          line: w.line_number,
          code: w.code_v2 ?? '',
          text: w.text_uthmani ?? w.text ?? '',
          isEnd: w.char_type_name === 'end',
          verseKey: v.verse_key,
          chapter: c,
          verse: n,
          position: w.position,
        });
      }
    }
    const lineCount = page <= 2 ? 8 : 15;
    const used = new Set(words.map((w) => w.line));
    // Boş satırlar: sure başlığı ve besmele. Yeni başlayan her surenin 1. ayetinden önce gelirler.
    const headers: QPage['headers'] = [];
    const starts = words.filter((w) => w.verse === 1 && w.position === 1);
    for (const s of starts) {
      const empties: number[] = [];
      for (let l = s.line - 1; l >= 1 && !used.has(l) && empties.length < 2; l--) empties.unshift(l);
      if (s.chapter === 1 || s.chapter === 9) {
        if (empties.length) headers.push({ line: empties[empties.length - 1], kind: 'surah', chapter: s.chapter });
      } else if (empties.length >= 2) {
        headers.push({ line: empties[0], kind: 'surah', chapter: s.chapter });
        headers.push({ line: empties[1], kind: 'bismillah', chapter: s.chapter });
      } else if (empties.length === 1) {
        headers.push({ line: empties[0], kind: 'surah', chapter: s.chapter });
      }
    }
    // Sayfanın sonunda başlayan sure: başlık satırları alttadır, ayetler sonraki sayfadadır.
    const maxLine = Math.max(0, ...words.map((w) => w.line));
    if (maxLine < lineCount && page < TOTAL_PAGES) {
      const nextChapter = (words[words.length - 1]?.chapter ?? 0) + 1;
      const trailing = [];
      for (let l = maxLine + 1; l <= lineCount; l++) trailing.push(l);
      if (trailing.length >= 1) headers.push({ line: trailing[0], kind: 'surah', chapter: nextChapter });
      if (trailing.length >= 2 && nextChapter !== 9) headers.push({ line: trailing[1], kind: 'bismillah', chapter: nextChapter });
    }
    return {
      page,
      juz: juzOfPage(page),
      words,
      lineCount,
      headers,
      firstChapter: words[0]?.chapter ?? 1,
      meals,
    };
  });
}

/** Mealdeki dipnot işaretlerini ve HTML'i temizler. */
function cleanMeal(t: string) {
  return t
    .replace(/<sup[^>]*>.*?<\/sup>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, '\u2019')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getChapterAudio(chapter: number): Promise<ChapterAudio> {
  return cached(`quran.audio.v1.${RECITER_ID}.${chapter}`, async () => {
    const json = await getJson(`${API}/chapter_recitations/${RECITER_ID}/${chapter}?segments=true`);
    const f = json.audio_file;
    const timings: Record<string, VerseTiming> = {};
    for (const t of (f.timestamps ?? []) as any[]) {
      timings[t.verse_key] = {
        from: t.timestamp_from,
        to: t.timestamp_to,
        segments: ((t.segments ?? []) as number[][])
          .filter((s) => Array.isArray(s) && s.length >= 3)
          .map((s) => [Number(s[0]), Number(s[1]), Number(s[2])] as [number, number, number]),
      };
    }
    return { chapter, url: f.audio_url, timings };
  });
}

const fontPromises = new Map<number, Promise<void>>();
export const pageFontFamily = (page: number) => `p${page}-v2`;

/** Sayfanın QCF V2 fontunu yükler (bir kez). */
export function ensurePageFont(page: number): Promise<void> {
  const fam = pageFontFamily(page);
  if (Font.isLoaded(fam)) return Promise.resolve();
  let p = fontPromises.get(page);
  if (!p) {
    p = Font.loadAsync({ [fam]: { uri: FONT_URL(page) } }).catch((e) => {
      fontPromises.delete(page);
      throw e;
    });
    fontPromises.set(page, p);
  }
  return p;
}

/** Sonraki sayfaları arka planda hazırlar. */
export function prefetchPages(from: number, count = 2) {
  for (let p = from; p < from + count && p <= TOTAL_PAGES; p++) {
    getPage(p)
      .then((pg) => {
        ensurePageFont(p).catch(() => {});
        new Set(pg.words.map((w) => w.chapter)).forEach((c) => getChapterAudio(c).catch(() => {}));
      })
      .catch(() => {});
  }
}

export type Chunk = { chapter: number; startMs: number; endMs: number; words: { id: number; start: number; end: number }[] };

/**
 * Verilen kelimeleri (bir satır ya da bütün sayfa) çalınacak ses parçalarına çevirir.
 * Her parça tek bir surenin ses dosyasındaki [başlangıç, bitiş] aralığıdır.
 * includeBismillah: sayfada yeni başlayan surelerde dosyanın başındaki besmeleyi de okut.
 */
export async function buildChunks(words: QWord[], includeBismillah: boolean): Promise<Chunk[]> {
  const real = words.filter((w) => !w.isEnd);
  const chunks: Chunk[] = [];
  for (const w of real) {
    const audio = await getChapterAudio(w.chapter);
    const t = audio.timings[w.verseKey];
    if (!t) continue;
    const seg = t.segments.find((s) => s[0] === w.position);
    // Zamanlaması olmayan kelimede ayetin tamamına düş.
    const start = seg ? seg[1] : t.from;
    const end = seg ? seg[2] : t.to;
    let c = chunks[chunks.length - 1];
    if (!c || c.chapter !== w.chapter) {
      c = { chapter: w.chapter, startMs: start, endMs: end, words: [] };
      if (includeBismillah && w.verse === 1 && w.position === 1 && w.chapter !== 1 && w.chapter !== 9) c.startMs = 0;
      chunks.push(c);
    }
    c.endMs = Math.max(c.endMs, end);
    c.words.push({ id: w.id, start, end });
  }
  return chunks;
}

export async function chapterAudioUrl(chapter: number) {
  return (await getChapterAudio(chapter)).url;
}
