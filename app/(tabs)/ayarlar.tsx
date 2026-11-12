import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../src/components/Text';
import { router, useFocusEffect } from 'expo-router';
import { Screen, Card, Chip, Eyebrow, Toggle } from '../../src/components/ui';
import { colors, fonts } from '../../src/theme';
import { useApp } from '../../src/context/AppContext';
import { formatTime, getPrayerTimes, METHODS, VAKIT_KEYS, VAKIT_NAMES, VakitKey } from '../../src/lib/prayerTimes';
import { utcLabel } from '../../src/lib/tz';
import { countryName } from '../../src/data/world';
import { getPermissionStatus, gunAcik, kurulanGun, LEAD_OPTIONS, onceListesi, PermissionStatus, sesOf, testEzanBildirimi, VakitAyar } from '../../src/lib/notifications';
import { sesById } from '../../src/lib/bildirimSesleri';
import { EZANLAR } from '../../src/lib/ezanSesleri';
import { setPrefs, usePrefs } from '../../src/lib/prefs';
import { useTour } from '../../src/tour/Tour';
import { SATIN_ALMA_ACIK, usePremium } from '../../src/lib/premium';
import { alarmPermission, alarmSupported, canliDestek, tanilama, testSabahAlarm } from '../../src/lib/vakitWidget';
import { getLang, LANGS, t } from '../../src/i18n';

