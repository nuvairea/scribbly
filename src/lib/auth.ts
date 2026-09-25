import { request } from './api';

export function signup(email: string, password: string) {
  return request('/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function login(email: string, password: string) {
  return request('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function checkSession() {
  return request('/me', { method: 'GET' });
}

export function logout() {
  return request('/logout', { method: 'POST' });
}

export function deleteAccount() {
  return request('/me', { method: 'DELETE' });
}