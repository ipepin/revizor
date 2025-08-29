// src/sections/catalog/CatalogCablesTab.tsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

type Family = { id: number; name: string };
type CableRow = {
  id: number;
  family_id: number;
  family?: string | null;
  spec: string;
  label?: string | null;
};

type Draft = {
  family_id: number | "";
  spec: string;
};

export default function CatalogCablesTab() {
  const [rows, setRows] = useState<CableRow[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // filtr
  const [q, setQ] = useState<string>("");

  // inline edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>({ family_id: "", spec: "" });

  // přidání přes našeptávání (zobrazení formuláře)
  const [adding, setAdding] = useState<boolean>(false);
  const [addFamilyName, setAddFamilyName] = useState<string>("");
  const [addSpec, setAddSpec] = useState<string>("");

  useEffect(() => {
    void reload();
  }, []);

  async function reload() {
    setLoading(true);
    setErr(null);
    try {
      const [famRes, cabRes] = await Promise.all([
        api.get<Family[]>("/cables/families"),
        api.get<CableRow[]>("/cables", { params: { offset: 0, limit: 5000 } }),
      ]);
      setFamilies(Array.isArray(famRes.data) ? famRes.data : []);
      setRows(Array.isArray(cabRes.data) ? cabRes.data : []);
    } catch (e: any) {
      console.warn("Cables load failed:", e?.response?.data || e);
      setErr("Nepodařilo se načíst katalog kabelů.");
    } finally {
      setLoading(false);
    }
  }

  function computedLabel(row: { family?: string | null; spec?: string | null; label?: string | null }) {
    return (row.label ?? `${row.family ?? ""} ${row.spec ?? ""}`.trim()) || "";
  }

  // --- vyhledávání (klientské) ---
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => {
      const fam = (r.family || "").toLowerCase();
      const spec = (r.spec || "").toLowerCase();
      const lbl = (computedLabel(r) || "").toLowerCase();
      return fam.includes(term) || spec.includes(term) || lbl.includes(term);
    });
  }, [rows, q]);

  // --- přidání (text + našeptávání) ---
  const familyNameToId = (name: string): number | null => {
    const n = name.trim().toLowerCase();
    if (!n) return null;
    const found = families.find((f) => f.name.trim().toLowerCase() === n);
    return found ? found.id : null;
  };

  const specSuggestions = useMemo(() => {
    const n = addFamilyName.trim().toLowerCase();
    const pool = n
      ? rows.filter((r) => (r.family || "").trim().toLowerCase() === n).map((r) => r.spec)
      : rows.map((r) => r.spec);
    return Array.from(new Set(pool.filter(Boolean))).sort((a, b) => String(a).localeCompare(String(b), "cs"));
  }, [rows, addFamilyName]);

  async function handleAdd() {
    const famName = addFamilyName.trim();
    const spec = addSpec.trim();
    if (!famName || !spec) return;

    // zjisti family_id nebo vytvoř rodinu
    let famId = familyNameToId(famName);
    if (!famId) {
      try {
        const res = await api.post<Family>("/cables/families", { name: famName });
        famId = res.data.id;
        setFamilies((prev) => [...prev, res.data]);
      } catch (e: any) {
        await reload(); // fallback – kdyby vznikl race a rodina už existuje
        famId = familyNameToId(famName);
        if (!famId) {
          console.warn("Create family failed:", e?.response?.data || e);
          alert("Vytvoření rodiny se nepodařilo.");
          return;
        }
      }
    }

    // vytvoř kabel
    try {
      const res = await api.post<CableRow>("/cables", { family_id: famId, spec });
      setRows((prev) => [res.data, ...prev]);
      setAddFamilyName(famName); // nech zvolenou rodinu pro rychlé další přidání
      setAddSpec("");
      setAdding(false);
    } catch (e: any) {
      console.warn("Create cable failed:", e?.response?.data || e);
      if (e?.response?.status === 409) {
        alert("Tato kombinace rodiny a specifikace už existuje.");
      } else {
        alert("Vytvoření kabelu se nepodařilo.");
      }
    }
  }

  function onAddKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleAdd();
    } else if (e.key === "Escape") {
      setAdding(false);
      setAddFamilyName("");
      setAddSpec("");
    }
  }

  // --- edit řádek ---
  function startEdit(row: CableRow) {
    setEditingId(row.id);
    setDraft({ family_id: row.family_id ?? "", spec: row.spec ?? "" });
  }
  function cancelEdit() {
    setEditingId(null);
    setDraft({ family_id: "", spec: "" });
  }
  async function saveEdit(id: number) {
    if (!draft.spec.trim() || draft.family_id === "" || Number.isNaN(Number(draft.family_id))) return;
    try {
      const payload: Partial<CableRow> = {
        family_id: Number(draft.family_id),
        spec: draft.spec.trim(),
      };
      const res = await api.patch<CableRow>(`/cables/${id}`, payload);
      setRows((prev) => prev.map((r) => (r.id === id ? res.data : r)));
      setEditingId(null);
      setDraft({ family_id: "", spec: "" });
    } catch (e: any) {
      console.warn("Save cable failed:", e?.response?.data || e);
      alert("Uložení se nepodařilo.");
    }
  }

  // --- smazat řádek ---
  async function removeRow(id: number) {
    if (!confirm("Opravdu smazat kabel?")) return;
    try {
      await api.delete(`/cables/${id}`);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      console.warn("Delete cable failed:", e?.response?.data || e);
      alert("Smazání se nepodařilo.");
    }
  }

  const famById = useMemo(() => {
    const map = new Map<number, string>();
    families.forEach((f) => map.set(f.id, f.name));
    return map;
  }, [families]);

  return (
    <section className="bg-white p-4 rounded shadow">
      {/* hlavička: filtr vlevo, akce vpravo */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex-1">
          <input
            className="w-full p-2 border rounded"
            placeholder="Hledat… (rodina, spec, label)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button className="px-3 py-2 border rounded text-sm" onClick={() => void reload()} title="Obnovit">
            ↻
          </button>
          {!adding ? (
            <button
              className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
              onClick={() => setAdding(true)}
              title="Přidat kabel"
            >
              ➕ Přidat kabel
            </button>
          ) : (
            <button
              className="px-3 py-2 bg-gray-300 rounded text-sm"
              onClick={() => {
                setAdding(false);
                setAddFamilyName("");
                setAddSpec("");
              }}
              title="Zrušit přidání"
            >
              ✖️
            </button>
          )}
        </div>
      </div>

      {/* přidání – kolonky s našeptáváním (zobrazit jen při adding) */}
      {adding && (
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Rodina</label>
            <input
              list="familiesOptions"
              className="w-full p-2 border rounded"
              placeholder="např. CYKY"
              value={addFamilyName}
              onChange={(e) => setAddFamilyName(e.target.value)}
              onKeyDown={onAddKeyDown}
            />
            <datalist id="familiesOptions">
              {families.map((f) => (
                <option key={f.id} value={f.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Spec (dimenze)</label>
            <input
              list="specOptions"
              className="w-full p-2 border rounded"
              placeholder="např. 3×2,5"
              value={addSpec}
              onChange={(e) => setAddSpec(e.target.value)}
              onKeyDown={onAddKeyDown}
            />
            <datalist id="specOptions">
              {specSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div className="flex items-end">
            <button
              className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded"
              onClick={() => void handleAdd()}
              disabled={!addFamilyName.trim() || !addSpec.trim()}
              title="Uložit nový kabel"
            >
              💾 Uložit
            </button>
          </div>
        </div>
      )}

      {err && <div className="mb-3 text-red-700 bg-red-50 border border-red-200 p-2 rounded">{err}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left w-56">Rodina</th>
              <th className="p-2 text-left w-40">Spec (dimenze)</th>
              <th className="p-2 text-left">Label</th>
              <th className="p-2 text-center w-28">Akce</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const isEd = editingId === r.id;
              return (
                <tr key={r.id} className="border-t">
                  <td className="p-2">
                    {isEd ? (
                      <select
                        className="w-full p-2 border rounded"
                        value={draft.family_id}
                        onChange={(e) =>
                          setDraft((s) => ({ ...s, family_id: e.target.value ? Number(e.target.value) : "" }))
                        }
                      >
                        <option value="">— vyber rodinu —</option>
                        {families.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      r.family || <span className="text-gray-400">(bez rodiny)</span>
                    )}
                  </td>
                  <td className="p-2">
                    {isEd ? (
                      <input
                        className="w-full p-2 border rounded"
                        value={draft.spec}
                        onChange={(e) => setDraft((s) => ({ ...s, spec: e.target.value }))}
                      />
                    ) : (
                      r.spec
                    )}
                  </td>
                  <td className="p-2">
                    {isEd ? (
                      <div className="text-gray-600">
                        {computedLabel({
                          family:
                            draft.family_id !== "" ? famById.get(Number(draft.family_id)) : r.family ?? "",
                          spec: draft.spec,
                          label: null,
                        })}
                      </div>
                    ) : (
                      computedLabel(r)
                    )}
                  </td>
                  <td className="p-2 text-center space-x-2">
                    {!isEd ? (
                      <>
                        <button className="px-2 py-1 border rounded" onClick={() => startEdit(r)} title="Upravit">
                          ✏️
                        </button>
                        <button
                          className="px-2 py-1 bg-red-600 text-white rounded"
                          onClick={() => void removeRow(r.id)}
                          title="Smazat"
                        >
                          🗑️
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="px-2 py-1 bg-blue-600 text-white rounded"
                          onClick={() => void saveEdit(r.id)}
                          disabled={draft.family_id === "" || !draft.spec.trim()}
                          title="Uložit"
                        >
                          💾
                        </button>
                        <button className="px-2 py-1 bg-gray-300 rounded" onClick={cancelEdit} title="Zrušit">
                          ✖️
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}

            {!loading && filtered.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={4}>
                  Nic nenalezeno.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={4}>
                  Načítám…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
