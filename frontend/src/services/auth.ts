// import apiClient from './api'; 
import type { ApiError } from '../types';
import apiClient from './api';

import type {
  LoginFormData,
  SignupFormData,
  User,
  GoLoginResponse,
  GoRegisterResponse,
  GoProfileResponse,
  AuthSuccessPayload, // This will be the return type for successful signup
  ForgotPasswordResponse, // For the mock
  // ApiErrorData, // This would be part of the ApiError.data property
} from '../types/auth.types'; // Adjusted path

// Helper to fetch user profile (used by AuthContext and potentially on app init)
export const fetchUserProfile = async (): Promise<User> => {
  try {
    // Endpoint is 'api/profile' because Go router is r.Group("/api").protected.GET("/profile",...)
    // API_BASE_URL should be http://localhost:8080
    const profileData = await apiClient<GoProfileResponse>('api/profile', {
      method: 'GET',
      isAuthRequest: true, // Requires Authorization header
    });
    return {
      name: profileData.username,
      email: profileData.email,
    };
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    // Re-throw the error so the caller (e.g., AuthContext) can handle it
    // (e.g., by logging out the user if token is invalid)
    throw error;
  }
};

/**
 * Logs in a user.
 * Returns only the token as per the Go backend's /login endpoint.
 * The AuthContext will then use this token to fetch the user's profile.
 */
export const login = async (credentials: LoginFormData): Promise<GoLoginResponse> => {
  console.log('Calling API to login:', { email: credentials.email, password: '***' });

  const loginPayload = {
    email: credentials.email, // This is the 'identifier' for the Go backend
    password: credentials.password,
  };

  try {
    // Endpoint is 'login' (root level)
    const response = await apiClient<GoLoginResponse>('login', {
      data: loginPayload,
      method: 'POST',
      isFormData: true,     // Go backend's c.PostForm expects x-www-form-urlencoded
      isAuthRequest: false, // Login endpoint itself doesn't require prior auth
    });
    console.log("[authService] Raw API response from /login:", response);
    return response; // Contains { token: "..." }
  } catch (err) {
    // apiClient should throw an instance of ApiError or a compatible error
    // Log the error and re-throw for AuthContext to handle UI updates
    console.error('Login service error:', err);
    throw err;
  }
};

/**
 * Registers a new user.
 * Returns the user object (username from response, email from input) and token.
 */
export const signup = async (credentials: SignupFormData): Promise<AuthSuccessPayload> => {
  // Backend expects 'username', frontend form has 'name'
  const signupPayload = {
    username: credentials.name,
    email: credentials.email,
    password: credentials.password,
  };
  console.log('Calling API to signup:', { username: signupPayload.username, email: signupPayload.email, password: '***' });

  try {
    // Endpoint is 'register' (root level)
    const response = await apiClient<GoRegisterResponse>('register', {
      data: signupPayload,
      method: 'POST',
      isFormData: true,     // Go backend's c.PostForm expects x-www-form-urlencoded
      isAuthRequest: false, // Register endpoint itself doesn't require prior auth
    });
     console.log("[authService] Raw API response from /register:", response);
    // Construct the User object for the frontend state
    const user: User = {
      name: response.username, // From API response
      email: credentials.email,    // From original signup form data
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

export const forgotPassword = async (email: string): Promise<ForgotPasswordResponse> => {
    return await apiClient<{ message: string }>('forgot-password', {
        method: 'POST',
        data: { email },
        isAuthRequest: false,
    });
};