export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'https://scribbly-server.onrender.com';

type RequestSuccess<T> = { ok: true; status: number; data: T };
type RequestFailure = { ok: false; status: number; data: { error: string } };

export async function request<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<RequestSuccess<T> | RequestFailure> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      return { ok: true, status: res.status, data: data as T };
    }
    return { ok: false, status: res.status, data: { error: data?.error ?? 'Request failed' } };
  } catch {
    return { ok: false, status: 0, data: { error: 'Network error — check your connection' } };
  }
}