import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/Text';
import { router, useFocusEffect } from 'expo-router';
import { Screen, Card, Eyebrow, Toggle } from '../../src/components/ui';
import { colors, fonts } from '../../src/theme';
import { useApp } from '../../src/context/AppContext';
import { formatTime, getPrayerTimes, VAKIT_KEYS, VAKIT_NAMES } from '../../src/lib/prayerTimes';
import { getPermissionStatus, LEAD_OPTIONS, PermissionStatus } from '../../src/lib/notifications';
import { setPrefs, usePrefs } from '../../src/lib/prefs';
import { EZAN_KAYDI_HAZIR } from '../../src/config';

export default function Ayarlar() {
  const { place, reminders, setReminders } = useApp();
  const times = useMemo(() => getPrayerTimes(new Date(), place.lat, place.lng), [place.lat, place.lng]);
  const prefs = usePrefs();
  const [perm, setPerm] = useState<PermissionStatus | null>(null);
  useFocusEffect(
    useCallback(() => {
      getPermissionStatus().then((p) => setPerm(p.status));
    }, [])
  );

  return (
    <Screen title="Ayarlar" back={false}>
      {perm && perm !== 'granted' && (
        <Pressable accessibilityRole="button" onPress={() => router.push('/izin')} style={st.permBanner}>
          <Text style={st.permTitle}>Bildirim izni kapalı</Text>
          <Text style={st.permBody}>Ezan bildirimleri gelmiyor. Nasıl açacağınızı adım adım göstermek için dokunun.</Text>
        </Pressable>
      )}

      <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
        <View style={st.row}>
          <View style={{ flexShrink: 1 }}>
            <Text style={st.name}>Büyük yazı</Text>
            <Text style={st.sub}>Uygulamadaki tüm yazıları büyütür</Text>
          </View>
          <Toggle label="Büyük yazı" value={prefs.largeText} onChange={(v) => setPrefs({ largeText: v })} />
        </View>
      </Card>

      <Eyebrow>Vakit hatırlatmaları</Eyebrow>
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
            <Text style={st.name}>Ezan sesiyle bildir</Text>
            <Text style={st.sub}>
              {reminders.leadMin === 0 ? 'Vakit girince ezan okunur' : 'Ezan yalnızca “Vaktinde” seçiliyken okunur'}
              {EZAN_KAYDI_HAZIR ? '' : ' · ezan kaydı yakında'}
            </Text>
          </View>
          <Toggle label="Ezan sesiyle bildir" value={reminders.ezan} onChange={(v) => setReminders({ ...reminders, ezan: v })} />
        </View>
        <View style={[st.row, st.divider]}>
          <View style={{ flexShrink: 1 }}>
            <Text style={st.name}>Kandil ve dini günler</Text>
            <Text style={st.sub}>Bir gün önce ve o gün hatırlat</Text>
          </View>
          <Toggle label="Kandil ve dini gün hatırlatması" value={reminders.diniGunler} onChange={(v) => setReminders({ ...reminders, diniGunler: v })} />
        </View>
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
        <Pressable accessibilityRole="button" onPress={() => router.push('/izin')} style={st.row}>
          <Text style={st.name}>Bildirim izinleri</Text>
          <Text style={st.link}>{perm === 'granted' ? 'Açık ›' : 'Nasıl açılır ›'}</Text>
        </Pressable>
      </Card>

      <Text style={st.note}>
        Hatırlatmalar önümüzdeki 7 gün için kurulur ve uygulamayı her açtığınızda yenilenir. Bir haftadan uzun süre açmazsanız uygulamayı bir kez açmanız yeterli.
      </Text>
    </Screen>
  );
}

const st = StyleSheet.create({
  permBanner: { backgroundColor: '#FBEBD3', borderWidth: 1, borderColor: colors.gold, borderRadius: 16, padding: 14, gap: 4 },
  permTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.goldText },
  permBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.ink },
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
