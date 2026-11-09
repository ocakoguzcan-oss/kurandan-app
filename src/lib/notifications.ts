import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CalcOptions, getPrayerTimes, VAKIT_KEYS, VAKIT_NAMES, VakitKey, formatTime } from './prayerTimes';
import { addDays, fromWall, ymdIn } from './tz';
import { t } from '../i18n';
import { upcomingDiniGunler } from '../data/diniGunler';
import { EZANLAR, ezanById, ezanFor, EzanId } from './ezanSesleri';
import { SESLER, sesById, SesId } from './bildirimSesleri';

export type ReminderSettings = {
  enabled: Record<VakitKey, boolean>;
  leadMin: number; // vakitten kaç dakika önce (0 = tam vaktinde)
  cuma: boolean;
  /** Eski sürüm: bildirim sesi olarak ezan (yerini `ses` aldı) */
  ezan: boolean;
  /** Bildirim sesi: ezan, zil sesleri, telefonun sesi ya da sessiz */
  ses?: SesId;
  diniGunler: boolean; // kandil ve bayram hatırlatmaları
  /** iOS 26+: sabah ezanı gerçek alarm olarak (sessiz modu deler) */
  sabahAlarm?: boolean;
};

export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: { imsak: true, gunes: false, ogle: true, ikindi: true, aksam: true, yatsi: true },
  leadMin: 0,
  cuma: true,
  ezan: true,
  ses: 'ezan',
  diniGunler: true,
};

/** Seçili ses (eski kayıtlarda `ezan` anahtarından) */
export const sesOf = (s: ReminderSettings): SesId => s.ses ?? (s.ezan === false ? 'varsayilan' : 'ezan');

export const LEAD_OPTIONS = [0, 5, 15, 30];

