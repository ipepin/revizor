import { Navigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import React, { ReactElement } from "react";

export default function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user } = useUser();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
