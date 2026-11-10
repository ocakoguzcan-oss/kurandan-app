import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Screen, Chip, Button } from '../src/components/ui';
import { CityPicker } from '../src/components/CityPicker';
import { colors, fonts, radius } from '../src/theme';
import { useApp, useNow } from '../src/context/AppContext';
import { citiesOf, City, cityById, nearestCity } from '../src/data/world';
import { addDays, ymdIn } from '../src/lib/tz';
import { formatDay, formatWeekday } from '../src/i18n/format';
import { currentOrNextRamazan, parseLocalDate, ramazanDay } from '../src/lib/hijri';
import { defaultMethod } from '../src/lib/prayerTimes';
import { formatCountdown, formatTime, getPrayerTimes, METHODS } from '../src/lib/prayerTimes';
import { getLang, t } from '../src/i18n';

const POPULER_TR = ['TR:34', 'TR:6', 'TR:35', 'TR:16', 'TR:42', 'TR:1', 'TR:7', 'TR:21']; // hızlı seçim çipleri

export default function Imsakiye() {
  const { place, calc, methodAuto } = useApp();
  const insets = useSafeAreaInsets();
  const now = useNow(1000);
  const initial = cityById(place.cityId) ?? nearestCity(place.lat, place.lng, place.country);
  const [city, setCity] = useState<City>(
    place.source === 'gps' ? { ...initial, name: place.label, lat: place.lat, lng: place.lng, tz: place.tz, id: 'gps' } : initial
  );
  const [picker, setPicker] = useState(false);
  // Başka ülkenin şehri seçilirse (otomatik yöntemde) o ülkenin yöntemi kullanılır
  const opts = useMemo(
    () => ({ ...calc, tz: city.tz, method: methodAuto ? defaultMethod(city.country, getLang()) : calc.method }),
    [calc, city, methodAuto]
  );

  const ramazan = currentOrNextRamazan(now);
  const start = parseLocalDate(ramazan.ilkOruc);
  const startYmd = { y: start.getFullYear(), m: start.getMonth() + 1, d: start.getDate() };
  const rows = useMemo(
    () =>
      Array.from({ length: ramazan.gun }).map((_, i) => {
        const d = addDays(startYmd, i);
        const tm = getPrayerTimes(d, city.lat, city.lng, opts);
        return { i, d, imsak: tm.imsak, iftar: tm.aksam };
      }),
    [city, opts, ramazan.ilkOruc, ramazan.gun] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const today = ymdIn(now, city.tz);
  const rDay = ramazanDay(new Date(today.y, today.m - 1, today.d));
  const todayRow = rDay ? rows[rDay - 1] : null;
  const countryCities = citiesOf(city.country);
  const popular = city.country === 'TR' ? POPULER_TR.map((id) => cityById(id)!).filter(Boolean) : countryCities.slice(0, 8);
  const chips = popular.some((c) => c.id === city.id) ? popular : [city, ...popular.slice(0, -1)];

  let heroLabel: string;
  let heroCount: string;
  if (todayRow) {
    const beforeImsak = now.getTime() < todayRow.imsak.getTime();
    const target = beforeImsak ? todayRow.imsak : todayRow.iftar;
    heroLabel = beforeImsak ? t('Sahurun bitmesine · {yer}', { yer: city.name }) : t('İftara kalan · {yer}', { yer: city.name });
    heroCount = now.getTime() < target.getTime() ? formatCountdown(target.getTime() - now.getTime()) : t('Hayırlı iftarlar');
  } else {
    const days = Math.round((Date.UTC(startYmd.y, startYmd.m - 1, startYmd.d) - Date.UTC(today.y, today.m - 1, today.d)) / 86400000);
    heroLabel = t('Ramazan {yil} · {yer}', { yil: ramazan.hicriYil, yer: city.name });
    heroCount = days > 0 ? t('{n} gün kaldı', { n: days }) : t('Hayırlı bayramlar');
  }

  return (
    <Screen title={t('Ramazan İmsakiyesi')}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {chips.map((c) => (
          <Chip key={c.id} label={c.name} selected={city.id === c.id} onPress={() => setCity(c)} />
        ))}
        <Chip label={city.country === 'TR' ? t('Tüm iller ›') : t('Tüm şehirler ›')} selected={false} onPress={() => setPicker(true)} />
      </ScrollView>

      <View style={st.hero}>
        <Svg width={120} height={120} viewBox="0 0 24 24" style={st.moon}>
          <Path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill={colors.goldLight} />
        </Svg>
        <View style={st.heroHead}>
          <Text style={st.heroEyebrow}>{heroLabel}</Text>
          <Text style={st.heroSmall}>{rDay ? t('Ramazan {n}. gün', { n: rDay }) : t('İlk oruç {tarih}', { tarih: formatDay(startYmd, false) })}</Text>
        </View>
        <Text style={st.heroCount}>{heroCount}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={st.heroBox}>
            <Text style={st.heroBoxLabel}>{t('İmsak (sahur sonu)')}</Text>
            <Text style={st.heroBoxVal}>{formatTime((todayRow ?? rows[0]).imsak, city.tz)}</Text>
          </View>
          <View style={st.heroBox}>
            <Text style={st.heroBoxLabel}>{t('İftar (akşam ezanı)')}</Text>
            <Text style={st.heroBoxVal}>{formatTime((todayRow ?? rows[0]).iftar, city.tz)}</Text>
          </View>
        </View>
      </View>

      <View style={st.table}>
        <View style={[st.tr, st.th]}>
          <Text style={[st.c1, st.thText]}>{t('Gün')}</Text>
          <Text style={[st.c2, st.thText]}>{t('İmsak')}</Text>
          <Text style={[st.c2, st.thText]}>{t('İftar')}</Text>
        </View>
        {rows.map((r) => {
          const isToday = rDay === r.i + 1;
          return (
            <View key={r.i} style={[st.tr, st.td, isToday && { backgroundColor: colors.greenTint }]}>
              <Text style={[st.c1, st.tdText, isToday && st.todayText]}>
                {`${t('{n}. gün', { n: r.i + 1 })} · ${formatDay(r.d, false)} ${formatWeekday(r.d, true)}`}
              </Text>
              <Text style={[st.c2, st.tdText, isToday && st.todayText]}>{formatTime(r.imsak, city.tz)}</Text>
              <Text style={[st.c2, st.tdText, { fontFamily: fonts.bodySemi }, isToday && st.todayText]}>{formatTime(r.iftar, city.tz)}</Text>
            </View>
          );
        })}
      </View>
      <Text style={st.note}>
        {opts.method === 'diyanet'
          ? t('Saatler Diyanet yöntemiyle il merkezine göre hesaplanır; ilçelerde 1–2 dakika fark olabilir.')
          : t('Saatler {yontem} yöntemiyle şehir merkezine göre hesaplanır.', { yontem: METHODS[opts.method].name })}
        {city.country === 'TR' ? '' : ` ${t('Ramazan’ın ilk günü Diyanet takvimine göredir; bulunduğunuz ülkede bir gün farklı olabilir.')}`}
      </Text>

      <Modal visible={picker} animationType="slide" onRequestClose={() => setPicker(false)}>
        <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top + 12 }}>
          <CityPicker
            country={city.country}
            selectedId={city.id}
            onSelect={(x) => {
              setCity(x);
              setPicker(false);
            }}
            header={
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.greenText }}>{city.country === 'TR' ? t('İl seçin') : t('Şehir seçin')}</Text>
                <Button variant="text" label={t('Kapat')} onPress={() => setPicker(false)} />
              </View>
            }
          />
        </View>
      </Modal>
    </Screen>
  );
}

