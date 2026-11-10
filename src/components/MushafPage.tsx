// Medine Mushafı'nın tek bir sayfası, basılı mushaf görünümünde: altın çift çerçeve, köşe
// süsleri, üstte sure adı ve cüz, altta sayfa numarası. Satırlar iki kenara tam yaslanır;
// yazı boyutu, sayfanın en uzun satırı ekran genişliğine tam oturacak şekilde ölçülerek bulunur.
//
// Yazı boyutu kademeleri:
//   1 = Mushaf  — sayfanın tamamı ekranda, satırlar mushaftaki gibi
//   2 = Büyük   — her mushaf satırı kendi bloğunda, yazı ~1.4 kat, sayfa aşağı kayar
//   3 = Çok büyük — yazı ~1.8 kat
// Her kademede bir satıra dokunmak o mushaf satırını okutur.
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text as RNText, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { Text } from './Text';
import { colors, fonts } from '../theme';
import { Chapter, chapterName, ensurePageFont, getPage, pageFontFamily, QPage, QWord } from '../lib/quran';
import type { MushafSize } from '../lib/prefs';
import { t, isRTL } from '../i18n';

const BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toArabicDigits = (n: number) => String(n).replace(/\d/g, (c) => AR_DIGITS[Number(c)]);
const SIZE_SCALE: Record<MushafSize, number> = { 1: 1, 2: 1.4, 3: 1.8 };

// Ölçü düzeni (çerçeve kalınlıkları ve boşluklar)
const OUTER = 6; // ekran kenarı ile çerçeve arası
const FRAME1 = 2; // dış altın çizgi
const FRAME_GAP = 3; // iki çizgi arası
const FRAME2 = 1; // iç yeşil çizgi
const PAD_X = 8;
const PAD_Y = 14; // üst/alt etiketlere yer
const F0 = 20; // ölçüm için temel yazı boyutu
const WORD_GAP = 0.06; // kelimeler arası en küçük boşluk (yazı boyutuna oranla)

/** Ölçülen doğal satır genişlikleri (F0 boyutunda), sayfa + yazı tipi durumuna göre önbellekte. */
const measureCache = new Map<string, Record<number, number>>();

type Props = {
  page: number;
  width: number;
  height: number;
  size: MushafSize;
  chapters: Chapter[];
  activeWordId: number | null;
  activeLine: number | null;
  onLinePress: (page: number, line: number, words: QWord[]) => void;
  /** 'word' iken kelimeye dokununca yalnızca o kelime okunur */
  tapMode: 'line' | 'word';
  onWordPress: (page: number, word: QWord) => void;
  /** Satırların altında Türkçe meal */
  showMeal: boolean;
};

type FontState = 'loading' | 'ready' | 'failed';

