import type { ApiError,  } from '../types';
import apiClient from './api';
import type {User} from '../types/user'

import type {
  LoginFormData,
  SignupFormData,
  
  GoLoginResponse,
  GoRegisterResponse,
  GoProfileResponse,
  AuthSuccessPayload, 
  ForgotPasswordResponse, 
} from '../types/auth.types';

export const fetchUserProfile = async (): Promise<User> => {
  try {
    const profileData = await apiClient<GoProfileResponse>('api/profile', {
      method: 'GET',
      isAuthRequest: true, 
    });
    return {
        id:profileData.id,
      name: profileData.username,
      email: profileData.email,
    };
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
  
    const response = await apiClient<GoRegisterResponse>('register', {
      data: signupPayload,
      method: 'POST',
      isFormData: true,     
      isAuthRequest: false, 
    });
    const user: User = {
        id: response.id,
      name: response.username, 
      email: credentials.email,   
    };

    return {
      user,
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

export const forgotPassword = async (email: string): Promise<ForgotPasswordResponse> => {
    return await apiClient<{ message: string }>('forgot-password', {
        method: 'POST',
        data: { email },
        isAuthRequest: false,
    });
};