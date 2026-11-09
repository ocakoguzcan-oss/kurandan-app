// Kurandan yerel modülü (yalnız iOS). Eski derlemelerde ve Android'de modül yoktur: null döner.
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

export type AlarmPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

type EzanNativeModule = {
  setWidgetData(group: string, key: string, json: string): void;
  alarmSupported(): boolean;
  alarmPermission(ask: boolean): Promise<AlarmPermission>;
  scheduleAlarms(items: { at: number; title: string }[], sound: string, stopText: string): Promise<number>;
  /** GEÇİCİ TEST */
  testAlarm(seconds: number, title: string, sound: string, stopText: string): Promise<boolean>;
  cancelAlarms(): Promise<void>;
};

export const EzanNative: EzanNativeModule | null =
  Platform.OS === 'ios' ? requireOptionalNativeModule<EzanNativeModule>('EzanNative') : null;
