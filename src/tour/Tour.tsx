// İlk açılış tanıtımı.
//   0) Dil seçimi (app/dil.tsx), cihaz dili önceden işaretli.
//   1) Şehir seçimi: ekranın tamamı bulanıklaşır, yalnızca sol üstteki "Selâmün aleyküm / Şehir"
//      çerçevelenip net kalır; oradan ortaya kıvrılan bir ok "Şehir seç" düğmesini gösterir.
//   2) İzinler: tüm izinler tek ekranda, tek düğmeyle istenir (app/izin.tsx).
//   3) Bölüm tanıtımı: ana sayfadaki her bölüm ve alttaki her sekme sırayla net gösterilir,
//      geri kalan her yer bulanık; kısa bir açıklama balonu ve İleri / Geç düğmeleri.
// Tanıtım bir kez gösterilir; Ayarlar'dan "Tanıtımı tekrar izle" ile yeniden açılabilir.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  GestureResponderEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import MaskedView from '@react-native-masked-view/masked-view';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Text } from '../components/Text';
import { colors, fonts } from '../theme';
import { loadPrefs, OnboardingPhase, setPrefs, usePrefs } from '../lib/prefs';
import { isRTL, t, tx } from '../i18n';

type Rect = { x: number; y: number; w: number; h: number };
type Step = { title: string; text: string; target?: string; tab?: number };

// Alt sekme sırası app/(tabs)/_layout.tsx ile aynı olmalı
const TAB_COUNT = 6;
const STEPS: Step[] = [
  { target: 'lang', title: tx('Dil seçimi'), text: tx('Uygulamayı Türkçe, English, Deutsch, العربية, Français ya da Русский kullanabilirsiniz. Dualar, Kur’an meali ve vakit yöntemi de seçtiğiniz dile göre gelir. Dili buradan istediğiniz zaman değiştirin.') },
  { target: 'hero', title: tx('Namaz vakitleri'), text: tx('Sıradaki vakit ve kalan süre burada. Altında bugünün bütün vakitleri yazar.') },
  { target: 'dua', title: tx('Günün duası'), text: tx('Her gün yeni bir dua ve ne için okunduğu. Dokununca aile, sağlık, rızık, nazar gibi kategorilerdeki bütün dualar açılır; Instagram story olarak paylaşabilirsiniz.') },
  { target: 'trackers', title: tx('Hatim ve namaz takibi'), text: tx('Kur’an’da kaldığınız sayfa ve bugün kıldığınız namazlar. Dokunarak işaretleyebilirsiniz.') },
  { target: 'dinigun', title: tx('Kandil ve dini günler'), text: tx('Yaklaşan kandil ve bayramlar. Bir gün önceden size hatırlatırız.') },
  { target: 'kabe', title: tx('Kâbe’ye Nasıl Gidilir?'), text: tx('Araba, otobüs ya da uçakla Kâbe’ye giden yollar: haritada güzergâh, sınır kapıları, vize ve gerekli belgeler adım adım.') },
  { target: 'tile-kuran', title: tx('Kur’an-ı Kerim'), text: tx('Mushaf sayfaları. Bir satıra ya da kelimeye dokunup dinleyin, ▶ ile sayfa sayfa okutun. “Meal” ile her ayetin anlamı altında görünür.') },
  { target: 'tile-kible', title: tx('Kıble'), text: tx('Telefonu düz tutun; ok Kâbe’nin yönünü gösterir. Doğru yöne dönünce telefon titrer.') },
  { target: 'tile-zikir', title: tx('Zikirmatik'), text: tx('Büyük daireye dokunarak zikrinizi sayın. Hedefe ulaşınca telefon titrer, günlük toplamınız saklanır.') },
  { target: 'tile-namaz-takip', title: tx('Namaz Takibi'), text: tx('Kıldığınız vakitleri işaretleyin; haftalık çizelgenizi ve kaza namazlarınızı takip edin.') },
  { target: 'tile-imsakiye', title: tx('İmsakiye'), text: tx('Ramazan’da sahur ve iftar vakitleri, iftara geri sayım.') },
  { target: 'tile-dini-gunler', title: tx('Dini Günler'), text: tx('Kandil ve bayram tarihleri, kaç gün kaldığı. Bir gün önce hatırlatılır.') },
  { target: 'tile-cuma', title: tx('Story Hazırla'), text: tx('Cuma, kandil ve bayramlarda Instagram hikâyenize hazır görsel. Söz, ayet ya da kendi yazınızı seçin; renk, desen ya da kendi fotoğrafınızla süsleyin.') },
  { target: 'tile-reels', title: tx('Reels'), text: tx('Kurandan.ai Instagram videoları burada; uygulamadan çıkmadan izleyin.') },
  { tab: 5, title: tx('Ayarlar'), text: tx('Ezan bildirimleri, büyük yazı, konum, dil ve vakit hesaplama yöntemi. Bu tanıtımı da buradan tekrar izleyebilirsiniz.') },
];

