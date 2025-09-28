export const tokenKey = 'auth_token';
export const userKey = 'auth_user';
export const permissionsKey = 'auth_permissions';

// In-memory cache so we can synchronously read the token for axios interceptors.
let memoryToken: string | null = null;

// Optional / dynamic requires so code still works in web + native without bundler issues.
let secureStore: typeof import('expo-secure-store') | null = null;
try { secureStore = require('expo-secure-store'); } catch {}

let asyncStorage: typeof import('@react-native-async-storage/async-storage').default | null = null;
try { asyncStorage = require('@react-native-async-storage/async-storage').default; } catch {}

// Browser (web) helpers
async function setBrowser(key: string, value: string | null) {
  if (typeof localStorage === 'undefined') return;
  if (value == null) localStorage.removeItem(key); else localStorage.setItem(key, value);
}
async function getBrowser(key: string): Promise<string | null> {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key);
}

// Generic layered set/get: SecureStore > AsyncStorage > Browser localStorage
async function layeredSet(key: string, value: string | null) {
  // Highest priority: SecureStore (only for sensitive data; we'll still use it for all for simplicity)
  if (secureStore?.isAvailableAsync && (await secureStore.isAvailableAsync())) {
    if (value == null) await secureStore.deleteItemAsync(key); else await secureStore.setItemAsync(key, value);
    return;
  }
  // Native non-secure fallback
  if (asyncStorage) {
    if (value == null) await asyncStorage.removeItem(key); else await asyncStorage.setItem(key, value);
    return;
  }
  // Web fallback
  await setBrowser(key, value);
}

async function layeredGet(key: string): Promise<string | null> {
  if (secureStore?.isAvailableAsync && (await secureStore.isAvailableAsync())) {
    return await secureStore.getItemAsync(key);
  }
  if (asyncStorage) {
    return await asyncStorage.getItem(key);
  }
  return await getBrowser(key);
}

// Token helpers -----------------------------------------------------------
export async function setTokenAsync(token: string | null) {
  memoryToken = token; // keep in sync for sync access
  await layeredSet(tokenKey, token);
}

export async function getTokenAsync(): Promise<string | null> {
  const t = await layeredGet(tokenKey);
  memoryToken = t; // prime cache
  return t;
}

// User helpers ------------------------------------------------------------
export async function setUserAsync(user: any) {
  const userStr = user ? JSON.stringify(user) : null;
  await layeredSet(userKey, userStr);
}

export async function getUserAsync(): Promise<any | null> {
  const userStr = await layeredGet(userKey);
  return userStr ? JSON.parse(userStr) : null;
}

// Permissions helpers -----------------------------------------------------
export async function setPermissionsAsync(permissions: string[] | null) {
  const permStr = permissions ? JSON.stringify(permissions) : null;
  await layeredSet(permissionsKey, permStr);
}

export async function getPermissionsAsync(): Promise<string[] | null> {
  const permStr = await layeredGet(permissionsKey);
  return permStr ? JSON.parse(permStr) : null;
}

// Synchronous accessor used by axios interceptor. Falls back to browser localStorage
// ONLY if memory cache not yet primed (e.g., during very first app load on web before async init completes).
export function getToken(): string | null {
  if (memoryToken != null) return memoryToken;
  if (typeof localStorage !== 'undefined') return localStorage.getItem(tokenKey);
  return null;
}
