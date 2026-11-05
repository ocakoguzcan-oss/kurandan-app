import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Text as RNText, Modal, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';
import { Text } from '../../src/components/Text';
import { Button, Card, Chip, Eyebrow } from '../../src/components/ui';
import { MushafPage } from '../../src/components/MushafPage';
import { colors, fonts } from '../../src/theme';
import { attribution, Chapter, chapterName, getChapters, hasMeal, JUZ_START_PAGES, juzOfPage, prefetchPages, QWord, TOTAL_PAGES, getPage } from '../../src/lib/quran';
import { quranPlayer, PlayerState } from '../../src/lib/quranPlayer';
import { loadHatim, markPageRead, resetHatim, setGoal, setLastPage, useHatim } from '../../src/lib/hatim';
import { MushafSize, setPrefs, usePrefs } from '../../src/lib/prefs';
import { normalizeTr } from '../../src/data/sureler';
import { SATIN_ALMA_ACIK, usePremium } from '../../src/lib/premium';
import { t, tx } from '../../src/i18n';

const PAGES = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);
const GOALS = [1, 2, 5, 10, 20];
const READ_AFTER_MS = 20000; // sayfada 20 sn kalınca okundu sayılır

function usePlayer(): PlayerState {
  const [s, setS] = useState(quranPlayer.state);
  useEffect(() => quranPlayer.subscribe(setS), []);
  return s;
}

