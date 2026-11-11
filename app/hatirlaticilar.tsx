// Hatırlatıcılar: vakit bildirimleri dışındaki ek hatırlatmalar (teheccüd, Pazartesi/Perşembe orucu,
// Cuma namazı, "kıldınız mı?", erteleme düğmesi, kandil ve Cuma story). Hepsi telefonda kurulur.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../src/components/Text';
import { Screen, Card, Chip, Eyebrow, Toggle } from '../src/components/ui';
import { colors, fonts } from '../src/theme';
import { useApp } from '../src/context/AppContext';
import { ERTELE_SECENEK, KILDIN_SECENEK, KILDIN_VARSAYILAN, kurulanGun, ReminderSettings, TEHECCUD_SECENEK } from '../src/lib/notifications';
import { t } from '../src/i18n';

export default function Hatirlaticilar() {
  const { reminders: r, setReminders } = useApp();
  const set = (p: Partial<ReminderSettings>) => setReminders({ ...r, ...p });

  const Satir = ({ ad, alt, deger, degistir, son, children }: { ad: string; alt: string; deger: boolean; degistir: (v: boolean) => void; son?: boolean; children?: React.ReactNode }) => (
    <View style={[st.block, !son && st.divider]}>
      <View style={st.row}>
        <View style={{ flexShrink: 1 }}>
          <Text style={st.name}>{ad}</Text>
          <Text style={st.sub}>{alt}</Text>
        </View>
        <Toggle label={ad} value={deger} onChange={degistir} />
      </View>
      {deger && children ? <View style={st.chips}>{children}</View> : null}
    </View>
  );

  const erteleDk = r.erteleDk ?? 10;
  return (
    <Screen title={t('Hatırlatıcılar')}>
      <Eyebrow>{t('Namaz')}</Eyebrow>
      <Card style={st.card}>
        <Satir
          ad={t('Namazını kıldın mı?')}
          alt={t('Vakit girdikten sonra sorar. Bildirimi basılı tutup ‘Evet, kıldım’ ya da ‘Hayır, kılmadım’ seçin; kılmadım derseniz o vakit kaza borcuna eklenir. Cevap vermezseniz hiçbir şey kendiliğinden işaretlenmez.')}
          deger={!!r.kildinMi}
          degistir={(v) => set({ kildinMi: v })}
        >
          {KILDIN_SECENEK.map((n) => (
            <Chip key={n} label={t('{n} dk sonra', { n })} selected={(r.kildinMiDk ?? KILDIN_VARSAYILAN) === n} onPress={() => set({ kildinMiDk: n })} />
          ))}
          <View style={st.alt}>
            <View style={st.row}>
              <View style={{ flexShrink: 1 }}>
                <Text style={st.name}>{t('Vakit çıkmadan son uyarı')}</Text>
                <Text style={st.sub}>{t('Cevap vermediyseniz vaktin çıkmasına 15 dakika kala bir kez daha sorar')}</Text>
              </View>
              <Toggle label={t('Vakit çıkmadan son uyarı')} value={r.sonUyari !== false} onChange={(v) => set({ sonUyari: v })} />
            </View>
            <View style={st.row}>
              <View style={{ flexShrink: 1 }}>
                <Text style={st.name}>{t('Haftalık özet')}</Text>
                <Text style={st.sub}>{t('Cuma akşamı bu hafta kaç vakit kıldığınızı hatırlatır')}</Text>
              </View>
              <Toggle label={t('Haftalık özet')} value={!!r.haftalikOzet} onChange={(v) => set({ haftalikOzet: v })} />
            </View>
            <Text style={st.sub}>{t('İşaretlenmemiş vakitler ertesi gün ana ekranda sorulur; kılmadıklarınızı tek dokunuşla kaza borcuna ekleyebilirsiniz.')}</Text>
          </View>
        </Satir>
        <Satir
          ad={t('Teheccüd için uyandır')}
          alt={t('İmsaktan önce, gecenin son üçte birinde hafif bir bildirim')}
          deger={!!r.teheccud}
          degistir={(v) => set({ teheccud: v })}
        >
          {TEHECCUD_SECENEK.map((n) => (
            <Chip
              key={n}
              label={n % 60 === 0 ? t('İmsaktan {n} saat önce', { n: n / 60 }) : t('İmsaktan {n} dk önce', { n })}
              selected={(r.teheccudDk ?? 60) === n}
              onPress={() => set({ teheccudDk: n })}
            />
          ))}
        </Satir>
        <Satir
          ad={t('Cuma namazı')}
          alt={t('Cuma günü öğleden 45 dakika önce hatırlat')}
          deger={!!r.cumaNamaz}
          degistir={(v) => set({ cumaNamaz: v })}
          son
        />
      </Card>

      <Eyebrow>{t('Oruç ve mübarek günler')}</Eyebrow>
      <Card style={st.card}>
        <Satir
          ad={t('Pazartesi ve Perşembe orucu')}
          alt={t('Bir önceki akşam 21:00’de ve sahurda (imsaktan 45 dk önce)')}
          deger={!!r.oruc}
          degistir={(v) => set({ oruc: v })}
        />
        <Satir
          ad={t('Kandil ve dini günler')}
          alt={t('Bir gün önce ve o gün hatırlat')}
          deger={r.diniGunler}
          degistir={(v) => set({ diniGunler: v })}
        />
        <Satir
          ad={t('Cuma hatırlatması')}
          alt={t('Cuma sabahı 09:00 · story görseli hazır')}
          deger={r.cuma}
          degistir={(v) => set({ cuma: v })}
          son
        />
      </Card>

      <Eyebrow>{t('Bildirimi erteleme')}</Eyebrow>
      <Card style={[st.card, { paddingVertical: 14, gap: 10 }]}>
        <Text style={st.sub}>{t('Bildirimi basılı tutunca çıkan ‘sonra hatırlat’ düğmesinin süresi.')}</Text>
        <View style={st.chips}>
          {ERTELE_SECENEK.map((n) => (
            <Chip key={n} label={n ? t('{n} dk', { n }) : t('Kapalı')} selected={erteleDk === n} onPress={() => set({ erteleDk: n })} />
          ))}
        </View>
      </Card>

      <Text style={st.note}>
        {t('Hatırlatmalar önümüzdeki {n} gün için kurulur ve uygulamayı her açtığınızda yenilenir. Daha uzun süre açmazsanız uygulamayı bir kez açmanız yeterli.', { n: kurulanGun(r) })}
      </Text>
    </Screen>
  );
}

const st = StyleSheet.create({
  card: { paddingVertical: 4, paddingHorizontal: 14 },
  block: { paddingVertical: 10, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  alt: { width: '100%', gap: 8, paddingTop: 4 },
  name: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  sub: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted, marginTop: 1 },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: 'center' },
});
