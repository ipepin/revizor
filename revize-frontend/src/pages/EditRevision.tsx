// src/pages/EditRevision.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { RevisionFormProvider } from "../context/RevisionFormContext";

import IdentifikaceSection from "../sections/IdentifikaceSection";
import ProhlidkaSection from "../sections/ProhlidkaSection";
import ZkouskySection from "../sections/ZkouskySection";
import MereniSection from "../sections/MereniSection";
import DefectsRecommendationsSection from "../sections/DefectsRecommendationsSection";
import ZaverSection from "../sections/ConclusionSection";

import { apiUrl } from "../api/base";
import { useAuth } from "../context/AuthContext";
import { authHeader } from "../api/auth";

export default function EditRevision() {
  const { revId } = useParams();
  const { token } = useAuth();

  const [activeSection, setActiveSection] = useState("identifikace");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const sectionMap: Record<string, React.ReactNode> = {
    identifikace: <IdentifikaceSection />,
    prohlidka: <ProhlidkaSection />,
    zkousky: <ZkouskySection />,
    mereni: <MereniSection />,
    zavady: <DefectsRecommendationsSection />,
    zaver: <ZaverSection />,
  };

  if (!revId) return <div className="p-6">❌ Chybí ID revize v URL.</div>;

  // Načtení detailu revize (kvůli ověření existence a případnému prefetchi)
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      if (!token) return;
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(apiUrl(`/revisions/${revId}`), {
          method: "GET",
          headers: { ...authHeader(token) },
          signal: ctrl.signal,
        });
        if (!res.ok) {
          setErr(`${res.status} ${res.statusText}`);
          return;
        }
        // data aktuálně nikde nepotřebujeme – jen „spotřebujeme“ stream
        await res.json();
      } catch (e: any) {
        if (e?.name !== "AbortError") setErr("Network error");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [revId, token, refreshKey]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 to-blue-50">
        <div className="loading loading-spinner loading-lg text-blue-700" />
      </div>
    );
  }

  if (err) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 to-blue-50">
        <div className="bg-white p-6 rounded shadow text-center">
          <p className="text-red-600 font-semibold mb-2">Nepodařilo se načíst revizi</p>
          <p className="text-sm opacity-80 mb-4">{err}</p>
          <button
            className="btn btn-primary"
            onClick={() => setRefreshKey((n) => n + 1)}
          >
            Zkusit znovu
          </button>
        </div>
      </div>
    );
  }

  return (
    <RevisionFormProvider revId={parseInt(revId, 10)}>
      <div className="flex min-h-screen bg-gradient-to-br from-gray-100 to-blue-50">
        <Sidebar
          mode="edit"
          active={activeSection}
          onSelect={(key) => setActiveSection(key)}
        />

        <main className="flex-1 p-6 overflow-auto">
          <div className="bg-white p-4 rounded shadow">
            {sectionMap[activeSection]}
          </div>
        </main>
      </div>
    </RevisionFormProvider>
  );
}