type Ctx = {
  register: (id: string, node: View | null) => void;
  scroll: { ref: React.RefObject<ScrollView | null>; onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void };
  /** Konum ekranı: şehir seçildiğinde çağırır. */
  cityChosen: () => void;
  /** İzin ekranı: bitince çağırır. */
  permissionsDone: () => void;
  restart: () => void;
};

const TourCtx = createContext<Ctx | null>(null);

export function useTour() {
  const c = useContext(TourCtx);
  if (!c) throw new Error('useTour must be used inside TourProvider');
  return c;
}

/** Tanıtımda gösterilecek bir alanı işaretler: <View ref={useTourTarget('hero')} collapsable={false}> */
export function useTourTarget(id: string) {
  const { register } = useTour();
  return useCallback((node: View | null) => register(id, node), [id, register]);
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const prefs = usePrefs();
  const [loaded, setLoaded] = useState(false);
  const targets = useRef(new Map<string, View>());
  const scrollRef = useRef<ScrollView | null>(null);
  const scrollY = useRef(0);
  const pathname = usePathname();

  useEffect(() => {
    loadPrefs().then(() => setLoaded(true));
  }, []);

  const setPhase = (p: OnboardingPhase) => setPrefs({ onboarding: p });

  // İlk açılış: önce dil seçimi
  useEffect(() => {
    if (loaded && prefs.onboarding === 'lang' && pathname === '/') {
      const t = setTimeout(() => router.push('/dil'), 350);
      return () => clearTimeout(t);
    }
  }, [loaded, prefs.onboarding, pathname]);

  // Şehir seçilince izin ekranını aç
  useEffect(() => {
    if (loaded && prefs.onboarding === 'perm' && pathname === '/') {
      const t = setTimeout(() => router.push('/izin'), 450);
      return () => clearTimeout(t);
    }
  }, [loaded, prefs.onboarding, pathname]);

  const value = useMemo<Ctx>(
    () => ({
      register: (id, node) => {
        if (node) targets.current.set(id, node);
        else targets.current.delete(id);
      },
      scroll: {
        ref: scrollRef,
        onScroll: (e) => {
          scrollY.current = e.nativeEvent.contentOffset.y;
        },
      },
      cityChosen: () => {
        if (prefs.onboarding === 'city') setPhase('perm');
      },
      permissionsDone: () => {
        if (prefs.onboarding === 'perm') setPhase('sections');
      },
      // Baştan: dil → şehir seçimi → izinler → bölüm tanıtımı
      restart: () => {
        setPhase('lang');
        router.navigate('/');
      },
    }),
    [prefs.onboarding]
  );

  const show = loaded && pathname === '/' && (prefs.onboarding === 'city' || prefs.onboarding === 'sections');

  return (
    <TourCtx.Provider value={value}>
      {children}
      {show && (
        <Overlay
          phase={prefs.onboarding as 'city' | 'sections'}
          targets={targets}
          scrollRef={scrollRef}
          scrollY={scrollY}
          onDone={() => setPhase('done')}
        />
      )}
    </TourCtx.Provider>
  );
}

