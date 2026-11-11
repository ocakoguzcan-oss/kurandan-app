import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CalcOptions, getPrayerTimes, VAKIT_KEYS, VAKIT_NAMES, VakitKey, formatTime } from './prayerTimes';
import { addDays, fromWall, ymdIn } from './tz';
import { t } from '../i18n';
import { upcomingDiniGunler } from '../data/diniGunler';
import { EZANLAR, ezanById, ezanDosya, ezanFor, EzanId, EzanSeviye } from './ezanSesleri';
import { gecerliSes, SESLER, sesById, SesId } from './bildirimSesleri';
import { vakitSozu } from './vakitSozleri';
import { FarzKey, isaretliMi, kazayaEklendi, namazYukle, namazDurum, takipBaslat } from './namazTakip';
import type { Ymd } from './tz';
import { BILDIRIM_KATEGORI, ERTELE_ONEK } from './bildirimEylem';

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
  /** Ezan kayıtlarının ses seviyesi (varsayılan yüksek) */
  sesSeviyesi?: EzanSeviye;
  /**
   * Vakte özel ayar: birden çok "önce" hatırlatması (dakika) ve hangi günler (0 = Pazar … 6 = Cumartesi).
   * `once` yoksa genel `leadMin` kullanılır; `gunler` yoksa her gün.
   */
  vakitAyar?: Partial<Record<VakitKey, VakitAyar>>;
  /** Teheccüd için uyandırma: imsaktan `teheccudDk` dakika önce */
  teheccud?: boolean;
  teheccudDk?: number;
  /** Pazartesi ve Perşembe orucu: bir önceki akşam ve sahurda hatırlat */
  oruc?: boolean;
  /** Cuma namazından 45 dakika önce hatırlat */
  cumaNamaz?: boolean;
  /** "Namazını kıldın mı?": vakit girdikten `kildinMiDk` dakika sonra, Namaz Takibi'nde işaretlenmediyse */
  kildinMi?: boolean;
  kildinMiDk?: number;
  /** Hâlâ işaretlenmediyse vakit çıkmadan 15 dakika önce son kez sor (varsayılan açık) */
  sonUyari?: boolean;
  /** Cuma günü haftalık namaz özeti */
  haftalikOzet?: boolean;
  /** Bildirimdeki "sonra hatırlat" süresi (dakika); 0 = düğme yok */
  erteleDk?: number;
  /** Kilit ekranı ve Dinamik Ada'da sıradaki vakte geri sayım (Canlı Etkinlik) */
  canli?: boolean;
};

export type VakitAyar = { once?: number[]; gunler?: number[] };

export const ONCE_SECENEK = [5, 10, 15, 20, 30, 45, 60];
export const TEHECCUD_SECENEK = [30, 60, 90, 120];
export const KILDIN_SECENEK = [15, 30, 45, 60];
export const KILDIN_VARSAYILAN = 30;
export const ERTELE_SECENEK = [0, 5, 10, 15];
export const TUM_GUNLER = [1, 2, 3, 4, 5, 6, 0];

