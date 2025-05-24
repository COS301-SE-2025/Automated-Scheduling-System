import { type LoginFormData, type SignupFormData } from '../utils/validation';

export interface User {
    id: string;
    name: string;
    email: string;
}

export interface AuthState {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    isLoading: boolean;
    error: string | null;
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