function measure(node: View): Promise<Rect | null> {
  return new Promise((resolve) => {
    try {
      node.measureInWindow((x, y, w, h) => resolve(w > 0 && h > 0 ? { x, y, w, h } : null));
    } catch {
      resolve(null);
    }
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Overlay({
  phase,
  targets,
  scrollRef,
  scrollY,
  onDone,
}: {
  phase: 'city' | 'sections';
  targets: React.MutableRefObject<Map<string, View>>;
  scrollRef: React.RefObject<ScrollView | null>;
  scrollY: React.MutableRefObject<number>;
  onDone: () => void;
}) {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabH = 49 + insets.bottom;
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const fade = useRef(new Animated.Value(0)).current;

  const steps = STEPS;
  const step = phase === 'sections' ? steps[index] : undefined;

  // Hedefi bul, gerekirse sayfayı kaydırıp görünür yap
  useEffect(() => {
    let alive = true;
    fade.setValue(0);
    setRect(null);
    (async () => {
      await sleep(phase === 'city' ? 500 : 150);
      let r: Rect | null = null;
      if (phase === 'city') {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
        await sleep(100);
        const n = targets.current.get('place');
        r = n ? await measure(n) : null;
      } else if (step?.tab != null) {
        const w = W / TAB_COUNT;
        r = { x: step.tab * w, y: H - tabH, w, h: 49 };
      } else if (step?.target) {
        const n = targets.current.get(step.target);
        if (!n) {
          // Bu bölüm şu an ekranda yok (ör. yaklaşan dini gün yoksa): atla
          if (alive) setIndex((i) => (i + 1 < steps.length ? i + 1 : i));
          return;
        }
        {
          r = await measure(n);
          const top = insets.top + 24;
          const bottom = H - tabH - 230;
          if (r && (r.y < top || r.y + r.h > bottom)) {
            scrollRef.current?.scrollTo({ y: Math.max(0, scrollY.current + r.y - top), animated: true });
            await sleep(420);
            r = await measure(n);
          }
        }
      }
      if (!alive) return;
      setRect(r);
      Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true }).start();
    })();
    return () => {
      alive = false;
    };
  }, [phase, index, step, W, H, tabH, insets.top, targets, scrollRef, scrollY, fade]);

  const indexRef = useRef(0);
  indexRef.current = index;
  const finish = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    onDone();
  };
  const next = () => {
    if (!rect) return; // bölüm yerine oturmadan geçme
    if (indexRef.current + 1 >= steps.length) finish();
    else setIndex(indexRef.current + 1);
  };

  // Dokunulan yerde dalga
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const ripple = (e: GestureResponderEvent) => {
    const { pageX: x, pageY: y } = e.nativeEvent;
    const id = Date.now() + Math.random();
    setRipples((r) => [...r, { id, x, y }]);
    setTimeout(() => setRipples((r) => r.filter((q) => q.id !== id)), 700);
  };
  /** Ekranın herhangi bir yerine dokunma: dalga çıkar, sonra ilerle (şehir adımında şehir listesini aç). */
  const onTap = (e: GestureResponderEvent) => {
    ripple(e);
    if (phase === 'city') setTimeout(() => router.push('/konum'), 220);
    else setTimeout(next, 200);
  };

  const pad = 8;
  const hole = rect ? { x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 } : null;

  return (
    <View style={[StyleSheet.absoluteFill, { direction: 'ltr' }]} accessibilityViewIsModal>
      {hole ? <Dim hole={hole} W={W} H={H} /> : <Dim W={W} H={H} />}
      <Pressable accessibilityRole="button" accessibilityLabel={phase === 'city' ? t('Şehir seç') : t('İleri')} onPress={onTap} style={StyleSheet.absoluteFill} />
      {hole && <HoleFrame hole={hole} />}

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]} pointerEvents="box-none">
        {phase === 'city' && hole && <CityPrompt hole={hole} W={W} H={H} />}
        {phase === 'sections' && hole && step && (
          <Bubble
            hole={hole}
            W={W}
            H={H}
            insetsTop={insets.top}
            title={t(step.title)}
            text={t(step.text)}
            counter={`${index + 1} / ${steps.length}`}
            last={index + 1 >= steps.length}
            onNext={(e) => {
              ripple(e);
              setTimeout(next, 200);
            }}
            onSkip={finish}
          />
        )}
      </Animated.View>
      {ripples.map((r) => (
        <Ripple key={r.id} x={r.x} y={r.y} />
      ))}
    </View>
  );
}

const HOLE_RADIUS = 20;

/** Köşeleri yuvarlatılmış dikdörtgenin SVG yolu */
function roundRect(r: Rect, rad: number) {
  const k = Math.min(rad, r.w / 2, r.h / 2);
  const { x, y, w, h } = r;
  return `M${x + k} ${y} H${x + w - k} A${k} ${k} 0 0 1 ${x + w} ${y + k} V${y + h - k} A${k} ${k} 0 0 1 ${x + w - k} ${y + h} H${x + k} A${k} ${k} 0 0 1 ${x} ${y + h - k} V${y + k} A${k} ${k} 0 0 1 ${x + k} ${y} Z`;
}

