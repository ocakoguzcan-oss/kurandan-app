// Ülke → şehir seçimi. Türkiye'de 81 il (plaka ile aranabilir), diğer ülkelerde nüfusa göre
// sıralı şehirler. Ülke listesi seçili dilde, alfabetik; Müslüman nüfusun yoğun olduğu ve
// gurbetçilerin çok yaşadığı ülkeler üstte.
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from './Text';
import { citiesOf, City, COUNTRY_LIST, Country, normalize } from '../data/world';
import { colors, fonts } from '../theme';
import { getLang, LOCALE, t } from '../i18n';
import { utcLabel } from '../lib/tz';

const ONE_CIKAN = ['TR', 'DE', 'SA', 'NL', 'FR', 'AT', 'BE', 'GB', 'AZ', 'RU', 'EG', 'AE', 'US', 'CH', 'SE'];

const flag = (cc: string) => String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));

export function CityPicker({
  country,
  selectedId,
  onSelect,
  onChangeCountry,
  header,
}: {
  country: string;
  selectedId?: string;
  onSelect: (c: City) => void;
  /** Verilirse üstte ülke düğmesi görünür */
  onChangeCountry?: () => void;
  header?: React.ReactElement;
}) {
  const [q, setQ] = useState('');
  const lang = getLang();
  const all = useMemo(() => citiesOf(country), [country]);
  const list = useMemo(() => {
    const n = normalize(q.trim());
    if (!n) return all;
    return all.filter((c) => normalize(c.name).includes(n) || normalize(c.province).includes(n) || (c.plaka && String(c.plaka) === n));
  }, [q, all]);
  const cName = COUNTRY_LIST.find((c) => c.c === country)?.n[lang] ?? country;

  return (
    <FlatList
      data={list}
      keyExtractor={(i) => i.id}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={30}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
      ListHeaderComponent={
        <View style={{ gap: 14, marginBottom: 10 }}>
          {header}
          {onChangeCountry && (
            <Pressable accessibilityRole="button" accessibilityLabel={t('Ülke seç')} onPress={onChangeCountry} style={st.country}>
              <Text style={st.flag}>{flag(country)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={st.countryLabel}>{t('Ülke')}</Text>
                <Text style={st.countryName}>{cName}</Text>
              </View>
              <Text style={st.change}>{t('Değiştir ›')}</Text>
            </Pressable>
          )}
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={country === 'TR' ? t('İl ara (ör. Konya ya da 42)') : t('Şehir ara')}
            placeholderTextColor={colors.muted}
            accessibilityLabel={t('Şehir ara')}
            style={st.search}
            autoCorrect={false}
          />
        </View>
      }
      ListEmptyComponent={<Text style={st.empty}>{t('Bu adla şehir bulunamadı. “Konumumu kullan” ile bulunduğunuz yeri seçebilirsiniz.')}</Text>}
      renderItem={({ item }) => {
        const on = item.id === selectedId;
        return (
          <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onSelect(item)} style={st.row}>
            {item.plaka ? <Text style={st.plaka}>{String(item.plaka).padStart(2, '0')}</Text> : null}
            <View style={{ flex: 1 }}>
              <Text style={[st.name, on && { color: colors.greenText, fontFamily: fonts.bodyBold }]}>{item.name}</Text>
              {item.province ? <Text style={st.sub}>{item.province}</Text> : null}
            </View>
            {on && <Text style={st.check}>✓</Text>}
          </Pressable>
        );
      }}
    />
  );
}

export function CountryList({ selected, onSelect, header }: { selected?: string; onSelect: (c: Country) => void; header?: React.ReactElement }) {
  const [q, setQ] = useState('');
  const lang = getLang();
  const sorted = useMemo(() => {
    let coll: Intl.Collator | null = null;
    try {
      coll = new Intl.Collator(LOCALE[lang]);
    } catch {
      coll = null;
    }
    const byName = [...COUNTRY_LIST].sort((a, b) => (coll ? coll.compare(a.n[lang], b.n[lang]) : a.n[lang] < b.n[lang] ? -1 : 1));
    const top = ONE_CIKAN.map((c) => COUNTRY_LIST.find((x) => x.c === c)).filter(Boolean) as Country[];
    return { top, byName };
  }, [lang]);
  const list = useMemo(() => {
    const n = normalize(q.trim());
    if (!n) return [...sorted.top, ...sorted.byName.filter((c) => !ONE_CIKAN.includes(c.c))];
    return sorted.byName.filter((c) => normalize(c.n[lang]).includes(n) || normalize(c.n.en).includes(n) || c.c.toLowerCase() === n);
  }, [q, sorted, lang]);

  return (
    <FlatList
      data={list}
      keyExtractor={(i) => i.c}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={30}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
      ListHeaderComponent={
        <View style={{ gap: 14, marginBottom: 10 }}>
          {header}
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t('Ülke ara')}
            placeholderTextColor={colors.muted}
            accessibilityLabel={t('Ülke ara')}
            style={st.search}
            autoCorrect={false}
          />
        </View>
      }
      renderItem={({ item, index }) => {
        const on = item.c === selected;
        const sep = !q && index === sorted.top.length;
        return (
          <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onSelect(item)} style={[st.row, sep && st.sep]}>
            <Text style={st.flag}>{flag(item.c)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[st.name, on && { color: colors.greenText, fontFamily: fonts.bodyBold }]}>{item.n[lang]}</Text>
              <Text style={st.sub}>{utcLabel(citiesOf(item.c)[0]?.tz)}</Text>
            </View>
            {on && <Text style={st.check}>✓</Text>}
          </Pressable>
        );
      }}
    />
  );
}

const st = StyleSheet.create({
  search: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.buttonBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.ink,
    textAlign: 'auto',
  },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    paddingHorizontal: 14,
  },
  countryLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  countryName: { fontFamily: fonts.bodySemi, fontSize: 17, color: colors.ink },
  change: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.greenText },
  flag: { fontSize: 26 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 14, paddingVertical: 6 },
  sep: { borderTopWidth: 6, borderTopColor: colors.divider },
  plaka: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.goldText, width: 24 },
  name: { fontFamily: fonts.body, fontSize: 16, color: colors.ink },
  sub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  check: { fontSize: 18, color: colors.greenText },
  empty: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center', marginTop: 20 },
});
