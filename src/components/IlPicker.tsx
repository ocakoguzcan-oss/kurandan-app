import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from './Text';
import { ILLER, Il } from '../data/iller';
import { colors, fonts } from '../theme';

const norm = (s: string) => s.toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\u0131/g, 'i');

/** Aranabilir 81 il listesi. */
export function IlPicker({ selected, onSelect, header }: { selected?: number; onSelect: (il: Il) => void; header?: React.ReactElement }) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const n = norm(q.trim());
    return n ? ILLER.filter((i) => norm(i.ad).includes(n) || String(i.plaka) === n) : ILLER;
  }, [q]);

  return (
    <FlatList
      data={list}
      keyExtractor={(i) => String(i.plaka)}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
      ListHeaderComponent={
        <View style={{ gap: 14, marginBottom: 10 }}>
          {header}
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="İl ara (ör. Konya ya da 42)"
            placeholderTextColor={colors.muted}
            accessibilityLabel="İl ara"
            style={st.search}
            autoCorrect={false}
          />
        </View>
      }
      renderItem={({ item }) => {
        const on = item.plaka === selected;
        return (
          <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onSelect(item)} style={st.row}>
            <Text style={st.plaka}>{String(item.plaka).padStart(2, '0')}</Text>
            <Text style={[st.name, on && { color: colors.green, fontFamily: fonts.bodyBold }]}>{item.ad}</Text>
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
  },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 50, borderBottomWidth: 1, borderBottomColor: colors.divider, gap: 14 },
  plaka: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.goldText, width: 24 },
  name: { fontFamily: fonts.body, fontSize: 16, color: colors.ink, flex: 1 },
  check: { fontSize: 18, color: colors.green },
});
