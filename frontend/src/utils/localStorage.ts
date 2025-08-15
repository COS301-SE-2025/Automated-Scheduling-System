import { type User } from '../types/user';
import type { AllowedPage } from '../types/role';

const TOKEN_KEY = 'authToken';
const USER_KEY = 'authUser';
const PERMS_KEY = 'authPerms';

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

export const savePermissions = (perms: AllowedPage[]): void => {
    try {
        localStorage.setItem(PERMS_KEY, JSON.stringify(perms));
    } catch (error) {
        console.error('Error saving permissions to localStorage', error);
    }
};

export const getPermissions = (): AllowedPage[] | null => {
    try {
        const val = localStorage.getItem(PERMS_KEY);
        return val ? (JSON.parse(val) as AllowedPage[]) : null;
    } catch (error) {
        console.error('Error reading permissions from localStorage', error);
        removePermissions();
        return null;
    }
};

export const removePermissions = (): void => {
    try {
        localStorage.removeItem(PERMS_KEY);
    } catch (error) {
        console.error('Error removing permissions from localStorage', error);
    }
};