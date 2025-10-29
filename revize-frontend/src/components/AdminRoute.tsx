import React from "react";
import { JSX } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";

export default function AdminRoute({ children }: { children: JSX.Element }) {
  const location = useLocation();
  const { token } = useAuth();
  const { profile, loading } = useUser();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (loading) {
    return <div className="p-6 text-gray-600">Načítám…</div>;
  }

  if (!profile?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

