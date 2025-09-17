export const tokenKey = 'auth_token';

async function setWeb(token: string | null) {
  if (typeof localStorage === 'undefined') return;
  if (token) localStorage.setItem(tokenKey, token);
  else localStorage.removeItem(tokenKey);
}

async function getWeb(): Promise<string | null> {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(tokenKey);
}

let secureStore: typeof import('expo-secure-store') | null = null;
try { secureStore = require('expo-secure-store'); } catch {}

export async function setTokenAsync(token: string | null) {
  if (secureStore?.isAvailableAsync && (await secureStore.isAvailableAsync())) {
    if (token) await secureStore.setItemAsync(tokenKey, token);
    else await secureStore.deleteItemAsync(tokenKey);
  } else {
    await setWeb(token);
  }
}

export async function getTokenAsync(): Promise<string | null> {
  if (secureStore?.isAvailableAsync && (await secureStore.isAvailableAsync())) {
    return await secureStore.getItemAsync(tokenKey);
  }
  return await getWeb();
}

// sync helpers used by interceptor; best-effort from web storage
export function getToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(tokenKey);
}
