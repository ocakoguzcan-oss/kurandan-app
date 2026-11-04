// Kâbe'ye Nasıl Gidilir? — Araba / Otobüs / Uçak. Haritada güzergâh animasyonla çizilir,
// altında sınır kapıları, belgeler, firmalar ve ipuçları adım adım yazar.
// İçerik content/kabe-yolu.json'dan gelir (GitHub'da güncellenince herkese ulaşır).
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text as RNText, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Text } from '../src/components/Text';
import { Screen, Card, Chip, Eyebrow } from '../src/components/ui';
import { colors, fonts, radius } from '../src/theme';
import { useRemoteJson } from '../src/lib/remoteJson';
import bundled from '../content/kabe-yolu.json';

type Durak = { ad: string; lat: number; lng: number; tur: 'sehir' | 'sinir' | 'havalimani' | 'hedef'; detay: string };
type Guzergah = { id: string; ad: string; mesafe: string; sure: string; duraklar: Durak[] };
type Mod = {
  baslik: string;
  ozet: string;
  uyari: string;
  guzergahlar: Guzergah[];
  belgeler: string[];
  ipuclari: string[];
  firmalar: { ad: string; url: string }[];
};
type Veri = {
  surum: number;
  guncelleme: string;
  genel: { umreHac: string[]; vize: string[]; kaynaklar: { ad: string; url: string }[] };
  modlar: Record<'araba' | 'otobus' | 'ucak', Mod>;
};
type ModId = keyof Veri['modlar'];

const MODLAR: { id: ModId; ad: string }[] = [
  { id: 'araba', ad: 'Araba' },
  { id: 'otobus', ad: 'Otobüs' },
  { id: 'ucak', ad: 'Uçak' },
];

const isValid = (x: unknown): x is Veri => {
  const v = x as Veri;
  return !!v && !!v.modlar && (['araba', 'otobus', 'ucak'] as const).every((m) => Array.isArray(v.modlar[m]?.guzergahlar));
};

type LL = { latitude: number; longitude: number };

/** İki nokta arasında büyük çember yayı (uçak rotası için). */
function arc(a: LL, b: LL, n = 40): LL[] {
  const r = Math.PI / 180;
  const [φ1, λ1, φ2, λ2] = [a.latitude * r, a.longitude * r, b.latitude * r, b.longitude * r];
  const d = 2 * Math.asin(Math.sqrt(Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2));
  if (d === 0) return [a, b];
  const out: LL[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    out.push({ latitude: Math.atan2(z, Math.sqrt(x * x + y * y)) / r, longitude: Math.atan2(y, x) / r });
  }
  return out;
}

/** Durakları animasyon için sık noktalara böler. */
function path(duraklar: Durak[], ucak: boolean): LL[] {
  const ll = duraklar.map((d) => ({ latitude: d.lat, longitude: d.lng }));
  const out: LL[] = [];
  for (let i = 0; i < ll.length - 1; i++) {
    const seg = ucak && i === 0 ? arc(ll[i], ll[i + 1], 60) : Array.from({ length: 13 }, (_, k) => ({
      latitude: ll[i].latitude + ((ll[i + 1].latitude - ll[i].latitude) * k) / 12,
      longitude: ll[i].longitude + ((ll[i + 1].longitude - ll[i].longitude) * k) / 12,
    }));
    out.push(...(i === 0 ? seg : seg.slice(1)));
  }
  return out;
}

const DOT: Record<Durak['tur'], string> = { sehir: colors.green, sinir: '#C8553D', havalimani: '#1B5E9E', hedef: colors.gold };

