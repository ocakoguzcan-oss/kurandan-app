// Ezan kayıtları: her vakit kendi makamıyla, Cuma günü öğle vaktinde Cuma salâsı.
// Dosyalar assets/sounds/ altında; bildirim sesi olarak kullanılabilmeleri için en fazla
// 30 saniye (iOS sınırı), WAV ve app.json → expo-notifications → sounds listesinde olmalı.
// Bildirim sesleri uygulamayla birlikte yüklenir: değiştirince yeni mağaza sürümü gerekir.
import type { VakitKey } from './prayerTimes';
import { tx } from '../i18n';

export type EzanId = 'imsak' | 'ogle' | 'ikindi' | 'aksam' | 'yatsi' | 'cuma';

export const EZANLAR: { id: EzanId; ad: string; dosya: string; asset: number }[] = [
  { id: 'imsak', ad: tx('Sabah'), dosya: 'ezan_imsak.wav', asset: require('../../assets/sounds/ezan_imsak.wav') },
  { id: 'ogle', ad: tx('Öğle'), dosya: 'ezan_ogle.wav', asset: require('../../assets/sounds/ezan_ogle.wav') },
  { id: 'ikindi', ad: tx('İkindi'), dosya: 'ezan_ikindi.wav', asset: require('../../assets/sounds/ezan_ikindi.wav') },
  { id: 'aksam', ad: tx('Akşam'), dosya: 'ezan_aksam.wav', asset: require('../../assets/sounds/ezan_aksam.wav') },
  { id: 'yatsi', ad: tx('Yatsı'), dosya: 'ezan_yatsi.wav', asset: require('../../assets/sounds/ezan_yatsi.wav') },
  { id: 'cuma', ad: tx('Cuma salâsı'), dosya: 'cuma_sala.wav', asset: require('../../assets/sounds/cuma_sala.wav') },
];

export const ezanById = (id: EzanId) => EZANLAR.find((e) => e.id === id)!;

/** Vakit için çalınacak kayıt (güneşte ezan yok). Cuma günü öğlede salâ. */
export function ezanFor(key: VakitKey, cuma: boolean): EzanId | null {
  if (key === 'gunes') return null;
  if (key === 'ogle' && cuma) return 'cuma';
  return key;
}
