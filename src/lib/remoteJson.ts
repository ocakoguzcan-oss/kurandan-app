// GitHub'daki content/ klasöründen içerik okur (dualar, Kâbe yolu vb.).
// Uygulamanın içinde bir kopyası olduğu için ilk açılışta ve internetsiz de çalışır;
// GitHub'daki dosya güncellenince, uygulama güncellemesi olmadan herkese gelir.
import { useEffect, useState } from 'react';
import { load, save } from './storage';

const BASE = 'https://raw.githubusercontent.com/ocakoguzcan-oss/kurandan-app/main/content/';
const REFRESH_MS = 6 * 60 * 60 * 1000;
const mem = new Map<string, unknown>();

export function useRemoteJson<T extends { surum: number }>(file: string, bundled: T, isValid: (x: unknown) => x is T): T {
  const [data, setData] = useState<T>(() => (mem.get(file) as T) ?? bundled);
  useEffect(() => {
    let alive = true;
    const key = `kurandan.remote.${file}`;
    (async () => {
      const cached = await load<{ at: number; data: T } | null>(key, null);
      if (cached && isValid(cached.data) && cached.data.surum >= bundled.surum) {
        mem.set(file, cached.data);
        if (alive) setData(cached.data);
      }
      if (cached && Date.now() - cached.at < REFRESH_MS) return;
      try {
        const res = await fetch(`${BASE}${file}?t=${Math.floor(Date.now() / REFRESH_MS)}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!isValid(json)) return;
        mem.set(file, json);
        save(key, { at: Date.now(), data: json });
        if (alive) setData(json);
      } catch {
        // internet yoksa kayıtlı kopya kullanılır
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);
  return data;
}
