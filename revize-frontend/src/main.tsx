import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter, Routes, Route } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { UserProvider } from "./context/UserContext";
import { VvDocsProvider } from "./context/VvDocsContext"; // â¬…ď¸Ź DOPLNÄšNO

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
import ProfilePage from "./pages/ProfilPage";
import InstrumentsPage from "./pages/InstrumentsPage";
import VvEditor from "./pages/VvEditor";
import LpsEditPage from "./pages/LpsEditPage";

import "./index.css";

// Choose router mode (browser vs hash) to avoid 404 on reload if host lacks SPA rewrites
const routerMode = (window as any)?.__APP_CONFIG__?.routerMode || import.meta.env.VITE_ROUTER_MODE || "browser";
const Router: any = routerMode === "hash" ? HashRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {/* GlobĂˇlnĂ­ auth kontext */}
    <AuthProvider>
      {/* Aplikace si zachovĂˇvĂˇ existujĂ­cĂ­ UserContext */}
      <UserProvider>
        {/* â¬‡ď¸Ź MUSĂŤ obalovat Router i vĹˇechny strĂˇnky, kde volĂˇĹˇ useVvDocs() */}
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

              {/* Summary mĹŻĹľe bĂ˝t veĹ™ejnĂ˝, ale klidnÄ› ho mĹŻĹľeĹˇ taky chrĂˇnit */}
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

              {/* (volitelnĂ©) 404 fallback */}
              {/* <Route path="*" element={<NotFoundPage />} /> */}
            </Routes>
          </Router>
        </VvDocsProvider>
      </UserProvider>
    </AuthProvider>
  </React.StrictMode>
);
