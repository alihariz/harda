// Auth token storage helpers. Uses expo-secure-store on iOS/Android
// (Keychain / EncryptedSharedPreferences) for JWT secrets. A small in-memory
// cache backs synchronous reads in axios interceptors.

import * as SecureStore from 'expo-secure-store';
import { jwtDecode } from 'jwt-decode';

import type { UserRole } from './types';

const KEYS = {
  access: 'harda.access_token',
  refresh: 'harda.refresh_token',
  apiOverride: 'harda.api_override',
} as const;

interface AccessClaims {
  sub: string;          // user_id as string
  role?: UserRole;
  team_id?: number;
  exp?: number;
}

let memoryAccess: string | null = null;
let memoryApiOverride: string | null = null;

export const decode = (token: string | null): AccessClaims | null => {
  if (!token) return null;
  try {
    return jwtDecode<AccessClaims>(token);
  } catch {
    return null;
  }
};

export const hydrate = async () => {
  memoryAccess = await SecureStore.getItemAsync(KEYS.access);
  memoryApiOverride = await SecureStore.getItemAsync(KEYS.apiOverride);
};

export const getAccessToken = async (): Promise<string | null> => {
  if (memoryAccess) return memoryAccess;
  const v = await SecureStore.getItemAsync(KEYS.access);
  memoryAccess = v;
  return v;
};

export const setTokens = async (access: string, refresh: string) => {
  memoryAccess = access;
  await SecureStore.setItemAsync(KEYS.access, access);
  await SecureStore.setItemAsync(KEYS.refresh, refresh);
};

export const clearTokens = async () => {
  memoryAccess = null;
  await SecureStore.deleteItemAsync(KEYS.access);
  await SecureStore.deleteItemAsync(KEYS.refresh);
};

export const getApiOverride = (): string | null => memoryApiOverride;

export const setApiOverride = async (url: string | null) => {
  memoryApiOverride = url;
  if (url) {
    await SecureStore.setItemAsync(KEYS.apiOverride, url);
  } else {
    await SecureStore.deleteItemAsync(KEYS.apiOverride);
  }
};
