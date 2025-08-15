import { type LoginFormData, type SignupFormData } from '../utils/validation';
import { type User } from './user';
import type { AllowedPage } from './role';

export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    isLoading: boolean;
    error: string | null;
    permissions: AllowedPage[] | null;
}

export interface AuthSuccessPayload { 
    user: User; 
    token: string;
}

export interface RegisterSuccessResponse {
  message: string;
  user: User; 
  token: string;
}

export interface ApiErrorData { 
    error: string;
}

// --- Mocked Service Types ---
export interface ForgotPasswordResponse { 
    message: string;
}

// AuthActions for the reducer
export type AuthAction =
    | { type: 'INIT_AUTH' }
    | { type: 'AUTH_REQUEST' }
    | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
    | { type: 'SIGNUP_SUCCESS'; payload: { user: User; token: string } }
    | { type: 'AUTH_FAILURE'; payload: string }
    | { type: 'FORGOT_PASSWORD_REQUEST' }
    | { type: 'FORGOT_PASSWORD_SUCCESS' }
    | { type: 'FORGOT_PASSWORD_FAILURE'; payload: string }
    | { type: 'LOGOUT' }
    | { type: 'SET_USER_FROM_STORAGE'; payload: { user: User | null; token: string | null } }
    | { type: 'SET_PERMISSIONS'; payload: AllowedPage[] | null }
    | { type: 'CLEAR_ERROR' };

export type { LoginFormData, SignupFormData };

export interface GoLoginResponse {
    token: string;
    user: User;
}