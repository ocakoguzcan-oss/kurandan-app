import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/Text';
import { Link, router } from 'expo-router';
import Svg, { Circle, G, Rect } from 'react-native-svg';
import { Screen, Card, Eyebrow, RoundButton } from '../../src/components/ui';
import { IconBell, IconGlobe, IconKaaba, IconBook, IconCalendar, IconCheck, IconCoins, IconCompass, IconHatim, IconHijri, IconMoon, IconMosque, IconPin, IconStory, IconTasbih } from '../../src/components/Icons';
import { colors, fonts, lightColors, radius } from '../../src/theme';
import { usePrefs } from '../../src/lib/prefs';
import { useApp, useNow } from '../../src/context/AppContext';
import { formatCountdown, formatTime, getNextPrayer, getPrayerTimes, VAKIT_KEYS, VAKIT_NAMES } from '../../src/lib/prayerTimes';
import { formatHijriAr, ramazanDay, toHijri } from '../../src/lib/hijri';
import { getLang, LANGS, t, tx } from '../../src/i18n';
import { formatDay, formatWeekday } from '../../src/i18n/format';
import { ymdIn, ymdToLocalDate } from '../../src/lib/tz';
import { duaForDate, duaText, useDualar } from '../../src/lib/dualar';
import { upcomingDiniGunler } from '../../src/data/diniGunler';
import { useHatim } from '../../src/lib/hatim';
import { countDay, dayKey as namazDayKey, FARZLAR, gunKontrolEdildi, isaretle, isaretsizler, kilmadim, useNamaz } from '../../src/lib/namazTakip';
import { useTour, useTourTarget } from '../../src/tour/Tour';
import { TOTAL_PAGES } from '../../src/lib/quran';

const FEATURES = [
  { href: '/kuran', label: tx("Kur'an-ı Kerim"), Icon: IconBook },
  { href: '/hatim', label: tx('Hatim'), Icon: IconHatim },
  { href: '/kible', label: tx('Kıble'), Icon: IconCompass },
  { href: '/camiler', label: tx('Yakın Camiler'), Icon: IconMosque },
  { href: '/namaz-takip', label: tx('Namaz Takibi'), Icon: IconCheck },
  { href: '/kaza', label: tx('Kaza Namazı'), Icon: IconCheck },
  { href: '/zikir', label: tx('Zikirmatik'), Icon: IconTasbih },
  { href: '/imsakiye', label: tx('İmsakiye'), Icon: IconMoon },
  { href: '/hicri-takvim', label: tx('Hicri Takvim'), Icon: IconHijri },
  { href: '/dini-gunler', label: tx('Dini Günler'), Icon: IconCalendar },
  { href: '/zekat', label: tx('Zekât'), Icon: IconCoins },
  { href: '/cuma', label: tx('Story Hazırla'), Icon: IconStory },
] as const;

