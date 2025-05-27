
import { vi } from 'vitest';
import { type User } from '../../types/user';

const mockStorage: { [key: string]: string } = {};

const mockLocalStorage = {
    getItem: vi.fn((key: string) => mockStorage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
    }),
    clear: vi.fn(() => {
        Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    })
};

Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
});

export const saveToken = vi.fn((token: string): void => {
    mockLocalStorage.setItem('authToken', token);
});

export const getToken = vi.fn((): string | null => {
    return mockLocalStorage.getItem('authToken');
});

export const removeToken = vi.fn((): void => {
    mockLocalStorage.removeItem('authToken');
});

export const saveUser = vi.fn((user: User): void => {
    mockLocalStorage.setItem('authUser', JSON.stringify(user));
});

export const getUser = vi.fn((): User | null => {
    const userStr = mockLocalStorage.getItem('authUser');
    if (userStr) {
        try {
            return JSON.parse(userStr) as User;
        } catch {
            removeUser();
            return null;
        }
    }
    return null;
});

export const removeUser = vi.fn((): void => {
    mockLocalStorage.removeItem('authUser');
});

export const clearAllMocks = () => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
};

export const getMockStorageState = () => ({ ...mockStorage });