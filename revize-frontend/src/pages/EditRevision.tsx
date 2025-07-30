// src/pages/EditRevision.tsx

import React, { useState } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { RevisionFormProvider } from "../context/RevisionFormContext";

import IdentifikaceSection from "../sections/IdentifikaceSection";
import ProhlidkaSection from "../sections/ProhlidkaSection";
import ZkouskySection from "../sections/ZkouskySection";
import MereniSection from "../sections/MereniSection";
import DefectsRecommendationsSection from "../sections/DefectsRecommendationsSection";
import ZaverSection from "../sections/ConclusionSection";

export default function EditRevision() {
  const { revId } = useParams();
  const [activeSection, setActiveSection] = useState("identifikace");

  if (!revId) return <div className="p-6">❌ Chybí ID revize v URL.</div>;

  const sectionMap: Record<string, React.ReactNode> = {
    identifikace: <IdentifikaceSection />,
    prohlidka: <ProhlidkaSection />,
    zkousky: <ZkouskySection />,
    mereni: <MereniSection />,
    zavady: <DefectsRecommendationsSection />,
    zaver: <ZaverSection />,
  };

  return (
    <RevisionFormProvider revId={parseInt(revId)}>
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
