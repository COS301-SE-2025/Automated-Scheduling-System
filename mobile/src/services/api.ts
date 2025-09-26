import axios from 'axios';
import { Platform } from 'react-native';
import { getToken } from './session';

// Replace with your development machine's actual IP address
// To find your IP: Windows: ipconfig | macOS/Linux: ifconfig or ip addr
const defaultBase = 'http://YOUR_MACHINE_IP:8080/api'; // e.g., 'http://192.168.1.100:8080/api'
const baseURL = process.env.EXPO_PUBLIC_API_URL || defaultBase;

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
  // Debug logging to see API requests
  const method = config.method?.toUpperCase() || 'REQUEST';
  const url = `${config.baseURL || ''}${config.url || ''}`;
  console.log('[API Request]', method, url);
  return config;
});

// Log API errors for debugging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('[API Error]', error.message, error.config?.method?.toUpperCase(), error.config?.url);
    return Promise.reject(error);
  }
);

export function postForm<T = any>(url: string, data: Record<string, string>) {
  const form = new URLSearchParams();
  Object.entries(data).forEach(([k, v]) => form.append(k, v));
  return api.post<T>(url, form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
}

export default api;
