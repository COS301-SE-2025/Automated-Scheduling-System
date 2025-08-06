import { describe, it, expect, beforeEach, vi } from 'vitest';
import { type User } from '../../types/user';
import {
    saveToken,
    getToken,
    removeToken,
    saveUser,
    getUser,
    removeUser
} from '../../utils/localStorage';


const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
});


const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => { });

describe('localStorage utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockConsoleError.mockClear();
    });

    describe('Token operations', () => {
        describe('saveToken', () => {
            it('should save token to localStorage', () => {
                const token = 'test-token-123';
                saveToken(token);

                expect(mockLocalStorage.setItem).toHaveBeenCalledWith('authToken', token);
                expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
            });

            it('should handle localStorage errors gracefully', () => {
                const token = 'test-token-123';
                const error = new Error('Storage quota exceeded');
                mockLocalStorage.setItem.mockImplementationOnce(() => {
                    throw error;
                });

                saveToken(token);
                expect(mockConsoleError).toHaveBeenCalledWith('Error saving token to localStorage', error);
            });
        });

        describe('getToken', () => {
            it('should retrieve token from localStorage', () => {
                const token = 'test-token-123';
                mockLocalStorage.getItem.mockReturnValueOnce(token);

                const result = getToken();
                expect(mockLocalStorage.getItem).toHaveBeenCalledWith('authToken');
                expect(result).toBe(token);
            });

            it('should return null when no token exists', () => {
                mockLocalStorage.getItem.mockReturnValueOnce(null);

                const result = getToken();

                expect(result).toBeNull();
            });

            it('should handle localStorage errors gracefully', () => {
                const error = new Error('localStorage not available');
                mockLocalStorage.getItem.mockImplementationOnce(() => {
                    throw error;
                });

                const result = getToken();
                expect(mockConsoleError).toHaveBeenCalledWith('Error getting token from localStorage', error);
                expect(result).toBeNull();
            });
        });

        describe('removeToken', () => {
            it('should remove token from localStorage', () => {
                removeToken();
                expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
                expect(mockLocalStorage.removeItem).toHaveBeenCalledTimes(1);
            });

            it('should handle localStorage errors gracefully', () => {
                const error = new Error('localStorage not available');
                mockLocalStorage.removeItem.mockImplementationOnce(() => {
                    throw error;
                });

                removeToken();
                expect(mockConsoleError).toHaveBeenCalledWith('Error removing token from localStorage', error);
            });
        });
    });

    describe('User operations', () => {
        const mockUser: User = {
            id: 1,
            employeeNumber: 'E001',
            username: 'john.doe',
            name: 'John Doe',
            email: 'john@example.com',
            terminationDate: null,
            employeeStatus: 'Active',
            role: 'User'
        };

        describe('saveUser', () => {
            it('should save user to localStorage as JSON string', () => {
                saveUser(mockUser);

                expect(mockLocalStorage.setItem).toHaveBeenCalledWith('authUser', JSON.stringify(mockUser));
                expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
            });

            it('should handle localStorage errors gracefully', () => {
                const error = new Error('Storage quota exceeded');
                mockLocalStorage.setItem.mockImplementationOnce(() => {
                    throw error;
                });
                saveUser(mockUser);
                expect(mockConsoleError).toHaveBeenCalledWith('Error saving user to localStorage', error);
            });
        });

        describe('getUser', () => {
            it('should retrieve and parse user from localStorage', () => {
                const userJson = JSON.stringify(mockUser);
                mockLocalStorage.getItem.mockReturnValueOnce(userJson);
                const result = getUser();
                expect(mockLocalStorage.getItem).toHaveBeenCalledWith('authUser');
                expect(result).toEqual(mockUser);
            });

            it('should return null when no user exists', () => {
                mockLocalStorage.getItem.mockReturnValueOnce(null);
                const result = getUser();
                expect(result).toBeNull();
            });

            it('should return null for empty string', () => {
                mockLocalStorage.getItem.mockReturnValueOnce('');
                const result = getUser();
                expect(result).toBeNull();
            });

            it('should handle corrupted JSON data gracefully', () => {
                const corruptedJson = '{"id": "1", "name": "John';
                mockLocalStorage.getItem.mockReturnValueOnce(corruptedJson);
                mockLocalStorage.removeItem.mockImplementationOnce(() => { });

                const result = getUser();

                expect(mockConsoleError).toHaveBeenCalledWith('Error parsing user from localStorage', expect.any(SyntaxError));
                expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authUser');
                expect(result).toBeNull();
            });
        });

        describe('removeUser', () => {
            it('should remove user from localStorage', () => {
                removeUser();

                expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authUser');
                expect(mockLocalStorage.removeItem).toHaveBeenCalledTimes(1);
            });

            it('should handle localStorage errors gracefully', () => {
                const error = new Error('localStorage not available');
                mockLocalStorage.removeItem.mockImplementationOnce(() => {
                    throw error;
                });

                removeUser();

                expect(mockConsoleError).toHaveBeenCalledWith('Error removing user from localStorage', error);
            });
        });
    });

    describe('Integration scenarios', () => {
        it('should handle complete auth flow', () => {
            const token = 'auth-token-123';
            const user: User = {
                id: 1,
                employeeNumber: 'E002',
                username: 'jane.doe',
                name: 'Jane Doe',
                email: 'jane@example.com',
                terminationDate: null,
                employeeStatus: 'Active',
                role: 'Admin'
            };

            saveToken(token);
            saveUser(user);

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('authToken', token);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('authUser', JSON.stringify(user));

            mockLocalStorage.getItem.mockReturnValueOnce(token);
            mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(user));

            expect(getToken()).toBe(token);
            expect(getUser()).toEqual(user);

            removeToken();
            removeUser();

            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authToken');
            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('authUser');
        });

        it('should handle different user variations', () => {
            const users: User[] = [
                { 
                    id: 1, 
                    employeeNumber: 'E003',
                    username: 'alice.smith',
                    name: 'Alice Smith', 
                    email: 'alice@example.com',
                    terminationDate: null,
                    employeeStatus: 'Active',
                    role: 'User'
                },
                { 
                    id: 2, 
                    employeeNumber: 'E004',
                    username: 'bob.johnson',
                    name: 'Bob Johnson', 
                    email: 'bob@example.com',
                    terminationDate: null,
                    employeeStatus: 'Active',
                    role: 'Admin'
                },
                { 
                    id: 3, 
                    employeeNumber: 'E005',
                    username: 'charlie.brown',
                    name: 'Charlie Brown', 
                    email: 'charlie@example.com',
                    terminationDate: '2024-12-31',
                    employeeStatus: 'Terminated',
                    role: 'User'
                }
            ];

            users.forEach((user) => {
                mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(user));
                const result = getUser();

                expect(result).toEqual(user);
                expect(result?.id).toBe(user.id);
                expect(result?.name).toBe(user.name);
                expect(result?.email).toBe(user.email);
            });
        });
    });
});