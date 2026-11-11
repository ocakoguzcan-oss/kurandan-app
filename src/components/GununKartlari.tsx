// Ana ekrandaki "İyi Niyet Et ve Kart Seç" bölümü: 3 kapalı kart. Seçilen kart dönerek açılır ve
// kart ekranına geçilir. Günlük hak bittiyse kart sallanır ve "Fe sabrun cemîl" penceresi çıkar
// (yeni kartlar imsakta açılır; ileride ödüllü video ile de açılacak).
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { Eyebrow } from './ui';
import { StarOrnament } from './Icons';
import { colors, fonts, lightColors, radius } from '../theme';
import { acabilir, acilanlar, gununKartlari, kartAc, KartTur, useKartlar } from '../lib/kartlar';
import { formatCountdown } from '../lib/prayerTimes';
import { t } from '../i18n';

const TUR_AD: Record<KartTur, string> = { ayet: 'Ayet', hadis: 'Hadis', dua: 'Dua' };

function KartYuzu({ konum, acik, tur, onPress, sallaRef }: { konum: number; acik: boolean; tur: KartTur; onPress: (konum: number, cevir: (sonra: () => void) => void) => void; sallaRef: (f: () => void) => void }) {
  const don = useRef(new Animated.Value(acik ? 1 : 0)).current;
  const buyu = useRef(new Animated.Value(1)).current;
  const salla = useRef(new Animated.Value(0)).current;
  const parilti = useRef(new Animated.Value(0)).current;

  // Kapalı kartlar hafifçe "nefes alır"
  useEffect(() => {
    if (acik) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(parilti, { toValue: 1, duration: 1600 + konum * 250, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(parilti, { toValue: 0, duration: 1600 + konum * 250, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [acik, konum, parilti]);

  useEffect(() => {
    sallaRef(() => {
      salla.setValue(0);
      Animated.sequence(
        [10, -10, 8, -8, 4, 0].map((v) => Animated.timing(salla, { toValue: v, duration: 60, useNativeDriver: true }))
      ).start();
    });
  }, [salla, sallaRef]);

  const cevir = (sonra: () => void) => {
    Animated.sequence([
      Animated.spring(buyu, { toValue: 1.08, useNativeDriver: true, speed: 30 }),
      Animated.timing(don, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.spring(buyu, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start(() => sonra());
  };

  const arka = don.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '90deg', '90deg'] });
  const on = don.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-90deg', '-90deg', '0deg'] });
  const arkaOp = don.interpolate({ inputRange: [0, 0.5, 0.51, 1], outputRange: [1, 1, 0, 0] });
  const onOp = don.interpolate({ inputRange: [0, 0.5, 0.51, 1], outputRange: [0, 0, 1, 1] });
  const isik = parilti.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={acik ? t('{tur} kartını aç', { tur: t(TUR_AD[tur]) }) : t('{n}. kartı seç', { n: konum + 1 })}
      onPress={() => onPress(konum, cevir)}
      style={{ flex: 1 }}
    >
      <Animated.View style={[st.kart, { transform: [{ translateX: salla }, { scale: buyu }] }]}>
        {/* Arka yüz (kapalı) */}
        <Animated.View style={[st.yuz, st.arka, { opacity: arkaOp, transform: [{ perspective: 800 }, { rotateY: arka }] }]}>
          <Animated.View style={[st.isik, { opacity: isik }]} />
          <StarOrnament size={34} color={lightColors.goldLight} fill={lightColors.green} />
          <Text style={st.arkaYazi}>Kurandan.ai</Text>
        </Animated.View>
        {/* Ön yüz (açık) */}
        <Animated.View style={[st.yuz, st.on, { opacity: onOp, transform: [{ perspective: 800 }, { rotateY: on }] }]}>
          <StarOrnament size={22} />
          <Text style={st.onTur}>{t(TUR_AD[tur])}</Text>
          <Text style={st.onAlt}>{t('Okumak için dokun')}</Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export function GununKartlari({ gun, yenilenme, now }: { gun: Date; yenilenme: Date; now: Date }) {
  const s = useKartlar();
  const kartlar = gununKartlari(gun);
  const acik = acilanlar(s, gun);
  const [sabir, setSabir] = useState(false);
  const sallalar = useRef<(() => void)[]>([]);

  const sec = (konum: number, cevir: (sonra: () => void) => void) => {
    const kart = kartlar[konum];
    if (acik.includes(konum)) {
      router.push({ pathname: '/kart', params: { id: kart.id } });
      return;
    }
    if (!acabilir(s, gun)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      sallalar.current[konum]?.();
      setTimeout(() => setSabir(true), 380);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    cevir(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      kartAc(gun, konum);
      setTimeout(() => router.push({ pathname: '/kart', params: { id: kart.id, yeni: '1' } }), 250);
    });
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={st.baslik}>
        <View style={{ flexShrink: 1 }}>
          <Eyebrow>{t('Günün Kartları')}</Eyebrow>
          <Text style={st.niyet}>{t('İyi Niyet Et ve Kart Seç')}</Text>
        </View>
        <Pressable accessibilityRole="link" onPress={() => router.push('/kart-sandigi')} hitSlop={8}>
          <Text style={st.sandik}>{t('Kart Sandığım ›')}</Text>
        </Pressable>
      </View>
      <View style={st.sira}>
        {kartlar.map((k, i) => (
          <KartYuzu
            key={`${k.id}-${i}`}
            konum={i}
            acik={acik.includes(i)}
            tur={k.tur}
            onPress={sec}
            sallaRef={(f) => {
              sallalar.current[i] = f;
            }}
          />
        ))}
      </View>
      <Text style={st.not}>
        {acik.length ? t('Yeni kartlar {sure} sonra imsakta açılacak', { sure: formatCountdown(yenilenme.getTime() - now.getTime()) }) : t('Her gün imsakta yeni kartlar · ilk kart bugün sana açık')}
      </Text>

      <Modal visible={sabir} transparent animationType="fade" onRequestClose={() => setSabir(false)}>
        <Pressable style={st.perde} onPress={() => setSabir(false)}>
          <View style={st.pencere}>
            <StarOrnament size={34} />
            <Text style={st.arapca}>فَصَبْرٌ جَمِيلٌ</Text>
            <Text style={st.sabirBaslik}>{t('Sabır güzeldir…')}</Text>
            <Text style={st.sabirKaynak}>{t('Yûsuf, 18')}</Text>
            <Text style={st.sabirMetin}>{t('Bugünün kartını açtın. Diğer kartların yarın imsakta açılacak.')}</Text>
            <Text style={st.sayac}>{formatCountdown(yenilenme.getTime() - now.getTime())}</Text>
            <Pressable accessibilityRole="button" onPress={() => setSabir(false)} style={st.tamam}>
              <Text style={st.tamamYazi}>{t('Tamam')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  baslik: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  niyet: { fontFamily: fonts.display, fontSize: 19, color: colors.ink, marginTop: 2 },
  sandik: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.greenText },
  sira: { flexDirection: 'row', gap: 10 },
  kart: { aspectRatio: 0.68, borderRadius: radius.md },
  yuz: { ...StyleSheet.absoluteFillObject, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden', overflow: 'hidden' },
  arka: { backgroundColor: lightColors.green, borderWidth: 2, borderColor: lightColors.gold, gap: 8 },
  isik: { position: 'absolute', width: '140%', height: '40%', backgroundColor: lightColors.goldLight, top: '30%', transform: [{ rotate: '-30deg' }], opacity: 0.3 },
  arkaYazi: { fontFamily: fonts.bodySemi, fontSize: 10, letterSpacing: 1, color: lightColors.goldLight },
  on: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.gold, gap: 6, padding: 8 },
  onTur: { fontFamily: fonts.display, fontSize: 18, color: colors.greenText },
  onAlt: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, textAlign: 'center' },
  not: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, textAlign: 'center', fontVariant: ['tabular-nums'] },
  perde: { flex: 1, backgroundColor: 'rgba(8,24,16,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  pencere: { width: '100%', maxWidth: 340, backgroundColor: colors.card, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.gold, padding: 24, alignItems: 'center', gap: 6 },
  arapca: { fontFamily: fonts.arabic, fontSize: 34, color: colors.greenText, marginTop: 6 },
  sabirBaslik: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  sabirKaynak: { fontFamily: fonts.body, fontSize: 12, color: colors.goldText },
  sabirMetin: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.inkSoft, textAlign: 'center', marginTop: 8 },
  sayac: { fontFamily: fonts.bodyBold, fontSize: 28, color: colors.greenText, fontVariant: ['tabular-nums'], marginTop: 4 },
  tamam: { marginTop: 10, minHeight: 46, alignSelf: 'stretch', borderRadius: 14, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  tamamYazi: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.onGreen },
});
