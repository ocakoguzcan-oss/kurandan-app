// iOS widget'ı ve sabah ezanı alarmı (modules/ezan-native).
// - Widget: önümüzdeki 3 günün vakitleri App Group'a yazılır; widget sıradaki vakti ve geri sayımı gösterir.
// - Alarm (iOS 26+, AlarmKit): açıksa önümüzdeki 7 günün imsak vakitlerine gerçek alarm kurulur.
//   Alarm sessiz modu ve Odak'ı deler, kilit ekranında tam ekran çıkar, kaydırarak / "Kapat" ile susar.
import { Platform } from 'react-native';
import { EzanNative, AlarmPermission } from '../../modules/ezan-native';
import { CalcOptions, getPrayerTimes, VAKIT_KEYS, VAKIT_NAMES, formatTime } from './prayerTimes';
import { addDays, ymdIn } from './tz';
import { ezanById } from './ezanSesleri';
import { t } from '../i18n';

const APP_GROUP = 'group.ai.kurandan.app';
const ALARM_DAYS = 7;

export function updateWidget(lat: number, lng: number, place: string, calc: CalcOptions = {}) {
  if (!EzanNative) return;
  const today = ymdIn(new Date(), calc.tz);
  const items: { n: string; t: number; h: string }[] = [];
  for (let i = 0; i < 3; i++) {
    const times = getPrayerTimes(addDays(today, i), lat, lng, calc);
    for (const k of VAKIT_KEYS) {
      items.push({ n: t(VAKIT_NAMES[k]), t: Math.round(times[k].getTime() / 1000), h: formatTime(times[k], calc.tz) });
    }
  }
  try {
    EzanNative.setWidgetData(APP_GROUP, 'vakitler', JSON.stringify({ place, items, empty: t('Vakitler için uygulamayı açın') }));
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
export async function syncSabahAlarm(on: boolean, lat: number, lng: number, calc: CalcOptions = {}): Promise<boolean> {
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
    const n = await EzanNative!.scheduleAlarms(items, ezanById('imsak').dosya, t('Durdur'));
    return n > 0;
  } catch {
    return false;
  }
}

/** GEÇİCİ TEST: birkaç saniye sonra sabah ezanı alarmı */
export async function testSabahAlarm(saniye = 10): Promise<boolean> {
  if (!alarmSupported()) return false;
  try {
    return await EzanNative!.testAlarm(saniye, t('{vakit} Ezanı Okunuyor', { vakit: t('Sabah') }), ezanById('imsak').dosya, t('Durdur'));
  } catch {
    return false;
  }
}