const CHANNEL = 'vakit';
// Android'de bildirim sesi kanala bağlıdır: her kayıt için ayrı kanal
const ezanChannel = (id: EzanId) => `ezan-${id}`;
const sesChannel = (id: SesId) => `ses-${id}`;
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
    name: t('Vakit hatırlatmaları'),
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#18583C',
  });
  for (const e of EZANLAR) {
    await Notifications.setNotificationChannelAsync(ezanChannel(e.id), {
      name: `${t('Ezan')} · ${t(e.ad)}`,
      importance: Notifications.AndroidImportance.MAX,
      sound: e.dosya,
      vibrationPattern: [0, 400, 200, 400],
      lightColor: '#18583C',
    });
  }
  for (const z of SESLER) {
    if (!z.dosya && z.id !== 'sessiz') continue;
    await Notifications.setNotificationChannelAsync(sesChannel(z.id), {
      name: `${t('Vakit hatırlatmaları')} · ${t(z.ad)}`,
      importance: Notifications.AndroidImportance.HIGH,
      sound: z.dosya ?? null,
      vibrationPattern: [0, 300, 200, 300],
      enableVibrate: true,
      lightColor: '#18583C',
    });
  }
  // Eski sürümün tek ezan kanalı
  await Notifications.deleteNotificationChannelAsync('vakit-ezan').catch(() => {});
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
export async function rescheduleAll(
  settings: ReminderSettings,
  lat: number,
  lng: number,
  placeName: string,
  calc: CalcOptions = {},
  /** Sabah alarmı kuruluysa imsak bildirimi sessiz gelir (alarm zaten ezanı çalar) */
  sabahAlarmKurulu = false
) {
  if (Platform.OS === 'web') return 0;
  const { status } = await getPermissionStatus();
  if (status !== 'granted') return 0;
  await ensureChannels();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = Date.now();
  let count = 0;
  const tz = calc.tz;
  const today = ymdIn(new Date(), tz);
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const day = addDays(today, i);
    const cuma = new Date(Date.UTC(day.y, day.m - 1, day.d)).getUTCDay() === 5;
    const times = getPrayerTimes(day, lat, lng, calc);
    for (const key of VAKIT_KEYS) {
      if (!settings.enabled[key]) continue;
      const fireAt = times[key].getTime() - settings.leadMin * 60000;
      if (fireAt <= now + 30000) continue;
      const name = t(VAKIT_NAMES[key]);
      const cumaOgle = cuma && key === 'ogle';
      // Ezan yalnızca vaktin tam girdiği anda okunur; "x dk önce" hatırlatması normal sesle gelir.
      // Cuma günü öğle vaktinde Cuma salâsı çalar.
      const ses = sesOf(settings);
      // Sabah alarmı kuruluysa imsakta bildirim yalnızca yazı olarak gelir
      if (sabahAlarmKurulu && key === 'imsak' && settings.leadMin === 0) continue;
      const ezan = ses === 'ezan' && settings.leadMin === 0 ? ezanFor(key, cuma) : null;
      // Ezan dışındaki seçimler (zil sesi, telefonun sesi, sessiz) yalnız tam vaktinde uygulanır
      const zil = !ezan && settings.leadMin === 0 && ses !== 'ezan' ? sesById(ses) : null;
      // Ezanlı bildirim: "Sabah Ezanı Okunuyor" / "Namaz Vakti 🤲🏻📿"; Cuma öğlesinde salâ
      const ezanAdi = t(key === 'imsak' ? 'Sabah' : VAKIT_NAMES[key]);
      let title: string;
      let body: string;
      if (settings.leadMin) {
        title = cumaOgle
          ? t('Cuma namazına {n} dakika', { n: settings.leadMin })
          : t('{vakit} vaktine {n} dakika', { vakit: name, n: settings.leadMin });
        body = `${placeName} · ${name} ${formatTime(times[key], tz)}`;
      } else if (key === 'gunes') {
        title = t('{vakit} vakti girdi', { vakit: name });
        body = `${placeName} · ${name} ${formatTime(times[key], tz)}`;
      } else if (ezan) {
        title = ezan === 'cuma' ? t('Cuma Salâsı Okunuyor') : t('{vakit} Ezanı Okunuyor', { vakit: ezanAdi });
        body = ezan === 'cuma' ? t('Cuma Namazı Vakti 🤲🏻📿') : t('Namaz Vakti 🤲🏻📿');
      } else {
        title = cumaOgle ? t('Cuma Namazı Vakti 🤲🏻📿') : t('{vakit} Namazı Vakti 🤲🏻📿', { vakit: ezanAdi });
        body = `${placeName} · ${formatTime(times[key], tz)}`;
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: ezan ? ezanById(ezan).dosya : zil?.dosya ? zil.dosya : zil?.id === 'sessiz' ? false : 'default',
          data: { url: ezan ? `/ezan?vakit=${encodeURIComponent(key)}${ezan === 'cuma' ? '&cuma=1' : ''}` : '/' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(fireAt),
          channelId: ezan ? ezanChannel(ezan) : zil && (zil.dosya || zil.id === 'sessiz') ? sesChannel(zil.id) : CHANNEL,
        },
      });
      count++;
    }
  }

  if (settings.cuma) {
    // Şehrin saatiyle Cuma 09:00
    const dow = new Date(Date.UTC(today.y, today.m - 1, today.d)).getUTCDay();
    const firstFri = addDays(today, (5 - dow + 7) % 7);
    for (let w = 0; w < 2; w++) {
      const fri = fromWall(addDays(firstFri, 7 * w), 9, 0, tz);
      if (fri.getTime() <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: t('Hayırlı Cumalar'),
          body: t('Cuma story görseliniz hazır. Instagram’da paylaşmak için dokunun.'),
          data: { url: '/cuma' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fri, channelId: CHANNEL },
      });
      count++;
    }
  }

  if (settings.diniGunler) {
    // Önümüzdeki 45 gündeki dini günler: bir gün önce 20:00'de ve o gün 10:00'da (şehrin saatiyle)
    for (const g of upcomingDiniGunler(new Date(today.y, today.m - 1, today.d)).filter((x) => x.daysLeft <= 45)) {
      const [gy, gm, gd] = g.date.split('-').map(Number);
      const day = { y: gy, m: gm, d: gd };
      const eve = fromWall(addDays(day, -1), 20, 0, tz);
      const morning = fromWall(day, 10, 0, tz);
      const name = t(g.name);
      const pairs: [Date, string, string][] = [
        [eve, t('Yarın {gun}', { gun: name }), g.kind === 'kandil' ? t('Kandil geceniz mübarek olsun.') : t('Hayırlı olsun.')],
        [
          morning,
          g.kind === 'kandil' ? t('Bu gece {gun}', { gun: name }) : t('Bugün {gun}', { gun: name }),
          g.note ? t(g.note) : g.kind === 'kandil' ? t('Kandiliniz mübarek olsun.') : t('Hayırlı olsun.'),
        ],
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

/**
 * GEÇİCİ TEST: seçili bildirim sesiyle 10 saniye sonra bir bildirim gönderir (yalnız iOS, Ayarlar'da).
 * Ezan seçiliyse hangi vaktin ezanı çalınacağı `id` ile verilir. Denedikten sonra silinecek.
 */
export async function testEzanBildirimi(id: EzanId, ses: SesId = 'ezan', saniye = 10) {
  if (Platform.OS === 'web') return false;
  const { status } = await getPermissionStatus();
  if (status !== 'granted') return false;
  await ensureChannels();
  const e = ezanById(id);
  const z = sesById(ses);
  const isEzan = ses === 'ezan';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: isEzan
        ? id === 'cuma' ? t('Cuma Salâsı Okunuyor') : t('{vakit} Ezanı Okunuyor', { vakit: t(e.ad) })
        : id === 'cuma' ? t('Cuma Namazı Vakti 🤲🏻📿') : t('{vakit} Namazı Vakti 🤲🏻📿', { vakit: t(e.ad) }),
      body: isEzan ? (id === 'cuma' ? t('Cuma Namazı Vakti 🤲🏻📿') : t('Namaz Vakti 🤲🏻📿')) : `Test · ${t(z.ad)}`,
      sound: isEzan ? e.dosya : z.dosya ? z.dosya : ses === 'sessiz' ? false : 'default',
      data: { url: isEzan ? `/ezan?vakit=${id === 'cuma' ? 'ogle&cuma=1' : id}` : '/' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: saniye,
      channelId: isEzan ? ezanChannel(id) : z.dosya || ses === 'sessiz' ? sesChannel(ses) : CHANNEL,
    },
  });
  return true;
}
