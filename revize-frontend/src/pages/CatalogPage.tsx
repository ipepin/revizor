import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import CatalogComponentsTab from "../sections/catalog/CatalogComponentsTab";
import CatalogPristrojeTab from "../sections/catalog/CatalogPristrojeTab";
import CatalogCablesTab from "../sections/catalog/CatalogCablesTab";

type CatalogTab = "komponenty" | "pristroje" | "kabely";

export default function CatalogPage() {
  const [tab, setTab] = useState<CatalogTab>("komponenty");

  const tabClass = (key: CatalogTab) =>
    `px-4 py-2 rounded ${tab === key ? "bg-blue-600 text-white" : "bg-white hover:bg-slate-50"}`;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-100 to-blue-50">
      <Sidebar mode="catalog" />
      <main className="flex-1 p-6 catalog-main">
        <h1 className="mb-4 text-3xl font-bold text-blue-800">Správa katalogů</h1>
        <div className="mb-4 flex gap-2">
          <button className={tabClass("komponenty")} onClick={() => setTab("komponenty")}>
            Komponenty rozvaděčů
          </button>
          <button className={tabClass("pristroje")} onClick={() => setTab("pristroje")}>
            Měřicí přístroje
          </button>
          <button className={tabClass("kabely")} onClick={() => setTab("kabely")}>
            Kabely
          </button>
        </div>
        <div className="rounded bg-white p-4 shadow">
          {tab === "komponenty" && <CatalogComponentsTab />}
          {tab === "pristroje" && <CatalogPristrojeTab />}
          {tab === "kabely" && <CatalogCablesTab />}
        </div>
      </main>
    </div>
  );
}
