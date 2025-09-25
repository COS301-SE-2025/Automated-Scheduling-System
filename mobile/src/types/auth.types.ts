export type LoginFormData = { email: string; password: string };

export interface SignupFormData {
  name: string;
  email: string;
  password: string;
}

export interface AuthSuccessPayload {
  user: any;
  token: string;
}

export interface GoLoginResponse {
  token: string; 
  user: any;
}

export interface RegisterSuccessResponse {
  user: any;
  token: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  permissions: string[] | null;
}

export type AuthAction =
  | { type: 'INIT_AUTH' }
  | { type: 'AUTH_REQUEST' }
  | { type: 'LOGIN_SUCCESS'; payload: AuthSuccessPayload }
  | { type: 'SIGNUP_SUCCESS'; payload: AuthSuccessPayload }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_USER_FROM_STORAGE'; payload: { user: any | null; token: string | null } }
  | { type: 'SET_PERMISSIONS'; payload: string[] | null }
  | { type: 'CLEAR_ERROR' }
  | { type: 'FORGOT_PASSWORD_REQUEST' }
  | { type: 'FORGOT_PASSWORD_SUCCESS' }
  | { type: 'FORGOT_PASSWORD_FAILURE'; payload: string };