/**
 * Tüm ekranı bulanıklaştırır; hedef alan köşeleri yuvarlak bir pencere olarak net kalır.
 * (iOS'ta gerçek bulanıklık, Android'de koyu perde.)
 */
function Dim({ hole, W, H }: { hole?: Rect; W: number; H: number }) {
  const layer =
    Platform.OS === 'ios' ? (
      <BlurView intensity={28} tint="dark" style={StyleSheet.absoluteFill}>
        <View style={st.tint} />
      </BlurView>
    ) : (
      <View style={[StyleSheet.absoluteFill, st.dimAndroid]} />
    );
  if (!hole) return <View style={StyleSheet.absoluteFill} pointerEvents="auto">{layer}</View>;
  return (
    <MaskedView
      style={StyleSheet.absoluteFill}
      maskElement={
        <Svg width={W} height={H}>
          <Path d={`M0 0 H${W} V${H} H0 Z ${roundRect(hole, HOLE_RADIUS)}`} fill="#000" fillRule="evenodd" />
        </Svg>
      }
    >
      {layer}
    </MaskedView>
  );
}

function usePulse() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    a.start();
    return () => a.stop();
  }, [v]);
  return v;
}

/** Dokunulan noktadan yayılıp sönen altın dalga. */
function Ripple({ x, y }: { x: number; y: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v]);
  const R = 70;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        st.ripple,
        { left: x - R, top: y - R, width: R * 2, height: R * 2, borderRadius: R },
        { opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }) }] },
      ]}
    />
  );
}

/** Net bırakılan alanın etrafında nabız gibi atan altın çerçeve. */
function HoleFrame({ hole }: { hole: Rect }) {
  const p = usePulse();
  const scale = p.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const glow = p.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: hole.x, top: hole.y, width: hole.w, height: hole.h }}>
      <Animated.View style={[st.frame, { opacity: glow, transform: [{ scale }] }]} />
    </View>
  );
}

/** Kıvrık, kendini çizen ok. */
function DrawnArrow({ from, to, bend }: { from: { x: number; y: number }; to: { x: number; y: number }; bend: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.delay(900),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    );
    a.start();
    return () => a.stop();
  }, [v]);
  const cx = (from.x + to.x) / 2 + bend;
  const cy = (from.y + to.y) / 2 - Math.abs(bend) * 0.2;
  const len = Math.hypot(to.x - from.x, to.y - from.y) * 1.25;
  // Ok başı: eğrinin sonundaki yön
  const ang = Math.atan2(to.y - cy, to.x - cx);
  const hs = 14;
  const head = `M ${to.x - hs * Math.cos(ang - 0.45)} ${to.y - hs * Math.sin(ang - 0.45)} L ${to.x} ${to.y} L ${to.x - hs * Math.cos(ang + 0.45)} ${to.y - hs * Math.sin(ang + 0.45)}`;
  const offset = v.interpolate({ inputRange: [0, 1], outputRange: [len, 0] });
  const headOpacity = v.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0, 0, 1] });
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <AnimatedPath
        d={`M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`}
        stroke={colors.goldLight}
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={`${len}`}
        strokeDashoffset={offset as unknown as number}
      />
      <AnimatedPath d={head} stroke={colors.goldLight} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={headOpacity as unknown as number} />
    </Svg>
  );
}
const AnimatedPath = Animated.createAnimatedComponent(Path);

