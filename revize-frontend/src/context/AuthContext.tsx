import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { loginUser, refreshAccessToken, RegisterPayload, registerUser } from "../api/auth";
import { clearStoredAuth, expireSession, EMAIL_KEY, TOKEN_KEY } from "../auth/session";

interface AuthContextValue {
  token: string | null;
  userEmail: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const REFRESH_WHEN_LESS_THAN_MS = 15 * 60 * 1000;
const MIN_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

function decodeJwtExp(token: string): number | null {
  const [, payloadBase64] = token.split(".");
  if (!payloadBase64) return null;

  try {
    const base64 = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem(EMAIL_KEY));
  const tokenRef = useRef<string | null>(token);
  const refreshInFlight = useRef<Promise<void> | null>(null);
  const lastRefreshAttempt = useRef(0);

  const saveAuth = useCallback((access_token: string, email: string) => {
    setToken(access_token);
    setUserEmail(email);
    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(EMAIL_KEY, email);
  }, []);

  const saveToken = useCallback((access_token: string) => {
    setToken(access_token);
    localStorage.setItem(TOKEN_KEY, access_token);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await loginUser(email, password);
    saveAuth(access_token, email);
  }, [saveAuth]);

  const register = useCallback(async (data: RegisterPayload) => {
    await registerUser(data);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUserEmail(null);
    clearStoredAuth();
    setTimeout(() => expireSession(), 0);
  }, []);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const refreshIfNeeded = useCallback(async (force = false) => {
    const currentToken = tokenRef.current;
    if (!currentToken) return;

    const expiresAt = decodeJwtExp(currentToken);
    if (!expiresAt) {
      logout();
      return;
    }

    const now = Date.now();
    if (expiresAt <= now) {
      logout();
      return;
    }

    const nearExpiry = expiresAt - now <= REFRESH_WHEN_LESS_THAN_MS;
    if (!force && !nearExpiry) return;
    if (!force && now - lastRefreshAttempt.current < MIN_REFRESH_INTERVAL_MS) return;
    if (refreshInFlight.current) return refreshInFlight.current;

    lastRefreshAttempt.current = now;
    refreshInFlight.current = refreshAccessToken(currentToken)
      .then(({ access_token }) => {
        saveToken(access_token);
      })
      .catch(() => {
        logout();
      })
      .finally(() => {
        refreshInFlight.current = null;
      });

    return refreshInFlight.current;
  }, [logout, saveToken]);

  useEffect(() => {
    if (!token) return;

    const expiresAt = decodeJwtExp(token);
    if (!expiresAt) {
      logout();
      return;
    }

    const expiryMs = expiresAt - Date.now();
    if (expiryMs <= 0) {
      logout();
      return;
    }

    const t = setTimeout(logout, expiryMs);
    return () => clearTimeout(t);
  }, [token, logout]);

  useEffect(() => {
    if (!token) return;

    const onActivity = () => {
      void refreshIfNeeded();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshIfNeeded(true);
      }
    };

    const events: Array<keyof WindowEventMap> = [
      "click",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
    ];
    events.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));
    document.addEventListener("visibilitychange", onVisible);

    void refreshIfNeeded();

    return () => {
      events.forEach((event) => window.removeEventListener(event, onActivity));
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [token, refreshIfNeeded]);

  const value: AuthContextValue = {
    token,
    userEmail,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const withAuthToken = <P extends object>(Component: React.ComponentType<P>) =>
  function AuthComponent(props: P) {
    const { token } = useAuth();
    if (!token) return null;
    return <Component {...props} />;
  };