export default function Kuran() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { mushafSize, mushafTap, mushafMeal } = usePrefs();
  const [pageH, setPageH] = useState(0);
  const params = useLocalSearchParams<{ sayfa?: string }>();
  const hatim = useHatim();
  const player = usePlayer();
  const listRef = useRef<FlatList<number>>(null);
  const [page, setPage] = useState(hatim.lastPage || 1);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [firstChapter, setFirstChapter] = useState<number | null>(null);
  const [picker, setPicker] = useState(false);
  const [hatimOpen, setHatimOpen] = useState(false);
  const [ready, setReady] = useState(false);


  useEffect(() => {
    getChapters().then(setChapters).catch(() => {});
  }, []);

  // Ücretsiz sürümde ekran kilitlenince okuma durur; geri dönünce "kilit ekranında dinle" önerilir
  const premium = usePremium();
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && quranPlayer.stoppedByLock) {
        quranPlayer.stoppedByLock = false;
        if (SATIN_ALMA_ACIK && !premium.owned) setTimeout(() => router.push('/kilit-ekrani'), 400);
      }
    });
    return () => sub.remove();
  }, [premium.owned]);

  // Kaldığınız sayfayı yükle; liste o sayfadan açılır.
  useEffect(() => {
    loadHatim().then((h) => {
      const p = Number(params.sayfa);
      setPage(p >= 1 && p <= TOTAL_PAGES ? p : h.lastPage || 1);
      setReady(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ana sayfadaki "Kaldığınız yer" kartından gelinirse
  useEffect(() => {
    const p = Number(params.sayfa);
    if (ready && p >= 1 && p <= TOTAL_PAGES) goTo(p, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.sayfa]);

  const goTo = useCallback((p: number, animated = true) => {
    const target = Math.max(1, Math.min(TOTAL_PAGES, p));
    setPage(target);
    listRef.current?.scrollToIndex({ index: target - 1, animated });
  }, []);

  // Sürekli okumada sayfa çevrilince ekran da çevrilsin, önceki sayfa okundu sayılsın.
  useEffect(() => {
    quranPlayer.setPageChangeHandler((p) => {
      markPageRead(p - 1);
      goTo(p);
    });
    return () => quranPlayer.setPageChangeHandler(null);
  }, [goTo]);

  useEffect(() => {
    if (!ready) return;
    setLastPage(page);
    prefetchPages(page + 1, 2);
    getPage(page)
      .then((d) => setFirstChapter(d.firstChapter))
      .catch(() => {});
    const t = setTimeout(() => markPageRead(page), READ_AFTER_MS);
    return () => clearTimeout(t);
  }, [page, ready]);

  const onLinePress = useCallback((p: number, line: number, words: QWord[]) => {
    quranPlayer.playLine(p, line, words);
  }, []);
  const onWordPress = useCallback((p: number, w: QWord) => {
    quranPlayer.playWord(p, w);
  }, []);

  const togglePlay = () => {
    if (player.mode === 'page') {
      quranPlayer.stop();
      return;
    }
    // Kalınan yer bu sayfadaysa oradan, değilse sayfanın başından başla.
    const r = quranPlayer.resume;
    quranPlayer.playFrom(page, r && r.page === page ? r.line : 1);
  };

  const chapter = chapters.find((c) => c.id === firstChapter);
  const hatimPct = Math.round((hatim.read.length / TOTAL_PAGES) * 100);
  const playing = player.mode === 'page';

  let status = mushafTap === 'word' ? t('Bir kelimeye dokunun, telaffuzunu dinleyin.') : t('Bir satıra dokunun, yalnızca o satır okunsun.');
  if (player.loading) status = t('Tilavet hazırlanıyor…');
  else if (player.mode === 'line') status = t('{n}. satır okunuyor', { n: player.line });
  else if (player.mode === 'word') status = t('Kelime okunuyor');
  else if (playing) status = t('Sayfa {n} okunuyor · durdurana kadar devam eder', { n: player.page });

  return (
    <View style={[st.root, { paddingTop: insets.top + 8, direction: 'ltr' }]}>
      <View style={st.header}>
        <View style={st.headRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('Sure ve cüz seç')} onPress={() => setPicker(true)} style={st.titleBtn}>
            <Text style={st.title} numberOfLines={1}>{chapter ? t('{sure} Suresi', { sure: chapterName(chapter) }) : t("Kur'an-ı Kerim")}</Text>
            <Text style={st.sub}>{`${t('Cüz {n}', { n: juzOfPage(page) })} · ${t('Sayfa {n}', { n: page })} ▾`}</Text>
          </Pressable>
          <SizeButton size={mushafSize} onPress={() => setPrefs({ mushafSize: ((mushafSize % 3) + 1) as MushafSize })} />
          <Pressable accessibilityRole="button" accessibilityLabel={t('Hatim takibi')} onPress={() => setHatimOpen(true)} style={st.hatimBtn}>
            <Text style={st.hatimPct}>{`%${hatimPct}`}</Text>
            <Text style={st.hatimLabel}>{t('{a}/{b} bugün', { a: hatim.todayPages.length, b: hatim.goal })}</Text>
          </Pressable>
        </View>
        <View style={st.progress}>
          <View style={[st.progressFill, { width: `${Math.max(2, hatimPct)}%` }]} />
        </View>
      </View>

      <View style={{ flex: 1 }} onLayout={(e) => setPageH(Math.floor(e.nativeEvent.layout.height))}>
      {!ready || pageH === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.green} />
        </View>
      ) : (
      <FlatList
        ref={listRef}
        data={PAGES}
        horizontal
        inverted
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => String(p)}
        extraData={`${mushafSize}:${mushafTap}:${mushafMeal}:${player.mode}:${player.page}:${player.line}:${player.wordId}:${chapters.length}:${pageH}`}
        initialScrollIndex={page - 1}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          const p = i + 1;
          if (p !== page) {
            if (player.mode !== 'idle' && player.page !== p) quranPlayer.stop();
            setPage(p);
          }
        }}
        renderItem={({ item }) => (
          <View style={{ width, height: pageH }}>
            <MushafPage
              page={item}
              width={width}
              height={pageH}
              size={mushafSize}
              tapMode={mushafTap}
              showMeal={mushafMeal && hasMeal()}
              onWordPress={onWordPress}
              chapters={chapters}
              activeWordId={player.page === item ? player.wordId : null}
              activeLine={player.page === item && player.mode === 'line' ? player.line : null}
              onLinePress={onLinePress}
            />
          </View>
        )}
        style={{ flexGrow: 0, height: pageH }}
        onScrollToIndexFailed={(info) => setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: false }), 200)}
      />
      )}
      </View>

      <View style={st.footer}>
        <View style={st.footRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Önceki sayfa')} onPress={() => goTo(page - 1)} style={st.arrow} disabled={page <= 1}>
          <Text style={st.arrowText}>‹</Text>
        </Pressable>
        <View style={st.seg} accessibilityRole="radiogroup">
          {(['line', 'word'] as const).map((m) => {
            const on = mushafTap === m;
            return (
              <Pressable
                key={m}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={m === 'line' ? t('Dokununca satır okunsun') : t('Dokununca kelime okunsun')}
                onPress={() => setPrefs({ mushafTap: m })}
                style={[st.segBtn, on && st.segOn]}
              >
                <Text style={[st.segText, on && st.segTextOn]}>{m === 'line' ? t('Satır') : t('Kelime')}</Text>
              </Pressable>
            );
          })}
        </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playing ? t('Durdur') : t('Sayfayı okut')}
            onPress={togglePlay}
            style={st.play}
          >
            {player.loading ? (
              <ActivityIndicator color={colors.paper} />
            ) : (
              <Svg width={26} height={26} viewBox="0 0 24 24">
                {playing ? (
                  <>
                    <Rect x={6} y={5} width={4} height={14} rx={1} fill={colors.paper} />
                    <Rect x={14} y={5} width={4} height={14} rx={1} fill={colors.paper} />
                  </>
                ) : (
                  <Path d="M8 5v14l11-7z" fill={colors.paper} />
                )}
              </Svg>
            )}
          </Pressable>
        {hasMeal() && (
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: mushafMeal }}
            accessibilityLabel={t('Meal')}
            onPress={() => setPrefs({ mushafMeal: !mushafMeal })}
            style={[st.mealBtn, mushafMeal && st.segOn]}
          >
            <Text style={[st.segText, mushafMeal && st.segTextOn]}>{t('Meal')}</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" accessibilityLabel={t('Sonraki sayfa')} onPress={() => goTo(page + 1)} style={st.arrow} disabled={page >= TOTAL_PAGES}>
          <Text style={st.arrowText}>›</Text>
        </Pressable>
        </View>
        {SATIN_ALMA_ACIK && playing && !premium.owned ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/kilit-ekrani')} hitSlop={8}>
            <Text style={[st.status, { color: colors.green, fontFamily: fonts.bodySemi }]} numberOfLines={1}>
              {t('🔒 Ekran kilitlenince durur · Kilitliyken dinle ›')}
            </Text>
          </Pressable>
        ) : (
          <Text style={st.status} numberOfLines={1}>{status}</Text>
        )}
      </View>

      <SurahPicker
        visible={picker}
        chapters={chapters}
        onClose={() => setPicker(false)}
        onPick={(p) => {
          quranPlayer.stop();
          setPicker(false);
          goTo(p, false);
        }}
      />

      <Modal visible={hatimOpen} animationType="slide" transparent onRequestClose={() => setHatimOpen(false)}>
        <View style={st.sheetBackdrop}>
          <View style={[st.sheet, { paddingBottom: insets.bottom + 20 }]}>
            <Text style={st.sheetTitle}>{t('Hatim takibi')}</Text>
            <Card style={{ gap: 6 }}>
              <Text style={st.big}>{`%${hatimPct}`}</Text>
              <Text style={st.muted}>{t('Bu hatimde {a} / {b} sayfa okundu', { a: hatim.read.length, b: TOTAL_PAGES })}</Text>
              <Text style={st.muted}>{t('Tamamlanan hatim: {n}', { n: hatim.completed })}</Text>
              <Text style={st.muted}>{t('Kaldığınız yer: Sayfa {n}', { n: hatim.lastPage })}</Text>
            </Card>
            <Eyebrow>{t('Günlük hedef')}</Eyebrow>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {GOALS.map((g) => (
                <Chip key={g} label={g === 20 ? t('20 sayfa (1 cüz)') : t('{n} sayfa', { n: g })} selected={hatim.goal === g} onPress={() => setGoal(g)} />
              ))}
            </View>
            <Text style={st.muted}>{t('Bir sayfada 20 saniye kalınca ya da sayfa sonuna kadar dinlenince okundu sayılır.')}</Text>
            <Button variant="secondary" label={t('Yeni hatime başla')} onPress={resetHatim} />
            <Text style={st.attrib}>{attribution()}</Text>
            <Button label={t('Kapat')} onPress={() => setHatimOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const SIZE_LABELS: Record<MushafSize, string> = { 1: tx('Mushaf görünümü'), 2: tx('Büyük yazı'), 3: tx('Çok büyük yazı') };

/** 3 kademeli yazı boyutu tuşu: her dokunuşta bir sonraki kademeye geçer. */
function SizeButton({ size, onPress }: { size: MushafSize; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('Yazı boyutu: {boyut}. Değiştirmek için dokunun.', { boyut: t(SIZE_LABELS[size]) })}
      onPress={onPress}
      style={st.sizeBtn}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
          <RNText allowFontScaling={false} style={[st.sizeA, { fontSize: 12 }]}>A</RNText>
          <RNText allowFontScaling={false} style={[st.sizeA, { fontSize: 18 }]}>A</RNText>
        </View>
        <RNText allowFontScaling={false} style={st.sizeLabel}>{size === 3 ? t('Yazı\nKüçült') : t('Yazı\nBüyüt')}</RNText>
      </View>
      <View style={st.sizeDots}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[st.sizeDot, n <= size && st.sizeDotOn]} />
        ))}
      </View>
    </Pressable>
  );
}

