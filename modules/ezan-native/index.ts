// Kurandan yerel modülü (iOS ve Android). Eski derlemelerde modül yoktur: null döner.
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

export type AlarmPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

type EzanNativeModule = {
  setWidgetData(group: string, key: string, json: string): void;
  diagnose(group: string, key: string): { group: boolean; dataLength: number; ios: string };
  alarmSupported(): boolean;
  alarmPermission(ask: boolean): Promise<AlarmPermission>;
  scheduleAlarms(items: { at: number; title: string }[], sound: string, stopText: string): Promise<number>;
  /** GEÇİCİ TEST */
  testAlarm(seconds: number, title: string, sound: string, stopText: string): Promise<boolean>;
  cancelAlarms(): Promise<void>;
  /** Canlı Etkinlik: sıradaki vakte geri sayım (iOS 16.2+) */
  liveSupported?(): boolean;
  liveStart(city: string, vakit: string, saat: string, startMs: number, endMs: number): Promise<boolean>;
  liveStop(): Promise<void>;
  /** Apple Haritalar'da çevredeki yerleri arar (yakın camiler) */
  /** Android: tam vaktinde alarm izni, pil kısıtlaması, ana ekrana widget ekleme */
  exactAlarmOk?(): boolean;
  openExactAlarm?(): boolean;
  batteryOk?(): boolean;
  openAppSettings?(): boolean;
  pinSupported?(): boolean;
  altBosluk?(): number;
  /** Android kıble pusulası: olaylar "pusula" adıyla gelir */
  pusulaBasla?(lat: number, lng: number): boolean;
  pusulaDur?(): void;
  addListener?(ad: 'pusula', cb: (e: { yon: number; hassas: number }) => void): { remove(): void };
  sistemCubugu?(koyu: boolean): void;
  sesDurumu?(): { alarm: number; bildirim: number };
  sesiYukselt?(akis: 'alarm' | 'bildirim'): boolean;
  pinWidget?(tur: 'vakit' | 'manzara' | 'ayet'): boolean;
  searchPlaces?(lat: number, lng: number, radius: number, queries: string[]): Promise<{ name: string; lat: number; lng: number }[]>;
};

export const EzanNative: EzanNativeModule | null =
  Platform.OS === 'ios' || Platform.OS === 'android' ? requireOptionalNativeModule<EzanNativeModule>('EzanNative') : null;