/** Vaktin "önce" hatırlatmaları (dakika, büyükten küçüğe) */
export function onceListesi(s: ReminderSettings, key: VakitKey): number[] {
  const l = s.vakitAyar?.[key]?.once ?? (s.leadMin ? [s.leadMin] : []);
  return [...new Set(l.filter((n) => n > 0))].sort((a, b) => b - a);
}
/** Vakit o gün açık mı (gün seçimi) */
export function gunAcik(s: ReminderSettings, key: VakitKey, dow: number): boolean {
  const g = s.vakitAyar?.[key]?.gunler;
  return !g || g.includes(dow);
}
/** Namaz Takibi'ndeki karşılığı (güneş yok) */
export const TAKIP_KEY: Partial<Record<VakitKey, FarzKey>> = { imsak: 'sabah', ogle: 'ogle', ikindi: 'ikindi', aksam: 'aksam', yatsi: 'yatsi' };
export const kildinId = (gun: string, farz: FarzKey) => `kildin:${gun}:${farz}`;
const ymdStr = (d: Ymd) => `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;

export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: { imsak: true, gunes: false, ogle: true, ikindi: true, aksam: true, yatsi: true },
  leadMin: 0,
  cuma: true,
  ezan: true,
  ses: 'ezan',
  diniGunler: true,
};

/** Seçili ses (eski kayıtlarda `ezan` anahtarından) */
export const sesOf = (s: ReminderSettings): SesId => gecerliSes(s.ses) ?? (s.ezan === false ? 'varsayilan' : 'ezan');

export const LEAD_OPTIONS = [0, 5, 15, 30];

const CHANNEL = 'vakit';
// Android'de bildirim sesi kanala bağlıdır: her kayıt için ayrı kanal
const ezanChannel = (id: EzanId, sev: EzanSeviye = 'yuksek') => (sev === 'yuksek' ? `ezan-${id}` : `ezan-${id}-${sev}`);
const sesChannel = (id: SesId) => `ses-${id}`;
const DAYS_AHEAD = 7;
/** iOS en fazla 64 bekleyen bildirime izin verir; Cuma ve dini günler için pay bırakılır */
const VAKIT_BUTCESI = 54;

/** Kaç günlük vakit bildirimi kurulabilir (günlük bildirim sayısına göre; iOS sınırı 64) */
export function kurulanGun(settings: ReminderSettings): number {
  let gunluk = 0;
  for (const k of VAKIT_KEYS) {
    if (!settings.enabled[k]) continue;
    const oran = (settings.vakitAyar?.[k]?.gunler?.length ?? 7) / 7;
    gunluk += oran * (1 + onceListesi(settings, k).length + (settings.kildinMi && TAKIP_KEY[k] ? (settings.sonUyari === false ? 1 : 2) : 0));
  }
  if (settings.teheccud) gunluk += 1;
  if (settings.oruc) gunluk += 4 / 7;
  if (settings.cumaNamaz) gunluk += 1 / 7;
  return Math.max(2, Math.min(DAYS_AHEAD, Math.floor(VAKIT_BUTCESI / Math.max(1, gunluk))));
}

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

async function ensureChannels(sev: EzanSeviye = 'yuksek') {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: t('Vakit hatırlatmaları'),
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#18583C',
  });
  for (const e of EZANLAR) {
    await Notifications.setNotificationChannelAsync(ezanChannel(e.id, sev), {
      name: `${t('Ezan')} · ${t(e.ad)}`,
      importance: Notifications.AndroidImportance.MAX,
      sound: ezanDosya(e.id, sev),
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

async function zamanla(content: Notifications.NotificationContentInput, at: number, identifier?: string) {
  const kanal = (content.data as { kanal?: string } | undefined)?.kanal ?? CHANNEL;
  // Erteleme düğmesi aynı sesi tekrar çalabilsin diye ses dosyası veride de tutulur
  const ses = typeof content.sound === 'string' ? content.sound : content.sound === false ? '' : 'default';
  await Notifications.scheduleNotificationAsync({
    ...(identifier ? { identifier } : {}),
    content: { ...content, data: { ...content.data, ses } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at), channelId: kanal },
  });
}

/** "1 sa 20 dk" / "40 dk" */
function kalanYaz(ms: number): string {
  const dk = Math.max(1, Math.round(ms / 60000));
  const sa = Math.floor(dk / 60);
  return sa ? t('{sa} sa {dk} dk', { sa, dk: dk % 60 }) : t('{dk} dk', { dk });
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
  const sev = settings.sesSeviyesi ?? 'yuksek';
  await ensureChannels(sev);
  // Ertelenmiş ("sonra hatırlat") bildirimler korunur
  const bekleyen = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  for (const b of bekleyen) {
    if (!b.identifier.startsWith(ERTELE_ONEK)) await Notifications.cancelScheduledNotificationAsync(b.identifier).catch(() => {});
  }
  const kategori = (settings.erteleDk ?? 10) > 0 ? BILDIRIM_KATEGORI.vakit : undefined;

  if (settings.kildinMi) {
    await namazYukle().catch(() => {});
    takipBaslat(ymdStr(ymdIn(new Date(), calc.tz)));
  }
  const now = Date.now();
  let count = 0;
  const tz = calc.tz;
  const today = ymdIn(new Date(), tz);
  const gunSayisi = kurulanGun(settings);
  const ses = sesOf(settings);
  for (let i = 0; i < gunSayisi; i++) {
    const day = addDays(today, i);
    const dow = new Date(Date.UTC(day.y, day.m - 1, day.d)).getUTCDay();
    const cuma = dow === 5;
    const gun = ymdStr(day);
    const times = getPrayerTimes(day, lat, lng, calc);
    const sonraki = (k: VakitKey) =>
      k === 'yatsi' ? getPrayerTimes(addDays(day, 1), lat, lng, calc).imsak.getTime() : times[VAKIT_KEYS[VAKIT_KEYS.indexOf(k) + 1]].getTime();

    // Teheccüd: imsaktan önce, yumuşak sesle
    if (settings.teheccud) {
      const at = times.imsak.getTime() - (settings.teheccudDk ?? 60) * 60000;
      if (at > now + 30000) {
        await zamanla(
          { title: t('Teheccüd vakti 🌙'), body: t('Gecenin son üçte biri; duaların kabul edildiği vakit. İki rekât kılmaya ne dersiniz?'), sound: 'default', data: { url: '/', kanal: CHANNEL }, categoryIdentifier: kategori },
          at
        );
        count++;
      }
    }
    // Pazartesi / Perşembe orucu: önceki akşam 21:00 ve sahurda (imsaktan 45 dk önce)
    if (settings.oruc && (dow === 1 || dow === 4)) {
      const gunAdi = dow === 1 ? t('Pazartesi') : t('Perşembe');
      const aksam = fromWall(addDays(day, -1), 21, 0, tz).getTime();
      if (aksam > now + 30000) {
        await zamanla({ title: t('Yarın {gun} orucu', { gun: gunAdi }), body: t('Niyet etmeyi ve sahura kalkmayı unutmayın.'), sound: 'default', data: { url: '/imsakiye', kanal: CHANNEL } }, aksam);
        count++;
      }
      const sahur = times.imsak.getTime() - 45 * 60000;
      if (sahur > now + 30000) {
        await zamanla(
          { title: t('Sahur vakti'), body: t('{gun} orucu · imsak {saat}', { gun: gunAdi, saat: formatTime(times.imsak, tz) }), sound: 'default', data: { url: '/imsakiye', kanal: CHANNEL }, categoryIdentifier: kategori },
          sahur
        );
        count++;
      }
    }
    // Cuma namazından 45 dakika önce
    if (settings.cumaNamaz && cuma) {
      const at = times.ogle.getTime() - 45 * 60000;
      if (at > now + 30000) {
        await zamanla(
          { title: t('Cuma namazına 45 dakika'), body: t('Gusül, temiz kıyafet ve erken gitmek sünnettir. Hayırlı Cumalar.'), sound: 'default', data: { url: '/', kanal: CHANNEL }, categoryIdentifier: kategori },
          at
        );
        count++;
      }
    }

    for (const key of VAKIT_KEYS) {
      if (!settings.enabled[key] || !gunAcik(settings, key, dow)) continue;
      const vakitMs = times[key].getTime();
      const name = t(VAKIT_NAMES[key]);
      const cumaOgle = cuma && key === 'ogle';

      // 1) "x dk önce" hatırlatmaları (seçiliyse): telefonun normal sesiyle
      for (const dk of onceListesi(settings, key)) {
        const onceMs = vakitMs - dk * 60000;
        if (onceMs <= now + 30000) continue;
        await zamanla(
          {
            title: cumaOgle ? t('Cuma namazına {n} dakika', { n: dk }) : t('{vakit} vaktine {n} dakika', { vakit: name, n: dk }),
            body: `${placeName} · ${name} ${formatTime(times[key], tz)}`,
            sound: 'default',
            data: { url: '/', kanal: CHANNEL },
            categoryIdentifier: kategori,
          },
          onceMs
        );
        count++;
      }

      // 3) "Namazını kıldın mı?": Namaz Takibi'nde işaretlenmediyse vaktin içinde bir kez
      const farz = TAKIP_KEY[key];
      if (settings.kildinMi && farz && !isaretliMi(gun, farz) && !kazayaEklendi(namazDurum(), gun, farz)) {
        const bitis = sonraki(key);
        const at = Math.min(vakitMs + (settings.kildinMiDk ?? KILDIN_VARSAYILAN) * 60000, bitis - 20 * 60000);
        // Son uyarı: hâlâ cevap verilmediyse vakit çıkmadan 15 dakika önce
        const son = bitis - 15 * 60000;
        if (settings.sonUyari !== false && son > at + 10 * 60000 && son > now + 30000) {
          await zamanla(
            {
              title: t('{vakit} vakti çıkmak üzere', { vakit: t(key === 'imsak' ? 'Sabah' : VAKIT_NAMES[key]) }),
              body: t('Henüz işaretlemediniz; vaktin çıkmasına 15 dakika kaldı.'),
              sound: 'default',
              data: { url: '/namaz-takip', kanal: CHANNEL, gun, farz },
              categoryIdentifier: BILDIRIM_KATEGORI.kildin,
            },
            son,
            `sonuyari:${gun}:${farz}`
          );
          count++;
        }
        if (at > vakitMs && at > now + 30000) {
          await zamanla(
            {
              title: t('{vakit} namazını kıldınız mı?', { vakit: t(key === 'imsak' ? 'Sabah' : VAKIT_NAMES[key]) }),
              body: t('Kıldıysanız işaretleyin; vaktin çıkmasına {saat} kaldı.', { saat: kalanYaz(sonraki(key) - at) }),
              sound: 'default',
              data: { url: '/namaz-takip', kanal: CHANNEL, gun, farz },
              categoryIdentifier: BILDIRIM_KATEGORI.kildin,
            },
            at,
            kildinId(gun, farz)
          );
          count++;
        }
      }

      // 2) Vakit girdiğinde: seçilen ses (ezan, zil sesi, telefonun sesi ya da sessiz)
      if (vakitMs <= now + 30000) continue;
      // Sabah alarmı kuruluysa imsakta ayrıca bildirim gelmez (alarm ezanı çalar)
      if (sabahAlarmKurulu && key === 'imsak') continue;
      // Cuma günü öğle vaktinde Cuma salâsı çalar
      const ezan = ses === 'ezan' ? ezanFor(key, cuma) : null;
      const zil = !ezan && ses !== 'ezan' ? sesById(ses) : null;
      const ezanAdi = t(key === 'imsak' ? 'Sabah' : VAKIT_NAMES[key]);
      let title: string;
      let body: string;
      if (key === 'gunes') {
        title = t('{vakit} vakti girdi', { vakit: name });
        body = `${placeName} · ${name} ${formatTime(times[key], tz)}`;
      } else if (ezan) {
        title = ezan === 'cuma' ? t('Cuma Salâsı Okunuyor') : t('{vakit} Ezanı Okunuyor', { vakit: ezanAdi });
        body = `${ezan === 'cuma' ? t('Cuma Namazı Vakti 🤲🏻📿') : t('Namaz Vakti 🤲🏻📿')}\n${vakitSozu(key, day)}`;
      } else {
        title = cumaOgle ? t('Cuma Namazı Vakti 🤲🏻📿') : t('{vakit} Namazı Vakti 🤲🏻📿', { vakit: ezanAdi });
        body = `${placeName} · ${formatTime(times[key], tz)}\n${vakitSozu(key, day)}`;
      }
      const kanal = ezan ? ezanChannel(ezan, sev) : zil && (zil.dosya || zil.id === 'sessiz') ? sesChannel(zil.id) : CHANNEL;
      await zamanla(
        {
          title,
          body,
          sound: ezan ? ezanDosya(ezan, sev) : zil?.dosya ? zil.dosya : zil?.id === 'sessiz' ? false : 'default',
          data: { url: ezan ? `/ezan?vakit=${encodeURIComponent(key)}${ezan === 'cuma' ? '&cuma=1' : ''}` : '/', kanal },
          categoryIdentifier: kategori,
        },
        vakitMs
      );
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

  if (settings.haftalikOzet) {
    // Şehrin saatiyle Cuma 20:30: haftanın namaz özeti (sayılar Namaz Takibi ekranında)
    const dow = new Date(Date.UTC(today.y, today.m - 1, today.d)).getUTCDay();
    for (let w = 0; w < 2; w++) {
      const at = fromWall(addDays(today, (5 - dow + 7) % 7 + 7 * w), 20, 30, tz);
      if (at.getTime() <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: t('Haftalık namaz özetiniz'), body: t('Bu hafta kaç vakit kıldığınızı görmek için dokunun.'), data: { url: '/namaz-takip' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
      });
      count++;
      break;
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
export async function testEzanBildirimi(id: EzanId, ses: SesId = 'ezan', sev: EzanSeviye = 'yuksek', saniye = 10) {
  if (Platform.OS === 'web') return false;
  const { status } = await getPermissionStatus();
  if (status !== 'granted') return false;
  await ensureChannels(sev);
  const e = ezanById(id);
  const z = sesById(ses);
  const isEzan = ses === 'ezan';
  await Notifications.scheduleNotificationAsync({
    content: {
      title: isEzan
        ? id === 'cuma' ? t('Cuma Salâsı Okunuyor') : t('{vakit} Ezanı Okunuyor', { vakit: t(e.ad) })
        : id === 'cuma' ? t('Cuma Namazı Vakti 🤲🏻📿') : t('{vakit} Namazı Vakti 🤲🏻📿', { vakit: t(e.ad) }),
      body: `${isEzan ? (id === 'cuma' ? t('Cuma Namazı Vakti 🤲🏻📿') : t('Namaz Vakti 🤲🏻📿')) : `Test · ${t(z.ad)}`}\n${vakitSozu(
        id === 'cuma' ? 'ogle' : id,
        ymdIn(new Date())
      )}`,
      sound: isEzan ? ezanDosya(id, sev) : z.dosya ? z.dosya : ses === 'sessiz' ? false : 'default',
      data: { url: isEzan ? `/ezan?vakit=${id === 'cuma' ? 'ogle&cuma=1' : id}` : '/' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: saniye,
      channelId: isEzan ? ezanChannel(id, sev) : z.dosya || ses === 'sessiz' ? sesChannel(ses) : CHANNEL,
    },
  });
  return true;
}
