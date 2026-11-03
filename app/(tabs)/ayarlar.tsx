import React, { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Card, Eyebrow, Toggle } from '../../src/components/ui';
import { colors, fonts } from '../../src/theme';
import { useApp } from '../../src/context/AppContext';
import { formatTime, getPrayerTimes, VAKIT_KEYS, VAKIT_NAMES } from '../../src/lib/prayerTimes';
import { LEAD_OPTIONS } from '../../src/lib/notifications';

export default function Ayarlar() {
  const { place, reminders, setReminders } = useApp();
  const times = useMemo(() => getPrayerTimes(new Date(), place.lat, place.lng), [place.lat, place.lng]);

  return (
    <Screen title="Vakit Hatırlatma" back={false}>
      <Card style={{ padding: 0, paddingHorizontal: 14 }}>
        {VAKIT_KEYS.map((k, i) => (
          <View key={k} style={[st.row, i < VAKIT_KEYS.length - 1 && st.divider]}>
            <View>
              <Text style={st.name}>{VAKIT_NAMES[k]}</Text>
              <Text style={st.sub}>{`${formatTime(times[k])} · ${reminders.enabled[k] ? 'açık' : 'kapalı'}`}</Text>
            </View>
            <Toggle
              label={`${VAKIT_NAMES[k]} hatırlatması`}
              value={reminders.enabled[k]}
              onChange={(v) => setReminders({ ...reminders, enabled: { ...reminders.enabled, [k]: v } })}
            />
          </View>
        ))}
      </Card>

      <View style={{ gap: 8 }}>
        <Eyebrow>Ne zaman hatırlatılsın?</Eyebrow>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {LEAD_OPTIONS.map((m) => {
            const on = reminders.leadMin === m;
            return (
              <Pressable
                key={m}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => setReminders({ ...reminders, leadMin: m })}
                style={[st.lead, on ? st.leadOn : st.leadOff]}
              >
                <Text style={[st.leadText, { color: on ? colors.paper : colors.green }]}>{m === 0 ? 'Vaktinde' : `${m} dk`}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
        <View style={[st.row, st.divider]}>
          <View style={{ flexShrink: 1 }}>
            <Text style={st.name}>Cuma hatırlatması</Text>
            <Text style={st.sub}>Cuma sabahı 09:00 · story görseli hazır</Text>
          </View>
          <Toggle label="Cuma hatırlatması" value={reminders.cuma} onChange={(v) => setReminders({ ...reminders, cuma: v })} />
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/konum')} style={[st.row, st.divider]}>
          <Text style={st.name}>Konum</Text>
          <Text style={st.link} numberOfLines={1}>{`${place.label} ›`}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => Linking.openSettings()} style={st.row}>
          <Text style={st.name}>Bildirim izinleri</Text>
          <Text style={st.link}>Ayarları aç ›</Text>
        </Pressable>
      </Card>

      <Text style={st.note}>
        Hatırlatmalar önümüzdeki 7 gün için kurulur ve uygulamayı her açtığınızda yenilenir. Bir haftadan uzun süre açmazsanız uygulamayı bir kez açmanız yeterli.
      </Text>
    </Screen>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, paddingVertical: 8, gap: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  name: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  sub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 1 },
  link: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.green, flexShrink: 1 },
  lead: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  leadOn: { backgroundColor: colors.green, borderColor: colors.green },
  leadOff: { backgroundColor: colors.card, borderColor: colors.buttonBorder },
  leadText: { fontFamily: fonts.bodySemi, fontSize: 13 },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: 'center' },
});