const st = StyleSheet.create({
  hero: { backgroundColor: colors.green, borderRadius: radius.xl - 2, padding: 18, gap: 12, overflow: 'hidden' },
  moon: { position: 'absolute', right: -16, top: -16, opacity: 0.16 },
  heroHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  heroEyebrow: { fontFamily: fonts.bodySemi, fontSize: 12, letterSpacing: 0.9, textTransform: 'uppercase', color: colors.goldLight, flexShrink: 1 },
  heroSmall: { fontFamily: fonts.body, fontSize: 12, color: colors.mutedOnGreen },
  heroCount: { fontFamily: fonts.bodyBold, fontSize: 40, color: colors.onGreen, fontVariant: ['tabular-nums'] },
  heroBox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, gap: 2 },
  heroBoxLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.mutedOnGreen },
  heroBoxVal: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.onGreen },
  table: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.md + 2, overflow: 'hidden' },
  tr: { flexDirection: 'row', paddingHorizontal: 14 },
  th: { backgroundColor: colors.tableHead, paddingVertical: 10 },
  td: { paddingVertical: 11, borderTopWidth: 1, borderTopColor: colors.divider },
  c1: { flex: 1.6 },
  c2: { flex: 1, textAlign: 'right' },
  thText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.goldText },
  tdText: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, fontVariant: ['tabular-nums'] },
  todayText: { color: colors.greenText, fontFamily: fonts.bodyBold },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: 'center' },
});
