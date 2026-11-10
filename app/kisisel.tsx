// Kişisel ayarlar: hicri gün düzeltmesi, saat biçimi, ana ekranda iftar sayacı ve konumdan
// otomatik şehir bulma.
import React from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { Screen, Card, Eyebrow, Toggle } from '../src/components/ui';
import { colors, fonts } from '../src/theme';
import { useApp } from '../src/context/AppContext';
import { setPrefs, usePrefs } from '../src/lib/prefs';
import { formatHijriTr, hijriMonthName, setHicriDuzelt, toHijri } from '../src/lib/hijri';
import { formatTime } from '../src/lib/prayerTimes';
import { setSaat12 } from '../src/lib/tz';
import { formatNumber } from '../src/i18n/format';
import { getLang, t } from '../src/i18n';

export default function Kisisel() {
  const prefs = usePrefs();
  const { place, setOtoKonum } = useApp();
  const lang = getLang();
  const duzelt = prefs.hicriDuzelt ?? 0;

  const hicriYaz = () => {
    const h = toHijri(new Date());
    return lang === 'tr' ? formatHijriTr(h) : `${formatNumber(h.day)} ${hijriMonthName(h.month, lang)} ${formatNumber(h.year)}`;
  };
  const duzeltDegistir = (n: number) => {
    const v = Math.max(-2, Math.min(2, duzelt + n));
    setHicriDuzelt(v);
    setPrefs({ hicriDuzelt: v });
  };

  const otoKonum = async (v: boolean) => {
    const ok = await setOtoKonum(v);
    if (v && !ok) Alert.alert(t('Konum izni gerekli'), t('Ayarlar → Kurandan.ai → Konum’dan ‘Uygulamayı Kullanırken’ seçin.'));
  };

  return (
    <Screen title={t('Kişisel ayarlar')}>
      <Eyebrow>{t('Takvim ve saat')}</Eyebrow>
      <Card style={st.card}>
        <View style={[st.row, st.divider]}>
          <View style={{ flexShrink: 1 }}>
            <Text style={st.name}>{t('Hicri gün düzeltmesi')}</Text>
            <Text style={st.sub}>{t('Bugün: {tarih}', { tarih: hicriYaz() })}</Text>
          </View>
          <View style={st.stepper}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('Bir gün geri')} disabled={duzelt <= -2} onPress={() => duzeltDegistir(-1)} style={[st.step, duzelt <= -2 && st.off]}>
              <Text style={st.stepText}>−</Text>
            </Pressable>
            <Text style={st.stepVal}>{duzelt > 0 ? `+${duzelt}` : String(duzelt)}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('Bir gün ileri')} disabled={duzelt >= 2} onPress={() => duzeltDegistir(1)} style={[st.step, duzelt >= 2 && st.off]}>
              <Text style={st.stepText}>+</Text>
            </Pressable>
          </View>
        </View>
        <View style={st.row}>
          <View style={{ flexShrink: 1 }}>
            <Text style={st.name}>{t('12 saat biçimi')}</Text>
            <Text style={st.sub}>{t('Örnek: {saat}', { saat: ornekSaat(!!prefs.saat12) })}</Text>
          </View>
          <Toggle
            label={t('12 saat biçimi')}
            value={!!prefs.saat12}
            onChange={(v) => {
              setSaat12(v, t('ÖÖ'), t('ÖS'));
              setPrefs({ saat12: v });
            }}
          />
        </View>
      </Card>
      <Text style={st.note}>{t('Hicri tarih hesapla bulunur; ayın görülmesine göre ilan edilen tarihten bir gün sapabilir. Diyanet takvimiyle uyuşmuyorsa buradan düzeltin.')}</Text>

      <Eyebrow>{t('Ana ekran ve konum')}</Eyebrow>
      <Card style={st.card}>
        <View style={[st.row, st.divider]}>
          <View style={{ flexShrink: 1 }}>
            <Text style={st.name}>{t('İftar sayacı')}</Text>
            <Text style={st.sub}>{t('Ana ekranda akşam ezanına kalan süre (nafile oruç için de)')}</Text>
          </View>
          <Toggle label={t('İftar sayacı')} value={!!prefs.iftarSayaci} onChange={(v) => setPrefs({ iftarSayaci: v })} />
        </View>
        <View style={st.row}>
          <View style={{ flexShrink: 1 }}>
            <Text style={st.name}>{t('Otomatik şehir bulma')}</Text>
            <Text style={st.sub}>
              {place.source === 'gps' ? t('Açık · {sehir}', { sehir: place.label }) : t('Uygulama açılınca bulunduğunuz şehre geçer')}
            </Text>
          </View>
          <Toggle label={t('Otomatik şehir bulma')} value={place.source === 'gps'} onChange={otoKonum} />
        </View>
      </Card>
    </Screen>
  );
}

function ornekSaat(on: boolean) {
  const d = new Date();
  d.setHours(18, 32, 0, 0);
  setSaat12(on, t('ÖÖ'), t('ÖS'));
  return formatTime(d);
}

const st = StyleSheet.create({
  card: { paddingVertical: 4, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 60, paddingVertical: 8, gap: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  name: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  sub: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  step: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.buttonBorder, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.4 },
  stepText: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.greenText },
  stepVal: { minWidth: 28, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink, fontVariant: ['tabular-nums'] },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: 'center' },
});
