import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import EditRevision from "./pages/EditRevision";
import ProtectedRoute from "./components/ProtectedRoute";
import "./index.css"; // <-- DŮLEŽITÉ

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
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
        </Routes>
      </BrowserRouter>
    </UserProvider>
  </React.StrictMode>
);