export default function KabeYolu() {
  const veri = useRemoteJson<Veri>('kabe-yolu.json', bundled as Veri, isValid);
  const [mod, setMod] = useState<ModId>('araba');
  const [gIdx, setGIdx] = useState(0);
  const [focus, setFocus] = useState<number | null>(null);
  const [drawn, setDrawn] = useState(0);
  const [run, setRun] = useState(0);
  const mapRef = useRef<MapView>(null);
  const m = veri.modlar[mod];
  const g = m.guzergahlar[Math.min(gIdx, m.guzergahlar.length - 1)];
  const line = useMemo(() => path(g.duraklar, mod === 'ucak'), [g, mod]);

  // Güzergâhı baştan çiz
  useEffect(() => {
    setDrawn(1);
    setFocus(null);
    const total = line.length;
    const stepMs = Math.max(12, Math.round(2600 / total));
    let n = 1;
    const t = setInterval(() => {
      n += 1;
      setDrawn(n);
      if (n >= total) clearInterval(t);
    }, stepMs);
    const coords = g.duraklar.map((d) => ({ latitude: d.lat, longitude: d.lng }));
    setTimeout(() => mapRef.current?.fitToCoordinates(coords, { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: true }), 200);
    return () => clearInterval(t);
  }, [line, g, run]);

  const focusOn = (i: number) => {
    setFocus(i);
    const d = g.duraklar[i];
    mapRef.current?.animateToRegion({ latitude: d.lat, longitude: d.lng, latitudeDelta: 3.5, longitudeDelta: 3.5 }, 600);
  };

  const visible = line.slice(0, drawn);
  const head = visible[visible.length - 1];
  const reachedStops = g.duraklar.filter((d) => visible.some((p) => Math.abs(p.latitude - d.lat) < 1e-6 && Math.abs(p.longitude - d.lng) < 1e-6));

  return (
    <Screen title="Kâbe'ye Nasıl Gidilir?">
      <View style={st.segWrap}>
        <View style={st.seg} accessibilityRole="tablist">
          {MODLAR.map((x) => {
            const on = x.id === mod;
            return (
              <Pressable
                key={x.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  setMod(x.id);
                  setGIdx(0);
                }}
                style={[st.segBtn, on && st.segOn]}
              >
                <Text style={[st.segText, on && st.segTextOn]}>{x.ad}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={st.mapBox}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{ latitude: 31, longitude: 35, latitudeDelta: 22, longitudeDelta: 22 }}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
        >
          <Polyline coordinates={line} strokeColor="rgba(24,88,60,0.18)" strokeWidth={5} />
          <Polyline coordinates={visible} strokeColor={mod === 'ucak' ? '#1B5E9E' : colors.green} strokeWidth={4} lineDashPattern={mod === 'ucak' ? [10, 8] : undefined} />
          {reachedStops.map((d) => {
            const i = g.duraklar.indexOf(d);
            return (
              <Marker key={`${g.id}-${i}`} coordinate={{ latitude: d.lat, longitude: d.lng }} anchor={{ x: 0.5, y: 0.5 }} onPress={() => focusOn(i)} tracksViewChanges={false}>
                <View style={[st.dot, { backgroundColor: DOT[d.tur], width: d.tur === 'hedef' ? 18 : 12, height: d.tur === 'hedef' ? 18 : 12 }, focus === i && st.dotFocus]} />
              </Marker>
            );
          })}
          {head && drawn < line.length && (
            <Marker coordinate={head} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges>
              <RNText style={{ fontSize: 20 }}>{mod === 'ucak' ? '✈️' : mod === 'otobus' ? '🚌' : '🚗'}</RNText>
            </Marker>
          )}
        </MapView>
        <Pressable accessibilityRole="button" onPress={() => setRun((r) => r + 1)} style={st.replay}>
          <Text style={st.replayText}>↻ Yolu tekrar çiz</Text>
        </Pressable>
      </View>
      <Text style={st.mapNote}>Harita temsilîdir; çizgi ana durakları birleştirir, gerçek yol biraz farklı olabilir.</Text>

      {m.guzergahlar.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {m.guzergahlar.map((x, i) => (
            <Chip key={x.id} label={x.ad} selected={i === gIdx} onPress={() => setGIdx(i)} />
          ))}
        </ScrollView>
      )}

      <View style={st.facts}>
        <View style={st.fact}>
          <Text style={st.factLabel}>Mesafe</Text>
          <Text style={st.factVal}>{g.mesafe}</Text>
        </View>
        <View style={st.fact}>
          <Text style={st.factLabel}>Süre</Text>
          <Text style={st.factVal}>{g.sure}</Text>
        </View>
      </View>

      <Text style={st.ozet}>{m.ozet}</Text>
      {!!m.uyari && (
        <View style={st.warn}>
          <Text style={st.warnTitle}>Dikkat</Text>
          <Text style={st.warnText}>{m.uyari}</Text>
        </View>
      )}

      <Eyebrow>Adım adım güzergâh</Eyebrow>
      <View style={st.timeline}>
        {g.duraklar.map((d, i) => (
          <Pressable key={`${g.id}-${i}`} accessibilityRole="button" onPress={() => focusOn(i)} style={[st.stop, focus === i && st.stopOn]}>
            <View style={st.rail}>
              <View style={[st.stopDot, { backgroundColor: DOT[d.tur] }]} />
              {i < g.duraklar.length - 1 && <View style={st.railLine} />}
            </View>
            <View style={{ flex: 1, paddingBottom: 14 }}>
              <Text style={st.stopName}>{d.ad}</Text>
              {d.tur === 'sinir' && <Text style={st.badge}>Sınır kapısı</Text>}
              {!!d.detay && <Text style={st.stopDetail}>{d.detay}</Text>}
            </View>
          </Pressable>
        ))}
      </View>

      <Eyebrow>Gerekli belgeler</Eyebrow>
      <Card style={{ gap: 8 }}>
        {m.belgeler.map((b, i) => (
          <View key={i} style={st.li}>
            <Text style={st.check}>✓</Text>
            <Text style={st.liText}>{b}</Text>
          </View>
        ))}
      </Card>

      {m.firmalar.length > 0 && (
        <>
          <Eyebrow>{mod === 'ucak' ? 'Havayolları ve tren' : 'Firmalar'}</Eyebrow>
          <View style={st.firmWrap}>
            {m.firmalar.map((f) => (
              <Pressable key={f.url} accessibilityRole="link" onPress={() => Linking.openURL(f.url)} style={st.firm}>
                <Text style={st.firmText}>{`${f.ad} ↗`}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Eyebrow>İpuçları</Eyebrow>
      <Card style={{ gap: 8 }}>
        {m.ipuclari.map((t, i) => (
          <View key={i} style={st.li}>
            <Text style={st.check}>•</Text>
            <Text style={st.liText}>{t}</Text>
          </View>
        ))}
      </Card>

      <Eyebrow>Umre mi, hac mı?</Eyebrow>
      <Card style={{ gap: 8 }}>
        {veri.genel.umreHac.map((t, i) => (
          <Text key={i} style={st.liText}>{t}</Text>
        ))}
      </Card>

      <Eyebrow>Vize ve umre izni</Eyebrow>
      <Card style={{ gap: 8 }}>
        {veri.genel.vize.map((t, i) => (
          <Text key={i} style={st.liText}>{t}</Text>
        ))}
      </Card>

      <Eyebrow>Resmî kaynaklar</Eyebrow>
      <View style={st.firmWrap}>
        {veri.genel.kaynaklar.map((k) => (
          <Pressable key={k.url} accessibilityRole="link" onPress={() => Linking.openURL(k.url)} style={st.firm}>
            <Text style={st.firmText}>{`${k.ad} ↗`}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={st.mapNote}>{`Bilgiler ${veri.guncelleme.split('-').reverse().join('.')} tarihinde güncellendi. Kurallar ve sınır kapıları değişebilir; yola çıkmadan resmî kaynaklardan teyit edin.`}</Text>
    </Screen>
  );
}

const st = StyleSheet.create({
  segWrap: { alignItems: 'center' },
  seg: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, borderColor: colors.buttonBorder, backgroundColor: colors.card, padding: 4 },
  segBtn: { minHeight: 44, minWidth: 92, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.green },
  segText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.green },
  segTextOn: { color: colors.paper },
  mapBox: { height: 320, borderRadius: radius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card },
  replay: { position: 'absolute', right: 10, bottom: 10, backgroundColor: 'rgba(251,247,238,0.95)', borderRadius: 12, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
  replayText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.green },
  mapNote: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted, textAlign: 'center' },
  dot: { borderRadius: 10, borderWidth: 2, borderColor: '#FFFFFF' },
  dotFocus: { transform: [{ scale: 1.6 }] },
  facts: { flexDirection: 'row', gap: 10 },
  fact: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.lg, padding: 12, gap: 2 },
  factLabel: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  factVal: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.green },
  ozet: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.ink },
  warn: { backgroundColor: '#FBEBD3', borderWidth: 1, borderColor: colors.gold, borderRadius: 16, padding: 14, gap: 4 },
  warnTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.goldText },
  warnText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.ink },
  timeline: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.lg, paddingTop: 14, paddingHorizontal: 12 },
  stop: { flexDirection: 'row', gap: 12, borderRadius: 10 },
  stopOn: { backgroundColor: 'rgba(226,194,122,0.22)' },
  rail: { width: 16, alignItems: 'center' },
  stopDot: { width: 14, height: 14, borderRadius: 7, marginTop: 3 },
  railLine: { flex: 1, width: 2, backgroundColor: colors.cardBorder, marginTop: 2 },
  stopName: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  badge: { alignSelf: 'flex-start', marginTop: 3, fontFamily: fonts.bodySemi, fontSize: 11, color: '#FFFFFF', backgroundColor: '#C8553D', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  stopDetail: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 3 },
  li: { flexDirection: 'row', gap: 8 },
  check: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.green, width: 14 },
  liText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.ink },
  firmWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  firm: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.buttonBorder, backgroundColor: colors.card, justifyContent: 'center' },
  firmText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.green },
});
