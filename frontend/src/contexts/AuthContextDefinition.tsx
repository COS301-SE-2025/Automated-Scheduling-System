import { createContext } from 'react';
import type { AuthState, LoginFormData, SignupFormData } from '../types/auth.types';

export interface AuthContextType extends AuthState {
    // dispatch: Dispatch<AuthAction>;
    login: (credentials: LoginFormData) => Promise<void>;
    signup: (credentials: SignupFormData) => Promise<void>;
    logout: () => Promise<void>;
    forgotPassword: (email: string) => Promise<{ message: string }>;
    clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);