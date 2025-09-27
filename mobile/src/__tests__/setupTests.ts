import '@testing-library/jest-native/extend-expect';

// Keep setup intentionally minimal (parallels frontend style)

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