function MushafPageInner({ page, width, height, size, chapters, activeWordId, activeLine, onLinePress, tapMode, onWordPress, showMeal }: Props) {
  const [data, setData] = useState<QPage | null>(null);
  const [fontState, setFontState] = useState<FontState>('loading');
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const cacheKey = `${page}:${fontState}`;
  const [widths, setWidths] = useState<Record<number, number> | null>(() => measureCache.get(cacheKey) ?? null);
  const pending = useRef<Record<number, number>>({});
  const scrollRef = useRef<ScrollView>(null);
  const lineY = useRef<Record<number, number>>({});

  useEffect(() => {
    let alive = true;
    setError(false);
    getPage(page)
      .then((d) => alive && setData(d))
      .catch(() => alive && setError(true));
    ensurePageFont(page)
      .then(() => alive && setFontState('ready'))
      .catch(() => alive && setFontState('failed'));
    return () => {
      alive = false;
    };
  }, [page, retry]);

  // Yazı tipi değişince yeniden ölç
  useEffect(() => {
    pending.current = {};
    setWidths(measureCache.get(cacheKey) ?? null);
  }, [cacheKey]);

  const byLine = useMemo(() => {
    const m = new Map<number, QWord[]>();
    data?.words.forEach((w) => {
      const arr = m.get(w.line) ?? [];
      arr.push(w);
      m.set(w.line, arr);
    });
    return m;
  }, [data]);

  const lineOfWord = useMemo(() => {
    const m = new Map<number, number>();
    data?.words.forEach((w) => m.set(w.id, w.line));
    return m;
  }, [data]);

  // Büyük yazıda okunan satır görünür kalsın
  const activeLineNow = activeLine ?? (activeWordId != null ? lineOfWord.get(activeWordId) ?? null : null);
  useEffect(() => {
    if (size === 1 || activeLineNow == null) return;
    const y = lineY.current[activeLineNow];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 60), animated: true });
  }, [activeLineNow, size]);

  const innerW = width - 2 * (OUTER + FRAME1 + FRAME_GAP + FRAME2 + PAD_X);
  const innerH = height - 2 * (OUTER + FRAME1 + FRAME_GAP + FRAME2 + PAD_Y);

  if (error) {
    return (
      <View style={[st.center, { width, height }]}>
        <Text style={st.msg}>{t('Sayfa yüklenemedi. İnternet bağlantınızı kontrol edin.')}</Text>
        <Pressable accessibilityRole="button" onPress={() => setRetry(retry + 1)} style={st.retry}>
          <Text style={st.retryText}>{t('Tekrar dene')}</Text>
        </Pressable>
      </View>
    );
  }

  const lineCount = data?.lineCount ?? 15;
  const centeredPage = page <= 2;
  const useQcf = fontState === 'ready';
  const wordText = (w: QWord) => (useQcf ? w.code : w.text);
  const wordFont = (fontSize: number) =>
    useQcf ? { fontFamily: pageFontFamily(page), fontSize } : { fontFamily: fonts.arabic, fontSize: fontSize * 0.9 };

  const ready = data && fontState !== 'loading';
  const measuring = ready && !widths;

  // ---- Ölçüm: her satır doğal genişliğinde, görünmez çizilir
  if (!ready || measuring) {
    const onLine = (line: number) => (e: LayoutChangeEvent) => {
      pending.current[line] = e.nativeEvent.layout.width;
      if (Object.keys(pending.current).length >= byLine.size) {
        const result = { ...pending.current };
        measureCache.set(cacheKey, result);
        setWidths(result);
      }
    };
    return (
      <View style={{ width, height }}>
        <Frame width={width} height={height} />
        <View style={[StyleSheet.absoluteFill, st.center]}>
          <ActivityIndicator color={colors.greenText} />
        </View>
        {measuring && (
          <View style={st.measureBox} pointerEvents="none">
            {Array.from(byLine.entries()).map(([line, words]) => (
              <View key={line} onLayout={onLine(line)} style={[st.measureLine, { columnGap: F0 * WORD_GAP }]}>
                {words.map((w) => (
                  <RNText key={w.id} allowFontScaling={false} style={[wordFont(F0), st.word]}>
                    {w.isEnd ? endMark(w.verse) : wordText(w)}
                  </RNText>
                ))}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  }

  const widest = Math.max(1, ...Object.values(widths!));
  const fitFont = (F0 * innerW) / widest * 0.985;
  const chapterOf = (id: number) => chapters.find((c) => c.id === id);
  const firstCh = chapterOf(data!.firstChapter);

  const renderWord = (w: QWord, fontSize: number) => {
    const el = <Word key={w.id} w={w} text={wordText(w)} style={wordFont(fontSize)} endSize={fontSize} active={w.id === activeWordId} />;
    if (tapMode !== 'word' || w.isEnd) return el;
    return (
      <Pressable
        key={w.id}
        accessibilityRole="button"
        accessibilityLabel={t('Bu kelimeyi dinle')}
        onPress={() => onWordPress(page, w)}
        hitSlop={4}
        style={({ pressed }) => pressed && st.wordPressed}
      >
        {el}
      </Pressable>
    );
  };

  // ---- 1. kademe: tam sayfa mushaf (mealsiz)
  if (size === 1 && !showMeal) {
    const lineH = innerH / 15;
    const fontSize = Math.min(fitFont, lineH / 1.4);
    const gap = fontSize * WORD_GAP;
    return (
      <View style={{ width, height }}>
        <Frame width={width} height={height} topRight={firstCh?.nameAr} topLeft={`الجزء ${toArabicDigits(data!.juz)}`} page={page} />
        <View style={[st.content, { justifyContent: centeredPage ? 'center' : 'flex-start' }]}>
          {Array.from({ length: lineCount }, (_, i) => i + 1).map((line) => {
            const header = data!.headers.find((h) => h.line === line);
            if (header) return <HeaderLine key={line} kind={header.kind} chapter={chapterOf(header.chapter)} height={lineH} />;
            const words = byLine.get(line);
            if (!words) return centeredPage ? null : <View key={line} style={{ height: lineH }} />;
            const short = centeredPage || (widths![line] ?? widest) < widest * 0.72;
            return (
              <Pressable
                key={line}
                accessibilityRole="button"
                accessibilityLabel={t('{n}. satırı dinle', { n: line })}
                onPress={() => onLinePress(page, line, data!.words)}
                style={({ pressed }) => [
                  st.line,
                  { height: lineH, columnGap: gap, justifyContent: short ? 'center' : 'space-between' },
                  (activeLineNow === line || pressed) && st.lineActive,
                ]}
              >
                {words.map((w) => renderWord(w, fontSize))}
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  // ---- Büyük yazı ya da meal: satır blokları, dikey kaydırma
  const fontSize = Math.min(fitFont, innerH / 15 / 1.4) * SIZE_SCALE[size];
  const gap = fontSize * 0.16;
  const mealSize = 15 * (size === 1 ? 1 : size === 2 ? 1.12 : 1.25);
  return (
    <View style={{ width, height }}>
      <Frame width={width} height={height} topRight={firstCh?.nameAr} topLeft={`الجزء ${toArabicDigits(data!.juz)}`} page={page} />
      <ScrollView ref={scrollRef} style={st.content} contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        {Array.from({ length: lineCount }, (_, i) => i + 1).map((line) => {
          const header = data!.headers.find((h) => h.line === line);
          if (header)
            return (
              <View key={line} onLayout={(e) => (lineY.current[line] = e.nativeEvent.layout.y)}>
                <HeaderLine kind={header.kind} chapter={chapterOf(header.chapter)} height={fontSize * 1.9} />
              </View>
            );
          const words = byLine.get(line);
          if (!words) return null;
          // Bu satırda biten ayetlerin meali satırın altına yazılır
          const meals = showMeal
            ? words.filter((w) => w.isEnd && data!.meals[w.verseKey]).map((w) => ({ n: w.verse, key: w.verseKey, text: data!.meals[w.verseKey] }))
            : [];
          return (
            <View key={line} style={st.lineBlock} onLayout={(e) => (lineY.current[line] = e.nativeEvent.layout.y)}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('{n}. satırı dinle', { n: line })}
              onPress={() => onLinePress(page, line, data!.words)}
              style={({ pressed }) => [
                st.bigLine,
                { columnGap: gap, rowGap: fontSize * 0.1, paddingVertical: fontSize * 0.3, justifyContent: centeredPage ? 'center' : 'flex-start' },
                (activeLineNow === line || pressed) && st.lineActive,
              ]}
            >
              {words.map((w) => renderWord(w, fontSize))}
            </Pressable>
            {meals.map((m) => (
              <Text key={m.key} style={[st.meal, { fontSize: mealSize, lineHeight: mealSize * 1.45 }]}>
                <Text style={[st.mealNo, { fontSize: mealSize }]}>{`${m.n}. `}</Text>
                {m.text}
              </Text>
            ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function endMark(verse: number) {
  return `﴿${toArabicDigits(verse)}﴾`;
}

const Word = memo(function Word({ w, text, style, endSize, active }: { w: QWord; text: string; style: object; endSize: number; active: boolean }) {
  if (w.isEnd) {
    return (
      <RNText allowFontScaling={false} style={[st.end, { fontSize: endSize * 0.8, lineHeight: endSize * 1.5 }, active && st.wordActive]}>
        {endMark(w.verse)}
      </RNText>
    );
  }
  return (
    <RNText allowFontScaling={false} style={[style, st.word, active && st.wordActive]}>
      {text}
    </RNText>
  );
});

/** Sure başlığı (süslü bant) ya da besmele satırı */
function HeaderLine({ kind, chapter, height }: { kind: 'surah' | 'bismillah'; chapter?: Chapter; height: number }) {
  if (kind === 'bismillah') {
    return (
      <View style={[st.headerRow, { height }]}>
        <RNText allowFontScaling={false} style={[st.bismillah, { fontSize: height * 0.5, lineHeight: height * 0.95 }]} numberOfLines={1}>
          {BISMILLAH}
        </RNText>
      </View>
    );
  }
  const bandH = height * 0.82;
  return (
    <View style={[st.headerRow, { height }]}>
      <View style={[st.band, { height: bandH, borderRadius: bandH / 2 }]}>
        <View style={[st.bandInner, { borderRadius: bandH / 2 - 3 }]}>
          <Ornament size={bandH * 0.62} />
          <View style={st.bandCenter}>
            <RNText allowFontScaling={false} numberOfLines={1} style={[st.bandAr, { fontSize: bandH * 0.46, lineHeight: bandH * 0.86 }]}>
              {`سُورَةُ ${chapter?.nameAr ?? ''}`}
            </RNText>
          </View>
          {chapter ? (
            <RNText allowFontScaling={false} numberOfLines={1} style={[st.bandTr, { fontSize: Math.max(9, bandH * 0.24) }]}>
              {isRTL() ? String(chapter.id) : `${chapter.id}. ${chapterName(chapter)}`}
            </RNText>
          ) : (
            <Ornament size={bandH * 0.62} />
          )}
        </View>
      </View>
    </View>
  );
}

function Ornament({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G fill="none" stroke={colors.gold} strokeWidth={6}>
        <Rect x={22} y={22} width={56} height={56} />
        <Rect x={22} y={22} width={56} height={56} transform="rotate(45 50 50)" />
      </G>
      <Circle cx={50} cy={50} r={10} fill={colors.greenText} />
    </Svg>
  );
}

/** Sayfa çerçevesi: altın çift çizgi, köşe süsleri, üst etiketler ve sayfa numarası. */
function Frame({ width, height, topRight, topLeft, page }: { width: number; height: number; topRight?: string; topLeft?: string; page?: number }) {
  const corner = 16;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { padding: OUTER }]}>
      <View style={st.frameOuter}>
        <View style={st.frameInner} />
      </View>
      {[
        { top: OUTER - 5, left: OUTER - 5 },
        { top: OUTER - 5, right: OUTER - 5 },
        { bottom: OUTER - 5, left: OUTER - 5 },
        { bottom: OUTER - 5, right: OUTER - 5 },
      ].map((pos, i) => (
        <View key={i} style={[st.corner, pos, { width: corner, height: corner }]}>
          <Svg width={corner} height={corner} viewBox="0 0 100 100">
            <Rect x={18} y={18} width={64} height={64} fill={colors.paper} stroke={colors.gold} strokeWidth={9} transform="rotate(45 50 50)" />
            <Circle cx={50} cy={50} r={14} fill={colors.greenText} />
          </Svg>
        </View>
      ))}
      {topRight ? (
        <View style={[st.labelBox, { top: OUTER - 2, right: OUTER + 26 }]}>
          <RNText allowFontScaling={false} style={st.labelAr}>{topRight}</RNText>
        </View>
      ) : null}
      {topLeft ? (
        <View style={[st.labelBox, { top: OUTER - 2, left: OUTER + 26 }]}>
          <RNText allowFontScaling={false} style={st.labelAr}>{topLeft}</RNText>
        </View>
      ) : null}
      {page ? (
        <View style={[st.pageNo, { bottom: OUTER - 8, left: width / 2 - 20 }]}>
          <Svg width={40} height={22} viewBox="0 0 40 22" style={StyleSheet.absoluteFill}>
            <Path d="M4 11 L11 3 H29 L36 11 L29 19 H11 Z" fill={colors.paper} stroke={colors.gold} strokeWidth={1.4} />
          </Svg>
          <RNText allowFontScaling={false} style={st.pageNoText}>{toArabicDigits(page)}</RNText>
        </View>
      ) : null}
    </View>
  );
}

export const MushafPage = memo(MushafPageInner);

const st = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  msg: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, textAlign: 'center' },
  retry: { minHeight: 44, paddingHorizontal: 18, borderRadius: 12, backgroundColor: colors.green, justifyContent: 'center' },
  retryText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.onGreen },
  measureBox: { position: 'absolute', left: 0, top: 0, width: 4000, opacity: 0, alignItems: 'flex-start' },
  measureLine: { flexDirection: 'row-reverse', alignSelf: 'flex-start' },
  content: {
    position: 'absolute',
    left: OUTER + FRAME1 + FRAME_GAP + FRAME2 + PAD_X,
    right: OUTER + FRAME1 + FRAME_GAP + FRAME2 + PAD_X,
    top: OUTER + FRAME1 + FRAME_GAP + FRAME2 + PAD_Y,
    bottom: OUTER + FRAME1 + FRAME_GAP + FRAME2 + PAD_Y,
  },
  line: { flexDirection: 'row-reverse', alignItems: 'center', borderRadius: 6 },
  bigLine: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  lineBlock: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(168,118,40,0.35)' },
  meal: { fontFamily: fonts.body, color: colors.inkSoft, paddingHorizontal: 6, paddingBottom: 10, paddingTop: 2 },
  mealNo: { fontFamily: fonts.bodyBold, color: colors.goldText },
  wordPressed: { backgroundColor: 'rgba(226,194,122,0.45)', borderRadius: 6 },
  lineActive: { backgroundColor: 'rgba(226,194,122,0.30)' },
  word: { color: colors.ink, includeFontPadding: false },
  wordActive: { color: colors.greenText, backgroundColor: 'rgba(24,88,60,0.13)', borderRadius: 4 },
  end: { fontFamily: fonts.arabic, color: colors.gold, includeFontPadding: false },
  headerRow: { alignItems: 'center', justifyContent: 'center' },
  band: { alignSelf: 'stretch', borderWidth: 1.5, borderColor: colors.gold, backgroundColor: colors.creamBox, padding: 2 },
  bandInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 0.75,
    borderColor: colors.greenText,
    paddingHorizontal: 8,
  },
  bandCenter: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bandAr: { fontFamily: fonts.arabicBold, color: colors.greenText, textAlign: 'center' },
  bandTr: { fontFamily: fonts.bodySemi, color: colors.goldText, maxWidth: '30%' },
  bismillah: { fontFamily: fonts.arabic, color: colors.greenText, textAlign: 'center' },
  frameOuter: { flex: 1, borderWidth: FRAME1, borderColor: colors.gold, borderRadius: 6, padding: FRAME_GAP, backgroundColor: colors.mushaf },
  frameInner: { flex: 1, borderWidth: FRAME2, borderColor: colors.greenText, borderRadius: 3 },
  corner: { position: 'absolute' },
  labelBox: { position: 'absolute', backgroundColor: colors.mushaf, paddingHorizontal: 6, height: 14, justifyContent: 'center' },
  labelAr: { fontFamily: fonts.arabic, fontSize: 11, lineHeight: 14, color: colors.goldText },
  pageNo: { position: 'absolute', width: 40, height: 22, alignItems: 'center', justifyContent: 'center' },
  pageNoText: { fontFamily: fonts.arabicBold, fontSize: 12, lineHeight: 16, color: colors.greenText },
});
