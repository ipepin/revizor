import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import api from "../api/axios";
import { Snippet } from "../api/snippets";

type Scope = "EI" | "LPS";

export default function AdminSnippetsPage() {
  const [scope, setScope] = useState<Scope | "ALL">("ALL");
  const [items, setItems] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Snippet[]>("/snippets/admin/all", {
        params: scope === "ALL" ? {} : { scope },
      });
      setItems(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Nepodařilo se načíst čipy.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const promote = async (id: number) => {
    setInfo(null);
    setError(null);
    try {
      await api.post(`/snippets/${id}/promote`);
      setInfo("Čip byl povýšen na výchozí.");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Povýšení selhalo.");
    }
  };

  return (
    <div className="flex">
      <Sidebar mode="dashboard" />
      <main className="flex-1 p-6 space-y-4 compact-main">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-blue-800">Správa čipů</h1>
            <p className="text-sm text-gray-600">Zobraz a povyšuj uživatelské čipy na výchozí.</p>
          </div>
          <select
            className="border rounded px-3 py-1 text-sm"
            value={scope}
            onChange={(e) => setScope(e.target.value as any)}
          >
            <option value="ALL">Vše</option>
            <option value="EI">EI</option>
            <option value="LPS">LPS</option>
          </select>
        </div>

        {loading && <div className="text-sm text-gray-500">Načítám…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {info && <div className="text-sm text-green-600">{info}</div>}

        <div className="overflow-auto border rounded bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left">Scope</th>
                <th className="px-4 py-2 text-left">Label</th>
                <th className="px-4 py-2 text-left">Text</th>
                <th className="px-4 py-2 text-center">Typ</th>
                <th className="px-4 py-2 text-center">Akce</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2 align-top font-medium">{s.scope}</td>
                  <td className="px-4 py-2 align-top font-medium">{s.label}</td>
                  <td className="px-4 py-2 align-top whitespace-pre-wrap text-gray-700">{s.body}</td>
                  <td className="px-4 py-2 text-center align-top">
                    {s.is_default ? (
                      <span className="inline-flex px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs">Výchozí</span>
                    ) : (
                      <span className="inline-flex px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs">Uživatelský</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center align-top">
                    {!s.is_default && (
                      <button
                        className="text-xs px-3 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900"
                        onClick={() => promote(s.id)}
                      >
                        Povýšit na výchozí
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                    Žádné čipy k zobrazení.
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
