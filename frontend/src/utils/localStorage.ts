import { type User } from '../types/user';

const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';

export const saveToken = (token: string): void => {
    try {
        localStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
        console.error("Error saving token to localStorage", error);
    }
};

export const getToken = (): string | null => {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch (error) {
        console.error("Error getting token from localStorage", error);
        return null;
    }
};

export const removeToken = (): void => {
    try {
        localStorage.removeItem(TOKEN_KEY);
    } catch (error) {
        console.error("Error removing token from localStorage", error);
    }
};

export const saveUser = (user: User): void => {
    try {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
        console.error("Error saving user to localStorage", error);
    }
};

export const getUser = (): User | null => {
    try {
        const userStr = localStorage.getItem(USER_KEY);
        if (userStr) {
            return JSON.parse(userStr) as User;
        }
        return null;
    } catch (e) {
        console.error("Error parsing user from localStorage", e);
        removeUser(); //clear corrupted data
        return null;
    }
};

export const removeUser = (): void => {
    try {
        localStorage.removeItem(USER_KEY);
    } catch (error) {
        console.error("Error removing user from localStorage", error);
    }
};