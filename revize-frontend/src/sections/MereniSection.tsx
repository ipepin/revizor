import React from "react";
import RozvadecePanel from "../components/RozvadecePanel";
import MistnostiPanel from "../components/MistnostiPanel";

export default function SectionMereni() {
  return (
    <div className="space-y-8 px-4">
      <h1 className="text-2xl font-bold text-blue-800 mb-4">📏 Měření – Elektroinstalace</h1>
      
      <RozvadecePanel />

      <MistnostiPanel />
    </div>
  );
}
