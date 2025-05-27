// src/contexts/AuthContextDefinition.ts
import { createContext, type Dispatch } from 'react';
// Import necessary types for AuthContextType from your main types file
import type { AuthState, AuthAction, LoginFormData, SignupFormData } from '../types/auth.types';

// 1. Define the shape of the context value
export interface AuthContextType extends AuthState {
    // Note: Your original AuthContextDefinition.ts had 'dispatch' here.
    // The AuthProvider in your AuthContext.tsx provides methods instead of raw dispatch.
    // I'll match the methods provided by your AuthProvider.
    // If you truly intend to expose dispatch, add it back and ensure AuthProvider provides it.
    // dispatch: Dispatch<AuthAction>;
    login: (credentials: LoginFormData) => Promise<void>;
    signup: (credentials: SignupFormData) => Promise<void>;
    logout: () => Promise<void>;
    forgotPassword: (email: string) => Promise<{ message: string }>;
    clearError: () => void;
}

// 2. Create and export the context object (ONLY ONCE HERE)
export const AuthContext = createContext<AuthContextType | undefined>(undefined);