// src/components/Sidebar.tsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useRevisionForm } from "../context/RevisionFormContext";

type Props = {
  mode: "dashboard" | "edit" | "catalog" | "summary";
  active?: string;
  onSelect?: (sectionKey: string) => void;
  onNewProject?: () => void;
};

export default function Sidebar({ mode, active, onSelect, onNewProject }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showSettings, setShowSettings] = useState(false);

  // User context (nově: profil technika + firma)
  const { logout, profile, company, loading } = useUser();

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

  const initial = (profile?.name?.[0] || "T").toUpperCase();

  return (
    <aside className="w-64 bg-white shadow-lg p-4 flex flex-col justify-between sticky top-0 h-screen overflow-y-auto">
      <div>
        {/* Hlavicka se jménem technika, číslem osvědčení a aktivním subjektem */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-blue-500/20 text-blue-900 mx-auto mb-2 shadow-inner flex items-center justify-center text-2xl font-semibold">
            {initial}
          </div>

          <div className="font-bold text-blue-900">
            {profile?.name ?? (loading ? "Načítám…" : "—")}
          </div>

          <div className="text-sm text-gray-600">
            Osvědčení:{" "}
            <span className="font-medium">
              {profile?.certificate_number || (loading ? "…" : "—")}
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
              ⬅️ Zpět na projekty
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

            {/* Dokončit revizi */}
            <button
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition"
              onClick={finish}
              title="Označit revizi jako dokončenou"
            >
              ✅ Dokončit
            </button>
          </>
        )}

        {/* Režim DASHBOARD – tlačítko nový projekt */}
        {mode === "dashboard" && (
          <>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded mb-2 hover:bg-blue-700 transition"
              onClick={() => onNewProject?.()}
            >
              + Nový projekt
            </button>
          </>
        )}

        {/* Režim CATALOG – jen „zpět na projekty“ */}
        {isCatalog && (
          <button
            className="mb-4 bg-gray-200 hover:bg-gray-300 text-left px-4 py-2 rounded transition"
            onClick={() => navigate("/")}
          >
            ⬅️ Zpět na projekty
          </button>
        )}

        {/* Režim SUMMARY – jen „zpět na projekty“ */}
        {isSummary && (
          <button
            className="mb-4 bg-gray-200 hover:bg-gray-300 text-left px-4 py-2 rounded transition"
            onClick={() => navigate("/")}
          >
            ⬅️ Zpět na projekty
          </button>
        )}

        <hr className="my-4 border-gray-300" />

        {/* NASTAVENÍ */}
        <div className="relative">
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
                📚 Katalog
              </li>
              <li className="p-2 hover:bg-gray-100 cursor-pointer" onClick={() => go("/profil")}>
                👤 Profil
              </li>
              <li className="p-2 hover:bg-gray-100 cursor-pointer">🖨️ Tisk</li>
              <li
                className="p-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  logout();
                  go("/login");
                }}
              >
                🚪 Odhlásit se
              </li>
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
