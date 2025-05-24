import React, { useReducer, type ReactNode, useEffect } from 'react';
import * as authService from '../services/auth';
import { saveToken, removeToken, saveUser, removeUser, getToken, getUser } from '../utils/localStorage';
import type { AuthState, AuthAction, LoginFormData, SignupFormData } from '../types';
import { AuthContext } from './AuthContextDefinition';

const initialState: AuthState = {
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: true,
    error: null,
};

const AuthReducer = (state: AuthState, action: AuthAction): AuthState => {
    switch (action.type) {
        case 'INIT_AUTH':
        case 'AUTH_REQUEST':
        case 'FORGOT_PASSWORD_REQUEST':
            return { ...state, isLoading: true, error: null };
        case 'LOGIN_SUCCESS':
        case 'SIGNUP_SUCCESS':
            return {
                ...state,
                isAuthenticated: true,
                user: action.payload.user,
                token: action.payload.token,
                isLoading: false,
                error: null,
            };
        case 'AUTH_FAILURE':
        case 'FORGOT_PASSWORD_FAILURE':
            return {
                ...state,
                isAuthenticated: false,
                user: null,
                token: null,
                isLoading: false,
                error: action.payload,
            };
        case 'FORGOT_PASSWORD_SUCCESS':
            return { ...state, isLoading: false, error: null };
        case 'LOGOUT':
            return {
                ...initialState,
                isLoading: false,
            };
        case 'SET_USER_FROM_STORAGE':
            return {
                ...state,
                isAuthenticated: !!action.payload.token && !!action.payload.user,
                user: action.payload.user,
                token: action.payload.token,
                isLoading: false,
            };
        case 'CLEAR_ERROR':
            return { ...state, error: null };
        default:
            // type assertions?
            // const _exhaustiveCheck: never = action;
            // return _exhaustiveCheck;
            return state;
    }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(AuthReducer, initialState);

    useEffect(() => {
        const checkAuth = () => {
            const token = getToken();
            const user = getUser();
            dispatch({ 
                type: 'SET_USER_FROM_STORAGE', 
                payload: { user, token } 
            });
        };
        
        checkAuth();
    }, []);

    const login = async (credentials: LoginFormData) => {
        dispatch({ type: 'AUTH_REQUEST' });
        try {
            const data = await authService.login(credentials);
            saveToken(data.token);
            saveUser(data.user);
            dispatch({ type: 'LOGIN_SUCCESS', payload: data });
        } catch (err: unknown) {
            const message = (err instanceof Error) ? err.message : 'Login failed. Please check your credentials.';
            dispatch({ type: 'AUTH_FAILURE', payload: message });
            throw err;
        }
    };

    const signup = async (credentials: SignupFormData) => {
        dispatch({ type: 'AUTH_REQUEST' });
        try {
            const data = await authService.signup(credentials);
            saveToken(data.token);
            saveUser(data.user);
            dispatch({ type: 'SIGNUP_SUCCESS', payload: data });
        } catch (err: unknown) {
            const message = (err instanceof Error) ? err.message : 'Signup failed. Please try again.';
            dispatch({ type: 'AUTH_FAILURE', payload: message });
            throw err;
        }
    };

    const logout = async () => {
        try {
            await authService.logout();
        } catch (err: unknown) {
            if (err instanceof Error) {
                console.error("Logout API call failed (if any):", err.message);
            } else {
                console.error("Logout API call failed (if any) with unknown error:", err);
            }
        } finally {
            removeToken();
            removeUser();
            dispatch({ type: 'LOGOUT' });
        }
    };
    
    const forgotPassword = async (email: string): Promise<{ message: string}> => {
        dispatch({ type: 'FORGOT_PASSWORD_REQUEST' });
        try {
            const response = await authService.forgotPassword(email);
            dispatch({ type: 'FORGOT_PASSWORD_SUCCESS' });
            return response;
        } catch (err: unknown) {
            const message = (err instanceof Error) ? err.message : 'Failed to send reset link.';
            dispatch({ type: 'FORGOT_PASSWORD_FAILURE', payload: message });
            throw err;
        }
    };

    const clearError = () => {
        dispatch({ type: 'CLEAR_ERROR' });
    };

    return (
        <AuthContext.Provider value={{ 
            ...state, 
            dispatch, 
            login, 
            signup, 
            logout, 
            forgotPassword, 
            clearError 
        }}>
            {children}
        </AuthContext.Provider>
    );
}