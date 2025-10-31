import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { UserProvider } from "./context/UserContext";
import { VvDocsProvider } from "./context/VvDocsContext"; // ⬅️ DOPLNĚNO

import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import EditRevision from "./pages/EditRevision";
import SummaryWrapper from "./pages/SummaryWrapper";
import CatalogPage from "./pages/CatalogPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import DefectProposalsPage from "./pages/admin/DefectProposalsPage";
import RevisionsAdminPage from "./pages/admin/RevisionsAdminPage";
import DefectsEditorPage from "./pages/admin/DefectsEditorPage";
import ProfilePage from "./pages/ProfilPage";
import InstrumentsPage from "./pages/InstrumentsPage";
import VvEditor from "./pages/VvEditor";

import "./index.css";

// Choose router mode (browser vs hash) to avoid 404 on reload if host lacks SPA rewrites
const routerMode = (window as any)?.__APP_CONFIG__?.routerMode || import.meta.env.VITE_ROUTER_MODE || "browser";
const Router: any = routerMode === "hash" ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {/* Globální auth kontext */}
    <AuthProvider>
      {/* Aplikace si zachovává existující UserContext */}
      <UserProvider>
        {/* ⬇️ MUSÍ obalovat Router i všechny stránky, kde voláš useVvDocs() */}
        <VvDocsProvider>
          <Router>
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

              {/* Summary může být veřejný, ale klidně ho můžeš taky chránit */}
              <Route path="/summary/:revId" element={<SummaryWrapper />} />

              <Route
                path="/katalog"
                element={
                  <ProtectedRoute>
                    <CatalogPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profil"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/instruments"
                element={
                  <ProtectedRoute>
                    <InstrumentsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/vv/:id"
                element={
                  <ProtectedRoute>
                    <VvEditor />
                  </ProtectedRoute>
                }
              />

              {/* Admin */}
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/defects" element={<AdminRoute><DefectProposalsPage /></AdminRoute>} />
              <Route path="/admin/revisions" element={<AdminRoute><RevisionsAdminPage /></AdminRoute>} />
              <Route path="/admin/defects-editor" element={<AdminRoute><DefectsEditorPage /></AdminRoute>} />

              {/* (volitelné) 404 fallback */}
              {/* <Route path="*" element={<NotFoundPage />} /> */}
            </Routes>
          </Router>
        </VvDocsProvider>
      </UserProvider>
    </AuthProvider>
  </React.StrictMode>
);
