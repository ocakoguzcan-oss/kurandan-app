import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Location from 'expo-location';
import { DEFAULT_IL, ILLER, Il, nearestIl } from '../data/iller';
import { load, save, KEYS } from '../lib/storage';
import { DEFAULT_REMINDERS, ReminderSettings, rescheduleAll } from '../lib/notifications';

export type Place = {
  source: 'gps' | 'il';
  lat: number;
  lng: number;
  ilPlaka: number;
  label: string; // ekranda görünen ad
};

const defaultPlace: Place = {
  source: 'il',
  lat: DEFAULT_IL.lat,
  lng: DEFAULT_IL.lng,
  ilPlaka: DEFAULT_IL.plaka,
  label: DEFAULT_IL.ad,
};

type Ctx = {
  place: Place;
  ready: boolean;
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
        load<Place>(KEYS.location, defaultPlace),
        load<ReminderSettings>(KEYS.reminders, DEFAULT_REMINDERS),
      ]);
      setPlace(p);
      setRemindersState({ ...DEFAULT_REMINDERS, ...r, enabled: { ...DEFAULT_REMINDERS.enabled, ...r.enabled } });
      setReady(true);
      // Konum GPS'ten seçildiyse açılışta sessizce yenile.
      if (p.source === 'gps') refreshGps(false).catch(() => {});
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Konum ya da ayarlar değişince 7 günlük hatırlatmaları yeniden kur.
  useEffect(() => {
    if (!ready) return;
    rescheduleAll(reminders, place.lat, place.lng, place.label).catch(() => {});
  }, [ready, reminders, place.lat, place.lng, place.label]);

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
      const il = nearestIl(lat, lng);
      let label = il.ad;
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        const district = geo?.subregion || geo?.district || geo?.city;
        if (district && district !== il.ad) label = `${il.ad}, ${district}`;
      } catch {
        // Adres çözülemezse il adı yeterli.
      }
      updatePlace({ source: 'gps', lat, lng, ilPlaka: il.plaka, label });
      return true;
    },
    [updatePlace]
  );

  const value = useMemo<Ctx>(
    () => ({
      place,
      ready,
      setIl: (il: Il) => updatePlace({ source: 'il', lat: il.lat, lng: il.lng, ilPlaka: il.plaka, label: il.ad }),
      locateWithGps: () => refreshGps(true),
      reminders,
      setReminders: (r: ReminderSettings) => {
        setRemindersState(r);
        save(KEYS.reminders, r);
      },
    }),
    [place, ready, reminders, refreshGps, updatePlace]
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp, AppProvider içinde kullanılmalı');
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
