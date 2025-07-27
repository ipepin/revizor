import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import EditRevision from "./pages/EditRevision";
import './index.css';
import { CatalogProvider } from "./context/CatalogContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CatalogProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/revize/:id" element={<EditRevision />} />
      </Routes>
    </BrowserRouter>
    </CatalogProvider>
  </React.StrictMode>
);