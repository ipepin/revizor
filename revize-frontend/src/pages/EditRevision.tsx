import React, { useState, useRef, useEffect } from "react";
import IdentifikaceSection from "../sections/IdentifikaceSection";
import ProhlidkaSection from "../sections/ProhlidkaSection";
import ZkouskySection from "../sections/ZkouskySection";
import MereniSection from "../sections/MereniSection";
export default function EditRevision() {
  const [activeSection, setActiveSection] = useState("identifikace");
  const contentRef = useRef<HTMLDivElement>(null);

  const sections = [
    { key: "identifikace", label: "Identifikace" },
    { key: "prohlidka", label: "Prohlídka" },
    { key: "zkousky", label: "Zkoušky" },
    { key: "mereni", label: "Měření" },
    { key: "zavady", label: "Závady a doporučení" },
    { key: "zaver", label: "Závěr" },
  ];

  const getNextSection = () => {
    const currentIndex = sections.findIndex(s => s.key === activeSection);
    return sections[currentIndex + 1]?.key;
  };

  useEffect(() => {
    const handleScroll = () => {
      const el = contentRef.current;
      if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 5) {
        const next = getNextSection();
        if (next) setActiveSection(next);
      }
    };

    const el = contentRef.current;
    if (el) el.addEventListener("scroll", handleScroll);
    return () => {
      if (el) el.removeEventListener("scroll", handleScroll);
    };
  }, [activeSection]);

  const renderSection = () => {
    switch (activeSection) {
      case "identifikace":
        return <IdentifikaceSection />;
      case "prohlidka":
        return <ProhlidkaSection/>
      case "zkousky":
        return <ZkouskySection/>
      case "mereni":
        return <MereniSection/>
      default:
        return <div className="text-gray-500">Obsah sekce zatím není k dispozici.</div>;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r shadow p-4 flex-shrink-0 overflow-y-auto">
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-blue-400 mx-auto mb-2 shadow-inner" />
          <div className="font-bold text-blue-900">Ing. Petr Revizní</div>
          <div className="text-sm text-gray-600">Oprávnění: 123456</div>
          <div className="text-sm text-gray-600">Osvědčení: 7891011</div>
          <div className="text-sm text-gray-600">Platnost: 12/2026</div>
        </div>

        <button
          onClick={() => window.history.back()}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded mb-4 hover:bg-blue-700 transition"
        >
          ← Projekty
        </button>

        <div className="space-y-2">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`w-full text-left px-3 py-2 rounded ${
                activeSection === s.key
                  ? "bg-blue-100 text-blue-900 font-semibold"
                  : "hover:bg-gray-100"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </aside>

      {/* Obsah */}
      <main ref={contentRef} className="flex-1 overflow-y-auto p-6">
        <h1 className="text-2xl font-bold text-blue-800 mb-6">📝 Úprava revizní zprávy</h1>
        {renderSection()}
      </main>
    </div>
  );
}
