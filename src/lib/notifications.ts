import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getPrayerTimes, VAKIT_KEYS, VAKIT_NAMES, VakitKey, formatTime } from './prayerTimes';
import { nextFriday } from '../data/cuma';
import { upcomingDiniGunler } from '../data/diniGunler';

export type ReminderSettings = {
  enabled: Record<VakitKey, boolean>;
  leadMin: number; // vakitten kaç dakika önce (0 = tam vaktinde)
  cuma: boolean;
  ezan: boolean; // bildirim sesi olarak ezan
  diniGunler: boolean; // kandil ve bayram hatırlatmaları
};

export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: { imsak: true, gunes: false, ogle: true, ikindi: true, aksam: true, yatsi: true },
  leadMin: 0,
  cuma: true,
  ezan: true,
  diniGunler: true,
};

export const LEAD_OPTIONS = [0, 5, 15, 30];

const CHANNEL = 'vakit';
const CHANNEL_EZAN = 'vakit-ezan';
const EZAN_FILE = 'ezan.wav';
const DAYS_AHEAD = 7; // iOS en fazla 64 bekleyen bildirime izin verir: 6 vakit × 7 gün + Cuma + dini günler

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

async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Vakit hatırlatmaları',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#18583C',
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_EZAN, {
    name: 'Ezan',
    importance: Notifications.AndroidImportance.MAX,
    sound: EZAN_FILE,
    vibrationPattern: [0, 400, 200, 400],
    lightColor: '#18583C',
  });
}

export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

/** Sistemin izin penceresini açmadan durumu öğrenir. */
export async function getPermissionStatus(): Promise<{ status: PermissionStatus; canAskAgain: boolean }> {
  if (Platform.OS === 'web') return { status: 'denied', canAskAgain: false };
  const p = await Notifications.getPermissionsAsync();
  return { status: p.granted ? 'granted' : (p.status as PermissionStatus), canAskAgain: p.canAskAgain };
}

/** Sistemin izin penceresini açar (önce animasyonlu anlatım ekranı gösterilir). */
export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await ensureChannels();
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/**
 * Önümüzdeki 7 günün hatırlatmalarını yeniden kurar. İzin yoksa hiçbir şey yapmaz
 * (izni yalnızca anlatım ekranı ister). Uygulama her açıldığında ve ayarlar değişince çağrılır.
 */
export async function rescheduleAll(settings: ReminderSettings, lat: number, lng: number, placeName: string) {
  if (Platform.OS === 'web') return 0;
  const { status } = await getPermissionStatus();
  if (status !== 'granted') return 0;
  await ensureChannels();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = Date.now();
  let count = 0;
  const today = new Date();
  const channelId = settings.ezan ? CHANNEL_EZAN : CHANNEL;

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const times = getPrayerTimes(day, lat, lng);
    for (const key of VAKIT_KEYS) {
      if (!settings.enabled[key]) continue;
      const fireAt = times[key].getTime() - settings.leadMin * 60000;
      if (fireAt <= now + 30000) continue;
      const name = VAKIT_NAMES[key];
      // Ezan yalnızca vaktin tam girdiği anda okunur; "x dk önce" hatırlatması normal sesle gelir.
      const withEzan = settings.ezan && settings.leadMin === 0 && key !== 'gunes';
      await Notifications.scheduleNotificationAsync({
        content: {
          title: settings.leadMin ? `${name} vaktine ${settings.leadMin} dakika` : `${name} vakti girdi`,
          body: `${placeName} · ${name} ${formatTime(times[key])}`,
          sound: withEzan ? EZAN_FILE : 'default',
          data: { url: withEzan ? `/ezan?vakit=${encodeURIComponent(name)}` : '/' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(fireAt),
          channelId: withEzan ? channelId : CHANNEL,
        },
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

  if (settings.diniGunler) {
    // Önümüzdeki 45 gündeki dini günler: bir gün önce 20:00'de ve o gün 10:00'da
    for (const g of upcomingDiniGunler(today).filter((x) => x.daysLeft <= 45)) {
      const eve = new Date(g.day.getFullYear(), g.day.getMonth(), g.day.getDate() - 1, 20, 0);
      const morning = new Date(g.day.getFullYear(), g.day.getMonth(), g.day.getDate(), 10, 0);
      const tonight = g.kind === 'kandil' ? 'Bu gece' : 'Bugün';
      const pairs: [Date, string, string][] = [
        [eve, `Yarın ${g.name}`, g.kind === 'kandil' ? 'Kandil geceniz mübarek olsun.' : 'Hayırlı olsun.'],
        [morning, `${tonight} ${g.name}`, g.note ?? (g.kind === 'kandil' ? 'Kandiliniz mübarek olsun.' : 'Hayırlı olsun.')],
      ];
      for (const [date, title, body] of pairs) {
        if (date.getTime() <= now) continue;
        await Notifications.scheduleNotificationAsync({
          content: { title, body, data: { url: '/dini-gunler' } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL },
        });
        count++;
      }
    }
  }
  return count;
}
