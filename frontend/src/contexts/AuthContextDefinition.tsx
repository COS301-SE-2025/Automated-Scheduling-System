import { createContext, type Dispatch } from 'react';
import type { AuthState, AuthAction, LoginFormData, SignupFormData } from '../types';

interface AuthContextType extends AuthState {
    dispatch: Dispatch<AuthAction>;
    login: (credentials: LoginFormData) => Promise<void>;
    signup: (credentials: SignupFormData) => Promise<void>;
    logout: () => Promise<void>;
    forgotPassword: (email: string) => Promise<{ message: string }>;
    clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);