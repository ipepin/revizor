// src/api/auth.ts
// Jednoduchá API vrstva pro autentizaci + uživatele (FastAPI + JWT)

import { API_DISPLAY_URL, apiUrl } from "./base";

// --- typy ---
export type LoginResponse = {
  access_token: string;
  token_type: "bearer" | string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  phone?: string;
  certificate_number: string;
  authorization_number?: string;
  address?: string;
  ico?: string;
  dic?: string;
};

export type User = {
  id: number;
  name: string;
  email: string;
};

// --- helpers ---
export const authHeader = (token?: string): HeadersInit =>
  token ? { Authorization: `Bearer ${token}` } : {};

async function throwIfNotOk(res: Response): Promise<void> {
  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = (data && (data.detail || data.message)) ?? "";
    } catch {
      /* ignore json parse error */
    }
    throw new Error(detail || `${res.status} ${res.statusText}`);
  }
}

// --- API volání ---

/** Přihlášení – FastAPI OAuth2 očekává username+password (form-urlencoded). */
export async function loginUser(
  email: string,
  password: string
): Promise<LoginResponse> {
  const body = new URLSearchParams();
  body.set("username", email);
  body.set("password", password);

  const res = await fetch(apiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  await throwIfNotOk(res);
  return (await res.json()) as LoginResponse;
}

/** Registrace – JSON payload (name, email, password). */
export async function registerUser(data: RegisterPayload) {
  const res = await fetch(apiUrl("/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  await throwIfNotOk(res);
  return await res.json();
}

/** Detail přihlášeného uživatele (JWT v Authorization). */
export async function getCurrentUser(token: string): Promise<User> {
  const res = await fetch(apiUrl("/auth/me"), {
    headers: { ...authHeader(token) },
  });
  await throwIfNotOk(res);
  return (await res.json()) as User;
}

/** (Volitelné) Ověření e-mailu tokenem. */
export async function verifyEmail(token: string) {
  const base =
    API_DISPLAY_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:8000");
  const url = new URL(apiUrl("/auth/verify"), base);
  url.searchParams.set("token", token);
  const res = await fetch(url.toString());
  await throwIfNotOk(res);
  return await res.json();
}

/** Export „base URL“ jen pro zobrazení/debug. */
export const API_URL = API_DISPLAY_URL;
