import { MMKV } from 'react-native-mmkv';

/**
 * MMKV-based storage — blazing fast key-value store
 * Used for: cached data, user preferences, offline queue
 * NOT for sensitive data — use expo-secure-store for tokens
 */
export const storage = new MMKV({
  id: 'lyra-app-storage',
});

/**
 * Type-safe storage helpers
 */
export const appStorage = {
  getString: (key: string): string | undefined => storage.getString(key),
  setString: (key: string, value: string) => storage.set(key, value),

  getNumber: (key: string): number | undefined => storage.getNumber(key),
  setNumber: (key: string, value: number) => storage.set(key, value),

  getBoolean: (key: string): boolean | undefined => storage.getBoolean(key),
  setBoolean: (key: string, value: boolean) => storage.set(key, value),

  getJSON: <T>(key: string): T | undefined => {
    const raw = storage.getString(key);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  },
  setJSON: <T>(key: string, value: T) => storage.set(key, JSON.stringify(value)),

  delete: (key: string) => storage.delete(key),
  clear: () => storage.clearAll(),
};
