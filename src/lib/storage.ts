import AsyncStorage from '@react-native-async-storage/async-storage';

export async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback) || typeof fallback !== 'object' || fallback === null) return parsed as T;
    return { ...fallback, ...parsed } as T;
  } catch {
    return fallback;
  }
}

export async function save<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Kayıt başarısızsa uygulama çalışmaya devam eder.
  }
}

export const KEYS = {
  location: 'kurandan.location.v1',
  reminders: 'kurandan.reminders.v1',
  zikir: 'kurandan.zikir.v1',
  reelsCache: 'kurandan.reels.v1',
  savedDuas: 'kurandan.savedDuas.v1',
};
