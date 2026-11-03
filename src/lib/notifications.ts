import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getPrayerTimes, VAKIT_KEYS, VAKIT_NAMES, VakitKey, formatTime } from './prayerTimes';
import { nextFriday } from '../data/cuma';

export type ReminderSettings = {
  enabled: Record<VakitKey, boolean>;
  leadMin: number; // vakitten kaç dakika önce (0 = tam vaktinde)
  cuma: boolean;
};

export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: { imsak: true, gunes: false, ogle: true, ikindi: true, aksam: true, yatsi: true },
  leadMin: 5,
  cuma: true,
};

export const LEAD_OPTIONS = [0, 5, 15, 30];

const CHANNEL = 'vakit';
const DAYS_AHEAD = 7; // iOS en fazla 64 bekleyen bildirime izin verir: 6 vakit × 7 gün + Cuma

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Vakit hatırlatmaları',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#18583C',
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/**
 * Önümüzdeki 7 günün hatırlatmalarını yeniden kurar.
 * Uygulama her açıldığında ve ayarlar değiştiğinde çağrılır, böylece liste hep güncel kalır.
 */
export async function rescheduleAll(settings: ReminderSettings, lat: number, lng: number, placeName: string) {
  if (Platform.OS === 'web') return 0;
  const ok = await ensurePermission();
  if (!ok) return 0;
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = Date.now();
  let count = 0;
  const today = new Date();

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const times = getPrayerTimes(day, lat, lng);
    for (const key of VAKIT_KEYS) {
      if (!settings.enabled[key]) continue;
      const fireAt = times[key].getTime() - settings.leadMin * 60000;
      if (fireAt <= now + 30000) continue;
      const name = VAKIT_NAMES[key];
      await Notifications.scheduleNotificationAsync({
        content: {
          title: settings.leadMin ? `${name} vaktine ${settings.leadMin} dakika` : `${name} vakti girdi`,
          body: `${placeName} · ${name} ${formatTime(times[key])}`,
          sound: 'default',
          data: { url: '/' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(fireAt), channelId: CHANNEL },
      });
      count++;
    }
  }

  if (settings.cuma) {
    for (let w = 0; w < 2; w++) {
      const fri = nextFriday(today);
      fri.setDate(fri.getDate() + 7 * w);
      fri.setHours(9, 0, 0, 0);
      if (fri.getTime() <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Hayırlı Cumalar',
          body: 'Cuma story görseliniz hazır. Instagram’da paylaşmak için dokunun.',
          data: { url: '/cuma' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fri, channelId: CHANNEL },
      });
      count++;
    }
  }
  return count;
}
