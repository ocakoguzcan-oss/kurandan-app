// Zekât hesaplama. Nisap Diyanet'e göre 80,18 gram altın değeridir. Temel ihtiyaçlar ve borçlar
// düşüldükten sonra kalan zekâta tabi mal nisaba ulaşmış ve üzerinden bir kameri yıl geçmişse
// kırkta biri (%2,5) verilir. Para birimi kullanıcının kendi para birimidir (ülkeden bağımsız).
import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../src/components/Text';
import { Screen, Card, Eyebrow } from '../src/components/ui';
import { colors, fonts, radius } from '../src/theme';
import { load, save } from '../src/lib/storage';
import { t, tx } from '../src/i18n';
import { formatNumber } from '../src/i18n/format';

const NISAP_GRAM = 80.18;
const KEY = 'kurandan.zekat.v1';

type Alan = { id: string; label: string; ipucu?: string; birim: 'para' | 'gram' };

const VARLIK: Alan[] = [
  { id: 'nakit', label: tx('Nakit ve banka'), ipucu: tx('Evde ve bankadaki para'), birim: 'para' },
  { id: 'doviz', label: tx('Döviz'), ipucu: tx('Kendi para biriminizle karşılığı'), birim: 'para' },
  { id: 'altin', label: tx('Altın'), ipucu: tx('Kullanım dışı (yatırım) altın, gram'), birim: 'gram' },
  { id: 'gumus', label: tx('Gümüş'), ipucu: tx('Kullanım dışı gümüş, gram'), birim: 'gram' },
  { id: 'ticari', label: tx('Ticari mal'), ipucu: tx('Satılmak için elde tutulan mallar'), birim: 'para' },
  { id: 'alacak', label: tx('Alacaklar'), ipucu: tx('Tahsili beklenen alacaklar'), birim: 'para' },
  { id: 'hisse', label: tx('Hisse ve fon'), ipucu: tx('Güncel değeri'), birim: 'para' },
];
const DUSULEN: Alan[] = [{ id: 'borc', label: tx('Borçlar'), ipucu: tx('Vadesi gelmiş ya da bu yıl ödenecek borçlar'), birim: 'para' }];
const FIYAT: Alan[] = [
  { id: 'altinFiyat', label: tx('Gram altın fiyatı'), ipucu: tx('Bugünkü satış fiyatı'), birim: 'para' },
  { id: 'gumusFiyat', label: tx('Gram gümüş fiyatı'), ipucu: tx('Gümüşünüz varsa'), birim: 'para' },
];

type Degerler = Record<string, string>;

const sayi = (v?: string) => {
  const n = Number(String(v ?? '').replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const para = (n: number) => formatNumber(Math.round(n * 100) / 100);

export default function Zekat() {
  const [v, setV] = useState<Degerler>({});
  const [hazir, setHazir] = useState(false);

  useEffect(() => {
    load<Degerler>(KEY, {}).then((d) => {
      setV(d);
      setHazir(true);
    });
  }, []);
  useEffect(() => {
    if (hazir) save(KEY, v);
  }, [v, hazir]);

  const altinF = sayi(v.altinFiyat);
  const gumusF = sayi(v.gumusFiyat);
  const varlik =
    sayi(v.nakit) + sayi(v.doviz) + sayi(v.ticari) + sayi(v.alacak) + sayi(v.hisse) + sayi(v.altin) * altinF + sayi(v.gumus) * gumusF;
  const net = Math.max(0, varlik - sayi(v.borc));
  const nisap = NISAP_GRAM * altinF;
  const fiyatYok = altinF === 0;
  const ulasti = !fiyatYok && net >= nisap && net > 0;
  const zekat = ulasti ? net / 40 : 0;

  const alan = (a: Alan) => (
    <View key={a.id} style={st.field}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={st.label}>{t(a.label)}</Text>
        {a.ipucu && <Text style={st.hint}>{t(a.ipucu)}</Text>}
      </View>
      <View style={st.inputWrap}>
        <TextInput
          value={v[a.id] ?? ''}
          onChangeText={(x) => setV((cur) => ({ ...cur, [a.id]: x.replace(/[^\d.,]/g, '') }))}
          keyboardType="decimal-pad"
          placeholder="0"
          placeholderTextColor={colors.muted}
          accessibilityLabel={t(a.label)}
          style={st.input}
        />
        <Text style={st.unit}>{a.birim === 'gram' ? t('gr') : ''}</Text>
      </View>
    </View>
  );

  return (
    <Screen title={t('Zekât Hesaplama')}>
      <Card style={st.result}>
        <Eyebrow style={{ color: colors.goldLight }}>{t('Vermeniz gereken zekât')}</Eyebrow>
        <Text style={st.big}>{para(zekat)}</Text>
        <Text style={st.resultSub}>
          {fiyatYok
            ? t('Nisabı hesaplamak için aşağıya gram altın fiyatını yazın.')
            : ulasti
              ? t('Net varlığınız {net}, nisap {nisap}. Kırkta biri (%2,5) zekât olarak verilir.', { net: para(net), nisap: para(nisap) })
              : t('Net varlığınız {net}, nisabın ({nisap}) altında. Zekât düşmez.', { net: para(net), nisap: para(nisap) })}
        </Text>
      </Card>

      <Eyebrow>{t('Fiyatlar')}</Eyebrow>
      <Card style={st.group}>{FIYAT.map(alan)}</Card>

      <Eyebrow>{t('Zekâta tabi mallarınız')}</Eyebrow>
      <Card style={st.group}>{VARLIK.map(alan)}</Card>

      <Eyebrow>{t('Düşülecekler')}</Eyebrow>
      <Card style={st.group}>{DUSULEN.map(alan)}</Card>

      <Card style={{ gap: 8 }}>
        <Text style={st.infoTitle}>{t('Zekât kime farzdır?')}</Text>
        <Text style={st.info}>
          {t(
            'Temel ihtiyaçları ve borçları dışında nisap miktarı (80,18 gram altın değeri) ya da daha fazla malı olan ve bu mal üzerinden bir kameri yıl (354 gün) geçen Müslümana zekât farzdır. Oturulan ev, kullanılan araba, ev eşyası ve takı olarak kullanılan ziynet zekâta dahil edilmez.'
          )}
        </Text>
        <Text style={st.info}>{t('Kaynak: Diyanet İşleri Başkanlığı. Özel durumlar için bir din görevlisine danışın.')}</Text>
      </Card>
    </Screen>
  );
}

const st = StyleSheet.create({
  result: { backgroundColor: colors.green, borderColor: colors.green, gap: 6 },
  big: { fontFamily: fonts.bodyBold, fontSize: 40, color: colors.paper, fontVariant: ['tabular-nums'] },
  resultSub: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.mutedOnGreen },
  group: { paddingVertical: 4, paddingHorizontal: 14 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, borderBottomWidth: 1, borderBottomColor: colors.divider },
  label: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  input: {
    width: 120,
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.buttonBorder,
    backgroundColor: colors.paper,
    paddingHorizontal: 10,
    fontFamily: fonts.bodySemi,
    fontSize: 16,
    color: colors.ink,
    textAlign: 'right',
  },
  unit: { width: 18, fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  infoTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  info: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.inkSoft },
});
