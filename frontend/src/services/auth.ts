import apiClient from './api';
import type { AllowedPage } from '../types/role';
import type { User } from '../types/user'

import type {
    LoginFormData,
    SignupFormData,
    RegisterSuccessResponse,
    GoLoginResponse,
    AuthSuccessPayload,
    ForgotPasswordResponse,
} from '../types/auth.types';

export const fetchUserProfile = async (): Promise<User> => {
    try {
        const profileData = await apiClient<User>('profile', {
            method: 'GET',
            isAuthRequest: true,
        });
        return profileData;
    } catch (error) {
        console.error('Failed to fetch user profile:', error);
        throw error;
    }
};


export const login = async (credentials: LoginFormData): Promise<GoLoginResponse> => {

    const loginPayload = {
        email: credentials.email,
        password: credentials.password,
    };

    try {
        // Endpoint is 'login' 
        const response = await apiClient<GoLoginResponse>('login', {
            data: loginPayload,
            method: 'POST',
            isFormData: true,
            isAuthRequest: false, // Login endpoint itself doesn't require prior auth
        });
        return response;
    } catch (err) {

        console.error('Login service error:', err);
        throw err;
    }
};


export const signup = async (credentials: SignupFormData): Promise<AuthSuccessPayload> => {

    const signupPayload = {
        username: credentials.name,
        email: credentials.email,
        password: credentials.password,
    };

    try {

        const response = await apiClient<RegisterSuccessResponse>('register', {
            data: signupPayload,
            method: 'POST',
            isFormData: true,
            isAuthRequest: false,
        });

        return {
            user: response.user,
            token: response.token,
        };
    } catch (err) {
        console.error('Signup service error:', err);
        throw err;
    }
};


export const logout = async (): Promise<void> => {

    //await apiClient<void>('auth/logout', { method: 'POST' });
    //might not actually make a call, depending how we handle logout (client or server side)

    // --- MOCK IMPLEMENTATION ---
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, 300);
    });
    // --- END MOCK ---
};

export const fetchMyPermissions = async (): Promise<AllowedPage[]> => {
    try {
    const perms = await apiClient<AllowedPage[]>('roles/permissions', { method: 'GET', isAuthRequest: true });
        return perms;
    } catch (err) {
        console.error('Failed to fetch permissions:', err);
        throw err;
    }
};

export const forgotPassword = async (email: string): Promise<ForgotPasswordResponse> => {
    return await apiClient<{ message: string }>('forgot-password', {
        method: 'POST',
        data: { email },
        isAuthRequest: false,
    });
};

