import React, { useMemo, useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import api from "../api/axios";
import { useUser } from "../context/UserContext";

type Scope = "EI" | "LPS";

type InspectionTemplate = {
  id: number;
  label: string;
  body: string;
  scope: Scope;
  user_id?: number | null;
  is_default?: boolean;
};

export default function InspectionTemplatesPage() {
  const { profile } = useUser();
  const isAdmin = Boolean(profile?.isAdmin);
  const [scope, setScope] = useState<Scope>("EI");
  const [items, setItems] = useState<InspectionTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [newLabel, setNewLabel] = useState("");
  const [newBody, setNewBody] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editBody, setEditBody] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const canEdit = (t: InspectionTemplate) => Boolean(t.user_id) || isAdmin;

  const stats = useMemo(() => ({ total: items.length }), [items.length]);

  const loadTemplates = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<InspectionTemplate[]>("/inspection-templates", { params: { scope } });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      setError("Nepodařilo se načíst vzorové texty.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [scope]);

  const startEdit = (item: InspectionTemplate) => {
    setEditId(item.id);
    setEditLabel(item.label);
    setEditBody(item.body);
    setExpandedId(item.id);
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
      await api.put(`/inspection-templates/${id}`, {
        label: editLabel.trim(),
        body: editBody.trim(),
        scope,
      });
      await loadTemplates();
      cancelEdit();
    } finally {
      setBusyId(null);
    }
  };

  const addTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newBody.trim()) return;
    setBusyId(-1);
    try {
      await api.post("/inspection-templates", {
        label: newLabel.trim(),
        body: newBody.trim(),
        scope,
      });
      setNewLabel("");
      setNewBody("");
      await loadTemplates();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Opravdu smazat vzorový text?")) return;
    setBusyId(id);
    try {
      await api.delete(`/inspection-templates/${id}`);
      await loadTemplates();
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
            <h1 className="text-2xl font-semibold text-blue-800">Katalog vzorových textů</h1>
            <p className="text-sm text-gray-600">
              Správa textů pro sekci Prohlídka. Každý technik má svůj katalog, administrátor vidí vše.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`px-3 py-1.5 rounded text-sm ${scope === "EI" ? "bg-blue-600 text-white" : "bg-white border"}`}
              onClick={() => setScope("EI")}
            >
              EI
            </button>
            <button
              className={`px-3 py-1.5 rounded text-sm ${scope === "LPS" ? "bg-blue-600 text-white" : "bg-white border"}`}
              onClick={() => setScope("LPS")}
            >
              LPS
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          Zobrazeno: <span className="font-medium">{stats.total}</span>
        </div>

        {loading && <div className="text-sm text-gray-500">Načítám…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="overflow-hidden border rounded bg-white divide-y">
          {items.map((t) => {
            const isOpen = expandedId === t.id;
            const isEditing = editId === t.id;
            return (
              <div key={t.id}>
                <button
                  type="button"
                  className="w-full px-4 py-3 flex items-start justify-between gap-4 text-left hover:bg-slate-50"
                  onClick={() => setExpandedId(isOpen ? null : t.id)}
                >
                  <div>
                    <div className="font-medium text-base">{t.label}</div>
                    <div className="text-xs text-gray-500">
                      {t.user_id ? "Vlastní" : "Výchozí"}
                      {isAdmin && t.user_id ? ` · Uživatel #${t.user_id}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">{isOpen ? "Skrýt" : "Zobrazit"}</div>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4">
                    <div className="text-gray-700 whitespace-pre-wrap text-[14px]">
                      {isEditing ? (
                        <textarea
                          className="w-full rounded border px-2 py-1 text-sm leading-6"
                          rows={6}
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                          disabled={busyId === t.id}
                        />
                      ) : (
                        t.body
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {isEditing ? (
                        <>
                          <button
                            className="text-xs px-3 py-1 rounded bg-indigo-600 text-white disabled:opacity-50"
                            onClick={() => saveEdit(t.id)}
                            disabled={busyId === t.id}
                          >
                            Uložit
                          </button>
                          <button
                            className="text-xs px-3 py-1 rounded bg-gray-200"
                            onClick={cancelEdit}
                            disabled={busyId === t.id}
                          >
                            Zrušit
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="text-xs px-3 py-1 rounded bg-slate-100 hover:bg-slate-200"
                            onClick={() => startEdit(t)}
                            disabled={busyId === t.id}
                          >
                            Upravit
                          </button>
                          <button
                            className="text-xs px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                            onClick={() => remove(t.id)}
                            disabled={busyId === t.id || !canEdit(t)}
                          >
                            Smazat
                          </button>
                        </>
                      )}
                    </div>
                    {isEditing && (
                      <div className="mt-3">
                        <label className="block text-xs text-gray-600 mb-1">Název</label>
                        <input
                          type="text"
                          className="w-full rounded border px-2 py-1 text-sm"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          disabled={busyId === t.id}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {items.length === 0 && !loading && (
            <div className="px-4 py-6 text-center text-sm text-gray-500">
              Zatím zde nejsou žádné vzorové texty.
            </div>
          )}
        </div>

        <form className="border rounded bg-white p-4 space-y-3" onSubmit={addTemplate}>
          <div className="text-sm font-semibold">Přidat vzorový text</div>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="block text-xs text-gray-600 mb-1">Název</label>
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
                className="w-full rounded border px-3 py-1.5 text-sm leading-6"
                rows={6}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm"
              type="submit"
              disabled={busyId === -1}
            >
              Uložit
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
