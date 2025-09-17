import axios from 'axios';
import { getToken } from './session';

const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';

export const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export function postForm<T = any>(url: string, data: Record<string, string>) {
  const form = new URLSearchParams();
  Object.entries(data).forEach(([k, v]) => form.append(k, v));
  return api.post<T>(url, form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
}

export default api;
