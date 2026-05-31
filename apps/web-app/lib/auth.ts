import { api, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY } from './api';

export interface CustomerUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: CustomerUser;
}

function persist(data: LoginResponse) {
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export async function login(identifier: { email?: string; phone?: string }, password: string) {
  const { data } = await api.post<LoginResponse>('/auth/login', { ...identifier, password });
  persist(data);
  return data.user;
}

export async function signup(input: {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  locale: string;
}) {
  await api.post('/auth/signup', input);
  // signup creates an active account; log in immediately
  return login(input.email ? { email: input.email } : { phone: input.phone }, input.password);
}

export function logout(locale: string) {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = `/${locale}`;
}

export function getCurrentUser(): CustomerUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as CustomerUser) : null;
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
}
