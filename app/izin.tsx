// Tüm izinler tek ekranda, tek düğmeyle: bildirim (ezan), konum (kıble ve vakit), fotoğraflar
// (Cuma görselini kaydetmek). Yaşlı kullanıcılar için büyük yazı; sistem penceresinde nereye
// dokunulacağı parmak animasyonuyla gösterilir. İzin reddedilirse Ayarlar'dan açma anlatılır.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library/legacy';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Text } from '../src/components/Text';
import { colors, fonts } from '../src/theme';
import { IconBell, IconCheck, IconCompass, IconStory } from '../src/components/Icons';
import { getPermissionStatus, requestPermission } from '../src/lib/notifications';
import { setPrefs, usePrefs } from '../src/lib/prefs';
import { useApp } from '../src/context/AppContext';
import { useTour } from '../src/tour/Tour';

type Step = 'anlat' | 'ayarlar' | 'tamam';
type Perm = 'granted' | 'denied' | 'undetermined';
type PermKey = 'bildirim' | 'konum' | 'foto';
type PermState = Record<PermKey, { status: Perm; canAsk: boolean }>;

const PERMS: { key: PermKey; title: string; why: string; Icon: typeof IconBell }[] = [
  { key: 'bildirim', title: 'Bildirimler', why: 'Vakit girince ezan sesiyle haber verelim', Icon: IconBell },
  { key: 'konum', title: 'Konum', why: 'Kıble yönü ve bulunduğunuz yerin vakitleri', Icon: IconCompass },
  { key: 'foto', title: 'Fotoğraflar', why: 'Cuma görselini galerinize kaydedebilmek için', Icon: IconStory },
];

const norm = (granted: boolean, status: string): Perm => (granted ? 'granted' : status === 'undetermined' ? 'undetermined' : 'denied');

async function readAll(): Promise<PermState> {
  const [n, l, f] = await Promise.all([
    getPermissionStatus().catch(() => ({ status: 'undetermined' as Perm, canAskAgain: true })),
    Location.getForegroundPermissionsAsync().catch(() => null),
    MediaLibrary.getPermissionsAsync(true).catch(() => null),
  ]);
  return {
    bildirim: { status: n.status, canAsk: n.canAskAgain },
    konum: l ? { status: norm(l.granted, l.status), canAsk: l.canAskAgain } : { status: 'undetermined', canAsk: true },
    foto: f ? { status: norm(f.granted, f.status), canAsk: f.canAskAgain } : { status: 'undetermined', canAsk: true },
  };
}

