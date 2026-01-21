import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import CatalogComponentsTab  from "../sections/catalog/CatalogComponentsTab";
import CatalogPristrojeTab   from "../sections/catalog/CatalogPristrojeTab";
import CatalogCablesTab      from "../sections/catalog/CatalogCablesTab";

export default function CatalogPage() {
  const [tab, setTab] = useState<"komponenty"|"pristroje"|"kabely">("komponenty");

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-100 to-blue-50">
      <Sidebar mode="catalog" />
      <main className="flex-1 p-6 catalog-main">
        <h1 className="text-3xl font-bold text-blue-800 mb-4">📚 Katalog</h1>
        <div className="mb-4 flex gap-2">
          <button className={`px-4 py-2 rounded ${tab==="komponenty"?"bg-blue-600 text-white":"bg-white"}`} onClick={()=>setTab("komponenty")}>Komponenty</button>
          <button className={`px-4 py-2 rounded ${tab==="pristroje"?"bg-blue-600 text-white":"bg-white"}`} onClick={()=>setTab("pristroje")}>Přístroje</button>
          <button className={`px-4 py-2 rounded ${tab==="kabely"?"bg-blue-600 text-white":"bg-white"}`} onClick={()=>setTab("kabely")}>Kabely</button>
        </div>
        <div className="bg-white rounded shadow p-4">
          {tab === "komponenty" && <CatalogComponentsTab/>}
          {tab === "pristroje" && <CatalogPristrojeTab/>}
          {tab === "kabely" && <CatalogCablesTab/>}
        </div>
      </main>
    </div>
  );
}
