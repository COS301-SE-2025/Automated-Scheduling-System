import api from '@/services/api';
import type { AllowedPage } from '../types/role';
import type { User } from '../types/user';
import type {
    LoginFormData,
    SignupFormData,
    RegisterSuccessResponse,
    GoLoginResponse,
    AuthSuccessPayload,
    ForgotPasswordResponse,
} from '../types/auth.types';

function postForm<T = any>(url: string, data: Record<string, string>) {
  const form = new URLSearchParams();
  Object.entries(data).forEach(([k, v]) => form.append(k, v));
  return api.post<T>(url, form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
}

export async function login(payload: LoginFormData): Promise<GoLoginResponse> {
  const res = await postForm<GoLoginResponse>('/login', payload);
  return res.data;
}

export async function fetchProfile(): Promise<User> {
  const res = await api.get<User>('/profile');
  return res.data;
}

export async function fetchMyPermissions(): Promise<AllowedPage[]> {
  const res = await api.get<AllowedPage[]>('/roles/permissions');
  return res.data || [];
}

export async function signup(credentials: SignupFormData): Promise<AuthSuccessPayload> {
  const res = await api.post<RegisterSuccessResponse>('/register', credentials);
  return {
    user: res.data.user,
    token: res.data.token,
  };
}

export async function logout(): Promise<void> {
  // Simple client-side logout since mobile apps typically don't need server-side logout
  return Promise.resolve();
}

export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  const res = await api.post<{ message: string }>('/forgot-password', { email });
  return res.data;
}
