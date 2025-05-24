// import apiClient from './api'; 
import type { LoginFormData, SignupFormData, AuthApiResponseData, ApiError } from '../types';

export const login = async (credentials: LoginFormData): Promise<AuthApiResponseData> => {
    console.log('Calling API to login:', credentials);
    // return apiClient<AuthApiResponseData>('auth/login', { data: credentials, method: 'POST', isAuthRequest: false });

    // --- MOCK IMPLEMENTATION ---
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (credentials.email === 'user@example.com' && credentials.password === 'password') {
                resolve({
                    user: { id: '1', name: 'Test User', email: 'user@example.com' },
                    token: 'mock-jwt-token-for-login',
                });
            } else {
                const error = new Error('Invalid email or password.') as ApiError;
                error.status = 401; // Unauthorized
                reject(error);
            }
        }, 1000);
    });
    // --- END MOCK ---
};

export const signup = async (credentials: SignupFormData): Promise<AuthApiResponseData> => {
    //basically a new type sans confirmPassword
    const signupData: Omit<SignupFormData, 'confirmPassword'> = {
        name: credentials.name,
        email: credentials.email,
        password: credentials.password
    };
    console.log('Calling API to signup:', signupData);
    // return apiClient<AuthApiResponseData>('auth/register', { data: signupData, method: 'POST', isAuthRequest: false });

    // --- MOCK IMPLEMENTATION ---
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (signupData.email === 'exists@example.com') {
                 const error = new Error('This email address is already registered.') as ApiError;
                 error.status = 409;
                 reject(error);
            } else {
                resolve({
                    user: { id: 'gen-' + Date.now(), name: signupData.name, email: signupData.email },
                    token: 'mock-jwt-token-for-signup',
                });
            }
        }, 1000);
    });
    // --- END MOCK ---
};

export const logout = async (): Promise<void> => {
    console.log('Calling API to logout (if necessary)');
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

interface ForgotPasswordResponse {
    message: string;
}

export const forgotPassword = async (email: string): Promise<ForgotPasswordResponse> => {
    // ...
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (email === "nonexistent@example.com") {
                const error = new Error('User with this email not found.') as ApiError;
                error.status = 404;
                reject(error);
            } 
            else if (email === "servererror@example.com") {
                const error = new Error('A server error occurred. Please try again later.') as ApiError;
                error.status = 500;
                reject(error);
            }
            else {
                resolve({ message: `If an account with the email ${email} exists, a password reset link has been sent.` });
                
            }
        }, 1000);
    });
};