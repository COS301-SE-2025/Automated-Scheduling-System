import api, { postForm } from './api';

export type LoginFormData = { email: string; password: string };
export type GoLoginResponse = { token: string; user: any };

export async function login(payload: LoginFormData) {
  const res = await postForm<GoLoginResponse>('/login', payload);
  return res.data;
}

export async function fetchProfile() {
  const res = await api.get('/profile');
  return res.data;
}
