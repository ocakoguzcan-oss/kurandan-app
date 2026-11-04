import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/Text';
import { router, useFocusEffect } from 'expo-router';
import { Screen, Card, Eyebrow, Toggle } from '../../src/components/ui';
import { colors, fonts } from '../../src/theme';
import { useApp } from '../../src/context/AppContext';
import { formatTime, getPrayerTimes, METHODS, VAKIT_KEYS, VAKIT_NAMES } from '../../src/lib/prayerTimes';
import { utcLabel } from '../../src/lib/tz';
import { countryName } from '../../src/data/world';
import { getPermissionStatus, LEAD_OPTIONS, PermissionStatus } from '../../src/lib/notifications';
import { setPrefs, usePrefs } from '../../src/lib/prefs';
import { useTour } from '../../src/tour/Tour';
import { getLang, LANGS, t } from '../../src/i18n';

export default function Ayarlar() {
  const { place, reminders, setReminders, calc, methodAuto } = useApp();
  const times = useMemo(() => getPrayerTimes(new Date(), place.lat, place.lng, calc), [place.lat, place.lng, calc]);
  const lang = getLang();
  const prefs = usePrefs();
  const tour = useTour();
  const [perm, setPerm] = useState<PermissionStatus | null>(null);
  useFocusEffect(
    useCallback(() => {
      getPermissionStatus().then((p) => setPerm(p.status));
    }, [])
  );

  return (
    <Screen title={t('Ayarlar')} back={false}>
      {perm && perm !== 'granted' && (
        <Pressable accessibilityRole="button" onPress={() => router.push('/izin')} style={st.permBanner}>
          <Text style={st.permTitle}>{t('Bildirim izni kapalı')}</Text>
          <Text style={st.permBody}>{t('Ezan bildirimleri gelmiyor. Nasıl açacağınızı adım adım göstermek için dokunun.')}</Text>
        </Pressable>
      )}

      <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
        <View style={st.row}>
          <View style={{ flexShrink: 1 }}>
            <Text style={st.name}>{t('Büyük yazı')}</Text>
            <Text style={st.sub}>{t('Uygulamadaki tüm yazıları büyütür')}</Text>
          </View>
          <Toggle label={t('Büyük yazı')} value={prefs.largeText} onChange={(v) => setPrefs({ largeText: v })} />
        </View>
      </Card>

      <Eyebrow>{t('Vakit hatırlatmaları')}</Eyebrow>
      <Card style={{ padding: 0, paddingHorizontal: 14 }}>
        {VAKIT_KEYS.map((k, i) => (
          <View key={k} style={[st.row, i < VAKIT_KEYS.length - 1 && st.divider]}>
            <View>
              <Text style={st.name}>{t(VAKIT_NAMES[k])}</Text>
              <Text style={st.sub}>{`${formatTime(times[k], calc.tz)} · ${reminders.enabled[k] ? t('açık') : t('kapalı')}`}</Text>
            </View>
            <Toggle
              label={t('{vakit} hatırlatması', { vakit: t(VAKIT_NAMES[k]) })}
              value={reminders.enabled[k]}
              onChange={(v) => setReminders({ ...reminders, enabled: { ...reminders.enabled, [k]: v } })}
            />
          </View>
        ))}
      </Card>

      <View style={{ gap: 8 }}>
        <Eyebrow>{t('Ne zaman hatırlatılsın?')}</Eyebrow>
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
                <Text style={[st.leadText, { color: on ? colors.paper : colors.green }]}>{m === 0 ? t('Vaktinde') : t('{n} dk', { n: m })}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
        <View style={[st.row, st.divider]}>
          <View style={{ flexShrink: 1 }}>
            <Text style={st.name}>{t('Ezan sesiyle bildir')}</Text>
            <Text style={st.sub}>
              {reminders.leadMin === 0 ? t('Vakit girince ezan okunur') : t('Ezan yalnızca “Vaktinde” seçiliyken okunur')}
            </Text>
          </View>
          <Toggle label={t('Ezan sesiyle bildir')} value={reminders.ezan} onChange={(v) => setReminders({ ...reminders, ezan: v })} />
        </View>
        <View style={[st.row, st.divider]}>
          <View style={{ flexShrink: 1 }}>
            <Text style={st.name}>{t('Kandil ve dini günler')}</Text>
            <Text style={st.sub}>{t('Bir gün önce ve o gün hatırlat')}</Text>
          </View>
          <Toggle label={t('Kandil ve dini gün hatırlatması')} value={reminders.diniGunler} onChange={(v) => setReminders({ ...reminders, diniGunler: v })} />
        </View>
        <View style={[st.row, st.divider]}>
          <View style={{ flexShrink: 1 }}>
            <Text style={st.name}>{t('Cuma hatırlatması')}</Text>
            <Text style={st.sub}>{t('Cuma sabahı 09:00 · story görseli hazır')}</Text>
          </View>
          <Toggle label={t('Cuma hatırlatması')} value={reminders.cuma} onChange={(v) => setReminders({ ...reminders, cuma: v })} />
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/konum')} style={[st.row, st.divider]}>
          <View style={{ flexShrink: 0 }}>
            <Text style={st.name}>{t('Konum')}</Text>
            <Text style={st.sub}>{`${countryName(place.country, lang)} · ${utcLabel(place.tz)}`}</Text>
          </View>
          <Text style={st.link} numberOfLines={1}>{`${place.label} ›`}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/vakit-yontemi')} style={[st.row, st.divider]}>
          <View style={{ flexShrink: 1 }}>
            <Text style={st.name}>{t('Vakit hesaplama yöntemi')}</Text>
            <Text style={st.sub} numberOfLines={2}>
              {`${METHODS[calc.method].name}${calc.asr === 'hanafi' ? ` · ${t('İkindi: Hanefî')}` : ''}${methodAuto ? ` · ${t('otomatik')}` : ''}`}
            </Text>
          </View>
          <Text style={st.link}>{t('Değiştir ›')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/dil')} style={[st.row, st.divider]}>
          <Text style={st.name}>{t('Dil')}</Text>
          <Text style={st.link}>{`${LANGS.find((l) => l.code === lang)?.name ?? ''} ›`}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/izin')} style={[st.row, st.divider]}>
          <Text style={st.name}>{t('İzinler')}</Text>
          <Text style={st.link}>{perm === 'granted' ? t('Açık ›') : t('Nasıl açılır ›')}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={tour.restart} style={st.row}>
          <Text style={st.name}>{t('Tanıtımı tekrar izle')}</Text>
          <Text style={st.link}>{t('Başlat ›')}</Text>
        </Pressable>
      </Card>

      <Text style={st.note}>
        {t('Hatırlatmalar önümüzdeki 7 gün için kurulur ve uygulamayı her açtığınızda yenilenir. Bir haftadan uzun süre açmazsanız uygulamayı bir kez açmanız yeterli.')}
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