function SurahPicker({ visible, chapters, onClose, onPick }: { visible: boolean; chapters: Chapter[]; onClose: () => void; onPick: (page: number) => void }) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const n = normalizeTr(q.trim());
    return n ? chapters.filter((c) => (normalizeTr(c.nameTr).includes(n) || normalizeTr(c.nameSimple ?? '').includes(n) || c.nameAr.includes(q.trim())) || String(c.id) === n) : chapters;
  }, [q, chapters]);
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top + 12 }}>
        <FlatList
          data={list}
          keyExtractor={(c) => String(c.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
          ListHeaderComponent={
            <View style={{ gap: 12, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={st.title}>{t('Sure ve cüz')}</Text>
                <Button variant="text" label={t('Kapat')} onPress={onClose} />
              </View>
              <Eyebrow>{t('Cüz')}</Eyebrow>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {JUZ_START_PAGES.map((p, i) => (
                  <Chip key={p} label={t('{n}. cüz', { n: i + 1 })} selected={false} onPress={() => onPick(p)} />
                ))}
              </ScrollView>
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder={t('Sure ara (ör. Yasin ya da 36)')}
                placeholderTextColor={colors.muted}
                accessibilityLabel={t('Sure ara')}
                style={st.search}
              />
              {chapters.length === 0 && <ActivityIndicator color={colors.green} />}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" onPress={() => onPick(item.pages[0])} style={st.surahRow}>
              <Text style={st.surahNo}>{item.id}</Text>
              <View style={{ flex: 1 }}>
                <Text style={st.surahName}>{chapterName(item)}</Text>
                <Text style={st.muted}>{`${t('{n} ayet', { n: item.verses })} · ${t('Sayfa {n}', { n: item.pages[0] })}`}</Text>
              </View>
              <Text style={st.surahAr}>{item.nameAr}</Text>
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: 16, gap: 6, paddingBottom: 4 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  titleBtn: { flexShrink: 1, minHeight: 44, justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 20, color: colors.green },
  sub: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.goldText },
  sizeBtn: { minWidth: 84, paddingHorizontal: 8, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.buttonBorder, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', gap: 3 },
  sizeA: { fontFamily: fonts.bodyBold, color: colors.green, lineHeight: 22 },
  sizeLabel: { fontFamily: fonts.bodyBold, fontSize: 11, lineHeight: 13, color: colors.green },
  sizeDots: { flexDirection: 'row', gap: 3 },
  sizeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.cardBorder },
  sizeDotOn: { backgroundColor: colors.gold },
  hatimBtn: { minWidth: 64, minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.buttonBorder, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  hatimPct: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.green },
  hatimLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  progress: { height: 4, borderRadius: 2, backgroundColor: colors.cardBorder, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: colors.gold },
  today: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  footRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  arrow: { width: 40, height: 48, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontFamily: fonts.bodyBold, fontSize: 30, lineHeight: 34, color: colors.green },
  seg: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, borderColor: colors.buttonBorder, backgroundColor: colors.paper, padding: 3 },
  segBtn: { minHeight: 40, paddingHorizontal: 10, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.green, borderColor: colors.green },
  segText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.green },
  segTextOn: { color: colors.paper },
  mealBtn: { minHeight: 46, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.buttonBorder, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingTop: 8, paddingBottom: 6, gap: 4, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder, backgroundColor: colors.card },
  navBtn: { width: 84, minHeight: 48, justifyContent: 'center' },
  navText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.green },
  play: { width: 54, height: 54, borderRadius: 27, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  status: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, textAlign: 'center' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  sheetTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.green },
  big: { fontFamily: fonts.bodyBold, fontSize: 36, color: colors.green },
  muted: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, lineHeight: 19 },
  attrib: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, lineHeight: 16 },
  search: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.buttonBorder, backgroundColor: colors.card, paddingHorizontal: 14, fontFamily: fonts.body, fontSize: 15, color: colors.ink },
  surahRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60, borderBottomWidth: 1, borderBottomColor: colors.divider },
  surahNo: { width: 30, fontFamily: fonts.bodyBold, fontSize: 14, color: colors.goldText, textAlign: 'center' },
  surahName: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink },
  surahAr: { fontFamily: fonts.arabic, fontSize: 20, color: colors.green },
});
