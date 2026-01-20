﻿// src/components/Sidebar.tsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useRevisionForm } from "../context/RevisionFormContext";
import { useAuth } from "../context/AuthContext";

type Props = {
  mode: "dashboard" | "edit" | "catalog" | "summary";
  active?: string;
  onSelect?: (sectionKey: string) => void;
  onNewProject?: () => void;
  actions?: { label: string; onClick: () => void; variant?: "primary" | "secondary" | "outline" }[];
};

export default function Sidebar({ mode, active, onSelect, onNewProject, actions }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  // potvrzení dokončení
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [finishing, setFinishing] = useState(false);

  // User context (profil technika + firma)
  const { profile, company, loading } = useUser();

  // dostupné jen pokud jsme uvnitř RevisionEdit provideru
  const { finish } = (() => {
    try {
      return useRevisionForm();
    } catch {
      // mimo provider – vrátíme dummy
      return { finish: () => Promise.resolve() } as any;
    }
  })();

  const editSections = [
    { key: "identifikace", label: "Identifikace" },
    { key: "prohlidka", label: "Prohlídka" },
    { key: "zkousky", label: "Zkoušky" },
    { key: "mereni", label: "Měření" },
    { key: "zavady", label: "Závady a doporučení" },
    { key: "zaver", label: "Závěr" },
  ];

  const go = (path: string) => {
    setShowSettings(false);
    navigate(path);
  };

  const isCatalog = mode === "catalog" || location.pathname.startsWith("/katalog");
  const isSummary = mode === "summary";
  // stránka měřicích přístrojů (obě možné cesty)
  const isInstruments =
    location.pathname.startsWith("/instruments") ||
    location.pathname.startsWith("/merici-pristroje");

  const initial = (profile?.fullName?.[0] || "T").toUpperCase();

  // potvrzení dokončení → zavolat finish() a přesměrovat
  const confirmFinish = async () => {
    setFinishing(true);
    try {
      await finish();
    } catch (e) {
      // případně lze doplnit toast; požadavek je každopádně přesměrovat
      console.warn("Dokončení selhalo, přesměrovávám i tak.", e);
    } finally {
      setFinishing(false);
      setShowConfirmFinish(false);
      navigate("/"); // zpět na projekty
    }
  };

  return (
    <>
      <aside className="w-64 bg-white shadow-lg p-4 flex flex-col justify-between sticky top-0 h-screen overflow-y-auto">
        <div>
          {/* Hlavicka se jménem technika, číslem osvědčení a aktivním subjektem */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-blue-500/20 text-blue-900 mx-auto mb-2 shadow-inner flex items-center justify-center text-2xl font-semibold">
              {initial}
            </div>

            <div className="font-bold text-blue-900">
              {profile?.fullName ?? (loading ? "Načítám…" : "—")}
            </div>

            <div className="text-sm text-gray-600">
              Osvědčení:{" "}
              <span className="font-medium">
                {profile?.certificateNumber || (loading ? "…" : "—")}
              </span>
            </div>

            <div className="text-sm text-gray-600">
              Aktivní subjekt:{" "}
              <span className="font-medium" title={company?.name}>
                {company?.name || (loading ? "…" : "—")}
              </span>
            </div>
          </div>

          {/* Režim EDIT – přepínače sekcí + akce */}
          {mode === "edit" && (
            <>
              <button
                className="mb-4 bg-gray-200 hover:bg-gray-300 text-left px-4 py-2 rounded transition"
                onClick={() => navigate("/")}
              >
                ← Zpět na projekty
              </button>

              <nav className="flex flex-col gap-2 mb-4">
                {editSections.map((section) => (
                  <button
                    key={section.key}
                    onClick={() => onSelect?.(section.key)}
                    className={`px-4 py-2 rounded text-left transition ${
                      active === section.key
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    {section.label}
                  </button>
                ))}
              </nav>

              {/* Dokončit revizi (s potvrzením) */}
              <button
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition"
                onClick={() => setShowConfirmFinish(true)}
                title="Označit revizi jako dokončenou"
              >
                ✓ Dokončit
              </button>
            </>
          )}

          {/* Režim DASHBOARD – tlačítko Nový projekt (NE na instruments) */}
          {mode === "dashboard" && !isInstruments && (
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded mb-2 hover:bg-blue-700 transition"
              onClick={() => onNewProject?.()}
            >
              + Nový projekt
            </button>
          )}

          {/* Režimy CATALOG / SUMMARY / INSTRUMENTS – jen „Zpět na projekty“ */}
          {(isCatalog || isSummary || isInstruments) && (
            <button
              className="mb-4 bg-gray-200 hover:bg-gray-300 text-left px-4 py-2 rounded transition"
              onClick={() => navigate("/")}
            >
              ← Zpět na projekty
            </button>
          )}

          {/* Režim SUMMARY – LPS: přepínač dvou sekcí + Dokončit */}
          {isSummary && onSelect && (
            <div className="mb-4 space-y-2">
              <button
                className={`w-full px-4 py-2 rounded text-left transition ${active === "lps_info" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
                onClick={() => onSelect?.("lps_info")}
              >
                Identifikace objektu a prohlídka
              </button>
              <button
                className={`w-full px-4 py-2 rounded text-left transition ${active === "lps_measure" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
                onClick={() => onSelect?.("lps_measure")}
              >
                Měření a závěr
              </button>
              <button
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition"
                onClick={() => setShowConfirmFinish(true)}
                title="Označit revizi jako dokončenou"
              >
                ✓ Dokončit
              </button>
            </div>
          )}

          <hr className="my-4 border-gray-300" />

          {profile?.isAdmin && (
            <div className="mt-4">
              <div className="text-xs text-gray-500 mb-2">Admin</div>
              <div className="flex flex-col gap-2">
                <button
                  className="bg-amber-100 hover:bg-amber-200 text-left px-4 py-2 rounded transition"
                  onClick={() => navigate("/admin")}
                >
                  Přehled administrátora
                </button>
                <button
                  className="bg-amber-100 hover:bg-amber-200 text-left px-4 py-2 rounded transition"
                  onClick={() => navigate("/admin/users")}
                >
                  Technici
                </button>
                <button
                  className="bg-amber-100 hover:bg-amber-200 text-left px-4 py-2 rounded transition"
                  onClick={() => navigate("/admin/defects")}
                >
                  Návrhy závad
                </button>
                <button
                  className="bg-amber-100 hover:bg-amber-200 text-left px-4 py-2 rounded transition"
                  onClick={() => navigate("/admin/defects-editor")}
                >
                  Editor závad
                </button>
                <button
                  className="bg-amber-100 hover:bg-amber-200 text-left px-4 py-2 rounded transition"
                  onClick={() => navigate("/admin/revisions")}
                >
                  Revize všech uživatelů
                </button>
                <button
                  className="bg-amber-100 hover:bg-amber-200 text-left px-4 py-2 rounded transition"
                  onClick={() => navigate("/admin/snippets")}
                >
                  Rychlé věty (správa a schvalování)
                </button>
                <button
                  className="bg-amber-100 hover:bg-amber-200 text-left px-4 py-2 rounded transition"
                  onClick={() => navigate("/admin/norms")}
                >
                  Normy (správa)
                </button>
              </div>
            </div>
          )}

          {actions && actions.length > 0 && (
            <div className="mb-4 space-y-2">
              <div className="text-xs text-gray-500">Exporty</div>
              {actions.map((action, idx) => {
                const base = "w-full px-4 py-2 rounded text-left transition";
                const variant =
                  action.variant === "primary"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : action.variant === "secondary"
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-100 hover:bg-gray-200";
                return (
                  <button
                    key={`${action.label}-${idx}`}
                    className={`${base} ${variant}`}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </button>
                );
              })}
            </div>
          )}
          {/* Nastavení */}
          <div className="relative mt-4">
            <button
              className="bg-gray-200 px-4 py-2 rounded w-full text-left hover:bg-gray-300 transition"
              onClick={() => setShowSettings(!showSettings)}
            >
              ⚙️ Nastavení
            </button>

            {showSettings && (
              <ul className="absolute left-0 mt-2 bg-white border rounded shadow w-full z-10 overflow-hidden">
                <li
                  className={`p-2 hover:bg-gray-100 cursor-pointer ${
                    isCatalog ? "bg-blue-50 font-medium" : ""
                  }`}
                  onClick={() => go("/katalog")}
                >
                  Katalog
                </li>
                <li
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => go("/snippets")}
                >
                  Katalog rychlých vět
                </li>
                <li
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => go("/instruments")}
                >
                  Měřicí přístroje
                </li>
                <li
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => go("/profil")}
                >
                  Profil
                </li>
                <li
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    window.dispatchEvent(new Event("revize-open-guide"));
                    go("/");
                  }}
                >
                  Spustit průvodce
                </li>
                <li
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    logout();
                    go("/login");
                  }}
                >
                  Odhlásit se
                </li>
              </ul>
            )}
          </div>
        </div>
      </aside>

      {/* Potvrzovací dialog „Dokončit“ */}
      {showConfirmFinish && (
        <div
          className="fixed inset-0 bg-black/40 z-50 grid place-items-center"
          onClick={() => !finishing && setShowConfirmFinish(false)}
        >
          <div
            className="bg-white p-6 rounded shadow w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">Označit revizi jako dokončenou?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Po potvrzení bude revize uzamčena k úpravám. Následně tě přesměruji na přehled projektů.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-200 rounded"
                onClick={() => setShowConfirmFinish(false)}
                disabled={finishing}
              >
                Zrušit
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-60"
                onClick={confirmFinish}
                disabled={finishing}
                title="Dokončit revizi"
              >
                {finishing ? "Dokončuji…" : "Dokončit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
