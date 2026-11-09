import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import { DEFAULT_IL, ILLER, Il } from '../data/iller';
import { City, nearestCity } from '../data/world';
import { load, save, KEYS } from '../lib/storage';
import { DEFAULT_REMINDERS, ReminderSettings, rescheduleAll } from '../lib/notifications';
import { syncSabahAlarm, updateWidget } from '../lib/vakitWidget';
import { CalcOptions, defaultAsr, defaultMethod } from '../lib/prayerTimes';
import { deviceTimeZone, hasTz } from '../lib/tz';
import { usePrefs } from '../lib/prefs';
import { getLang } from '../i18n';

export type Place = {
  source: 'gps' | 'il';
  lat: number;
  lng: number;
  /** Ülke kodu (ISO, ör. TR, DE) */
  country: string;
  /** IANA saat dilimi; vakitler bu saatle gösterilir */
  tz: string;
  /** Listeden seçildiyse şehir kimliği (src/data/world.ts) */
  cityId?: string;
  /** Türkiye'de il plakası (imsakiye için) */
  ilPlaka?: number;
  label: string; // ekranda görünen ad
};

const defaultPlace: Place = {
  source: 'il',
  lat: DEFAULT_IL.lat,
  lng: DEFAULT_IL.lng,
  country: 'TR',
  tz: 'Europe/Istanbul',
  cityId: `TR:${DEFAULT_IL.plaka}`,
  ilPlaka: DEFAULT_IL.plaka,
  label: DEFAULT_IL.ad,
};

/** Eski sürümde kaydedilen konum (yalnız Türkiye) */
function migrate(p: Partial<Place>): Place {
  if (p.country && p.tz) return p as Place;
  return { ...defaultPlace, ...p, country: 'TR', tz: 'Europe/Istanbul', cityId: p.ilPlaka ? `TR:${p.ilPlaka}` : undefined } as Place;
}

type Ctx = {
  place: Place;
  ready: boolean;
  /** Vakit hesabı: şehrin saat dilimi + yöntem (ayardan ya da ülkeye göre) */
  calc: Required<Pick<CalcOptions, 'tz' | 'method' | 'asr'>>;
  /** Ayarlarda seçilmediyse ülkeye göre otomatik yöntem kullanılıyor mu */
  methodAuto: boolean;
  setCity: (c: City) => void;
  /** Eski ekranlar için: Türkiye ili seç */
  setIl: (il: Il) => void;
  locateWithGps: () => Promise<boolean>;
  reminders: ReminderSettings;
  setReminders: (r: ReminderSettings) => void;
};

const AppCtx = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [place, setPlace] = useState<Place>(defaultPlace);
  const [reminders, setRemindersState] = useState<ReminderSettings>(DEFAULT_REMINDERS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, r] = await Promise.all([
        load<Partial<Place>>(KEYS.location, defaultPlace),
        load<ReminderSettings>(KEYS.reminders, DEFAULT_REMINDERS),
      ]);
      setPlace(migrate(p));
      // Eski kayıtta `ses` yok: `ezan` anahtarından türet
      setRemindersState({ ...DEFAULT_REMINDERS, ...r, ses: r.ses ?? (r.ezan === false ? 'varsayilan' : 'ezan'), enabled: { ...DEFAULT_REMINDERS.enabled, ...r.enabled } });
      setReady(true);
      // Konum GPS'ten seçildiyse açılışta sessizce yenile.
      if (p.source === 'gps') refreshGps(false).catch(() => {});
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prefs = usePrefs();
  const lang = getLang();
  const methodAuto = !prefs.method;
  const method = prefs.method ?? defaultMethod(place.country, lang);
  const asr = prefs.asr ?? defaultAsr(place.country, lang);
  const calc = useMemo(() => ({ tz: place.tz, method, asr }), [place.tz, method, asr]);

  // Konum, yöntem ya da ayarlar değişince 7 günlük hatırlatmaları yeniden kur.
  useEffect(() => {
    if (!ready) return;
    let iptal = false;
    (async () => {
      updateWidget(place.lat, place.lng, place.label, calc);
      const alarm = await syncSabahAlarm(!!reminders.sabahAlarm && reminders.enabled.imsak, place.lat, place.lng, calc);
      if (!iptal) await rescheduleAll(reminders, place.lat, place.lng, place.label, calc, alarm);
    })().catch(() => {});
    return () => {
      iptal = true;
    };
  }, [ready, reminders, place.lat, place.lng, place.label, calc]);

  const updatePlace = useCallback((p: Place) => {
    setPlace(p);
    save(KEYS.location, p);
  }, []);

  const refreshGps = useCallback(
    async (ask: boolean): Promise<boolean> => {
      const perm = ask ? await Location.requestForegroundPermissionsAsync() : await Location.getForegroundPermissionsAsync();
      if (!perm.granted) return false;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = pos.coords;
      let country: string | undefined;
      let geoCity: string | undefined;
      let district: string | undefined;
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        country = geo?.isoCountryCode?.toUpperCase() || undefined;
        geoCity = geo?.city || geo?.region || undefined;
        district = geo?.subregion || geo?.district || undefined;
      } catch {
        // Adres çözülemezse en yakın şehir yeterli.
      }
      const near = nearestCity(lat, lng, country);
      country = country ?? near.country;
      let label: string;
      if (country === 'TR') {
        label = district && district !== near.name ? `${near.name}, ${district}` : near.name;
      } else {
        label = geoCity ?? near.name;
      }
      // Kullanıcı fiilen oradadır: cihazın saat dilimi en doğrusudur.
      const dev = deviceTimeZone();
      const tz = hasTz(dev) ? dev : near.tz;
      updatePlace({ source: 'gps', lat, lng, country, tz, ilPlaka: near.plaka, cityId: near.id, label });
      return true;
    },
    [updatePlace]
  );

  const value = useMemo<Ctx>(
    () => ({
      place,
      ready,
      calc,
      methodAuto,
      setCity: (c: City) =>
        updatePlace({ source: 'il', lat: c.lat, lng: c.lng, country: c.country, tz: c.tz, cityId: c.id, ilPlaka: c.plaka, label: c.name }),
      setIl: (il: Il) =>
        updatePlace({ source: 'il', lat: il.lat, lng: il.lng, country: 'TR', tz: 'Europe/Istanbul', cityId: `TR:${il.plaka}`, ilPlaka: il.plaka, label: il.ad }),
      locateWithGps: () => refreshGps(true),
      reminders,
      setReminders: (r: ReminderSettings) => {
        setRemindersState(r);
        save(KEYS.reminders, r);
      },
    }),
    [place, ready, calc, methodAuto, reminders, refreshGps, updatePlace]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export function ilByPlaka(plaka: number): Il {
  return ILLER.find((i) => i.plaka === plaka) ?? DEFAULT_IL;
}

/** Her saniye (veya verilen aralıkta) güncellenen şimdiki zaman. */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
