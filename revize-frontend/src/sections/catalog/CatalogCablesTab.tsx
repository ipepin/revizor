import React, { useEffect, useState } from "react";
import api from "../../api/axios";

type Cable = {
  id:number; label:string; family:string; spec:string;
  material?:string; voltage?:string; standard?:string; resistance?:string; diameter?:string; weight?:string; note?:string;
};

export default function CatalogCablesTab(){
  const [items, setItems] = useState<Cable[]>([]);
  const [q, setQ] = useState("");
  const [family, setFamily] = useState("");
  const [editingId, setEditingId] = useState<number|null>(null);
  const [draft, setDraft] = useState<Partial<Cable>>({});
  const [showAdd, setShowAdd] = useState(false);
  const families = ["CYKY","AYKY","CYA","Jiná"];

  async function load(){ const r = await api.get("/cables", { params:{ q:q||undefined, family:family||undefined }}); setItems(r.data); }
  useEffect(()=>{ load(); }, [q, family]);

  function startEdit(c:Cable){ setEditingId(c.id); setDraft(c); }
  function cancelEdit(){ setEditingId(null); setDraft({}); }
  async function saveEdit(){ if(!editingId) return; const r = await api.put(`/cables/${editingId}`, draft); setItems(arr=>arr.map(a=>a.id===editingId?r.data:a)); cancelEdit(); }
  async function addCable(){ const base = { family: families[0], spec: "3×1,5", material: "Cu" }; const r = await api.post("/cables", { ...base, ...draft }); setItems(arr=>[r.data, ...arr]); setShowAdd(false); setDraft({}); }
  async function remove(id:number){ if(!confirm("Smazat kabel?")) return; await api.delete(`/cables/${id}`); setItems(arr=>arr.filter(a=>a.id!==id)); }

  return (
    <>
      <div className="flex gap-2 mb-3">
        <input className="border rounded p-2 flex-1" placeholder="Hledat…" value={q} onChange={e=>setQ(e.target.value)} />
        <select className="border rounded p-2" value={family} onChange={e=>setFamily(e.target.value)}>
          <option value="">Všechny rodiny</option>
          {families.map(f=> <option key={f} value={f}>{f}</option>)}
        </select>
        <button className="bg-blue-600 text-white px-3 rounded" onClick={()=>{ setShowAdd(true); setDraft({}); }}>➕ Kabel</button>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>{["Label","Rodina","Spec","Materiál","Napětí","Norma","Akce"].map(h=> <th key={h} className="p-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody>
            {items.map(c=> (
              <tr key={c.id} className="border-t">
                <td className="p-2">{editingId===c.id? <input className="border rounded p-1 w-full" value={draft.label||""} onChange={e=>setDraft(d=>({...d, label:e.target.value}))}/> : c.label}</td>
                <td className="p-2">{editingId===c.id? (
                  <select className="border rounded p-1" value={draft.family||""} onChange={e=>setDraft(d=>({...d, family:e.target.value}))}>
                    {families.map(f=> <option key={f} value={f}>{f}</option>)}
                  </select>
                ) : c.family}</td>
                <td className="p-2">{editingId===c.id? <input className="border rounded p-1 w-full" value={draft.spec||""} onChange={e=>setDraft(d=>({...d, spec:e.target.value}))}/> : c.spec}</td>
                <td className="p-2">{editingId===c.id? <input className="border rounded p-1 w-full" value={draft.material||""} onChange={e=>setDraft(d=>({...d, material:e.target.value}))}/> : (c.material||"")}</td>
                <td className="p-2">{editingId===c.id? <input className="border rounded p-1 w-full" value={draft.voltage||""} onChange={e=>setDraft(d=>({...d, voltage:e.target.value}))}/> : (c.voltage||"")}</td>
                <td className="p-2">{editingId===c.id? <input className="border rounded p-1 w-full" value={draft.standard||""} onChange={e=>setDraft(d=>({...d, standard:e.target.value}))}/> : (c.standard||"")}</td>
                <td className="p-2">{editingId===c.id? (<>
                  <button className="text-green-700 mr-2" onClick={saveEdit}>💾</button>
                  <button className="text-gray-600" onClick={cancelEdit}>✖</button>
                </>) : (<>
                  <button className="text-blue-700 mr-2" onClick={()=>startEdit(c)}>✎</button>
                  <button className="text-red-700" onClick={()=>remove(c.id)}>🗑️</button>
                </>)}</td>
              </tr>
            ))}
            {items.length===0 && <tr><td className="p-4 text-center text-gray-500" colSpan={7}>Žádné položky</td></tr>}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-md">
            <h3 className="text-lg font-semibold mb-3">Nový kabel</h3>
            <div className="grid gap-2">
              <label className="text-sm">Rodina</label>
              <select className="border rounded p-2" value={draft.family||families[0]} onChange={e=>setDraft(d=>({...d, family:e.target.value}))}>
                {families.map(f=> <option key={f} value={f}>{f}</option>)}
              </select>
              <label className="text-sm">Spec (např. 3×2,5)</label>
              <input className="border rounded p-2" value={draft.spec||""} onChange={e=>setDraft(d=>({...d, spec:e.target.value}))}/>
              <label className="text-sm">Materiál</label>
              <input className="border rounded p-2" value={draft.material||"Cu"} onChange={e=>setDraft(d=>({...d, material:e.target.value}))}/>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-3 py-2 bg-gray-200 rounded" onClick={()=>{ setShowAdd(false); setDraft({}); }}>Zrušit</button>
              <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={async ()=>{ await addCable(); }}>Přidat</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}