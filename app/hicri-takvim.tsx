// Hicri takvim: miladi ay görünümünde her günün hicri karşılığı, dini günler işaretli.
// Bir güne dokununca iki takvimde de tam tarihi gösterir. Altta hicri → miladi çevirici.
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Text } from '../src/components/Text';
import { Screen, Card, Eyebrow } from '../src/components/ui';
import { colors, fonts, radius } from '../src/theme';
import { fromHijri, hijriMonthLength, hijriMonthName, toHijri } from '../src/lib/hijri';
import { DINI_GUNLER } from '../src/data/diniGunler';
import { getLang, isRTL, t } from '../src/i18n';
import { formatDay, formatMonth, formatWeekday } from '../src/i18n/format';

const dk = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function HicriTakvim() {
  const lang = getLang();
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [sel, setSel] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));

  const gunler = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of DINI_GUNLER) if (!m.has(g.date)) m.set(g.date, g.name);
    return m;
  }, []);

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const lead = (first.getDay() + 6) % 7; // pazartesi başlangıç
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const out: (Date | null)[] = Array.from({ length: lead }, () => null);
    for (let i = 1; i <= days; i++) out.push(new Date(month.getFullYear(), month.getMonth(), i));
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);

  const hStart = toHijri(new Date(month.getFullYear(), month.getMonth(), 1));
  const hEnd = toHijri(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const hijriSpan =
    hStart.month === hEnd.month
      ? `${hijriMonthName(hStart.month, lang)} ${hStart.year}`
      : `${hijriMonthName(hStart.month, lang)}${hStart.year !== hEnd.year ? ` ${hStart.year}` : ''} – ${hijriMonthName(hEnd.month, lang)} ${hEnd.year}`;

  const weekdays = Array.from({ length: 7 }, (_, i) => formatWeekday(new Date(2024, 0, 1 + i), true));
  const selH = toHijri(sel);
  const selGun = gunler.get(dk(sel));
  const monthGunler = DINI_GUNLER.filter((g) => g.date.startsWith(dk(month).slice(0, 7)));

  // Hicri → miladi çevirici
  const [h, setH] = useState(toHijri(today));
  const hLen = hijriMonthLength(h.year, h.month);
  const conv = fromHijri({ ...h, day: Math.min(h.day, hLen) });
  const step = (field: 'day' | 'month' | 'year', delta: number) => {
    setH((cur) => {
      let { day, month: m, year } = cur;
      if (field === 'year') year += delta;
      if (field === 'month') {
        m += delta;
        if (m < 1) (m = 12), (year -= 1);
        if (m > 12) (m = 1), (year += 1);
      }
      if (field === 'day') {
        const len = hijriMonthLength(year, m);
        day = ((day - 1 + delta + len) % len) + 1;
      }
      return { day: Math.min(day, hijriMonthLength(year, m)), month: m, year };
    });
  };

  const flip = isRTL() ? { transform: [{ scaleX: -1 }] } : undefined;

  return (
    <Screen title={t('Hicri Takvim')}>
      <Card style={st.selCard}>
        <Text style={st.selHijri}>{`${selH.day} ${hijriMonthName(selH.month, lang)} ${selH.year}`}</Text>
        <Text style={st.selGreg}>{`${formatDay(sel)} · ${formatWeekday(sel)}`}</Text>
        {selGun && <Text style={st.selGun}>{t(selGun)}</Text>}
      </Card>

      <View style={st.nav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Önceki ay')}
          onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          style={st.navBtn}
        >
          <Text style={[st.navArrow, flip]}>‹</Text>
        </Pressable>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={st.navTitle}>{formatMonth(month)}</Text>
          <Text style={st.navSub}>{hijriSpan}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Sonraki ay')}
          onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          style={st.navBtn}
        >
          <Text style={[st.navArrow, flip]}>›</Text>
        </Pressable>
      </View>

      <Card style={{ padding: 8 }}>
        <View style={st.row}>
          {weekdays.map((w, i) => (
            <Text key={i} style={st.wd}>{w}</Text>
          ))}
        </View>
        {Array.from({ length: cells.length / 7 }).map((_, r) => (
          <View key={r} style={st.row}>
            {cells.slice(r * 7, r * 7 + 7).map((d, i) => {
              if (!d) return <View key={i} style={st.cell} />;
              const hd = toHijri(d);
              const isToday = dk(d) === dk(today);
              const isSel = dk(d) === dk(sel);
              const gun = gunler.has(dk(d));
              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatDay(d)}, ${hd.day} ${hijriMonthName(hd.month, lang)}`}
                  accessibilityState={{ selected: isSel }}
                  onPress={() => setSel(d)}
                  style={[st.cell, isToday && st.today, isSel && st.sel]}
                >
                  <Text style={[st.g, isSel && { color: colors.paper }]}>{d.getDate()}</Text>
                  <Text style={[st.h, hd.day === 1 && st.hFirst, isSel && { color: colors.goldLight }]} numberOfLines={1}>
                    {hd.day === 1 ? hijriMonthName(hd.month, lang).split(' ')[0].slice(0, 5) : hd.day}
                  </Text>
                  {gun && <View style={[st.dot, isSel && { backgroundColor: colors.goldLight }]} />}
                </Pressable>
              );
            })}
          </View>
        ))}
      </Card>
      <Text style={st.note}>{t('Büyük rakam miladi, küçük rakam hicri gündür. Noktalı günler dini günlerdir.')}</Text>

      {monthGunler.length > 0 && (
        <>
          <Eyebrow>{t('Bu aydaki dini günler')}</Eyebrow>
          <Card style={{ padding: 0, paddingHorizontal: 14 }}>
            {monthGunler.map((g, i) => {
              const [y, m, d] = g.date.split('-').map(Number);
              const date = new Date(y, m - 1, d);
              return (
                <Pressable
                  key={`${g.date}-${g.name}`}
                  accessibilityRole="button"
                  onPress={() => setSel(date)}
                  style={[st.listRow, i < monthGunler.length - 1 && st.divider]}
                >
                  <Text style={st.listName}>{t(g.name)}</Text>
                  <Text style={st.listDate}>{formatDay(date, false)}</Text>
                </Pressable>
              );
            })}
          </Card>
        </>
      )}

      <Eyebrow>{t('Hicri tarihi miladiye çevir')}</Eyebrow>
      <Card style={{ gap: 12 }}>
        {(
          [
            ['day', t('Gün'), String(Math.min(h.day, hLen))],
            ['month', t('Ay'), hijriMonthName(h.month, lang)],
            ['year', t('Yıl'), String(h.year)],
          ] as const
        ).map(([f, label, val]) => (
          <View key={f} style={st.stepRow}>
            <Text style={st.stepLabel}>{label}</Text>
            <View style={st.stepper}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${label} −`} onPress={() => step(f, -1)} style={st.sBtn}>
                <Text style={st.sBtnText}>−</Text>
              </Pressable>
              <Text style={st.sVal} numberOfLines={1}>{val}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`${label} +`} onPress={() => step(f, 1)} style={st.sBtn}>
                <Text style={st.sBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
        ))}
        <View style={st.result}>
          <Text style={st.resultText}>{`${formatDay(conv)} · ${formatWeekday(conv)}`}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setMonth(new Date(conv.getFullYear(), conv.getMonth(), 1));
            setSel(conv);
          }}
        >
          <Text style={st.link}>{t('Takvimde göster ›')}</Text>
        </Pressable>
      </Card>
      <Pressable accessibilityRole="link" onPress={() => router.push('/dini-gunler')}>
        <Text style={st.note}>{t('Hesaplanan hicri tarih Diyanet takviminden bir gün farklı olabilir. Dini günler Diyanet takvimine göredir.')}</Text>
      </Pressable>
    </Screen>
  );
}

