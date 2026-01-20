import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { UserProvider } from "./context/UserContext";
import { VvDocsProvider } from "./context/VvDocsContext";

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
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminNormsPage from "./pages/admin/AdminNormsPage";
import ProfilePage from "./pages/ProfilPage";
import InstrumentsPage from "./pages/InstrumentsPage";
import VvEditor from "./pages/VvEditor";
import LpsEditPage from "./pages/LpsEditPage";
import AdminSnippetsPage from "./pages/AdminSnippetsPage";
import UserSnippetsPage from "./pages/UserSnippetsPage";

import "./index.css";

// Choose router mode (browser vs hash) to avoid 404 on reload if host lacks SPA rewrites
const routerMode = (window as any)?.__APP_CONFIG__?.routerMode || import.meta.env.VITE_ROUTER_MODE || "browser";
const Router: any = routerMode === "hash" ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <UserProvider>
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

              <Route
                path="/revize-lps/:revId"
                element={
                  <ProtectedRoute>
                    <LpsEditPage />
                  </ProtectedRoute>
                }
              />

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
                path="/snippets"
                element={
                  <ProtectedRoute>
                    <UserSnippetsPage />
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
              <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
              <Route path="/admin/defects" element={<AdminRoute><DefectProposalsPage /></AdminRoute>} />
              <Route path="/admin/revisions" element={<AdminRoute><RevisionsAdminPage /></AdminRoute>} />
              <Route path="/admin/defects-editor" element={<AdminRoute><DefectsEditorPage /></AdminRoute>} />
              <Route path="/admin/snippets" element={<AdminRoute><AdminSnippetsPage /></AdminRoute>} />
              <Route path="/admin/norms" element={<AdminRoute><AdminNormsPage /></AdminRoute>} />

              {/* <Route path="*" element={<NotFoundPage />} /> */}
            </Routes>
          </Router>
        </VvDocsProvider>
      </UserProvider>
    </AuthProvider>
  </React.StrictMode>
);
