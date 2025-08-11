// src/sections/catalog/CatalogPristrojeTab.tsx
// Kompletní tab s in‑row editorem (rozbalí se ihned pod kliknutým řádkem),
// vyhledáváním, řazením, klientským stránkováním a možností přidání nového záznamu.
// Počítá s axios instancí v `src/api/axios.ts` (baseURL + auth interceptor).

import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

// --- Types ---
export type Device = {
  id: number;
  name: string;
  manufacturer: string;
  model: string;
  trida?: string | null;
  ip?: string | null;
  note?: string | null;
};

// --- Utils ---
function normalize(s: unknown) {
  return String(s ?? "").toLowerCase();
}

function toMsg(err: any): string {
  const d = err?.response?.data;
  if (!d) return err?.message || "Neznámá chyba";
  if (typeof d === "string") return d;
  if (d?.detail) {
    if (typeof d.detail === "string") return d.detail;
    try {
      return JSON.stringify(d.detail);
    } catch {
      return "Chyba";
    }
  }
  try {
    return JSON.stringify(d);
  } catch {
    return "Chyba";
  }
}

// --- Inline editor komponenta ---
function EditorRow({
  value,
  onChange,
  onSave,
  onClose,
}: {
  value: Partial<Device> & { id?: number };
  onChange: (field: keyof Device, val: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <tr className="bg-blue-50 border-t">
      <td className="p-0" colSpan={7}>
        <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-600">Přístroj</label>
            <input
              className="w-full p-2 border rounded"
              value={value.name ?? ""}
              onChange={(e) => onChange("name", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Výrobce</label>
            <input
              className="w-full p-2 border rounded"
              value={value.manufacturer ?? ""}
              onChange={(e) => onChange("manufacturer", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Typ</label>
            <input
              className="w-full p-2 border rounded"
              value={value.model ?? ""}
              onChange={(e) => onChange("model", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Třída</label>
            <input
              className="w-full p-2 border rounded"
              value={value.trida ?? ""}
              onChange={(e) => onChange("trida", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">IP</label>
            <input
              className="w-full p-2 border rounded"
              value={value.ip ?? ""}
              onChange={(e) => onChange("ip", e.target.value)}
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs text-gray-600">Poznámka</label>
            <textarea
              rows={3}
              className="w-full p-2 border rounded"
              value={value.note ?? ""}
              onChange={(e) => onChange("note", e.target.value)}
            />
          </div>
          <div className="md:col-span-3 flex justify-end gap-2">
            <button className="px-4 py-2 bg-gray-200 rounded" onClick={onClose}>
              Zavřít
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={onSave}>
              Uložit
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
}

// --- Toolbar ---
function Toolbar({
  q,
  setQ,
  onAdd,
}: {
  q: string;
  setQ: (v: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
      <div className="flex items-center gap-2">
        <input
          placeholder="Hledat… (název, výrobce, typ, IP, třída)"
          className="w-80 max-w-full p-2 border rounded"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button
            className="px-3 py-2 bg-gray-200 rounded"
            onClick={() => setQ("")}
            title="Vyčistit"
          >
            ✕
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={onAdd}>
          + Nový přístroj
        </button>
      </div>
    </div>
  );
}

// --- Hlavní komponenta ---
export default function CatalogPristrojeTab() {
  const [rows, setRows] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof Device>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [edit, setEdit] = useState<Partial<Device>>({});

  // nový záznam (inline editor nad tabulkou)
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState<Partial<Device>>({
    name: "",
    manufacturer: "",
    model: "",
    trida: "",
    ip: "",
    note: "",
  });

  // --- Načtení dat ---
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // dbej na to, aby parametry byly číselné – FastAPI jinak vrací 422
        const res = await api.get<Device[]>("/devices", {
          params: { offset: 0, limit: 1000 },
        });
        if (mounted) setRows(Array.isArray(res.data) ? res.data : []);
      } catch (e: any) {
        if (mounted) setErr(toMsg(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // --- Filtrování + řazení ---
  const filteredSorted = useMemo(() => {
    const q = normalize(search);
    let out = rows.filter((d) => {
      if (!q) return true;
      return (
        normalize(d.name).includes(q) ||
        normalize(d.manufacturer).includes(q) ||
        normalize(d.model).includes(q) ||
        normalize(d.trida).includes(q) ||
        normalize(d.ip).includes(q)
      );
    });

    out.sort((a: any, b: any) => {
      const av = normalize((a as any)[sortKey]);
      const bv = normalize((b as any)[sortKey]);
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return out;
  }, [rows, search, sortKey, sortDir]);

  function toggleSort(key: keyof Device) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // --- Inline edit ---
  function onRowClick(d: Device) {
    if (expandedId === d.id) {
      setExpandedId(null);
      setEdit({});
    } else {
      setExpandedId(d.id);
      setEdit({
        id: d.id,
        name: d.name,
        manufacturer: d.manufacturer,
        model: d.model,
        trida: d.trida ?? "",
        ip: d.ip ?? "",
        note: d.note ?? "",
      });
    }
  }

  function onEditChange(field: keyof Device, val: string) {
    setEdit((e) => ({ ...e, [field]: val }));
  }

  async function onSaveEdit() {
    if (!edit.id) return;
    const payload = {
      name: edit.name ?? "",
      manufacturer: edit.manufacturer ?? "",
      model: edit.model ?? "",
      trida: edit.trida ?? null,
      ip: edit.ip ?? null,
      note: edit.note ?? null,
    };
    try {
      await api.patch(`/devices/${edit.id}`, payload);
      setRows((list) => list.map((d) => (d.id === edit.id ? { ...d, ...payload } : d)));
    } catch (e: any) {
      alert(toMsg(e));
    }
  }

  async function onDeleteRow(id: number) {
    if (!confirm("Opravdu smazat tento přístroj?")) return;
    try {
      await api.delete(`/devices/${id}`);
      setRows((list) => list.filter((d) => d.id !== id));
      if (expandedId === id) {
        setExpandedId(null);
        setEdit({});
      }
    } catch (e: any) {
      alert(toMsg(e));
    }
  }

  // --- Create new ---
  function openCreate() {
    setIsCreating(true);
  }
  function cancelCreate() {
    setIsCreating(false);
    setCreateForm({ name: "", manufacturer: "", model: "", trida: "", ip: "", note: "" });
  }
  function onCreateChange(field: keyof Device, val: string) {
    setCreateForm((f) => ({ ...f, [field]: val }));
  }
  async function onCreateSave() {
    const payload = {
      name: createForm.name?.trim() || "",
      manufacturer: createForm.manufacturer?.trim() || "",
      model: createForm.model?.trim() || "",
      trida: createForm.trida ? String(createForm.trida) : null,
      ip: createForm.ip ? String(createForm.ip) : null,
      note: createForm.note ? String(createForm.note) : null,
    };
    if (!payload.name || !payload.manufacturer || !payload.model) {
      alert("Vyplň název, výrobce a typ.");
      return;
    }
    try {
      const res = await api.post<Device>("/devices", payload);
      setRows((list) => [{ ...res.data }, ...list]);
      cancelCreate();
    } catch (e: any) {
      alert(toMsg(e));
    }
  }

  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Přístroje</h2>
        {loading && <span className="text-sm text-gray-500">Načítám…</span>}
      </div>

      {err && (
        <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded">
          {err}
        </div>
      )}

      <Toolbar q={search} setQ={setSearch} onAdd={openCreate} />

      {/* Create row (inline nad tabulkou) */}
      {isCreating && (
        <div className="mb-3 border rounded overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <EditorRow
                value={createForm}
                onChange={onCreateChange}
                onSave={onCreateSave}
                onClose={cancelCreate}
              />
            </tbody>
          </table>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left w-14">#</th>
              <SortableTh label="Přístroj" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
              <SortableTh label="Výrobce" active={sortKey === "manufacturer"} dir={sortDir} onClick={() => toggleSort("manufacturer")} />
              <SortableTh label="Typ" active={sortKey === "model"} dir={sortDir} onClick={() => toggleSort("model")} />
              <SortableTh label="Třída" active={sortKey === "trida"} dir={sortDir} onClick={() => toggleSort("trida")} />
              <SortableTh label="IP" active={sortKey === "ip"} dir={sortDir} onClick={() => toggleSort("ip")} />
              <th className="p-2 text-left w-28">Akce</th>
            </tr>
          </thead>
          <tbody>
            {filteredSorted.map((d) => (
              <React.Fragment key={d.id}>
                <tr
                  className={`border-t cursor-pointer hover:bg-blue-50 ${expandedId === d.id ? "bg-blue-50" : ""}`}
                  onClick={() => onRowClick(d)}
                >
                  <td className="p-2">{d.id}</td>
                  <td className="p-2">{d.name}</td>
                  <td className="p-2">{d.manufacturer}</td>
                  <td className="p-2">{d.model}</td>
                  <td className="p-2">{d.trida || ""}</td>
                  <td className="p-2">{d.ip || ""}</td>
                  <td className="p-2">
                    <button
                      className="text-red-600 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteRow(d.id);
                      }}
                    >
                      Smazat
                    </button>
                  </td>
                </tr>
                {expandedId === d.id && (
                  <EditorRow value={edit} onChange={onEditChange} onSave={onSaveEdit} onClose={() => { setExpandedId(null); setEdit({}); }} />
                )}
              </React.Fragment>
            ))}

            {filteredSorted.length === 0 && !loading && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={7}>
                  Žádné záznamy.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortableTh({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th className="p-2 text-left select-none">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${active ? "text-blue-700" : "text-gray-800"}`}
        title="Seřadit"
      >
        <span>{label}</span>
        {active && <span>{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}
