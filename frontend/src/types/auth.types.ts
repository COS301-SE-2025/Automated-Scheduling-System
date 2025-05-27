import { type LoginFormData, type SignupFormData } from '../utils/validation';
import { type User } from './user';

export interface ApiUser {
    id: number;      
    username: string; 
    email: string;
}

export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    isLoading: boolean;
    error: string | null;
}

export interface AuthSuccessPayload { 
    user: User; // Uses the updated User interface
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
    | { type: 'CLEAR_ERROR' };

export type { LoginFormData, SignupFormData };

export interface GoLoginResponse {
    token: string;
}

export interface GoRegisterResponse {
    id: number;
    message: string;
    username: string; 
    token: string;
}

export interface GoProfileResponse {
    id: number;
    username: string;
    email: string;
}
