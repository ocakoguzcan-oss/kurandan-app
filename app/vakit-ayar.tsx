// Tek bir vaktin bildirim ayarı: açık/kapalı, birden çok "önce" hatırlatması ve hangi günler.
// Seçim yapılmazsa Ayarlar'daki genel "Ne zaman hatırlatılsın?" seçimi geçerlidir.
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '../src/components/Text';
import { Screen, Card, Chip, Eyebrow, Toggle } from '../src/components/ui';
import { colors, fonts } from '../src/theme';
import { useApp } from '../src/context/AppContext';
import { formatTime, getPrayerTimes, VAKIT_KEYS, VAKIT_NAMES, VakitKey } from '../src/lib/prayerTimes';
import { kurulanGun, ONCE_SECENEK, onceListesi, TUM_GUNLER, VakitAyar as VA } from '../src/lib/notifications';
import { formatWeekday } from '../src/i18n/format';
import { t } from '../src/i18n';

export default function VakitAyar() {
  const params = useLocalSearchParams<{ vakit?: string }>();
  const key = (VAKIT_KEYS.includes(params.vakit as VakitKey) ? params.vakit : 'imsak') as VakitKey;
  const { reminders: r, setReminders, place, calc } = useApp();
  const times = useMemo(() => getPrayerTimes(new Date(), place.lat, place.lng, calc), [place.lat, place.lng, calc]);
  const ayar: VA = r.vakitAyar?.[key] ?? {};
  const once = onceListesi(r, key);
  const gunler = ayar.gunler ?? TUM_GUNLER;
  const ozel = ayar.once !== undefined || ayar.gunler !== undefined;

  const kaydet = (a: VA) => setReminders({ ...r, vakitAyar: { ...r.vakitAyar, [key]: a } });
  const onceDegistir = (n: number) => {
    const next = once.includes(n) ? once.filter((x) => x !== n) : [...once, n];
    kaydet({ ...ayar, once: next });
  };
  const gunDegistir = (d: number) => {
    const next = gunler.includes(d) ? gunler.filter((x) => x !== d) : [...gunler, d];
    if (!next.length) return; // en az bir gün
    kaydet({ ...ayar, gunler: next.length === 7 ? undefined : next });
  };
  // Pazar 8 Kasım 2026'dan itibaren haftanın günleri (yalnız adları için)
  const gunAdi = (d: number) => formatWeekday(new Date(2026, 10, 8 + d), true);
  const ad = t(VAKIT_NAMES[key]);

  return (
    <Screen title={ad}>
      <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
        <View style={st.row}>
          <View style={{ flexShrink: 1 }}>
            <Text style={st.name}>{t('{vakit} hatırlatması', { vakit: ad })}</Text>
            <Text style={st.sub}>{t('Bugün {saat}', { saat: formatTime(times[key], calc.tz) })}</Text>
          </View>
          <Toggle
            label={t('{vakit} hatırlatması', { vakit: ad })}
            value={r.enabled[key]}
            onChange={(v) => setReminders({ ...r, enabled: { ...r.enabled, [key]: v } })}
          />
        </View>
      </Card>

      {r.enabled[key] && (
        <>
          <Eyebrow>{t('Önce hatırlat')}</Eyebrow>
          <Card style={{ gap: 10 }}>
            <Text style={st.sub}>
              {once.length
                ? t('Vakitten {liste} dakika önce ve vakit girince bildirim gelir.', { liste: [...once].sort((a, b) => b - a).join(', ') })
                : t('Yalnızca vakit girince bildirim gelir.')}
            </Text>
            <View style={st.chips}>
              {ONCE_SECENEK.map((n) => (
                <Chip key={n} label={t('{n} dk', { n })} selected={once.includes(n)} onPress={() => onceDegistir(n)} />
              ))}
            </View>
          </Card>

          <Eyebrow>{t('Günler')}</Eyebrow>
          <Card style={{ gap: 10 }}>
            <View style={st.chips}>
              {TUM_GUNLER.map((d) => (
                <Chip key={d} label={gunAdi(d)} selected={gunler.includes(d)} onPress={() => gunDegistir(d)} style={{ minWidth: 52 }} />
              ))}
            </View>
            <Text style={st.sub}>{gunler.length === 7 ? t('Her gün') : t('Yalnızca seçili günlerde')}</Text>
          </Card>

          {ozel && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const v = { ...r.vakitAyar };
                delete v[key];
                setReminders({ ...r, vakitAyar: v });
              }}
            >
              <Text style={st.link}>{t('Genel ayara dön')}</Text>
            </Pressable>
          )}
        </>
      )}

      <Text style={st.note}>{t('Hatırlatmalar önümüzdeki {n} gün için kurulur ve uygulamayı her açtığınızda yenilenir. Daha uzun süre açmazsanız uygulamayı bir kez açmanız yeterli.', { n: kurulanGun(r) })}</Text>
    </Screen>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, paddingVertical: 8, gap: 12 },
  name: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  sub: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  link: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.greenText, textAlign: 'center' },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: 'center' },
});
