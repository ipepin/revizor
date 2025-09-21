// src/sections/catalog/CatalogComponentsTab.tsx
import React, { useEffect, useState } from "react";
import api from "../../api/axios";

type Row = { id: number; name: string };

export default function CatalogComponentsTab() {
  const [types, setTypes] = useState<Row[]>([]);
  const [mftrs, setMftrs] = useState<Row[]>([]);
  const [models, setModels] = useState<Row[]>([]);
  const [selType, setSelType] = useState<number | undefined>();
  const [selMftr, setSelMftr] = useState<number | undefined>();
  const [qModel, setQModel] = useState("");

  async function loadTypes() {
    const r = await api.get("/catalog/types");
    setTypes(r.data);
  }
  async function loadMftrs(typeId: number) {
    const r = await api.get("/catalog/manufacturers", { params: { type_id: typeId } });
    setMftrs(r.data);
  }
  async function loadModels(mId: number) {
    const r = await api.get("/catalog/models", { params: { manufacturer_id: mId, q: qModel || undefined } });
    setModels(r.data);
  }

  useEffect(() => {
    loadTypes().catch(() => setTypes([]));
  }, []);

  useEffect(() => {
    if (selType) {
      loadMftrs(selType).catch(() => setMftrs([]));
      setSelMftr(undefined);
      setModels([]);
    }
  }, [selType]);

  useEffect(() => {
    if (selMftr) {
      loadModels(selMftr).catch(() => setModels([]));
    }
  }, [selMftr, qModel]);

  async function addType() {
    const name = prompt("Název typu")?.trim();
    if (!name) return;
    const r = await api.post("/catalog/types", { name });
    setTypes([r.data, ...types]);
  }
  async function renameType(t: Row) {
    const name = prompt("Přejmenovat typ", t.name)?.trim();
    if (!name) return;
    const r = await api.put(`/catalog/types/${t.id}`, { name });
    setTypes(types.map((x) => (x.id === t.id ? r.data : x)));
  }
  async function delType(t: Row) {
    if (!confirm("Smazat typ?")) return;
    await api.delete(`/catalog/types/${t.id}`);
    setTypes(types.filter((x) => x.id !== t.id));
    setSelType(undefined);
    setMftrs([]);
    setModels([]);
  }

  async function addMftr() {
    if (!selType) return alert("Vyber typ");
    const name = prompt("Název výrobce")?.trim();
    if (!name) return;
    const r = await api.post("/catalog/manufacturers", { name, type_id: selType });
    setMftrs([r.data, ...mftrs]);
  }
  async function renameMftr(m: Row) {
    const name = prompt("Přejmenovat výrobce", m.name)?.trim();
    if (!name) return;
    const r = await api.put(`/catalog/manufacturers/${m.id}`, { name });
    setMftrs(mftrs.map((x) => (x.id === m.id ? r.data : x)));
  }
  async function delMftr(m: Row) {
    if (!confirm("Smazat výrobce?")) return;
    await api.delete(`/catalog/manufacturers/${m.id}`);
    setMftrs(mftrs.filter((x) => x.id !== m.id));
    setModels([]);
  }

  async function addModel() {
    if (!selMftr) return alert("Vyber výrobce");
    const name = prompt("Název modelu")?.trim();
    if (!name) return;
    const r = await api.post("/catalog/models/", { name, manufacturer_id: selMftr });
    setModels([r.data, ...models]);
  }
  async function renameModel(m: Row) {
    const name = prompt("Přejmenovat model", m.name)?.trim();
    if (!name) return;
    const r = await api.put(`/catalog/models/${m.id}`, { name });
    setModels(models.map((x) => (x.id === m.id ? r.data : x)));
  }
  async function delModel(m: Row) {
    if (!confirm("Smazat model?")) return;
    await api.delete(`/catalog/models/${m.id}`);
    setModels(models.filter((x) => x.id !== m.id));
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Typy */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Typy</h3>
          <button className="text-sm bg-blue-600 text-white px-2 py-1 rounded" onClick={addType}>
            ➕
          </button>
        </div>
        <div className="border rounded divide-y bg-white">
          {types.map((t) => (
            <div
              key={t.id}
              className={`p-2 cursor-pointer flex justify-between items-center ${
                selType === t.id ? "bg-blue-50" : ""
              }`}
              onClick={() => setSelType(t.id)}
            >
              <span>{t.name}</span>
              <span className="text-sm whitespace-nowrap">
                <button
                  className="mx-1 text-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    renameType(t);
                  }}
                >
                  ✎
                </button>
                <button
                  className="mx-1 text-red-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    delType(t);
                  }}
                >
                  🗑️
                </button>
              </span>
            </div>
          ))}
          {types.length === 0 && <div className="p-3 text-gray-500 text-sm">Žádné typy</div>}
        </div>
      </div>

      {/* Výrobci */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Výrobci</h3>
          <button className="text-sm bg-blue-600 text-white px-2 py-1 rounded" onClick={addMftr}>
            ➕
          </button>
        </div>
        <div className="border rounded divide-y bg-white">
          {mftrs.map((m) => (
            <div
              key={m.id}
              className={`p-2 cursor-pointer flex justify-between items-center ${
                selMftr === m.id ? "bg-blue-50" : ""
              }`}
              onClick={() => setSelMftr(m.id)}
            >
              <span>{m.name}</span>
              <span className="text-sm whitespace-nowrap">
                <button
                  className="mx-1 text-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    renameMftr(m);
                  }}
                >
                  ✎
                </button>
                <button
                  className="mx-1 text-red-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    delMftr(m);
                  }}
                >
                  🗑️
                </button>
              </span>
            </div>
          ))}
          {(!selType || mftrs.length === 0) && <div className="p-3 text-gray-500 text-sm">Vyber typ</div>}
        </div>
      </div>

      {/* Modely */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Modely</h3>
        </div>
        <div className="flex gap-2 mb-2">
          <input
            className="border rounded p-1 text-sm flex-1"
            placeholder="Hledat…"
            value={qModel}
            onChange={(e) => setQModel(e.target.value)}
          />
          <button className="text-sm bg-blue-600 text-white px-2 py-1 rounded" onClick={addModel}>
            ➕
          </button>
        </div>
        <div className="border rounded divide-y bg-white">
          {models.map((m) => (
            <div key={m.id} className="p-2 flex justify-between items-center">
              <span>{m.name}</span>
              <span className="text-sm whitespace-nowrap">
                <button className="mx-1 text-blue-700" onClick={() => renameModel(m)}>
                  ✎
                </button>
                <button className="mx-1 text-red-700" onClick={() => delModel(m)}>
                  🗑️
                </button>
              </span>
            </div>
          ))}
          {(!selMftr || models.length === 0) && (
            <div className="p-3 text-gray-500 text-sm">Vyber výrobce</div>
          )}
        </div>
      </div>
    </div>
  );
}
