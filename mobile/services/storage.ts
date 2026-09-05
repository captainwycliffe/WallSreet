import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { AuthTokens } from '../types/auth';

const TOKEN_KEY = 'auth_tokens';

export const storage = {
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.error('Error saving to secure store', e);
    }
  },
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.error('Error reading from secure store', e);
      return null;
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.error('Error removing from secure store', e);
    }
  },
  setTokens: async (tokens: AuthTokens): Promise<void> => {
    await storage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  },
  getTokens: async (): Promise<AuthTokens | null> => {
    const data = await storage.getItem(TOKEN_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  },
  getAccessToken: async (): Promise<string | null> => {
    const tokens = await storage.getTokens();
    return tokens?.access_token || null;
  },
  getRefreshToken: async (): Promise<string | null> => {
    const tokens = await storage.getTokens();
    return tokens?.refresh_token || null;
  },
  clearTokens: async (): Promise<void> => {
    await storage.removeItem(TOKEN_KEY);
  }
};
