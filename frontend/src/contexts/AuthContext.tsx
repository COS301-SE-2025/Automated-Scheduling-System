import React, { useReducer, type ReactNode, useEffect, useCallback } from 'react';
import { AuthContext, type AuthContextType } from './AuthContextDefinition';
import * as authService from '../services/auth';
import { saveToken, removeToken, saveUser, removeUser, getToken, savePermissions, getPermissions, removePermissions, getUser } from '../utils/localStorage';
import type {
    AuthState,
    AuthAction,

    LoginFormData,
    SignupFormData,
} from '../types/auth.types';
import { ApiError } from '../services/api';
import type { User } from '../types/user'

const initialState: AuthState = {
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: true,
    error: null,
    permissions: null,
};

const AuthReducer = (state: AuthState, action: AuthAction): AuthState => {
    switch (action.type) {
        case 'INIT_AUTH':
            return { ...state, isLoading: true, error: null };
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
        case 'SET_PERMISSIONS':
            return { ...state, permissions: action.payload };
        case 'CLEAR_ERROR':
            return { ...state, error: null };
        case 'FORGOT_PASSWORD_SUCCESS':
            return { ...state, isLoading: false, error: null };
        default:
            return state;
    }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(AuthReducer, initialState);

    const handleApiError = (err: unknown, defaultMessage: string): string => {
        if (err instanceof ApiError) {
            return err.data?.error || err.message || defaultMessage;
        }
        return err instanceof Error ? err.message : defaultMessage;
    };

    const initializeAuth = useCallback(async () => {
        dispatch({ type: 'INIT_AUTH' });
        const storedToken = getToken();
        const storedUser = getUser();
        const storedPerms = getPermissions();

        let userToSet: User | null = null;
        let tokenToSet: string | null = null;

        if (storedPerms) {
            dispatch({ type: 'SET_PERMISSIONS', payload: storedPerms });
        }

        if (storedToken) {
            try {
                const profile = await authService.fetchUserProfile();
                userToSet = profile;
                tokenToSet = storedToken;
                saveUser(userToSet);
                authService
                    .fetchMyPermissions()
                    .then((perms) => {
                        savePermissions(perms);
                        dispatch({ type: 'SET_PERMISSIONS', payload: perms });
                    })
                    .catch(() => dispatch({ type: 'SET_PERMISSIONS', payload: [] }));
            } catch (error) {
                // Only clear auth on explicit 401/Unauthorized; keep session for transient/server errors
                if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
                    console.warn('Token invalid on init; clearing session. Details:', error);
                    removeToken();
                    removeUser();
                    removePermissions();
                    userToSet = null;
                    tokenToSet = null;
                } else {
                    console.warn('Profile fetch failed on init but keeping stored session (non-auth error):', error);
                    userToSet = storedUser ?? null;
                    tokenToSet = storedToken;
                    // permissions already set from storage if any
                }
            }
        }

        dispatch({
            type: 'SET_USER_FROM_STORAGE',
            payload: { user: userToSet, token: tokenToSet },
        });
    }, []);

    useEffect(() => {
        initializeAuth();
    }, [initializeAuth]);

    const login = async (credentials: LoginFormData) => {
        dispatch({ type: 'AUTH_REQUEST' });
        try {
            const payload = await authService.login(credentials);
            saveToken(payload.token);
            saveUser(payload.user);
            dispatch({ type: 'LOGIN_SUCCESS', payload });
            try {
                const perms = await authService.fetchMyPermissions();
                savePermissions(perms);
                dispatch({ type: 'SET_PERMISSIONS', payload: perms });
            } catch {
                dispatch({ type: 'SET_PERMISSIONS', payload: [] });
            }

        } catch (err) {
            const message = handleApiError(err, 'Login failed. Please check your credentials.');
            removeToken();
            removeUser();
            dispatch({ type: 'AUTH_FAILURE', payload: message });
            throw err;
        }
    };

    const signup = async (credentials: SignupFormData) => {
        dispatch({ type: 'AUTH_REQUEST' });
        try {
            const payload = await authService.signup(credentials);
            saveToken(payload.token);
            saveUser(payload.user);
            dispatch({ type: 'SIGNUP_SUCCESS', payload });
            try {
                const perms = await authService.fetchMyPermissions();
                savePermissions(perms);
                dispatch({ type: 'SET_PERMISSIONS', payload: perms });
            } catch {
                dispatch({ type: 'SET_PERMISSIONS', payload: [] });
            }
        } catch (err) {
            const message = handleApiError(err, 'Signup failed. Please try again.');
            dispatch({ type: 'AUTH_FAILURE', payload: message });
            throw err;
        }
    };

    const logout = async () => {
        dispatch({ type: 'AUTH_REQUEST' });
        try {
            await authService.logout();
        } catch (err: unknown) {
            console.error("Error during logout service call (if any):", err);
        } finally {
            removeToken();
            removeUser();
            dispatch({ type: 'LOGOUT' });
            removePermissions();
            dispatch({ type: 'SET_PERMISSIONS', payload: null });
        }
    };

    const forgotPassword = async (email: string): Promise<{ message: string }> => {
        dispatch({ type: 'FORGOT_PASSWORD_REQUEST' });
        try {
            const response = await authService.forgotPassword(email);
            dispatch({ type: 'FORGOT_PASSWORD_SUCCESS' });
            return response;
        } catch (err: unknown) {
            const message = handleApiError(err, 'Failed to send password reset link.');
            dispatch({ type: 'FORGOT_PASSWORD_FAILURE', payload: message });
            throw err;
        }
    };

    const clearError = () => {
        dispatch({ type: 'CLEAR_ERROR' });
    };

    const contextValue: AuthContextType = {
        ...state,
        login,
        signup,
        logout,
        forgotPassword,
        clearError,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};