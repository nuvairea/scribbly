import { request } from './api';

export type User = {
  userId: string;
  email: string;
  firstName: string;
  picture: string;
};

export function loginWithGoogle(code: string) {
  return request<User>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function checkSession() {
  return request<User>('/me', { method: 'GET' });
}

export function logout() {
  return request('/logout', { method: 'POST' });
}

export function deleteAccount() {
  return request('/me', { method: 'DELETE' });
}