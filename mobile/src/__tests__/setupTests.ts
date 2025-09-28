import '@testing-library/jest-native/extend-expect';

// Global extended timeout (mirrors web suite) to accommodate slower CI devices
jest.setTimeout(30000);

// Silence noisy logs during tests; individual tests can re-enable via mockRestore()
jest.spyOn(global.console, 'log').mockImplementation(() => {});
jest.spyOn(global.console, 'warn').mockImplementation(() => {});
jest.spyOn(global.console, 'error').mockImplementation(() => {});

// Basic async storage & secure store mocks only (no Animated mock needed)
jest.mock('expo-secure-store', () => {
  const mem: Record<string, string | undefined> = {};
  return {
    // Signal availability so session layer chooses this path
    isAvailableAsync: jest.fn(async () => true),
    getItemAsync: jest.fn(async (k: string) => (k in mem ? mem[k]! : null)),
    setItemAsync: jest.fn(async (k: string, v: string) => { mem[k] = v; }),
    deleteItemAsync: jest.fn(async (k: string) => { delete mem[k]; }),
  };
});

jest.mock('@react-native-async-storage/async-storage', () => {
  const mem: Record<string,string|undefined> = {};
  const store = {
    setItem: jest.fn(async (k: string, v: string) => { mem[k] = v; }),
    getItem: jest.fn(async (k: string) => mem[k] ?? null),
    removeItem: jest.fn(async (k: string) => { delete mem[k]; }),
    clear: jest.fn(async () => { Object.keys(mem).forEach(k => delete mem[k]); }),
  };
  // Provide both named object and default export to satisfy `require(...).default` pattern
  return { ...store, default: store };
});
