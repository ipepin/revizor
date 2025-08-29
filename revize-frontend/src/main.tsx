
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { UserProvider } from "./context/UserContext";

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import EditRevision from "./pages/EditRevision";
import SummaryWrapper from "./pages/SummaryWrapper";
import CatalogPage from "./pages/CatalogPage";
import ProtectedRoute from "./components/ProtectedRoute";
import ProfilePage from "./pages/ProfilPage";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {/* Globální auth kontext */}
    <AuthProvider>
      {/* Aplikace si zachovává existující UserContext */}
      <UserProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/revize/:revId"
              element={
                <ProtectedRoute>
                  <EditRevision />
                </ProtectedRoute>
              }
            />

            {/* Summary lze nechat veřejný, nebo také chránit */}
            <Route path="/summary/:revId" element={<SummaryWrapper />} />
            <Route path="/katalog" element={<ProtectedRoute><CatalogPage/></ProtectedRoute>} />
            <Route path="/profil" element={<ProtectedRoute><ProfilePage/></ProtectedRoute>} />
          </Routes>
        </BrowserRouter>
      </UserProvider>
    </AuthProvider>
  </React.StrictMode>
);
