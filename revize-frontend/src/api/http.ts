// src/api/http.ts
const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const TOKEN_KEY = "revize_jwt";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function authHeader(token?: string): HeadersInit {
  const t = token ?? getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** Základní wrapper – přidá JWT automaticky. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers: HeadersInit = {
    ...(init.headers || {}),
    ...authHeader(),
  };
  const res = await fetch(`${API}${path}`, { ...init, headers });
  return res;
}

/** Pohodlné helpery */
export const apiGet = (path: string, init?: RequestInit) => apiFetch(path, { ...(init || {}) });
export const apiDelete = (path: string, init?: RequestInit) =>
  apiFetch(path, { method: "DELETE", ...(init || {}) });

export const apiPostJson = (path: string, body: unknown, init?: RequestInit) =>
  apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    body: JSON.stringify(body),
    ...init,
  });

export const apiPutJson = (path: string, body: unknown, init?: RequestInit) =>
  apiFetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    body: JSON.stringify(body),
    ...init,
  });

export const apiPatchJson = (path: string, body: unknown, init?: RequestInit) =>
  apiFetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    body: JSON.stringify(body),
    ...init,
  });

export { API };