export default function IzinScreen() {
  const insets = useSafeAreaInsets();
  const { reminders, setReminders } = useApp();
  const tour = useTour();
  const onboarding = usePrefs().onboarding === 'perm';
  const [step, setStep] = useState<Step>('anlat');
  const [perms, setPerms] = useState<PermState | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async (afterAsk = false) => {
    const p = await readAll();
    setPerms(p);
    const all = PERMS.every((x) => p[x.key].status === 'granted');
    if (all) {
      setStep('tamam');
      setReminders({ ...reminders }); // hatırlatmaları hemen kur
    } else if (afterAsk || PERMS.some((x) => p[x.key].status === 'denied' && !p[x.key].canAsk)) {
      setStep(PERMS.some((x) => p[x.key].status !== 'granted' && !p[x.key].canAsk) ? 'ayarlar' : 'anlat');
    }
    if (p.bildirim.status === 'granted') setReminders({ ...reminders });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminders]);

  useEffect(() => {
    setPrefs({ permissionIntroShown: true });
    refresh();
    // Ayarlardan geri dönülünce izinleri tekrar kontrol et
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const askAll = async () => {
    setBusy(true);
    try {
      const p = perms ?? (await readAll());
      if (p.bildirim.status !== 'granted' && p.bildirim.canAsk) await requestPermission().catch(() => false);
      if (p.konum.status !== 'granted' && p.konum.canAsk) await Location.requestForegroundPermissionsAsync().catch(() => null);
      if (p.foto.status !== 'granted' && p.foto.canAsk) await MediaLibrary.requestPermissionsAsync(true).catch(() => null);
    } finally {
      setBusy(false);
      refresh(true);
    }
  };

  const close = () => {
    tour.permissionsDone();
    router.canGoBack() ? router.back() : router.replace('/');
  };

  const missing = perms ? PERMS.filter((x) => perms[x.key].status !== 'granted') : [];

  return (
    <View style={[st.root, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}>
      {step === 'anlat' && (
        <ScrollView contentContainerStyle={{ gap: 16 }} showsVerticalScrollIndicator={false}>
          <View style={st.top}>
            <PulsingBell />
            <Text style={st.h1}>Birkaç izin gerekiyor</Text>
            <Text style={st.lead}>Uygulamanın tüm bölümlerinin çalışması için bir kez izin vermeniz yeterli.</Text>
          </View>
          <View style={st.permList}>
            {PERMS.map(({ key, title, why, Icon }) => {
              const ok = perms?.[key].status === 'granted';
              return (
                <View key={key} style={st.permRow}>
                  <View style={st.permIcon}>
                    <Icon size={24} color={colors.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.permTitle}>{title}</Text>
                    <Text style={st.permWhy}>{why}</Text>
                  </View>
                  {ok && (
                    <View style={st.permOk}>
                      <IconCheck size={18} color={colors.paper} strokeWidth={3} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
          <AlertDemo />
          <View style={st.steps}>
            <StepRow n={1} text="Aşağıdaki yeşil “İzin ver” düğmesine dokunun." />
            <StepRow n={2} text="Çıkan her pencerede “İzin Ver”e dokunun." />
            <StepRow n={3} text="Konum sorulursa “Uygulamayı Kullanırken İzin Ver”i seçin." />
          </View>
          <BigButton label={busy ? 'Bekleyin…' : 'İzin ver'} onPress={askAll} />
          <Pressable accessibilityRole="button" onPress={close} style={st.later}>
            <Text style={st.laterText}>Daha sonra</Text>
          </Pressable>
        </ScrollView>
      )}

      {step === 'ayarlar' && (
        <ScrollView contentContainerStyle={{ gap: 18 }} showsVerticalScrollIndicator={false}>
          <View style={st.top}>
            <Text style={st.h1}>İzinleri Ayarlar’dan açalım</Text>
            <Text style={st.lead}>{`Şu izinler kapalı: ${missing.map((m) => m.title).join(', ')}. Telefonunuzun Ayarlar’ından birkaç dokunuşla açabilirsiniz.`}</Text>
          </View>
          <SettingsDemo />
          <View style={st.steps}>
            <StepRow n={1} text="Aşağıdaki “Ayarları Aç” düğmesine dokunun." />
            <StepRow n={2} text={`Açılan sayfada ${missing.map((m) => `“${m.title}”`).join(', ')} satırına dokunun.`} />
            <StepRow n={3} text={Platform.OS === 'ios' ? 'İzni açın (konum için “Uygulamayı Kullanırken”), sonra uygulamaya geri dönün.' : 'İzni açın, sonra uygulamaya geri dönün.'} />
          </View>
          <BigButton label="Ayarları Aç" onPress={() => Linking.openSettings()} />
          <Pressable accessibilityRole="button" onPress={close} style={st.later}>
            <Text style={st.laterText}>Daha sonra</Text>
          </Pressable>
        </ScrollView>
      )}

      {step === 'tamam' && (
        <View style={[st.top, { flex: 1, justifyContent: 'center' }]}>
          <SuccessCheck />
          <Text style={st.h1}>Teşekkürler!</Text>
          <Text style={st.lead}>{onboarding ? 'Her şey hazır. Şimdi size uygulamayı kısaca tanıtalım.' : 'Her şey hazır. Ezan vakitlerinde size haber vereceğiz.'}</Text>
          <View style={{ height: 24 }} />
          <BigButton label={onboarding ? 'Devam' : 'Tamam'} onPress={close} />
        </View>
      )}
    </View>
  );
}

function StepRow({ n, text }: { n: number; text: string }) {
  return (
    <View style={st.stepRow}>
      <View style={st.stepNo}>
        <Text style={st.stepNoText}>{n}</Text>
      </View>
      <Text style={st.stepText}>{text}</Text>
    </View>
  );
}

function BigButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [st.big, { opacity: pressed ? 0.85 : 1 }]}>
      <Text style={st.bigText}>{label}</Text>
    </Pressable>
  );
}

function useLoop(duration: number, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [v, duration, delay]);
  return v;
}

function PulsingBell() {
  const v = useLoop(1600);
  const scale = v.interpolate({ inputRange: [0, 0.15, 0.3, 0.45, 0.6, 1], outputRange: [1, 1.12, 1, 1.08, 1, 1] });
  const rotate = v.interpolate({ inputRange: [0, 0.1, 0.2, 0.3, 0.4, 1], outputRange: ['0deg', '-14deg', '12deg', '-8deg', '0deg', '0deg'] });
  return (
    <Animated.View style={[st.bell, { transform: [{ scale }, { rotate }] }]}>
      <IconBell size={44} color={colors.paper} strokeWidth={2} />
    </Animated.View>
  );
}

/** Parmak simgesi */
function Finger() {
  return (
    <Svg width={54} height={66} viewBox="0 0 54 66">
      <Path
        d="M20 30V9a5 5 0 0 1 10 0v17l2-1a5 5 0 0 1 6 1l1 1a5 5 0 0 1 6 2l1 1c3 1 4 4 4 7v10c0 9-7 17-17 17h-3c-6 0-11-3-14-8L7 41a5 5 0 0 1 8-6z"
        fill="#FFE3C4"
        stroke="#7E5718"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Sistem izin penceresinin taklidi; parmak "İzin Ver"e gidip dokunur. */
function AlertDemo() {
  const v = useLoop(2800, 300);
  const fingerX = v.interpolate({ inputRange: [0, 0.45, 1], outputRange: [10, 66, 66] });
  const fingerY = v.interpolate({ inputRange: [0, 0.45, 1], outputRange: [120, 22, 22] });
  const press = v.interpolate({ inputRange: [0, 0.5, 0.58, 0.66, 1], outputRange: [1, 1, 0.88, 1, 1] });
  const glow = v.interpolate({ inputRange: [0, 0.5, 0.58, 0.85, 1], outputRange: [0, 0, 1, 1, 0] });
  const ring = v.interpolate({ inputRange: [0, 0.55, 0.85, 1], outputRange: [0.2, 0.2, 1.6, 1.6] });
  const ringOpacity = v.interpolate({ inputRange: [0, 0.55, 0.6, 0.85, 1], outputRange: [0, 0, 0.6, 0, 0] });
  return (
    <View style={st.demoWrap} accessibilityLabel="Örnek: izin penceresinde İzin Ver düğmesine dokunma" accessible>
      <View style={st.alert}>
        <Text style={st.alertTitle}>“Kurandan” Size Bildirim Göndermek İstiyor</Text>
        <Text style={st.alertBody}>Bildirimler; uyarılar, sesler ve simge işaretleri içerebilir.</Text>
        <View style={st.alertBtns}>
          <View style={[st.alertBtn, { borderRightWidth: StyleSheet.hairlineWidth }]}>
            <Text style={st.alertBtnText}>İzin Verme</Text>
          </View>
          <Animated.View style={[st.alertBtn, { transform: [{ scale: press }] }]}>
            <Animated.View style={[StyleSheet.absoluteFill, st.alertGlow, { opacity: glow }]} />
            <Text style={[st.alertBtnText, { fontFamily: fonts.bodyBold }]}>İzin Ver</Text>
          </Animated.View>
        </View>
      </View>
      <Animated.View pointerEvents="none" style={[st.fingerBox, { transform: [{ translateX: fingerX }, { translateY: fingerY }] }]}>
        <Animated.View style={[st.ring, { opacity: ringOpacity, transform: [{ scale: ring }] }]} />
        <Finger />
      </Animated.View>
    </View>
  );
}

/** Ayarlar uygulamasının taklidi: satırlar sırayla vurgulanır, anahtar açılır. */
function SettingsDemo() {
  const v = useLoop(4200, 200);
  const hl = (a: number, b: number) =>
    v.interpolate({ inputRange: [0, a, a + 0.02, b, b + 0.02, 1], outputRange: [0, 0, 1, 1, 0, 0], extrapolate: 'clamp' });
  const knob = v.interpolate({ inputRange: [0, 0.7, 0.8, 1], outputRange: [0, 0, 20, 20] });
  const trackOn = v.interpolate({ inputRange: [0, 0.7, 0.8, 1], outputRange: [0, 0, 1, 1] });
  const rows = [
    { label: 'Ayarlar', o: hl(0.05, 0.25) },
    { label: 'Kurandan', o: hl(0.27, 0.47) },
    { label: 'Bildirimler · Konum · Fotoğraflar', o: hl(0.49, 0.69) },
  ];
  return (
    <View style={st.settings} accessible accessibilityLabel="Örnek: Ayarlar, Kurandan, Bildirimler ve izin anahtarını açma">
      {rows.map((r, i) => (
        <View key={r.label} style={st.setRow}>
          <Animated.View style={[StyleSheet.absoluteFill, st.setHl, { opacity: r.o }]} />
          <Text style={st.setNo}>{i + 1}</Text>
          <Text style={st.setLabel}>{r.label}</Text>
          <Text style={st.setChevron}>›</Text>
        </View>
      ))}
      <View style={[st.setRow, { borderBottomWidth: 0 }]}>
        <Text style={st.setNo}>4</Text>
        <Text style={[st.setLabel, { flex: 1 }]}>İzin Ver</Text>
        <View style={st.track}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#34C759', borderRadius: 16, opacity: trackOn }]} />
          <Animated.View style={[st.knob, { transform: [{ translateX: knob }] }]} />
        </View>
      </View>
    </View>
  );
}

function SuccessCheck() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true }).start();
  }, [v]);
  return (
    <Animated.View style={[st.bell, { transform: [{ scale: v }] }]}>
      <IconCheck size={48} color={colors.paper} strokeWidth={3} />
    </Animated.View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 22, gap: 18 },
  permList: { backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 14 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, borderBottomWidth: 1, borderBottomColor: colors.divider },
  permIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.greenTint, alignItems: 'center', justifyContent: 'center' },
  permTitle: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.ink },
  permWhy: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.muted },
  permOk: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  top: { alignItems: 'center', gap: 10 },
  bell: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  h1: { fontFamily: fonts.displayBold, fontSize: 28, color: colors.green, textAlign: 'center' },
  lead: { fontFamily: fonts.body, fontSize: 18, lineHeight: 26, color: colors.inkSoft, textAlign: 'center' },
  steps: { gap: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNo: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  stepNoText: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.white },
  stepText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 18, lineHeight: 25, color: colors.ink },
  big: { minHeight: 64, borderRadius: 18, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  bigText: { fontFamily: fonts.bodyBold, fontSize: 21, color: colors.paper },
  later: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  laterText: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.muted },
  demoWrap: { alignItems: 'center', height: 200, justifyContent: 'center' },
  alert: { width: 270, borderRadius: 16, backgroundColor: '#F2F2F7', overflow: 'hidden', borderWidth: 1, borderColor: '#D1D1D6' },
  alertTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#000', textAlign: 'center', paddingTop: 16, paddingHorizontal: 14 },
  alertBody: { fontFamily: fonts.body, fontSize: 12, color: '#333', textAlign: 'center', paddingHorizontal: 14, paddingTop: 4, paddingBottom: 14 },
  alertBtns: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderColor: '#B0B0B5' },
  alertBtn: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', borderColor: '#B0B0B5' },
  alertBtnText: { fontFamily: fonts.bodySemi, fontSize: 16, color: '#0A64D8' },
  alertGlow: { backgroundColor: 'rgba(10,100,216,0.18)' },
  fingerBox: { position: 'absolute', left: '50%', top: 60, alignItems: 'center' },
  ring: { position: 'absolute', top: -14, left: 4, width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: colors.green },
  settings: { borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden' },
  setRow: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  setHl: { backgroundColor: 'rgba(226,194,122,0.45)' },
  setNo: { width: 22, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.goldText },
  setLabel: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 17, color: colors.ink },
  setChevron: { fontSize: 22, color: colors.muted },
  track: { width: 52, height: 32, borderRadius: 16, backgroundColor: colors.toggleOff, padding: 3, overflow: 'hidden' },
  knob: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.white },
});
