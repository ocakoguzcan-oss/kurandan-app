// Medine Mushafı'nın tek bir sayfası: gerçek satır düzeni, satıra dokununca o satır okunur,
// okunan kelime ve satır renkle vurgulanır.
import React, { memo, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { Text } from './Text';
import { colors, fonts } from '../theme';
import { Chapter, ensurePageFont, getPage, pageFontFamily, QPage, QWord } from '../lib/quran';

const BISMILLAH = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
const toArabicDigits = (n: number) => String(n).replace(/\d/g, (c) => '٠١٢٣٤٥٦٧٨٩'[Number(c)]);

type Props = {
  page: number;
  width: number;
  height: number;
  chapters: Chapter[];
  activeWordId: number | null;
  activeLine: number | null;
  onLinePress: (page: number, line: number, words: QWord[]) => void;
};

function MushafPageInner({ page, width, height, chapters, activeWordId, activeLine, onLinePress }: Props) {
  const [data, setData] = useState<QPage | null>(null);
  const [fontReady, setFontReady] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(false);
    getPage(page)
      .then((d) => alive && setData(d))
      .catch(() => alive && setError(true));
    ensurePageFont(page)
      .then(() => alive && setFontReady(true))
      .catch(() => alive && setFontReady(false));
    return () => {
      alive = false;
    };
  }, [page, retry]);

  const innerW = width - 24;
  const lineCount = data?.lineCount ?? 15;
  // Satır yüksekliği ekrana sığacak şekilde; yazı boyutu satır genişliğine göre.
  const lineH = Math.min((height - 16) / 15, innerW / 9.2);
  const fontSize = Math.min(innerW / 15.2, lineH * 0.62);

  if (error) {
    return (
      <View style={[st.center, { width, height }]}>
        <Text style={st.msg}>Sayfa yüklenemedi. İnternet bağlantınızı kontrol edin.</Text>
        <Pressable accessibilityRole="button" onPress={() => setRetry(retry + 1)} style={st.retry}>
          <Text style={st.retryText}>Tekrar dene</Text>
        </Pressable>
      </View>
    );
  }
  if (!data) {
    return (
      <View style={[st.center, { width, height }]}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  const byLine = new Map<number, QWord[]>();
  data.words.forEach((w) => {
    const arr = byLine.get(w.line) ?? [];
    arr.push(w);
    byLine.set(w.line, arr);
  });
  const centered = page <= 2;
  const lines = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <View style={[st.page, { width, height, justifyContent: centered ? 'center' : 'flex-start' }]}>
      {lines.map((line) => {
        const header = data.headers.find((h) => h.line === line);
        if (header) {
          const ch = chapters.find((c) => c.id === header.chapter);
          return (
            <View key={line} style={[st.lineBox, { height: lineH }]}>
              {header.kind === 'surah' ? (
                <View style={st.surahBox}>
                  <RNText style={[st.surahAr, { fontSize: lineH * 0.42 }]}>{`سُورَةُ ${ch?.nameAr ?? ''}`}</RNText>
                  <RNText style={[st.surahTr, { fontSize: Math.max(10, lineH * 0.24) }]}>{ch ? `${ch.id}. ${ch.nameTr}` : ''}</RNText>
                </View>
              ) : (
                <RNText style={[st.bismillah, { fontSize: lineH * 0.45 }]}>{BISMILLAH}</RNText>
              )}
            </View>
          );
        }
        const words = byLine.get(line);
        if (!words) return centered ? null : <View key={line} style={{ height: lineH }} />;
        const isActiveLine = activeLine === line;
        return (
          <Pressable
            key={line}
            accessibilityRole="button"
            accessibilityLabel={`${line}. satırı dinle`}
            onPress={() => onLinePress(page, line, data.words)}
            style={({ pressed }) => [
              st.lineBox,
              { height: lineH, justifyContent: centered ? 'center' : 'space-between' },
              (isActiveLine || pressed) && st.lineActive,
            ]}
          >
            {words.map((w) => {
              const active = w.id === activeWordId;
              if (w.isEnd) {
                return (
                  <RNText key={w.id} style={[st.end, { fontSize: fontSize * 0.78 }, active && st.wordActive]}>
                    {`﴿${toArabicDigits(w.verse)}﴾`}
                  </RNText>
                );
              }
              return (
                <RNText
                  key={w.id}
                  allowFontScaling={false}
                  style={[
                    fontReady ? { fontFamily: pageFontFamily(page), fontSize } : { fontFamily: fonts.arabic, fontSize: fontSize * 0.9 },
                    st.word,
                    active && st.wordActive,
                  ]}
                >
                  {fontReady ? w.code : w.text}
                </RNText>
              );
            })}
          </Pressable>
        );
      })}
    </View>
  );
}

export const MushafPage = memo(MushafPageInner);

const st = StyleSheet.create({
  page: { paddingHorizontal: 12, paddingVertical: 8 },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  msg: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, textAlign: 'center' },
  retry: { minHeight: 44, paddingHorizontal: 18, borderRadius: 12, backgroundColor: colors.green, justifyContent: 'center' },
  retryText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.paper },
  lineBox: { flexDirection: 'row-reverse', alignItems: 'center', borderRadius: 8, overflow: 'hidden' },
  lineActive: { backgroundColor: 'rgba(226,194,122,0.28)' },
  word: { color: colors.ink, includeFontPadding: false },
  wordActive: { color: colors.green, backgroundColor: 'rgba(24,88,60,0.12)', borderRadius: 4 },
  end: { fontFamily: fonts.arabic, color: colors.gold },
  surahBox: {
    flex: 1,
    height: '88%',
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 8,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surahAr: { fontFamily: fonts.arabicBold, color: colors.green },
  surahTr: { fontFamily: fonts.bodySemi, color: colors.goldText, marginTop: -4 },
  bismillah: { flex: 1, textAlign: 'center', fontFamily: fonts.arabic, color: colors.green },
});