function CityPrompt({ hole, W, H }: { hole: Rect; W: number; H: number }) {
  const p = usePulse();
  const bob = p.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const btnTop = H * 0.5;
  const from = { x: hole.x + Math.min(hole.w * 0.55, 140), y: hole.y + hole.h + 10 };
  const to = { x: W / 2, y: btnTop - 120 };
  return (
    <>
      <DrawnArrow from={from} to={to} bend={-60} />
      <View style={[st.cityBox, { top: btnTop - 104, width: W }]} pointerEvents="box-none">
        <View pointerEvents="none" style={{ alignItems: 'center', gap: 10 }}>
          <Text style={st.cityTitle}>{t('Hoş geldiniz')}</Text>
          <Text style={st.cityText}>{t('Namaz vakitlerinin doğru gelmesi için önce şehrinizi seçin.')}</Text>
        </View>
        <Animated.View style={{ transform: [{ translateY: bob }] }}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/konum')} style={({ pressed }) => [st.cityBtn, { opacity: pressed ? 0.85 : 1 }]}>
            <Text style={st.cityBtnText}>{t('Şehir seç')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </>
  );
}

function Bubble({
  hole,
  W,
  H,
  insetsTop,
  title,
  text,
  counter,
  last,
  onNext,
  onSkip,
}: {
  hole: Rect;
  W: number;
  H: number;
  insetsTop: number;
  title: string;
  text: string;
  counter: string;
  last: boolean;
  onNext: (e: GestureResponderEvent) => void;
  onSkip: () => void;
}) {
  const p = usePulse();
  const below = hole.y + hole.h / 2 < H * 0.5;
  const bob = p.interpolate({ inputRange: [0, 1], outputRange: [0, below ? 5 : -5] });
  const arrowX = Math.min(Math.max(hole.x + hole.w / 2, 40), W - 40);
  const gap = 46;
  const pos = below ? { top: hole.y + hole.h + gap } : { bottom: H - hole.y + gap };
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[st.pointer, { left: arrowX - 14, transform: [{ translateY: bob }] }, below ? { top: hole.y + hole.h + 8 } : { top: hole.y - 38 }]}
      >
        <Svg width={28} height={30} viewBox="0 0 28 30">
          <Path d={below ? 'M14 2 L14 28 M4 12 L14 2 L24 12' : 'M14 28 L14 2 M4 18 L14 28 L24 18'} stroke={colors.goldLight} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </Animated.View>
      <View style={[st.bubble, pos, { maxHeight: H - insetsTop - 40, direction: isRTL() ? 'rtl' : 'ltr' }]} pointerEvents="box-none">
        <View style={st.bubbleHead} pointerEvents="none">
          <Text style={st.bubbleTitle}>{title}</Text>
          <Text style={st.counter}>{counter}</Text>
        </View>
        <View pointerEvents="none">
          <Text style={st.bubbleText}>{text}</Text>
          <Text style={st.tapHint}>{t('Devam etmek için ekranın herhangi bir yerine dokunun')}</Text>
        </View>
        <View style={st.bubbleBtns}>
          <Pressable accessibilityRole="button" onPress={onSkip} style={st.skip}>
            <Text style={st.skipText}>{t('Tanıtımı geç')}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onNext} style={({ pressed }) => [st.nextBtn, { opacity: pressed ? 0.85 : 1 }]}>
            <Text style={st.nextText}>{last ? t('Bitir') : isRTL() ? t('İleri ‹') : t('İleri ›')}</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

const st = StyleSheet.create({
  tint: { flex: 1, backgroundColor: 'rgba(8,24,16,0.35)' },
  dimAndroid: { backgroundColor: 'rgba(8,24,16,0.72)' },
  frame: { flex: 1, borderRadius: 20, borderWidth: 3, borderColor: colors.goldLight },
  cityBox: { position: 'absolute', left: 0, alignItems: 'center', paddingHorizontal: 32, gap: 10 },
  cityTitle: { fontFamily: fonts.displayBold, fontSize: 30, color: colors.white, textAlign: 'center' },
  cityText: { fontFamily: fonts.body, fontSize: 18, lineHeight: 26, color: '#F3ECDC', textAlign: 'center', marginBottom: 10 },
  cityBtn: {
    minHeight: 64,
    minWidth: 220,
    paddingHorizontal: 32,
    borderRadius: 32,
    backgroundColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cityBtnText: { fontFamily: fonts.bodyBold, fontSize: 21, color: colors.greenDark },
  pointer: { position: 'absolute' },
  ripple: { position: 'absolute', backgroundColor: colors.goldLight },
  tapHint: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 6 },
  bubble: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: colors.paper,
    borderRadius: 20,
    padding: 18,
    gap: 8,
    borderWidth: 2,
    borderColor: colors.goldLight,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  bubbleHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  bubbleTitle: { flex: 1, fontFamily: fonts.displayBold, fontSize: 21, color: colors.green },
  counter: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.goldText },
  bubbleText: { fontFamily: fonts.body, fontSize: 17, lineHeight: 25, color: colors.ink },
  bubbleBtns: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  skip: { minHeight: 48, justifyContent: 'center', paddingRight: 12 },
  skipText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.muted },
  nextBtn: { minHeight: 52, minWidth: 130, borderRadius: 16, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  nextText: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.paper },
});
