// iOS widget'ı ve sabah ezanı alarmı (modules/ezan-native).
// - Widget: önümüzdeki 3 günün vakitleri App Group'a yazılır; widget sıradaki vakti ve geri sayımı gösterir.
// - Alarm (iOS 26+, AlarmKit): açıksa önümüzdeki 7 günün imsak vakitlerine gerçek alarm kurulur.
//   Alarm sessiz modu ve Odak'ı deler, kilit ekranında tam ekran çıkar, kaydırarak / "Kapat" ile susar.
import { Platform } from 'react-native';
import { EzanNative, AlarmPermission } from '../../modules/ezan-native';
import { CalcOptions, getPrayerTimes, VAKIT_KEYS, VAKIT_NAMES, formatTime } from './prayerTimes';
import { addDays, ymdIn } from './tz';
import { ezanDosya, EzanSeviye } from './ezanSesleri';
import { getLang, t } from '../i18n';

const APP_GROUP = 'group.ai.kurandan.app';
const ALARM_DAYS = 7;

export function updateWidget(lat: number, lng: number, place: string, calc: CalcOptions = {}) {
  if (!EzanNative) return;
  const today = ymdIn(new Date(), calc.tz);
  // Dünden başlanır: imsaktan önce "yatsı" döneminin gökyüzü için önceki vakit de gerekir
  const items: { n: string; t: number; h: string; k: string }[] = [];
  for (let i = -1; i < 3; i++) {
    const times = getPrayerTimes(addDays(today, i), lat, lng, calc);
    for (const k of VAKIT_KEYS) {
      items.push({ n: t(VAKIT_NAMES[k]), t: Math.round(times[k].getTime() / 1000), h: formatTime(times[k], calc.tz), k });
    }
  }
  try {
    EzanNative.setWidgetData(
      APP_GROUP,
      'vakitler',
      JSON.stringify({ place, items, empty: t('Vakitler için uygulamayı açın'), lang: getLang(), kalan: t('{vakit} vaktine kalan'), tz: calc.tz })
    );
  } catch {
    // eski derleme: yok say
  }
}

/** Bu cihazda sabah alarmı kurulabilir mi (iOS 26+ ve yeni derleme) */
export function alarmSupported(): boolean {
  if (Platform.OS !== 'ios' || !EzanNative) return false;
  try {
    return EzanNative.alarmSupported();
  } catch {
    return false;
  }
}

export async function alarmPermission(ask: boolean): Promise<AlarmPermission> {
  if (!alarmSupported()) return 'unsupported';
  try {
    return await EzanNative!.alarmPermission(ask);
  } catch {
    return 'denied';
  }
}

/**
 * Sabah alarmlarını ayara göre kurar ya da kaldırır. Kurulduysa true döner
 * (o zaman imsak bildirimi ayrıca ezan çalmaz, iki ses üst üste binmesin).
 */
export async function syncSabahAlarm(
  on: boolean,
  lat: number,
  lng: number,
  calc: CalcOptions = {},
  sev: EzanSeviye = 'yuksek'
): Promise<boolean> {
  if (!alarmSupported()) return false;
  try {
    if (!on || (await alarmPermission(false)) !== 'granted') {
      await EzanNative!.cancelAlarms();
      return false;
    }
    const today = ymdIn(new Date(), calc.tz);
    const now = Date.now();
    const items: { at: number; title: string }[] = [];
    for (let i = 0; i < ALARM_DAYS; i++) {
      const at = getPrayerTimes(addDays(today, i), lat, lng, calc).imsak.getTime();
      if (at > now + 60000) items.push({ at, title: t('{vakit} Ezanı Okunuyor', { vakit: t('Sabah') }) });
    }
    const n = await EzanNative!.scheduleAlarms(items, ezanDosya('imsak', sev), t('Durdur'));
    return n > 0;
  } catch {
    return false;
  }
}

/** GEÇİCİ TEST: birkaç saniye sonra sabah ezanı alarmı */
export async function testSabahAlarm(saniye = 10, sev: EzanSeviye = 'yuksek'): Promise<boolean> {
  if (!alarmSupported()) return false;
  try {
    return await EzanNative!.testAlarm(saniye, t('{vakit} Ezanı Okunuyor', { vakit: t('Sabah') }), ezanDosya('imsak', sev), t('Durdur'));
  } catch {
    return false;
  }
}

/** GEÇİCİ TANILAMA: yerel modül, App Group ve widget verisi durumu */
export function tanilama(): string {
  if (Platform.OS !== 'ios') return 'iOS değil';
  if (!EzanNative) return 'Yerel modül YOK (derlemeye girmemiş)';
  try {
    const d = EzanNative.diagnose(APP_GROUP, 'vakitler');
    return `Modül: var\niOS: ${d.ios}\nApp Group: ${d.group ? 'erişilebilir' : 'YOK'}\nWidget verisi: ${d.dataLength} karakter\nAlarm: ${alarmSupported() ? 'destekleniyor' : 'yok'}`;
  } catch (e) {
    return `Modül var ama hata: ${String(e)}`;
  }
}

/** Canlı Etkinlik (iOS 16.2+, yeni derleme) destekleniyor ve kullanıcı kapatmamış mı */
export function canliDestek(): boolean {
  if (Platform.OS !== 'ios' || !EzanNative?.liveSupported) return false;
  try {
    return EzanNative.liveSupported();
  } catch {
    return false;
  }
}

/**
 * Kilit ekranı ve Dinamik Ada'da sıradaki vakte geri sayım. Vakit girince sayaç sıfırda kalır;
 * uygulama her açıldığında bir sonraki vakte geçer.
 */
export async function syncCanli(on: boolean, lat: number, lng: number, place: string, calc: CalcOptions = {}) {
  if (!canliDestek()) return;
  try {
    if (!on) {
      await EzanNative!.liveStop();
      return;
    }
    const today = ymdIn(new Date(), calc.tz);
    const now = Date.now();
    const list: { k: (typeof VAKIT_KEYS)[number]; at: Date }[] = [];
    for (let i = -1; i < 2; i++) {
      const times = getPrayerTimes(addDays(today, i), lat, lng, calc);
      for (const k of VAKIT_KEYS) list.push({ k, at: times[k] });
    }
    const idx = list.findIndex((x) => x.at.getTime() > now + 1000);
    if (idx <= 0) return;
    const next = list[idx];
    const prev = list[idx - 1];
    await EzanNative!.liveStart(place, t(VAKIT_NAMES[next.k]), formatTime(next.at, calc.tz), prev.at.getTime(), next.at.getTime());
  } catch {
    // eski derleme ya da Canlı Etkinlikler kapalı
  }
}
