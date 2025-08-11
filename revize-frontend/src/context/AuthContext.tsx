import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { loginUser, RegisterPayload, registerUser } from "../api/auth";

interface AuthContextValue {
  token: string | null;
  userEmail: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "revize_jwt";
const EMAIL_KEY = "revize_email";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem(EMAIL_KEY));

  const saveAuth = useCallback((access_token: string, email: string) => {
    setToken(access_token);
    setUserEmail(email);
    localStorage.setItem(TOKEN_KEY, access_token);
    localStorage.setItem(EMAIL_KEY, email);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await loginUser(email, password);
    saveAuth(access_token, email);
  }, [saveAuth]);

  const register = useCallback(async (data: RegisterPayload) => {
    await registerUser(data);
    // optional: auto‑login or redirect handled in page component
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUserEmail(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
  }, []);

  // Token expiry handling – basic example (decode exp every mount)
  useEffect(() => {
    if (!token) return;
    const [, payloadBase64] = token.split(".");
    try {
      const { exp } = JSON.parse(atob(payloadBase64));
      const expiryMs = exp * 1000 - Date.now();
      if (expiryMs <= 0) {
        logout();
      } else {
        const t = setTimeout(logout, expiryMs);
        return () => clearTimeout(t);
      }
    } catch {
      logout();
    }
  }, [token, logout]);

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

// Convenience HOC for pages/components that must be authenticated
export const withAuthToken = <P extends object>(Component: React.ComponentType<P>) =>
  function AuthComponent(props: P) {
    const { token } = useAuth();
    if (!token) return null; // or <Navigate to="/login"/> (if react‑router in scope)
    return <Component {...props} />;
  };