export default function Home() {
  const { place, calc } = useApp();
  const now = useNow(1000);
  // Şehrin takvim günü (seçili şehir başka saat dilimindeyse cihazın günü değil)
  const ymd = ymdIn(now, calc.tz);
  const dayKey = `${ymd.y}-${ymd.m}-${ymd.d}`;
  const localDay = useMemo(() => ymdToLocalDate(ymd), [dayKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const times = useMemo(() => getPrayerTimes(ymd, place.lat, place.lng, calc), [dayKey, place.lat, place.lng, calc]); // eslint-disable-line react-hooks/exhaustive-deps
  const next = getNextPrayer(now, place.lat, place.lng, calc);
  const duaLib = useDualar();
  const dua = useMemo(() => duaForDate(localDay, duaLib.dualar), [localDay, duaLib]);
  const duaTr = duaText(dua);
  const prefs = usePrefs();
  const hijri = useMemo(() => formatHijriAr(toHijri(localDay)), [localDay, prefs.hicriDuzelt]); // eslint-disable-line react-hooks/exhaustive-deps
  // İftar sayacı (Kişisel ayarlar): gündüz akşama, akşamdan sonra imsaka kalan süre
  const iftar = useMemo(() => {
    if (!prefs.iftarSayaci) return null;
    const n = now.getTime();
    if (n >= times.imsak.getTime() && n < times.aksam.getTime()) return { ad: t('İftara kalan'), hedef: times.aksam };
    const imsak = n < times.imsak.getTime() ? times.imsak : getPrayerTimes(ymdIn(new Date(n + 6 * 3600000), calc.tz), place.lat, place.lng, calc).imsak;
    return { ad: t('Sahura (imsaka) kalan'), hedef: imsak };
  }, [prefs.iftarSayaci, now, times, calc, place.lat, place.lng]);
  const rDay = ramazanDay(localDay);
  const hatim = useHatim();
  const namaz = useNamaz();
  const kildim = countDay(namaz, namazDayKey(localDay));
  // "Kıldınız mı?" açıksa: önceki günlerde hiç işaretlenmemiş vakitler (en fazla 5 satır gösterilir)
  const isaretsiz = useMemo(() => isaretsizler(namaz, localDay), [namaz, localDay]);
  const isaretsizSatir = isaretsiz.flatMap((g) => g.keys.map((k) => ({ ...g, key: k }))).slice(0, 5);
  const isaretsizToplam = isaretsiz.reduce((n, g) => n + g.keys.length, 0);
  const nextGun = useMemo(() => upcomingDiniGunler(localDay)[0], [localDay]);

  const tour = useTour();
  const tPlace = useTourTarget('place');
  const tHero = useTourTarget('hero');
  const tDua = useTourTarget('dua');
  const tTrackers = useTourTarget('trackers');
  const tGun = useTourTarget('dinigun');
  const tKabe = useTourTarget('kabe');
  const tLang = useTourTarget('lang');
  const langName = LANGS.find((l) => l.code === getLang())?.name ?? '';
  const register = tour.register;

  return (
    <Screen scrollRef={tour.scroll.ref} onScroll={tour.scroll.onScroll}>
      <View style={st.top}>
        <View style={st.topLeft}>
          <Image source={require('../../assets/logo.png')} style={st.logo} accessibilityLabel={t('Kurandan.ai logosu')} />
          <View ref={tPlace} collapsable={false} style={{ flexShrink: 1 }}>
            <Text style={st.greet}>{t('Selâmün aleyküm')}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('Konumu değiştir')} onPress={() => router.push('/konum')} style={st.placeRow}>
              <Text style={st.place} numberOfLines={1}>{place.label}</Text>
              <IconPin size={16} />
            </Pressable>
          </View>
        </View>
        <View style={st.topRight}>
          <View ref={tLang} collapsable={false}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${t('Dil')}: ${langName}`} onPress={() => router.push('/dil')} style={st.langBtn}>
              <IconGlobe size={18} />
              <Text style={st.langText}>{getLang().toUpperCase()}</Text>
            </Pressable>
          </View>
          <RoundButton label={t('Bildirim ayarları')} onPress={() => router.push('/ayarlar')}>
            <IconBell />
          </RoundButton>
        </View>
      </View>

      <View ref={tHero} collapsable={false} style={st.hero}>
        <Svg width={160} height={160} viewBox="0 0 100 100" style={st.heroStar}>
          <G fill="none" stroke={colors.goldLight} strokeWidth={2}>
            <Rect x={22} y={22} width={56} height={56} />
            <Rect x={22} y={22} width={56} height={56} transform="rotate(45 50 50)" />
            <Circle cx={50} cy={50} r={14} />
          </G>
        </Svg>
        <View style={st.heroHead}>
          <View>
            <Text style={st.heroEyebrow}>{rDay ? t('Ramazan {n}. gün · sıradaki vakit', { n: rDay }) : t('Sıradaki vakit')}</Text>
            <Text style={st.heroName}>{t(VAKIT_NAMES[next.key])}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={st.heroDate}>{formatDay(ymd)}</Text>
            <Text style={st.heroHijri}>{hijri}</Text>
          </View>
        </View>
        <View style={st.countRow}>
          <Text style={st.count}>{formatCountdown(next.time.getTime() - now.getTime())}</Text>
          <Text style={st.countSub}>{t('kaldı · {saat}', { saat: formatTime(next.time, calc.tz) })}</Text>
        </View>
        <View style={st.timesRow}>
          {VAKIT_KEYS.map((k) => {
            const active = k === next.key && times[k].getTime() === next.time.getTime();
            return (
              <View key={k} style={[st.timeCell, active && st.timeCellOn]}>
                <Text style={[st.timeLabel, active && { color: lightColors.green, fontFamily: fonts.bodySemi }]}>{t(VAKIT_NAMES[k])}</Text>
                <Text style={[st.timeVal, active && { color: lightColors.green, fontFamily: fonts.bodyBold }]}>{formatTime(times[k], calc.tz)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {isaretsizSatir.length > 0 && (
        <Card style={{ gap: 4, paddingVertical: 12 }}>
          <Text style={st.sorTitle}>{t('İşaretlenmemiş namazlar ({n})', { n: isaretsizToplam })}</Text>
          <Text style={st.sorSub}>{t('Kıldıysanız işaretleyin, kılmadıysanız kaza borcuna ekleyin.')}</Text>
          {isaretsizSatir.map((x) => (
            <View key={`${x.day}-${x.key}`} style={st.sorRow}>
              <Text style={st.sorName} numberOfLines={1}>
                {`${t(FARZLAR.find((f) => f.key === x.key)!.name)} · ${formatWeekday(x.date, true)}`}
              </Text>
              <Pressable accessibilityRole="button" onPress={() => isaretle(x.day, x.key, true)} style={[st.sorBtn, st.sorBtnOn]}>
                <Text style={[st.sorBtnText, { color: colors.onGreen }]}>{t('Kıldım')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => kilmadim(x.day, x.key)} style={st.sorBtn}>
                <Text style={st.sorBtnText}>{t('Kazaya ekle')}</Text>
              </Pressable>
            </View>
          ))}
          <Pressable accessibilityRole="button" onPress={() => isaretsiz.forEach((g) => gunKontrolEdildi(g.day))} style={{ alignSelf: 'center', paddingVertical: 8 }}>
            <Text style={st.sorSub}>{t('Bunları sorma')}</Text>
          </Pressable>
        </Card>
      )}

      {iftar && (
        <View style={st.iftar}>
          <Text style={st.iftarAd}>{iftar.ad}</Text>
          <Text style={st.iftarSure}>{formatCountdown(iftar.hedef.getTime() - now.getTime())}</Text>
          <Text style={st.iftarSaat}>{formatTime(iftar.hedef, calc.tz)}</Text>
        </View>
      )}

      <View ref={tDua} collapsable={false}>
      <Link href="/dua" asChild>
        <Pressable accessibilityRole="link">
          <Card style={{ gap: 8 }}>
            <View style={st.rowBetween}>
              <Eyebrow>{t('Günün duası')}</Eyebrow>
              <Text style={st.muted}>{duaTr.kaynak}</Text>
            </View>
            <Text style={st.duaNe} numberOfLines={2}>{duaTr.neIcin}</Text>
            <Text style={st.duaAr} numberOfLines={2}>{dua.arabic}</Text>
            <Text style={st.duaTr} numberOfLines={2}>{duaTr.meal}</Text>
          </Card>
        </Pressable>
      </Link>
      </View>

      <View ref={tTrackers} collapsable={false} style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t("Kur'an-ı Kerim, kaldığınız yer sayfa {n}", { n: hatim.lastPage })}
          onPress={() => router.push({ pathname: '/kuran', params: { sayfa: String(hatim.lastPage) } })}
          style={[st.mini, { flex: 1.2 }]}
        >
          <Eyebrow>{t('Kaldığınız yer')}</Eyebrow>
          <Text style={st.miniBig}>{t('Sayfa {n}', { n: hatim.lastPage })}</Text>
          <View style={st.miniBar}>
            <View style={[st.miniFill, { width: `${Math.max(3, (hatim.read.length / TOTAL_PAGES) * 100)}%` }]} />
          </View>
          <Text style={st.muted}>{t('Bugün {a}/{b} sayfa', { a: hatim.todayPages.length, b: hatim.goal })}</Text>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={() => router.push('/namaz-takip')} style={[st.mini, { flex: 1 }]}>
          <Eyebrow>{t('Bugün kıldım')}</Eyebrow>
          <Text style={st.miniBig}>{`${kildim} / 5`}</Text>
          <Text style={st.muted}>{t('Vakitleri işaretle')}</Text>
        </Pressable>
      </View>

      {nextGun && (
        <View ref={tGun} collapsable={false}>
        <Pressable accessibilityRole="link" onPress={() => router.push('/dini-gunler')}>
          <Card style={st.gunCard}>
            <IconMoon size={24} />
            <View style={{ flex: 1 }}>
              <Text style={st.gunName}>{t(nextGun.name)}</Text>
              <Text style={st.muted}>{nextGun.daysLeft === 0 ? (nextGun.kind === 'kandil' ? t('Bu gece') : t('Bugün')) : t('{n} gün kaldı', { n: nextGun.daysLeft })}</Text>
            </View>
            <Text style={st.gunMore}>{t('Tümü ›')}</Text>
          </Card>
        </Pressable>
        </View>
      )}

      <View ref={tKabe} collapsable={false}>
        <Pressable accessibilityRole="link" onPress={() => router.push('/kabe-yolu')}>
          <Card style={st.gunCard}>
            <IconKaaba />
            <View style={{ flex: 1 }}>
              <Text style={st.gunName}>{t("Kâbe'ye Nasıl Gidilir?")}</Text>
              <Text style={st.muted}>{t('Araba · Otobüs · Uçak — güzergâh, sınır kapıları, vize')}</Text>
            </View>
            <Text style={st.gunMore}>{t('Aç ›')}</Text>
          </Card>
        </Pressable>
      </View>

      <View style={st.grid}>
        {FEATURES.map(({ href, label, Icon }) => (
          <View key={href} ref={(n) => register(`tile-${href.slice(1)}`, n)} collapsable={false} style={st.tile}>
            <Link href={href} asChild>
              <Pressable accessibilityRole="link" style={st.tileInner}>
                <Icon size={26} color={colors.greenText} />
                <Text style={st.tileLabel} numberOfLines={2}>{t(label)}</Text>
              </Pressable>
            </Link>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.buttonBorder,
    backgroundColor: colors.card,
  },
  langText: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.greenText },
  logo: { width: 46, height: 44, resizeMode: 'contain' },
  greet: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  placeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 28 },
  place: { fontFamily: fonts.display, fontSize: 18, color: colors.greenText, flexShrink: 1 },
  hero: { backgroundColor: colors.green, borderRadius: radius.xl, padding: 20, gap: 14, overflow: 'hidden' },
  heroStar: { position: 'absolute', right: -40, top: -40, opacity: 0.18 },
  heroHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroEyebrow: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 0.9, textTransform: 'uppercase', color: colors.goldLight },
  heroName: { fontFamily: fonts.display, fontSize: 30, color: colors.onGreen },
  heroDate: { fontFamily: fonts.body, fontSize: 12, color: colors.mutedOnGreen },
  heroHijri: { fontFamily: fonts.arabic, fontSize: 16, color: colors.goldLight },
  countRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  count: { fontFamily: fonts.bodyBold, fontSize: 44, color: colors.onGreen, fontVariant: ['tabular-nums'], letterSpacing: -0.8 },
  countSub: { fontFamily: fonts.body, fontSize: 13, color: colors.mutedOnGreen },
  timesRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 14, padding: 6, gap: 4 },
  timeCell: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4, borderRadius: 8 },
  timeCellOn: { backgroundColor: colors.goldLight },
  sorTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  sorSub: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted },
  sorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, borderTopWidth: 1, borderTopColor: colors.divider },
  sorName: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink },
  sorBtn: { minHeight: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: colors.buttonBorder, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  sorBtnOn: { backgroundColor: colors.green, borderColor: colors.green },
  sorBtnText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.greenText },
  iftar: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 16 },
  iftarAd: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink },
  iftarSure: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.greenText, fontVariant: ['tabular-nums'] },
  iftarSaat: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, fontVariant: ['tabular-nums'] },
  timeLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.mutedOnGreen },
  timeVal: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.onGreen },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  muted: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  duaAr: { fontFamily: fonts.arabic, fontSize: 20, lineHeight: 34, color: colors.greenText, textAlign: 'right', writingDirection: 'rtl' },
  duaNe: { fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: colors.goldText },
  duaTr: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.inkSoft },
  mini: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.lg, padding: 14, gap: 4 },
  miniBig: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.greenText },
  miniBar: { height: 5, borderRadius: 3, backgroundColor: colors.cardBorder, overflow: 'hidden', marginVertical: 2 },
  miniFill: { height: 5, backgroundColor: colors.gold },
  gunCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  gunName: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  gunMore: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.greenText },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '22%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 18,
  },
  tileInner: { flex: 1, paddingVertical: 12, paddingHorizontal: 4, alignItems: 'center', gap: 8 },
  tileLabel: { fontFamily: fonts.bodySemi, fontSize: 12, lineHeight: 15, color: colors.ink, textAlign: 'center' },
});
