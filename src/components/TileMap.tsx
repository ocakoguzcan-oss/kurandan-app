// Anahtarsız harita (Android'de Yakın Camiler): OpenStreetMap karolarını kendimiz dizeriz.
// Parmakla kaydırma, iki parmakla yakınlaştırma, çift dokunma ve +/− düğmeleri; işaretler dokunulabilir.
// Google Maps anahtarı gerekmez. OSM kullanım kuralı gereği uygulamayı tanıtan bir User-Agent gönderilir
// ve haritanın altında "© OpenStreetMap" yazar.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, fonts } from '../theme';

const KARO = 256;
const EN_AZ = 3;
const EN_COK = 18;
const KARO_URL = (z: number, x: number, y: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
const BASLIK = { 'User-Agent': 'Kurandan.ai/1.0 (Android; +https://kurandan.ai)' };

export type HaritaNokta = { id: string; lat: number; lng: number; secili?: boolean };

/** Enlem/boylam → zoom z'de dünya pikseli (Web Mercator) */
function piksel(lat: number, lng: number, z: number) {
  const n = KARO * 2 ** z;
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return { x: ((lng + 180) / 360) * n, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n };
}

/** Bütün noktaları sığdıran en yakın zoom */
function sigdir(noktalar: { lat: number; lng: number }[], w: number, h: number): number {
  if (noktalar.length < 2) return 15;
  for (let z = 17; z > EN_AZ; z--) {
    const p = noktalar.map((n) => piksel(n.lat, n.lng, z));
    const gen = Math.max(...p.map((q) => q.x)) - Math.min(...p.map((q) => q.x));
    const yuk = Math.max(...p.map((q) => q.y)) - Math.min(...p.map((q) => q.y));
    if (gen <= w - 48 && yuk <= h - 48) return z;
  }
  return EN_AZ;
}

export function TileMap({
  merkez,
  odak,
  noktalar,
  ben,
  onNokta,
  onEtkilesim,
  height = 260,
}: {
  /** İlk açılış merkezi */
  merkez: { lat: number; lng: number };
  /** Değişince harita buraya kayar ve yakınlaşır */
  odak?: { lat: number; lng: number } | null;
  noktalar: HaritaNokta[];
  /** Kullanıcının konumu (mavi nokta) */
  ben?: { lat: number; lng: number } | null;
  onNokta?: (id: string) => void;
  /** Haritaya dokunulurken true: sayfanın kaydırmasını kapatmak için */
  onEtkilesim?: (v: boolean) => void;
  height?: number;
}) {
  const [w, setW] = useState(0);
  const [z, setZ] = useState(15);
  // Görünümün merkezi, z zoomundaki dünya pikseli olarak
  const [c, setC] = useState(() => piksel(merkez.lat, merkez.lng, 15));
  const [olcek, setOlcek] = useState(1);
  const [kayma, setKayma] = useState({ x: 0, y: 0 });
  const olcekRef = useRef(1);
  const etkilesim = useRef(onEtkilesim);
  etkilesim.current = onEtkilesim;
  const durum = useRef({ z, c, w });
  durum.current = { z, c, w };
  const ilk = useRef(false);

  // Genişlik belli olunca ve noktalar gelince hepsini sığdır (bir kez)
  useEffect(() => {
    if (!w || ilk.current || noktalar.length === 0) return;
    ilk.current = true;
    const hepsi = [merkez, ...noktalar];
    const yz = sigdir(hepsi, w, height);
    const lat = (Math.max(...hepsi.map((n) => n.lat)) + Math.min(...hepsi.map((n) => n.lat))) / 2;
    const lng = (Math.max(...hepsi.map((n) => n.lng)) + Math.min(...hepsi.map((n) => n.lng))) / 2;
    setZ(yz);
    setC(piksel(lat, lng, yz));
  }, [w, noktalar, merkez, height]);

  useEffect(() => {
    if (!odak) return;
    const yz = Math.max(durum.current.z, 16);
    setZ(yz);
    setC(piksel(odak.lat, odak.lng, yz));
  }, [odak]);

  const zoomla = (fark: number) => {
    const { z: mz, c: mc } = durum.current;
    const yz = Math.max(EN_AZ, Math.min(EN_COK, mz + fark));
    if (yz === mz) return;
    const k = 2 ** (yz - mz);
    setZ(yz);
    setC({ x: mc.x * k, y: mc.y * k });
  };

  const sonDokunma = useRef(0);
  const pan = useMemo(() => {
    let baslangicMesafe = 0;
    let iki = false;
    const mesafe = (t: readonly { pageX: number; pageY: number }[]) => Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        iki = false;
        baslangicMesafe = 0;
        olcekRef.current = 1;
        etkilesim.current?.(true);
      },
      onPanResponderMove: (e, g) => {
        const t = e.nativeEvent.touches;
        if (t.length >= 2) {
          if (!iki) {
            iki = true;
            baslangicMesafe = mesafe(t);
          }
          olcekRef.current = Math.max(0.25, Math.min(4, mesafe(t) / (baslangicMesafe || 1)));
          setOlcek(olcekRef.current);
          return;
        }
        if (!iki) setKayma({ x: g.dx, y: g.dy });
      },
      onPanResponderRelease: (_e, g) => {
        etkilesim.current?.(false);
        const { z: mz, c: mc } = durum.current;
        if (iki) {
          const fark = Math.round(Math.log2(olcekRef.current));
          if (fark) {
            const yz = Math.max(EN_AZ, Math.min(EN_COK, mz + fark));
            const k = 2 ** (yz - mz);
            setZ(yz);
            setC({ x: mc.x * k, y: mc.y * k });
          }
          olcekRef.current = 1;
          setOlcek(1);
          setKayma({ x: 0, y: 0 });
          return;
        }
        const n = KARO * 2 ** mz;
        setC({ x: (((mc.x - g.dx) % n) + n) % n, y: Math.max(0, Math.min(n, mc.y - g.dy)) });
        setKayma({ x: 0, y: 0 });
        // Çift dokunma: yakınlaştır
        if (Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6) {
          const simdi = Date.now();
          if (simdi - sonDokunma.current < 300) {
            sonDokunma.current = 0;
            const yz = Math.min(EN_COK, mz + 1);
            if (yz !== mz) {
              setZ(yz);
              setC({ x: mc.x * 2, y: mc.y * 2 });
            }
          } else sonDokunma.current = simdi;
        }
      },
      onPanResponderTerminate: () => {
        etkilesim.current?.(false);
        olcekRef.current = 1;
        setKayma({ x: 0, y: 0 });
        setOlcek(1);
      },
    });
  }, []);

  // Görünen karolar
  const karolar: { k: string; x: number; y: number; uri: string }[] = [];
  if (w) {
    const n = 2 ** z;
    const solX = c.x - w / 2;
    const ustY = c.y - height / 2;
    for (let ty = Math.floor(ustY / KARO); ty <= Math.floor((ustY + height) / KARO); ty++) {
      if (ty < 0 || ty >= n) continue;
      for (let tx = Math.floor(solX / KARO); tx <= Math.floor((solX + w) / KARO); tx++) {
        const gx = ((tx % n) + n) % n;
        karolar.push({ k: `${z}/${tx}/${ty}`, x: tx * KARO - solX, y: ty * KARO - ustY, uri: KARO_URL(z, gx, ty) });
      }
    }
  }
  const ekran = (lat: number, lng: number) => {
    const p = piksel(lat, lng, z);
    return { x: p.x - c.x + w / 2, y: p.y - c.y + height / 2 };
  };

  return (
    <View style={[st.kutu, { height }]} onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
      <View
        style={[StyleSheet.absoluteFill, { transform: [{ translateX: kayma.x }, { translateY: kayma.y }, { scale: olcek }] }]}
        {...pan.panHandlers}
      >
        {karolar.map((t) => (
          <Image key={t.k} source={{ uri: t.uri, headers: BASLIK }} fadeDuration={0} style={{ position: 'absolute', left: t.x, top: t.y, width: KARO, height: KARO }} />
        ))}
        {ben &&
          (() => {
            const p = ekran(ben.lat, ben.lng);
            return <View pointerEvents="none" style={[st.ben, { left: p.x - 8, top: p.y - 8 }]} />;
          })()}
        {noktalar.map((nk) => {
          const p = ekran(nk.lat, nk.lng);
          if (p.x < -20 || p.x > w + 20 || p.y < -30 || p.y > height + 20) return null;
          return (
            <Pressable
              key={nk.id}
              accessibilityRole="button"
              onPress={() => onNokta?.(nk.id)}
              hitSlop={8}
              style={[st.igne, { left: p.x - 13, top: p.y - 30, zIndex: nk.secili ? 2 : 1 }]}
            >
              <View style={[st.igneBas, { backgroundColor: nk.secili ? colors.gold : '#18583C' }]}>
                <Text style={st.igneYazi}>🕌</Text>
              </View>
              <View style={[st.igneUc, { borderTopColor: nk.secili ? colors.gold : '#18583C' }]} />
            </Pressable>
          );
        })}
      </View>
      <View style={st.dugmeler}>
        <Pressable accessibilityRole="button" accessibilityLabel="+" onPress={() => zoomla(1)} style={st.dugme}>
          <Text style={st.dugmeYazi}>+</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="−" onPress={() => zoomla(-1)} style={st.dugme}>
          <Text style={st.dugmeYazi}>−</Text>
        </Pressable>
      </View>
      <Text style={st.atif}>© OpenStreetMap</Text>
    </View>
  );
}

const st = StyleSheet.create({
  kutu: { overflow: 'hidden', backgroundColor: '#E8E4D8' },
  ben: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: '#2F7DE1', borderWidth: 3, borderColor: '#FFFFFF' },
  igne: { position: 'absolute', width: 26, alignItems: 'center' },
  igneBas: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  igneYazi: { fontSize: 12, lineHeight: 15 },
  igneUc: { width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', marginTop: -1 },
  dugmeler: { position: 'absolute', right: 8, top: 8, gap: 6 },
  dugme: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#DCCDAA' },
  dugmeYazi: { fontFamily: fonts.bodyBold, fontSize: 20, lineHeight: 22, color: '#18583C' },
  atif: { position: 'absolute', right: 6, bottom: 4, fontSize: 10, color: '#3B3A33', backgroundColor: 'rgba(255,255,255,0.75)', paddingHorizontal: 4, borderRadius: 4 },
});
