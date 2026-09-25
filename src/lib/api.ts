export const API_BASE_URL = 'https://scribbly-server.onrender.com';

export async function request<T>(path: string, options: RequestInit = {}): Promise<{
  ok: boolean;
  status: number;
  data: T | { error: string };
}> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: 'Network error — check your connection' } };
  }
}