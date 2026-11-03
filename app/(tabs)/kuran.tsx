import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import Svg, { Path, Rect } from 'react-native-svg';
import { Text } from '../../src/components/Text';
import { Button, Card, Chip, Eyebrow } from '../../src/components/ui';
import { MushafPage } from '../../src/components/MushafPage';
import { colors, fonts } from '../../src/theme';
import { ATTRIBUTION, Chapter, getChapters, JUZ_START_PAGES, juzOfPage, prefetchPages, QWord, TOTAL_PAGES, getPage } from '../../src/lib/quran';
import { quranPlayer, PlayerState } from '../../src/lib/quranPlayer';
import { loadHatim, markPageRead, resetHatim, setGoal, setLastPage, useHatim } from '../../src/lib/hatim';

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
  const { width, height } = useWindowDimensions();
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

  const headerH = 88;
  const footerH = 96;
  const pageH = height - insets.top - insets.bottom - headerH - footerH - 52; // 52: sekme çubuğu

  useEffect(() => {
    getChapters().then(setChapters).catch(() => {});
  }, []);

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

  let status = 'Bir satıra dokunun, yalnızca o satır okunsun.';
  if (player.loading) status = 'Tilavet hazırlanıyor…';
  else if (player.mode === 'line') status = `${player.line}. satır okunuyor`;
  else if (playing) status = `Sayfa ${player.page} okunuyor · durdurana kadar devam eder`;

  return (
    <View style={[st.root, { paddingTop: insets.top + 8 }]}>
      <View style={[st.header, { height: headerH }]}>
        <View style={st.headRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Sure ve cüz seç" onPress={() => setPicker(true)} style={st.titleBtn}>
            <Text style={st.title} numberOfLines={1}>{chapter ? `${chapter.nameTr} Suresi` : "Kur'an-ı Kerim"}</Text>
            <Text style={st.sub}>{`Cüz ${juzOfPage(page)} · Sayfa ${page} ▾`}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Hatim takibi" onPress={() => setHatimOpen(true)} style={st.hatimBtn}>
            <Text style={st.hatimPct}>{`%${hatimPct}`}</Text>
            <Text style={st.hatimLabel}>Hatim</Text>
          </Pressable>
        </View>
        <View style={st.progress}>
          <View style={[st.progressFill, { width: `${Math.max(2, hatimPct)}%` }]} />
        </View>
        <Text style={st.today}>{`Bugün ${hatim.todayPages.length}/${hatim.goal} sayfa`}</Text>
      </View>

      {!ready ? (
        <View style={{ height: pageH, alignItems: 'center', justifyContent: 'center' }}>
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

      <View style={[st.footer, { height: footerH }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Önceki sayfa" onPress={() => goTo(page - 1)} style={st.navBtn} disabled={page <= 1}>
          <Text style={st.navText}>‹ Önceki</Text>
        </Pressable>
        <View style={{ alignItems: 'center', flex: 1, gap: 4 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Durdur' : 'Sayfayı okut'}
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
          <Text style={st.status} numberOfLines={1}>{status}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Sonraki sayfa" onPress={() => goTo(page + 1)} style={st.navBtn} disabled={page >= TOTAL_PAGES}>
          <Text style={[st.navText, { textAlign: 'right' }]}>Sonraki ›</Text>
        </Pressable>
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
            <Text style={st.sheetTitle}>Hatim takibi</Text>
            <Card style={{ gap: 6 }}>
              <Text style={st.big}>{`%${hatimPct}`}</Text>
              <Text style={st.muted}>{`Bu hatimde ${hatim.read.length} / ${TOTAL_PAGES} sayfa okundu`}</Text>
              <Text style={st.muted}>{`Tamamlanan hatim: ${hatim.completed}`}</Text>
              <Text style={st.muted}>{`Kaldığınız yer: Sayfa ${hatim.lastPage}`}</Text>
            </Card>
            <Eyebrow>Günlük hedef</Eyebrow>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {GOALS.map((g) => (
                <Chip key={g} label={g === 20 ? '20 sayfa (1 cüz)' : `${g} sayfa`} selected={hatim.goal === g} onPress={() => setGoal(g)} />
              ))}
            </View>
            <Text style={st.muted}>Bir sayfada 20 saniye kalınca ya da sayfa sonuna kadar dinlenince okundu sayılır.</Text>
            <Button variant="secondary" label="Yeni hatime başla" onPress={resetHatim} />
            <Text style={st.attrib}>{ATTRIBUTION}</Text>
            <Button label="Kapat" onPress={() => setHatimOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SurahPicker({ visible, chapters, onClose, onPick }: { visible: boolean; chapters: Chapter[]; onClose: () => void; onPick: (page: number) => void }) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const n = q.trim().toLocaleLowerCase('tr');
    return n ? chapters.filter((c) => c.nameTr.toLocaleLowerCase('tr').includes(n) || String(c.id) === n) : chapters;
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
                <Text style={st.title}>Sure ve cüz</Text>
                <Button variant="text" label="Kapat" onPress={onClose} />
              </View>
              <Eyebrow>Cüz</Eyebrow>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {JUZ_START_PAGES.map((p, i) => (
                  <Chip key={p} label={`${i + 1}. cüz`} selected={false} onPress={() => onPick(p)} />
                ))}
              </ScrollView>
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Sure ara (ör. Yasin ya da 36)"
                placeholderTextColor={colors.muted}
                accessibilityLabel="Sure ara"
                style={st.search}
              />
              {chapters.length === 0 && <ActivityIndicator color={colors.green} />}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" onPress={() => onPick(item.pages[0])} style={st.surahRow}>
              <Text style={st.surahNo}>{item.id}</Text>
              <View style={{ flex: 1 }}>
                <Text style={st.surahName}>{item.nameTr}</Text>
                <Text style={st.muted}>{`${item.verses} ayet · Sayfa ${item.pages[0]}`}</Text>
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
  header: { paddingHorizontal: 20, gap: 6 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  titleBtn: { flexShrink: 1, minHeight: 44, justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.green },
  sub: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.goldText },
  hatimBtn: { minWidth: 64, minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.buttonBorder, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  hatimPct: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.green },
  hatimLabel: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  progress: { height: 6, borderRadius: 3, backgroundColor: colors.cardBorder, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: colors.gold },
  today: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  footer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: colors.cardBorder, backgroundColor: colors.card },
  navBtn: { width: 84, minHeight: 48, justifyContent: 'center' },
  navText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.green },
  play: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
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
