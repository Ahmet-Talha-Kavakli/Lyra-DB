import * as SecureStore from 'expo-secure-store';
import type { TokenCache } from '@clerk/expo';

/**
 * Secure token cache for Clerk auth tokens.
 * Uses expo-secure-store (Keychain on iOS, EncryptedSharedPreferences on Android).
 */
export const tokenCache: TokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Silently fail — token will be re-fetched on next launch
    }
  },
};