const st = StyleSheet.create({
  selCard: { backgroundColor: colors.green, borderColor: colors.green, gap: 4 },
  selHijri: { fontFamily: fonts.display, fontSize: 24, color: colors.paper },
  selGreg: { fontFamily: fonts.body, fontSize: 14, color: colors.mutedOnGreen },
  selGun: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.goldLight, marginTop: 4 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.buttonBorder, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  navArrow: { fontFamily: fonts.bodyBold, fontSize: 24, color: colors.green, lineHeight: 26 },
  navTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  navSub: { fontFamily: fonts.body, fontSize: 13, color: colors.goldText, textAlign: 'center' },
  row: { flexDirection: 'row' },
  wd: { flex: 1, textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 11, color: colors.muted, paddingVertical: 6 },
  cell: { flex: 1, aspectRatio: 0.9, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, margin: 1 },
  today: { borderWidth: 1.5, borderColor: colors.gold },
  sel: { backgroundColor: colors.green },
  g: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.ink, fontVariant: ['tabular-nums'] },
  h: { fontFamily: fonts.body, fontSize: 11, color: colors.goldText, fontVariant: ['tabular-nums'] },
  hFirst: { fontFamily: fonts.bodyBold, fontSize: 9 },
  dot: { position: 'absolute', bottom: 4, width: 5, height: 5, borderRadius: 3, backgroundColor: colors.gold },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted, textAlign: 'center' },
  listRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, gap: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  listName: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink, flexShrink: 1 },
  listDate: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepLabel: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.buttonBorder, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  sBtnText: { fontFamily: fonts.bodyBold, fontSize: 22, color: colors.green },
  sVal: { minWidth: 120, textAlign: 'center', fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  result: { backgroundColor: colors.greenTint, borderRadius: radius.sm, padding: 12, alignItems: 'center' },
  resultText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.green, textAlign: 'center' },
  link: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.green, textAlign: 'center' },
});
