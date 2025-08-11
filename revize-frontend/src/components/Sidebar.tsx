// src/components/Sidebar.tsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

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
  const { logout } = useUser();

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

  return (
    <aside className="w-64 bg-white shadow-lg p-4 flex flex-col justify-between sticky top-0 h-screen overflow-y-auto">
      <div>
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-blue-400 mx-auto mb-2 shadow-inner" />
          <div className="font-bold text-blue-900">Ing. Petr Revizní</div>
          <div className="text-sm text-gray-600">Oprávnění: 123456</div>
          <div className="text-sm text-gray-600">Osvědčení: 7891011</div>
          <div className="text-sm text-gray-600">Platnost: 12/2026</div>
        </div>

        {/* Režim EDIT – přepínače sekcí + zpět */}
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

        {/* Režim CATALOG – jen „zpět na projekty“ (žádný nový projekt) */}
        {isCatalog && (
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
              <li className="p-2 hover:bg-gray-100 cursor-pointer">👤 Profil</li>
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