export default function Ayarlar() {
  const { place, reminders, setReminders, calc, methodAuto } = useApp();
  const times = useMemo(() => getPrayerTimes(new Date(), place.lat, place.lng, calc), [place.lat, place.lng, calc]);
  const lang = getLang();
  const prefs = usePrefs();
  const tour = useTour();
  const premium = usePremium();

  // GEÇİCİ TEST (yalnız iOS)
  const testEzan = () =>
    Alert.alert('Hangi ezan?', 'Bildirim 10 saniye sonra gelir. Sesi duymak için telefonu kilitleyin ya da ana ekrana dönün.', [
      ...EZANLAR.map((e) => ({
        text: e.ad,
        onPress: async () => {
          const ok = await testEzanBildirimi(e.id, sesOf(reminders), reminders.sesSeviyesi);
          if (!ok) Alert.alert('Bildirim izni kapalı', 'Önce Ayarlar → İzinler’den bildirim izni verin.');
        },
      })),
      ...(alarmSupported()
        ? [
            {
              text: 'Sabah alarmı (10 sn)',
              onPress: async () => {
                const ok = await testSabahAlarm(10, reminders.sesSeviyesi);
                if (!ok) Alert.alert('Alarm kurulamadı', 'Alarm izni verilmedi ya da iOS 26 gerekli.');
              },
            },
          ]
        : []),
      { text: 'Tanılama', onPress: () => Alert.alert('Tanılama', tanilama()) },
      { text: 'Vazgeç', style: 'cancel' as const },
    ]);
  const alarmVar = useMemo(() => alarmSupported(), []);
  const canliVar = useMemo(() => canliDestek(), []);
  const ekSayisi = [reminders.kildinMi, reminders.teheccud, reminders.cumaNamaz, reminders.oruc, reminders.diniGunler, reminders.cuma].filter(Boolean).length;
  const vakitOzet = (k: VakitKey) => {
    if (!reminders.enabled[k]) return `${formatTime(times[k], calc.tz)} · ${t('kapalı')}`;
    const parca = [formatTime(times[k], calc.tz)];
    const once = onceListesi(reminders, k);
    parca.push(once.length ? t('{liste} dk önce + vaktinde', { liste: once.join(', ') }) : t('vaktinde'));
    const gunSayi = [0, 1, 2, 3, 4, 5, 6].filter((d) => gunAcik(reminders, k, d)).length;
    if (gunSayi < 7) parca.push(t('haftada {n} gün', { n: gunSayi }));
    return parca.join(' · ');
  };
  const sabahAlarm = async (v: boolean) => {
    if (v) {
      const p = await alarmPermission(true);
      if (p !== 'granted') {
        Alert.alert(t('Alarm izni verilmedi'), t('Ayarlar → Kurandan.ai → Alarmlar’dan izin verebilirsiniz.'));
        return;
      }
    }
    setReminders({ ...reminders, sabahAlarm: v });
  };
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
        <View style={[st.row, Platform.OS === 'ios' && st.divider]}>
          <View style={{ flexShrink: 1 }}>
            <Text style={st.name}>{t('Büyük yazı')}</Text>
            <Text style={st.sub}>{t('Uygulamadaki tüm yazıları büyütür')}</Text>
          </View>
          <Toggle label={t('Büyük yazı')} value={prefs.largeText} onChange={(v) => setPrefs({ largeText: v })} />
        </View>
        {Platform.OS === 'ios' && (
          <View style={{ paddingVertical: 10, gap: 8 }}>
            <Text style={st.name}>{t('Gece modu')}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {(
                [
                  ['auto', t('Otomatik')],
                  ['dark', t('Açık')],
                  ['light', t('Kapalı')],
                ] as const
              ).map(([v, l]) => (
                <Chip key={v} label={l} selected={(prefs.tema ?? 'auto') === v} onPress={() => setPrefs({ tema: v })} style={{ flex: 1 }} />
              ))}
            </View>
            <Text style={st.sub}>{t('Otomatik: akşam ezanından güneş doğana kadar gece modu')}</Text>
          </View>
        )}
      </Card>

      {Platform.OS === 'android' && (
        <Pressable accessibilityRole="button" onPress={() => Linking.openSettings().catch(() => {})} style={st.androidBanner}>
          <Text style={st.permTitle}>{t('Ezan tam vaktinde gelsin')}</Text>
          <Text style={st.permBody}>{t('Android’de uygulama ayarlarından “Alarmlar ve hatırlatıcılar” iznini açın; yoksa bildirim birkaç dakika gecikebilir. Açmak için dokunun.')}</Text>
        </Pressable>
      )}

      <Eyebrow>{t('Vakit hatırlatmaları')}</Eyebrow>
      <Card style={{ padding: 0, paddingHorizontal: 14 }}>
        {VAKIT_KEYS.map((k, i) => (
          <Pressable
            key={k}
            accessibilityRole="button"
            accessibilityHint={t('Önce hatırlatma ve günleri ayarlayın')}
            onPress={() => router.push({ pathname: '/vakit-ayar', params: { vakit: k } })}
            style={[st.row, i < VAKIT_KEYS.length - 1 && st.divider]}
          >
            <View style={{ flexShrink: 1 }}>
              <Text style={st.name}>{`${t(VAKIT_NAMES[k])} ›`}</Text>
              <Text style={st.sub} numberOfLines={2}>{vakitOzet(k)}</Text>
            </View>
            <Toggle
              label={t('{vakit} hatırlatması', { vakit: t(VAKIT_NAMES[k]) })}
              value={reminders.enabled[k]}
              onChange={(v) => setReminders({ ...reminders, enabled: { ...reminders.enabled, [k]: v } })}
            />
          </Pressable>
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
                onPress={() => {
                  // Genel seçim, vakitlere özel "önce" seçimlerinin yerine geçer (gün seçimleri kalır)
                  const vakitAyar: Partial<Record<VakitKey, VakitAyar>> = {};
                  for (const [k, a] of Object.entries(reminders.vakitAyar ?? {}) as [VakitKey, VakitAyar][]) if (a.gunler) vakitAyar[k] = { gunler: a.gunler };
                  setReminders({ ...reminders, leadMin: m, vakitAyar });
                }}
                style={[st.lead, on ? st.leadOn : st.leadOff]}
              >
                <Text style={[st.leadText, { color: on ? colors.onGreen : colors.greenText }]}>{m === 0 ? t('Vaktinde') : t('{n} dk', { n: m })}</Text>
              </Pressable>
            );
          })}
        </View>
        {Object.values(reminders.vakitAyar ?? {}).some((a) => a?.once) && (
          <Text style={st.sub}>{t('Bazı vakitlerde özel seçim var; o vakte dokunarak değiştirebilirsiniz.')}</Text>
        )}
      </View>

      <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/bildirim-sesi')} style={[st.row, st.divider]}>
          <View style={{ flexShrink: 1 }}>
            <Text style={st.name}>{t('Bildirim sesi')}</Text>
            <Text style={st.sub}>
              {t(sesById(sesOf(reminders)).aciklama)}
            </Text>
          </View>
          <Text style={st.link}>{`${t(sesById(sesOf(reminders)).ad)} ›`}</Text>
        </Pressable>
        {alarmVar && (
          <View style={[st.row, st.divider]}>
            <View style={{ flexShrink: 1 }}>
              <Text style={st.name}>{t('Sabah ezanı alarm olarak')}</Text>
              <Text style={st.sub}>{t('Sessiz modda da çalar · kaydırarak ya da Durdur ile kapatılır')}</Text>
            </View>
            <Toggle label={t('Sabah ezanı alarm olarak')} value={!!reminders.sabahAlarm} onChange={sabahAlarm} />
          </View>
        )}
        {/* GEÇİCİ TEST (yalnız iOS): denendikten sonra silinecek */}
        {Platform.OS === 'ios' && (
          <Pressable accessibilityRole="button" onPress={testEzan} style={[st.row, st.divider]}>
            <View style={{ flexShrink: 1 }}>
              <Text style={st.name}>Ezan bildirimini dene (test)</Text>
              <Text style={st.sub}>10 saniye sonra seçili sesle bildirim gelir</Text>
            </View>
            <Text style={st.link}>Dene ›</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" onPress={() => router.push('/hatirlaticilar')} style={[st.row, st.divider]}>
          <View style={{ flexShrink: 1 }}>
            <Text style={st.name}>{t('Hatırlatıcılar')}</Text>
            <Text style={st.sub} numberOfLines={2}>{t('Kıldınız mı?, teheccüd, oruç, Cuma, kandil, erteleme')}</Text>
          </View>
          <Text style={st.link}>{`${ekSayisi ? t('{n} açık', { n: ekSayisi }) : t('Kapalı')} ›`}</Text>
        </Pressable>
        {canliVar && (
          <View style={[st.row, st.divider]}>
            <View style={{ flexShrink: 1 }}>
              <Text style={st.name}>{t('Canlı Etkinlik')}</Text>
              <Text style={st.sub}>{t('Kilit ekranında ve Dinamik Ada’da sıradaki vakte geri sayım')}</Text>
            </View>
            <Toggle label={t('Canlı Etkinlik')} value={!!reminders.canli} onChange={(v) => setReminders({ ...reminders, canli: v })} />
          </View>
        )}
        {SATIN_ALMA_ACIK && (
        <Pressable accessibilityRole="button" onPress={() => router.push('/kilit-ekrani')} style={[st.row, st.divider]}>
          <View style={{ flexShrink: 1 }}>
            <Text style={st.name}>{t('Kilit ekranında Kur’an dinleme')}</Text>
            <Text style={st.sub}>{t('Telefon kilitliyken tilavet devam eder')}</Text>
          </View>
          <Text style={st.link}>{premium.owned ? t('Açık ›') : premium.price ? `${premium.price} ›` : t('Aç ›')}</Text>
        </Pressable>
        )}
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
        <Pressable accessibilityRole="button" onPress={() => router.push('/kisisel')} style={[st.row, st.divider]}>
          <View style={{ flexShrink: 1 }}>
            <Text style={st.name}>{t('Kişisel ayarlar')}</Text>
            <Text style={st.sub} numberOfLines={2}>{t('Hicri gün düzeltmesi, saat biçimi, iftar sayacı, otomatik şehir')}</Text>
          </View>
          <Text style={st.link}>{'›'}</Text>
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
        {t('Hatırlatmalar önümüzdeki {n} gün için kurulur ve uygulamayı her açtığınızda yenilenir. Daha uzun süre açmazsanız uygulamayı bir kez açmanız yeterli.', { n: kurulanGun(reminders) })}
      </Text>
    </Screen>
  );
}

const st = StyleSheet.create({
  permBanner: { backgroundColor: colors.warnBg, borderWidth: 1, borderColor: colors.gold, borderRadius: 16, padding: 14, gap: 4 },
  androidBanner: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 16, padding: 14, gap: 4 },
  permTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.goldText },
  permBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, paddingVertical: 8, gap: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  name: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  sub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 1 },
  link: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.greenText, flexShrink: 1 },
  lead: { flex: 1, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  leadOn: { backgroundColor: colors.green, borderColor: colors.green },
  leadOff: { backgroundColor: colors.card, borderColor: colors.buttonBorder },
  leadText: { fontFamily: fonts.bodySemi, fontSize: 13 },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: 'center' },
});
