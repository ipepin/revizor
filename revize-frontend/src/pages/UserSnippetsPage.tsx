import React, { useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useSnippets } from "../hooks/useSnippets";
import type { Snippet, SnippetScope } from "../api/snippets";

type Scope = SnippetScope;

export default function UserSnippetsPage() {
  const ei = useSnippets("EI");
  const lps = useSnippets("LPS");
  const [scope, setScope] = useState<Scope>("EI");

  const current = scope === "EI" ? ei : lps;
  const [newLabel, setNewLabel] = useState("");
  const [newBody, setNewBody] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editBody, setEditBody] = useState("");

  const stats = useMemo(() => {
    const total = current.items.length;
    const visible = current.items.filter((s) => s.visible !== false).length;
    return { total, visible };
  }, [current.items]);

  const startEdit = (item: Snippet) => {
    setEditId(item.id);
    setEditLabel(item.label);
    setEditBody(item.body);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditLabel("");
    setEditBody("");
  };

  const saveEdit = async (id: number) => {
    if (!editLabel.trim() || !editBody.trim()) return;
    setBusyId(id);
    try {
      await current.updateOne(id, { label: editLabel.trim(), body: editBody });
      cancelEdit();
    } finally {
      setBusyId(null);
    }
  };

  const addSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newBody.trim()) return;
    setBusyId(-1);
    try {
      await current.addSnippet({ label: newLabel.trim(), body: newBody });
      setNewLabel("");
      setNewBody("");
    } finally {
      setBusyId(null);
    }
  };

  const toggleVisible = async (id: number, visible: boolean) => {
    setBusyId(id);
    try {
      await current.toggleVisible(id, visible);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Opravdu smazat rychlou větu?")) return;
    setBusyId(id);
    try {
      await current.remove(id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-100 to-blue-50">
      <Sidebar mode="catalog" />
      <main className="flex-1 p-6 space-y-4 catalog-main">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-blue-800">Katalog rychlých vět</h1>
            <p className="text-sm text-gray-600">
              Upravte si vlastní knihovnu rychlých vět, vyberte které se mají zobrazovat.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`px-3 py-1.5 rounded text-sm ${
                scope === "EI" ? "bg-blue-600 text-white" : "bg-white border"
              }`}
              onClick={() => setScope("EI")}
            >
              EI
            </button>
            <button
              className={`px-3 py-1.5 rounded text-sm ${
                scope === "LPS" ? "bg-blue-600 text-white" : "bg-white border"
              }`}
              onClick={() => setScope("LPS")}
            >
              LPS
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Zobrazeno: <span className="font-medium">{stats.visible}</span> /
          <span className="font-medium"> {stats.total}</span>
        </div>

        {current.loading && <div className="text-sm text-gray-500">Načítám…</div>}
        {current.error && <div className="text-sm text-red-600">{current.error}</div>}

        <div className="overflow-auto border rounded bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left">Label</th>
                <th className="px-4 py-2 text-left">Text</th>
                <th className="px-4 py-2 text-center w-28">Zobrazit</th>
                <th className="px-4 py-2 text-center w-40">Akce</th>
              </tr>
            </thead>
            <tbody>
              {current.items.map((s) => (
                <tr key={s.id} className="border-t align-top">
                  <td className="px-4 py-2">
                    {editId === s.id ? (
                      <input
                        type="text"
                        className="w-full rounded border px-2 py-1 text-sm"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        disabled={busyId === s.id}
                      />
                    ) : (
                      <>
                        <div className="font-medium">{s.label}</div>
                        <div className="text-xs text-gray-500">{s.is_default ? "Výchozí" : "Vlastní"}</div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-700 whitespace-pre-wrap">
                    {editId === s.id ? (
                      <textarea
                        className="w-full rounded border px-2 py-1 text-sm"
                        rows={3}
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        disabled={busyId === s.id}
                      />
                    ) : (
                      s.body
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={s.visible !== false}
                        disabled={busyId === s.id}
                        onChange={(e) => toggleVisible(s.id, e.target.checked)}
                      />
                      <span className="text-xs text-gray-600">Zobrazit</span>
                    </label>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {s.is_default ? (
                      <span className="text-xs text-gray-500">Výchozí rychlá věta</span>
                    ) : editId === s.id ? (
                      <div className="flex justify-center gap-2">
                        <button
                          className="text-xs px-3 py-1 rounded bg-indigo-600 text-white disabled:opacity-50"
                          onClick={() => saveEdit(s.id)}
                          disabled={busyId === s.id}
                        >
                          Uložit
                        </button>
                        <button
                          className="text-xs px-3 py-1 rounded bg-gray-200"
                          onClick={cancelEdit}
                          disabled={busyId === s.id}
                        >
                          Zrušit
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-2">
                        <button
                          className="text-xs px-3 py-1 rounded bg-slate-100 hover:bg-slate-200"
                          onClick={() => startEdit(s)}
                          disabled={busyId === s.id}
                        >
                          Upravit
                        </button>
                        <button
                          className="text-xs px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                          onClick={() => remove(s.id)}
                          disabled={busyId === s.id}
                        >
                          Smazat
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {current.items.length === 0 && !current.loading && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                    Zatím zde nejsou žádné rychlé věty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form className="border rounded bg-white p-4 space-y-3" onSubmit={addSnippet}>
          <div className="text-sm font-semibold">Přidat vlastní rychlou větu</div>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="block text-xs text-gray-600 mb-1">Label</label>
              <input
                type="text"
                className="w-full rounded border px-3 py-1.5 text-sm"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Text</label>
              <textarea
                className="w-full rounded border px-3 py-2 text-sm"
                rows={3}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded text-sm disabled:opacity-50"
              disabled={busyId === -1}
            >
              Přidat
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
