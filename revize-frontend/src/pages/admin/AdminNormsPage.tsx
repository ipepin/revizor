import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import api from "../../api/axios";
import type { Norm, NormScope } from "../../api/norms";

type ScopeFilter = NormScope | "ALL";

const STATUS_OPTIONS = ["PLATNÁ", "NAHRAZENÁ EDICE", "ZRUŠENÁ"] as const;

export default function AdminNormsPage() {
  const [scope, setScope] = useState<ScopeFilter>("ALL");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Norm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [newScope, setNewScope] = useState<NormScope>("EI");
  const [newLabel, setNewLabel] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");
  const [newIssuedOn, setNewIssuedOn] = useState("");
  const [newCanceledOn, setNewCanceledOn] = useState("");

  const [editId, setEditId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editScope, setEditScope] = useState<NormScope>("EI");
  const [editStatus, setEditStatus] = useState<string>("");
  const [editIssuedOn, setEditIssuedOn] = useState("");
  const [editCanceledOn, setEditCanceledOn] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Norm[]>("/norms/admin/all", {
        params: {
          scope: scope === "ALL" ? undefined : scope,
          q: query.trim() || undefined,
        },
      });
      setItems(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Nepodařilo se načíst normy.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load();
  };

  const createNorm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    try {
      await api.post("/norms/admin", {
        scope: newScope,
        label: newLabel.trim(),
        status: newStatus || null,
        issued_on: newIssuedOn || null,
        canceled_on: newCanceledOn || null,
      });
      setInfo("Norma byla vytvořena.");
      setNewLabel("");
      setNewStatus("");
      setNewIssuedOn("");
      setNewCanceledOn("");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Vytvoření selhalo.");
    }
  };

  const startEdit = (n: Norm) => {
    setEditId(n.id);
    setEditLabel(n.label);
    setEditScope(n.scope);
    setEditStatus(n.status || "");
    setEditIssuedOn(n.issued_on || "");
    setEditCanceledOn(n.canceled_on || "");
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditLabel("");
    setEditScope("EI");
    setEditStatus("");
    setEditIssuedOn("");
    setEditCanceledOn("");
  };

  const saveEdit = async () => {
    if (!editId) return;
    setError(null);
    setInfo(null);
    try {
      await api.put(`/norms/admin/${editId}`, {
        scope: editScope,
        label: editLabel.trim(),
        status: editStatus || null,
        issued_on: editIssuedOn || null,
        canceled_on: editCanceledOn || null,
      });
      setInfo("Norma byla upravena.");
      cancelEdit();
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Uložení selhalo.");
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Opravdu smazat normu?")) return;
    setError(null);
    setInfo(null);
    try {
      await api.delete(`/norms/admin/${id}`);
      setInfo("Norma byla smazána.");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Smazání selhalo.");
    }
  };

  return (
    <div className="flex">
      <Sidebar mode="dashboard" />
      <main className="flex-1 p-6 space-y-4 compact-main">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-blue-800">Správa norem</h1>
            <p className="text-sm text-gray-600">Upravujte katalog norem pro EI/LPS.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="border rounded px-3 py-1 text-sm"
              value={scope}
              onChange={(e) => setScope(e.target.value as ScopeFilter)}
            >
              <option value="ALL">Vše</option>
              <option value="EI">EI</option>
              <option value="LPS">LPS</option>
            </select>
            <form onSubmit={onSearch} className="flex items-center gap-2">
              <input
                type="text"
                className="border rounded px-3 py-1 text-sm"
                placeholder="Hledat normu…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="px-3 py-1 text-sm rounded bg-slate-100 hover:bg-slate-200" type="submit">
                Hledat
              </button>
            </form>
          </div>
        </div>

        {loading && <div className="text-sm text-gray-500">Načítám…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {info && <div className="text-sm text-green-600">{info}</div>}

        <form className="border rounded bg-white p-4 space-y-3" onSubmit={createNorm}>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-600">Scope</label>
              <select
                className="border rounded px-3 py-1 text-sm"
                value={newScope}
                onChange={(e) => setNewScope(e.target.value as NormScope)}
              >
                <option value="EI">EI</option>
                <option value="LPS">LPS</option>
              </select>
            </div>
            <div className="flex-1 min-w-[220px]">
              <label className="block text-xs text-gray-600">Norma</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-1.5 text-sm"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600">Status</label>
              <select
                className="border rounded px-3 py-1 text-sm"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
              >
                <option value="">—</option>
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600">Vydána</label>
              <input
                type="date"
                className="border rounded px-3 py-1 text-sm"
                value={newIssuedOn}
                onChange={(e) => setNewIssuedOn(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600">Zrušena od</label>
              <input
                type="date"
                className="border rounded px-3 py-1 text-sm"
                value={newCanceledOn}
                onChange={(e) => setNewCanceledOn(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded text-sm disabled:opacity-50"
              disabled={!newLabel.trim()}
            >
              Přidat normu
            </button>
          </div>
        </form>

        <div className="overflow-auto border rounded bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left">Scope</th>
                <th className="px-4 py-2 text-left">Norma</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Vydána</th>
                <th className="px-4 py-2 text-left">Zrušena od</th>
                <th className="px-4 py-2 text-center">Akce</th>
              </tr>
            </thead>
            <tbody>
              {items.map((n) => (
                <tr key={n.id} className="border-t align-top">
                  <td className="px-4 py-2 font-medium">{n.scope}</td>
                  <td className="px-4 py-2">
                    {editId === n.id ? (
                      <input
                        type="text"
                        className="w-full border rounded px-2 py-1 text-sm"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                      />
                    ) : (
                      n.label
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editId === n.id ? (
                      <select
                        className="border rounded px-2 py-1 text-sm"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                      >
                        <option value="">—</option>
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      n.status || "—"
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editId === n.id ? (
                      <input
                        type="date"
                        className="border rounded px-2 py-1 text-sm"
                        value={editIssuedOn}
                        onChange={(e) => setEditIssuedOn(e.target.value)}
                      />
                    ) : (
                      n.issued_on || "—"
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {editId === n.id ? (
                      <input
                        type="date"
                        className="border rounded px-2 py-1 text-sm"
                        value={editCanceledOn}
                        onChange={(e) => setEditCanceledOn(e.target.value)}
                      />
                    ) : (
                      n.canceled_on || "—"
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {editId === n.id ? (
                      <div className="flex justify-center gap-2">
                        <button
                          className="text-xs px-3 py-1 rounded bg-indigo-600 text-white"
                          onClick={saveEdit}
                        >
                          Uložit
                        </button>
                        <button className="text-xs px-3 py-1 rounded bg-gray-200" onClick={cancelEdit}>
                          Zrušit
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-2">
                        <button
                          className="text-xs px-3 py-1 rounded bg-slate-100 hover:bg-slate-200"
                          onClick={() => startEdit(n)}
                        >
                          Upravit
                        </button>
                        <button
                          className="text-xs px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                          onClick={() => remove(n.id)}
                        >
                          Smazat
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                    Žádné normy k zobrazení.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
