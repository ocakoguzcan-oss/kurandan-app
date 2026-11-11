// Bildirim düğmeleri: "Sonra hatırlat" (erteleme), "Kıldım" (Namaz Takibi'ne işler), "Henüz kılmadım"
// (hiçbir şey yapmaz) ve vakit çıkarken "Kılamadım, kazaya ekle" (sonradan "kıldım" denirse geri alınır).
// Düğmeler uygulamayı açmadan çalışır; iOS uygulamayı arka planda kısa süre uyandırır.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isaretle, kilmadim, namazYukle, FarzKey } from './namazTakip';
import { t } from '../i18n';

export const BILDIRIM_KATEGORI = { vakit: 'kurandan-vakit', kildin: 'kurandan-kildin', kildinSon: 'kurandan-kildin-son' } as const;
/** Ertelenen bildirimlerin kimlik öneki (yeniden kurulumda silinmez) */
export const ERTELE_ONEK = 'ertele:';
const ERTELE = 'ertele';
const KILDIM = 'kildim';
const KILMADIM = 'kilmadim';
const HENUZ = 'henuz';
const ERTELE_KEY = 'kurandan.erteleDk';
const ISLENEN_KEY = 'kurandan.sonYanit';

/** Erteleme süresi bildirim düğmesinde yazar; ayar değişince kategoriler yeniden kurulur */
export async function kategorileriKur(erteleDk: number) {
  if (Platform.OS === 'web') return;
  await AsyncStorage.setItem(ERTELE_KEY, String(erteleDk)).catch(() => {});
  const ertele: Notifications.NotificationAction[] = erteleDk
    ? [{ identifier: ERTELE, buttonTitle: t('{n} dk sonra hatırlat', { n: erteleDk }), options: { opensAppToForeground: false } }]
    : [];
  await Notifications.setNotificationCategoryAsync(BILDIRIM_KATEGORI.vakit, ertele).catch(() => {});
  // İlk soru: vakit sürerken kazaya eklenmez ("henüz kılmadım" yalnızca bildirimi kapatır)
  await Notifications.setNotificationCategoryAsync(BILDIRIM_KATEGORI.kildin, [
    { identifier: KILDIM, buttonTitle: t('Kıldım ✓'), options: { opensAppToForeground: false } },
    { identifier: HENUZ, buttonTitle: t('Henüz kılmadım'), options: { opensAppToForeground: false } },
  ]).catch(() => {});
  // Vakit çıkarken: kılamadıysa kazaya eklenir
  await Notifications.setNotificationCategoryAsync(BILDIRIM_KATEGORI.kildinSon, [
    { identifier: KILDIM, buttonTitle: t('Kıldım ✓'), options: { opensAppToForeground: false } },
    { identifier: KILMADIM, buttonTitle: t('Kılamadım, kazaya ekle'), options: { opensAppToForeground: false } },
  ]).catch(() => {});
}

/**
 * Bildirim yanıtını işler. Bir düğmeye basıldıysa true döner (o zaman ekran açılmaz).
 * Aynı yanıt iki kez işlenmez (uygulama sonradan açıldığında son yanıt tekrar gelir).
 */
export async function yanitiIsle(r: Notifications.NotificationResponse): Promise<boolean> {
  const eylem = r.actionIdentifier;
  if (eylem === HENUZ) return true;
  if (eylem !== ERTELE && eylem !== KILDIM && eylem !== KILMADIM) return false;
  const anahtar = `${r.notification.request.identifier}|${eylem}|${r.notification.date}`;
  const son = await AsyncStorage.getItem(ISLENEN_KEY).catch(() => null);
  if (son === anahtar) return true;
  await AsyncStorage.setItem(ISLENEN_KEY, anahtar).catch(() => {});

  const c = r.notification.request.content;
  const data = (c.data ?? {}) as { gun?: string; farz?: FarzKey; kanal?: string; ses?: string };
  if (eylem === KILDIM && data.gun && data.farz) {
    await namazYukle().catch(() => {});
    isaretle(data.gun, data.farz, true);
    return true;
  }
  if (eylem === KILMADIM && data.gun && data.farz) {
    await namazYukle().catch(() => {});
    kilmadim(data.gun, data.farz);
    return true;
  }
  if (eylem === ERTELE) {
    const dk = Number((await AsyncStorage.getItem(ERTELE_KEY).catch(() => null)) ?? 10) || 10;
    await Notifications.scheduleNotificationAsync({
      identifier: `${ERTELE_ONEK}${Date.now()}`,
      content: {
        title: c.title ?? '',
        body: c.body ?? '',
        data: c.data,
        sound: data.ses === '' ? false : data.ses || 'default',
        categoryIdentifier: c.categoryIdentifier ?? undefined,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: dk * 60, channelId: data.kanal },
    }).catch(() => {});
    return true;
  }
  return false;
}
