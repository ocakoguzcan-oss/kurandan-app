// Uygulama içi satın alma: "Kilit ekranında dinleme" (tek seferlik, abonelik değil).
// Satın alma RevenueCat üzerinden yapılır (App Store ve Google Play'i tek yerden yönetir,
// makbuz doğrulama ve "Satın alımları geri yükle" hazır gelir).
//
// Kurulum (bir kez):
//   1. App Store Connect → Anlaşmalar: "Paid Apps" anlaşması, banka ve vergi bilgisi.
//   2. App Store Connect → uygulama → Uygulama İçi Satın Almalar → Tüketilmeyen (Non-Consumable),
//      ürün kimliği: PRODUCT_ID (aşağıda), fiyat 0,99 USD.
//   3. revenuecat.com → proje → App Store uygulamasını bağla → ürünü ekle →
//      Entitlement: ENTITLEMENT_ID → Offering "default" içine "Lifetime" paketi olarak ekle.
//   4. RevenueCat → API keys → "Public app-specific key" (appl_… / goog_…) değerlerini
//      app.json → extra → revenuecatIosKey / revenuecatAndroidKey alanına yazın. Bu anahtarlar gizli değildir.
// Expo Go'da RevenueCat önizleme modunda çalışır (gerçek ödeme alınmaz).
import { useSyncExternalStore } from 'react';
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import Constants from 'expo-constants';
import { load, save } from './storage';

/**
 * İlk App Store sürümünde satın alma gizli (Apple'ın ücretli uygulama anlaşması tamamlanınca açılacak).
 * Açmak için: true yapın, app.json'da expo-audio → enableBackgroundPlayback: true ve
 * ios.infoPlist.UIBackgroundModes: ["audio"] ekleyin, yeni mağaza sürümü derleyin.
 */
export const SATIN_ALMA_ACIK = false;

export const ENTITLEMENT_ID = 'kilit_ekrani';
export const PRODUCT_ID = 'ai.kurandan.app.kilitekrani';

type State = {
  /** Satın alındı mı (son bilinen; internetsiz açılışta da geçerli) */
  owned: boolean;
  /** Mağaza fiyatı, ör. "₺34,99" ya da "0,99 $" */
  price: string | null;
  /** Bu cihazda satın alma yapılabilir mi (anahtar ve yerel modül var mı) */
  available: boolean;
  busy: boolean;
};

const KEY = 'kurandan.premium.v1';
let state: State = { owned: false, price: null, available: false, busy: false };
const listeners = new Set<() => void>();
const set = (p: Partial<State>) => {
  state = { ...state, ...p };
  listeners.forEach((l) => l());
};

type RC = typeof import('react-native-purchases').default;
let rc: RC | null = null;
let pkg: unknown = null;
let started: Promise<void> | null = null;

function apiKey(): string | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as { revenuecatIosKey?: string; revenuecatAndroidKey?: string };
  const k = Platform.OS === 'ios' ? extra.revenuecatIosKey : Platform.OS === 'android' ? extra.revenuecatAndroidKey : undefined;
  return k && !k.startsWith('BURAYA') ? k : null;
}

function loadSdk(): RC | null {
  // Yerel modül yoksa (eski derleme) uygulama çökmesin
  const inExpoGo = Constants.executionEnvironment === 'storeClient';
  const native = NativeModules.RNPurchases ?? safeTurbo('RNPurchases');
  if (!inExpoGo && !native) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-purchases').default as RC;
  } catch {
    return null;
  }
}

function safeTurbo(name: string) {
  try {
    return TurboModuleRegistry.get(name);
  } catch {
    return null;
  }
}

const hasEntitlement = (info: { entitlements: { active: Record<string, unknown> } }) => !!info.entitlements.active[ENTITLEMENT_ID];

export function startPremium(): Promise<void> {
  if (started) return started;
  started = (async () => {
    const cached = await load<{ owned: boolean } | null>(KEY, null);
    if (cached?.owned) set({ owned: true });
    const key = apiKey();
    rc = key ? loadSdk() : null;
    if (!rc || !key) return;
    try {
      rc.configure({ apiKey: key });
      set({ available: true });
      rc.addCustomerInfoUpdateListener((info) => setOwned(hasEntitlement(info)));
      const [info, offerings] = await Promise.all([rc.getCustomerInfo(), rc.getOfferings()]);
      setOwned(hasEntitlement(info));
      const cur = offerings.current;
      const p = cur?.lifetime ?? cur?.availablePackages[0] ?? null;
      pkg = p;
      if (p) set({ price: p.product.priceString });
    } catch {
      // internet yoksa son bilinen durum geçerli
    }
  })();
  return started;
}

function setOwned(owned: boolean) {
  set({ owned });
  save(KEY, { owned });
}

export type BuyResult = 'ok' | 'cancelled' | 'unavailable' | 'error';

export async function buy(): Promise<BuyResult> {
  await startPremium();
  if (!rc || !pkg) return 'unavailable';
  set({ busy: true });
  try {
    const r = await rc.purchasePackage(pkg as Parameters<RC['purchasePackage']>[0]);
    const ok = hasEntitlement(r.customerInfo);
    setOwned(ok);
    return ok ? 'ok' : 'error';
  } catch (e) {
    return (e as { userCancelled?: boolean })?.userCancelled ? 'cancelled' : 'error';
  } finally {
    set({ busy: false });
  }
}

/** Telefon değiştirenler ya da uygulamayı silip yükleyenler için (Apple zorunlu tutar). */
export async function restore(): Promise<boolean> {
  await startPremium();
  if (!rc) return false;
  set({ busy: true });
  try {
    const info = await rc.restorePurchases();
    const ok = hasEntitlement(info);
    setOwned(ok);
    return ok;
  } catch {
    return false;
  } finally {
    set({ busy: false });
  }
}

export const isPremium = () => SATIN_ALMA_ACIK && state.owned;

function subscribe(cb: () => void) {
  listeners.add(cb);
  startPremium();
  return () => {
    listeners.delete(cb);
  };
}

export function usePremium(): State {
  return useSyncExternalStore(subscribe, () => state);
}
