// Yakın camiler: OpenStreetMap verisinden (Overpass API) çevredeki camiler ve mescitler.
// Konum izni varsa telefonun konumu, yoksa seçili şehrin merkezi kullanılır.
// Harita verisi © OpenStreetMap katkıda bulunanlar (ODbL) — atıf ekranda gösterilir.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { Text } from '../src/components/Text';
import { Button, Screen, Card } from '../src/components/ui';
import { colors, fonts, radius } from '../src/theme';
import { useApp } from '../src/context/AppContext';
import { getLang, t } from '../src/i18n';
import { formatNumber } from '../src/i18n/format';

type Cami = { id: string; ad: string; lat: number; lng: number; m: number };

const UCLAR = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

function mesafe(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r;
  const dLng = (bLng - aLng) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

async function camileriGetir(lat: number, lng: number, yaricap: number, lang: string): Promise<Cami[]> {
  const q = `[out:json][timeout:20];(nwr["amenity"="place_of_worship"]["religion"="muslim"](around:${yaricap},${lat},${lng}););out center 80;`;
  let son: unknown;
  for (const url of UCLAR) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Kurandan.ai/1.0 (iOS app)' },
        body: `data=${encodeURIComponent(q)}`,
      });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as { elements: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] };
      return json.elements
        .map((e) => {
          const la = e.lat ?? e.center?.lat;
          const lo = e.lon ?? e.center?.lon;
          if (la == null || lo == null) return null;
          const tags = e.tags ?? {};
          const ad = tags[`name:${lang}`] || tags.name || '';
          return { id: `${e.type}${e.id}`, ad, lat: la, lng: lo, m: mesafe(lat, lng, la, lo) };
        })
        .filter((x): x is Cami => !!x)
        .sort((a, b) => a.m - b.m);
    } catch (e) {
      son = e;
    }
  }
  throw son;
}

const mesafeYaz = (m: number) => (m < 1000 ? `${formatNumber(Math.round(m / 10) * 10)} m` : `${formatNumber(Math.round(m / 100) / 10)} km`);

export default function Camiler() {
  const { place } = useApp();
  const lang = getLang();
  const [konum, setKonum] = useState<{ lat: number; lng: number; gps: boolean } | null>(null);
  const [liste, setListe] = useState<Cami[] | null>(null);
  const [hata, setHata] = useState(false);
  const [secili, setSecili] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);

  const yukle = useCallback(async () => {
    setHata(false);
    setListe(null);
    let k = { lat: place.lat, lng: place.lng, gps: false };
    try {
      const izin = await Location.getForegroundPermissionsAsync();
      const p = izin.granted ? izin : await Location.requestForegroundPermissionsAsync();
      if (p.granted) {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        k = { lat: pos.coords.latitude, lng: pos.coords.longitude, gps: true };
      }
    } catch {
      // konum alınamazsa şehir merkezi
    }
    setKonum(k);
    try {
      let l = await camileriGetir(k.lat, k.lng, 2500, lang);
      if (l.length < 5) l = await camileriGetir(k.lat, k.lng, 8000, lang);
      setListe(l.slice(0, 40));
    } catch {
      setHata(true);
    }
  }, [place.lat, place.lng, lang]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const yolTarifi = (c: Cami) => {
    const ad = encodeURIComponent(c.ad || t('Cami'));
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${c.lat},${c.lng}&q=${ad}&dirflg=w`
        : `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}&travelmode=walking`;
    Linking.openURL(url).catch(() => {});
  };

  const odakla = (c: Cami) => {
    setSecili(c.id);
    mapRef.current?.animateToRegion({ latitude: c.lat, longitude: c.lng, latitudeDelta: 0.008, longitudeDelta: 0.008 }, 400);
  };

  return (
    <Screen title={t('Yakın Camiler')}>
      {konum && (
        <View style={st.mapWrap}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={{ latitude: konum.lat, longitude: konum.lng, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
            showsUserLocation={konum.gps}
          >
            {(liste ?? []).map((c) => (
              <Marker
                key={c.id}
                coordinate={{ latitude: c.lat, longitude: c.lng }}
                title={c.ad || t('Cami')}
                description={mesafeYaz(c.m)}
                pinColor={c.id === secili ? '#A87628' : '#18583C'}
                onPress={() => setSecili(c.id)}
              />
            ))}
          </MapView>
        </View>
      )}
      <Text style={st.note}>
        {konum?.gps ? t('Bulunduğunuz yere göre') : t('{sehir} merkezine göre · yakınınızdakiler için konum izni verin', { sehir: place.label })}
      </Text>

      {!liste && !hata && (
        <View style={st.center}>
          <ActivityIndicator color={colors.greenText} />
          <Text style={st.note}>{t('Camiler aranıyor…')}</Text>
        </View>
      )}
      {hata && (
        <Card style={{ gap: 10 }}>
          <Text style={st.info}>{t('Cami listesi alınamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.')}</Text>
          <Button label={t('Tekrar dene')} onPress={yukle} variant="secondary" />
        </Card>
      )}
      {liste && liste.length === 0 && (
        <Card>
          <Text style={st.info}>{t('Yakında kayıtlı cami bulunamadı.')}</Text>
        </Card>
      )}
      {liste && liste.length > 0 && (
        <Card style={{ padding: 0, paddingHorizontal: 14 }}>
          {liste.map((c, i) => (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityLabel={`${c.ad || t('Cami')}, ${mesafeYaz(c.m)}`}
              onPress={() => odakla(c)}
              style={[st.row, i < liste.length - 1 && st.divider, c.id === secili && st.rowOn]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={st.name} numberOfLines={2}>{c.ad || t('Adı kayıtlı olmayan cami')}</Text>
                <Text style={st.dist}>{mesafeYaz(c.m)}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={t('Yol tarifi')} onPress={() => yolTarifi(c)} style={st.go}>
                <Text style={st.goText}>{t('Yol tarifi')}</Text>
              </Pressable>
            </Pressable>
          ))}
        </Card>
      )}
      <Text style={st.attr}>{t('Cami verisi © OpenStreetMap katkıda bulunanlar')}</Text>
    </Screen>
  );
}

const st = StyleSheet.create({
  mapWrap: { height: 260, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card },
  center: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted, textAlign: 'center' },
  info: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.inkSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64, paddingVertical: 8 },
  rowOn: { backgroundColor: colors.greenTint, marginHorizontal: -14, paddingHorizontal: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  name: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.ink },
  dist: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, fontVariant: ['tabular-nums'] },
  go: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.greenText, alignItems: 'center', justifyContent: 'center' },
  goText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.greenText },
  attr: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, textAlign: 'center' },
});
