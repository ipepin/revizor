import React from "react";
import RozvadecePanel from "../components/RozvadecePanel";
import MistnostiPanel from "../components/MistnostiPanel";

export default function SectionMereni() {
  return (
    <div className="space-y-5 text-sm text-gray-800">
      <h2 className="text-xl font-semibold text-blue-800">📏 Měření – Elektroinstalace</h2>

      <div data-guide-id="me-rozvadece">
        <RozvadecePanel />
      </div>

      <div data-guide-id="me-mistnosti">
        <MistnostiPanel />
      </div>
    </div>
  );
}
