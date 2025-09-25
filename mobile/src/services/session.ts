export const tokenKey = 'auth_token';
export const userKey = 'auth_user';
export const permissionsKey = 'auth_permissions';

async function setWeb(key: string, value: string | null) {
  if (typeof localStorage === 'undefined') return;
  if (value) localStorage.setItem(key, value);
  else localStorage.removeItem(key);
}

async function getWeb(key: string): Promise<string | null> {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key);
}

let secureStore: typeof import('expo-secure-store') | null = null;
try { secureStore = require('expo-secure-store'); } catch {}

export async function setTokenAsync(token: string | null) {
  if (secureStore?.isAvailableAsync && (await secureStore.isAvailableAsync())) {
    if (token) await secureStore.setItemAsync(tokenKey, token);
    else await secureStore.deleteItemAsync(tokenKey);
  } else {
    await setWeb(tokenKey, token);
  }
}

export async function getTokenAsync(): Promise<string | null> {
  if (secureStore?.isAvailableAsync && (await secureStore.isAvailableAsync())) {
    return await secureStore.getItemAsync(tokenKey);
  }
  return await getWeb(tokenKey);
}

export async function setUserAsync(user: any) {
  const userStr = user ? JSON.stringify(user) : null;
  if (secureStore?.isAvailableAsync && (await secureStore.isAvailableAsync())) {
    if (userStr) await secureStore.setItemAsync(userKey, userStr);
    else await secureStore.deleteItemAsync(userKey);
  } else {
    await setWeb(userKey, userStr);
  }
}

export async function getUserAsync(): Promise<any | null> {
  let userStr: string | null = null;
  if (secureStore?.isAvailableAsync && (await secureStore.isAvailableAsync())) {
    userStr = await secureStore.getItemAsync(userKey);
  } else {
    userStr = await getWeb(userKey);
  }
  return userStr ? JSON.parse(userStr) : null;
}

export async function setPermissionsAsync(permissions: string[] | null) {
  const permStr = permissions ? JSON.stringify(permissions) : null;
  if (secureStore?.isAvailableAsync && (await secureStore.isAvailableAsync())) {
    if (permStr) await secureStore.setItemAsync(permissionsKey, permStr);
    else await secureStore.deleteItemAsync(permissionsKey);
  } else {
    await setWeb(permissionsKey, permStr);
  }
}

export async function getPermissionsAsync(): Promise<string[] | null> {
  let permStr: string | null = null;
  if (secureStore?.isAvailableAsync && (await secureStore.isAvailableAsync())) {
    permStr = await secureStore.getItemAsync(permissionsKey);
  } else {
    permStr = await getWeb(permissionsKey);
  }
  return permStr ? JSON.parse(permStr) : null;
}

// sync helpers used by interceptor; best-effort from web storage
export function getToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(tokenKey);
}
