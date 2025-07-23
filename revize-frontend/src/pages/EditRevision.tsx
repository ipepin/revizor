import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import IdentifikaceSection from "../sections/IdentifikaceSection";
export default function EditRevision() {
  const navigate = useNavigate();
  const { id } = useParams(); // ID revize z URL
  const [activeSection, setActiveSection] = useState("identifikace");

  const sections = [
    { key: "identifikace", label: "Identifikace" },
    { key: "prohlidka", label: "Prohlídka" },
    { key: "zkousky", label: "Zkoušky" },
    { key: "mereni", label: "Měření" },
    { key: "zavady", label: "Závady a doporučení" },
    { key: "zaver", label: "Závěr" },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-100 to-blue-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow p-4 flex flex-col">
        <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-blue-400 mx-auto mb-2 shadow-inner" />
            <div className="font-bold text-blue-900">Ing. Petr Revizní</div>
            <div className="text-sm text-gray-600">Oprávnění: 123456</div>
            <div className="text-sm text-gray-600">Osvědčení: 7891011</div>
            <div className="text-sm text-gray-600">Platnost: 12/2026</div>
        </div>
                    
                    
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded mb-6 hover:bg-blue-700 transition"
          onClick={() => navigate("/")}
        >
          ← Projekty
        </button>

        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className={`text-left px-4 py-2 rounded mb-2 transition ${
              activeSection === s.key
                ? "bg-blue-600 text-white"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {s.label}
          </button>
        ))}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-blue-900 mb-4">
          Revizní zpráva #{id} – {sections.find(s => s.key === activeSection)?.label}
        </h1>

        <div className="bg-white p-6 rounded shadow text-gray-700">
          {/* Zde se bude měnit obsah podle sekce */}
          {activeSection === "identifikace" && <IdentifikaceSection />}
          {activeSection === "prohlidka" && <p>🔍 Sekce prohlídky.</p>}
          {activeSection === "zkousky" && <p>🧪 Sekce zkoušek.</p>}
          {activeSection === "mereni" && <p>📊 Sekce měření.</p>}
          {activeSection === "zavady" && <p>⚠️ Závady a doporučení.</p>}
          {activeSection === "zaver" && <p>✅ Závěrečné hodnocení.</p>}
        </div>
      </main>
    </div>
  );
}
