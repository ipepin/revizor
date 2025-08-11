// src/sections/catalog/CatalogCablesTab.tsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

type Cable = { id: number; family: string; dimension: string };

function toMsg(err: any) {
  const d = err?.response?.data;
  if (!d) return err?.message || "Neznámá chyba";
  if (typeof d === "string") return d;
  if (d?.detail) return typeof d.detail === "string" ? d.detail : JSON.stringify(d.detail);
  try { return JSON.stringify(d); } catch { return "Chyba"; }
}

export default function CatalogCablesTab() {
  const [rows, setRows] = useState<Cable[]>([]);
  const [families, setFamilies] = useState<string[]>([]);
  const [dims, setDims] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [filterFamily, setFilterFamily] = useState<string>("");

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [edit, setEdit] = useState<Partial<Cable>>({});

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<Partial<Cable>>({ family: "", dimension: "" });

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    loadFamilies();
  }, []);
  useEffect(() => {
    if (creating) {
      // načti návrhy dimenzí pro vybranou rodinu v create
      fetchDims(createForm.family || "");
    }
  }, [creating, createForm.family]);
  useEffect(() => {
    if (expandedId && edit.family) {
      fetchDims(edit.family);
    }
  }, [expandedId, edit.family]);

  async function load() {
    const res = await api.get<Cable[]>("/cables", { params: { offset: 0, limit: 5000 } });
    setRows(res.data);
  }
  async function loadFamilies() {
    const res = await api.get<string[]>("/cables/families");
    setFamilies(res.data);
  }
  async function fetchDims(fam: string) {
    const res = await api.get<string[]>("/cables/dimensions", { params: fam ? { family: fam } : {} });
    setDims(res.data);
  }

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return rows.filter(r => {
      if (filterFamily && r.family.toLowerCase() !== filterFamily.toLowerCase()) return false;
      if (!needle) return true;
      return r.family.toLowerCase().includes(needle) || r.dimension.toLowerCase().includes(needle);
    }).sort((a,b) => a.family.localeCompare(b.family) || a.dimension.localeCompare(b.dimension));
  }, [rows, q, filterFamily]);

  function openCreate() { setCreating(true); setCreateForm({ family: "", dimension: "" }); }
  function cancelCreate() { setCreating(false); setCreateForm({ family: "", dimension: "" }); }

  async function saveCreate() {
    try {
      const payload = { family: (createForm.family || "").trim(), dimension: (createForm.dimension || "").trim() };
      if (!payload.family || !payload.dimension) { alert("Vyplň rodinu i dimenzi."); return; }
      const res = await api.post<Cable>("/cables", payload);
      setRows(r => [res.data, ...r]); cancelCreate();
      if (!families.includes(res.data.family)) loadFamilies();
    } catch (e:any) { alert(toMsg(e)); }
  }

  function startEdit(r: Cable) {
    setExpandedId(r.id);
    setEdit({ id: r.id, family: r.family, dimension: r.dimension });
  }
  async function saveEdit() {
    try {
      if (!edit.id) return;
      const res = await api.patch<Cable>(`/cables/${edit.id}`, {
        family: edit.family, dimension: edit.dimension
      });
      setRows(list => list.map(x => x.id === res.data.id ? res.data : x));
      setExpandedId(null); setEdit({});
      if (!families.includes(res.data.family)) loadFamilies();
    } catch (e:any) { alert(toMsg(e)); }
  }
  async function del(id: number) {
    if (!confirm("Opravdu smazat kabel?")) return;
    await api.delete(`/cables/${id}`);
    setRows(list => list.filter(x => x.id !== id));
  }

  return (
    <div className="bg-white rounded shadow p-4">
      <div className="mb-3 flex flex-col md:flex-row md:items-end gap-2">
        <div className="flex-1 flex gap-2">
          <input className="p-2 border rounded w-64" placeholder="Hledat (rodina, dimenze)…" value={q} onChange={e=>setQ(e.target.value)} />
          <select className="p-2 border rounded" value={filterFamily} onChange={e=>setFilterFamily(e.target.value)}>
            <option value="">Všechny rodiny</option>
            {families.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={openCreate}>+ Přidat kabel</button>
      </div>

      {/* create row */}
      {creating && (
        <div className="mb-3 border rounded overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="bg-blue-50">
                <td className="p-0" colSpan={3}>
                  <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Rodina</label>
                      <input
                        list="families"
                        className="w-full p-2 border rounded"
                        value={createForm.family || ""}
                        onChange={e=>setCreateForm(f=>({...f, family: e.target.value}))}
                        onBlur={()=>fetchDims(createForm.family || "")}
                      />
                      <datalist id="families">
                        {families.map(f => <option key={f} value={f} />)}
                      </datalist>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Dimenze</label>
                      <input
                        list="dims"
                        className="w-full p-2 border rounded"
                        value={createForm.dimension || ""}
                        onChange={e=>setCreateForm(f=>({...f, dimension: e.target.value}))}
                      />
                      <datalist id="dims">
                        {dims.map(d => <option key={d} value={d} />)}
                      </datalist>
                    </div>
                    <div className="flex items-end justify-end gap-2">
                      <button className="px-4 py-2 bg-gray-200 rounded" onClick={cancelCreate}>Zavřít</button>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={saveCreate}>Uložit</button>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left w-14">#</th>
              <th className="p-2 text-left">Rodina</th>
              <th className="p-2 text-left">Dimenze</th>
              <th className="p-2 text-left w-28">Akce</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <React.Fragment key={r.id}>
                <tr className={`border-t ${expandedId===r.id ? "bg-blue-50" : "hover:bg-blue-50"}`}>
                  <td className="p-2">{r.id}</td>
                  <td className="p-2">{r.family}</td>
                  <td className="p-2">{r.dimension}</td>
                  <td className="p-2 space-x-2">
                    <button className="text-blue-600 hover:underline" onClick={()=>startEdit(r)}>Upravit</button>
                    <button className="text-red-600 hover:underline" onClick={()=>del(r.id)}>Smazat</button>
                  </td>
                </tr>
                {expandedId===r.id && (
                  <tr className="bg-blue-50 border-t">
                    <td className="p-0" colSpan={4}>
                      <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-gray-600">Rodina</label>
                          <input
                            list="families"
                            className="w-full p-2 border rounded"
                            value={edit.family || ""}
                            onChange={e=>setEdit(s=>({...s, family: e.target.value}))}
                            onBlur={()=>fetchDims(edit.family || "")}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Dimenze</label>
                          <input
                            list="dims"
                            className="w-full p-2 border rounded"
                            value={edit.dimension || ""}
                            onChange={e=>setEdit(s=>({...s, dimension: e.target.value}))}
                          />
                        </div>
                        <div className="flex items-end justify-end gap-2">
                          <button className="px-4 py-2 bg-gray-200 rounded" onClick={()=>{setExpandedId(null); setEdit({});}}>Zavřít</button>
                          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={saveEdit}>Uložit</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {filtered.length===0 && (
              <tr><td className="p-4 text-center text-gray-500" colSpan={4}>Žádné záznamy.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
