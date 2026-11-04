// Vakit hesaplama yöntemi: otomatik (ülkeye göre) ya da elle seçilen kurum yöntemi; ikindi için
// standart (Şâfiî/Mâlikî/Hanbelî, Diyanet) ya da Hanefî gölge hesabı.
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { Screen, Card, Eyebrow } from '../src/components/ui';
import { colors, fonts } from '../src/theme';
import { useApp } from '../src/context/AppContext';
import { setPrefs, usePrefs } from '../src/lib/prefs';
import { defaultAsr, defaultMethod, formatTime, getPrayerTimes, METHOD_IDS, METHODS, MethodId, VAKIT_KEYS, VAKIT_NAMES } from '../src/lib/prayerTimes';
import { getLang, t } from '../src/i18n';
import { countryName } from '../src/data/world';

export default function VakitYontemi() {
  const { place, calc } = useApp();
  const prefs = usePrefs();
  const lang = getLang();
  const auto = defaultMethod(place.country, lang);
  const autoAsr = defaultAsr(place.country, lang);
  const times = getPrayerTimes(new Date(), place.lat, place.lng, calc);

  const Row = ({ id, label, sub, on, onPress, last }: { id: string; label: string; sub?: string; on: boolean; onPress: () => void; last?: boolean }) => (
    <Pressable key={id} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={onPress} style={[st.row, !last && st.divider]}>
      <View style={{ flex: 1 }}>
        <Text style={[st.name, on && { color: colors.green, fontFamily: fonts.bodyBold }]}>{label}</Text>
        {sub ? <Text style={st.sub}>{sub}</Text> : null}
      </View>
      <View style={[st.radio, on && st.radioOn]} />
    </Pressable>
  );

  const fajrIsha = (m: MethodId) => {
    const x = METHODS[m];
    const isha = typeof x.isha === 'number' ? `${x.isha}°` : t('akşamdan {n} dk sonra', { n: x.isha.min });
    return `${t('İmsak')} ${x.fajr}° · ${t('Yatsı')} ${isha}`;
  };

  return (
    <Screen title={t('Vakit hesaplama yöntemi')}>
      <Card style={st.preview}>
        <Text style={st.previewTitle}>{`${place.label} · ${t('bugün')}`}</Text>
        <View style={st.timesRow}>
          {VAKIT_KEYS.map((k) => (
            <View key={k} style={st.cell}>
              <Text style={st.cellLabel}>{t(VAKIT_NAMES[k])}</Text>
              <Text style={st.cellVal}>{formatTime(times[k], calc.tz)}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Eyebrow>{t('Yöntem')}</Eyebrow>
      <Card style={{ padding: 0, paddingHorizontal: 14 }}>
        <Row
          id="auto"
          label={t('Otomatik')}
          sub={t('{ulke} için: {yontem}', { ulke: countryName(place.country, lang), yontem: METHODS[auto].name })}
          on={!prefs.method}
          onPress={() => setPrefs({ method: undefined })}
        />
        {METHOD_IDS.map((m, i) => (
          <Row key={m} id={m} label={METHODS[m].name} sub={fajrIsha(m)} on={prefs.method === m} onPress={() => setPrefs({ method: m })} last={i === METHOD_IDS.length - 1} />
        ))}
      </Card>

      <Eyebrow>{t('İkindi vakti')}</Eyebrow>
      <Card style={{ padding: 0, paddingHorizontal: 14 }}>
        <Row
          id="asr-auto"
          label={t('Otomatik')}
          sub={autoAsr === 'hanafi' ? t('Hanefî') : t('Standart')}
          on={!prefs.asr}
          onPress={() => setPrefs({ asr: undefined })}
        />
        <Row id="standard" label={t('Standart')} sub={t('Şâfiî, Mâlikî, Hanbelî · Diyanet (asr-ı evvel)')} on={prefs.asr === 'standard'} onPress={() => setPrefs({ asr: 'standard' })} />
        <Row id="hanafi" label={t('Hanefî')} sub={t('Gölge boyun iki katı olunca (asr-ı sânî)')} on={prefs.asr === 'hanafi'} onPress={() => setPrefs({ asr: 'hanafi' })} last />
      </Card>

      <Text style={st.note}>
        {t('Vakitler internet olmadan cihazda hesaplanır ve seçtiğiniz şehrin saatine göre gösterilir. Bulunduğunuz yerdeki caminin takvimiyle 1–3 dakika fark olabilir; caminizin kullandığı yöntemi seçebilirsiniz. Kuzey ülkelerinde yazın imsak ve yatsı için gecenin bir bölümü esas alınır.')}
      </Text>
    </Screen>
  );
}

const st = StyleSheet.create({
  preview: { gap: 10 },
  previewTitle: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.ink },
  timesRow: { flexDirection: 'row', gap: 4 },
  cell: { flex: 1, alignItems: 'center', gap: 2 },
  cellLabel: { fontFamily: fonts.body, fontSize: 10, color: colors.muted },
  cellVal: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.green },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 58, paddingVertical: 8, gap: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  name: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  sub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.buttonBorder },
  radioOn: { borderColor: colors.green, backgroundColor: colors.green },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: 'center' },
});
