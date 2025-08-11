import React from "react";
import { JSX } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const { token } = useAuth();         // nový zdroj pravdy (JWT)
  const { user } = useUser();          // legacy uživatel (ponecháme pro kompatibilitu)

  // Pokud někdo omylem zabalí i /login, neblokuj ho
  if (location.pathname === "/login") return children;

  // povol, pokud je JWT *nebo* legacy user
  const isAuthenticated = Boolean(token || user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
