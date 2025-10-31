import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import api from "../../api/axios";

type Defect = {
  id: number;
  description: string;
  standard?: string | null;
  article?: string | null;
  visibility: string; // "global" | "user"
  moderation_status: string; // none|pending|rejected
};

export default function DefectsEditorPage() {
  const [items, setItems] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [onlyGlobal, setOnlyGlobal] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const resp = await api.get("/admin/defects", { params: q ? { q } : undefined });
      setItems(Array.isArray(resp.data) ? resp.data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((d) => (onlyGlobal ? d.visibility === "global" : true));
  }, [items, onlyGlobal]);

  async function save(d: Defect) {
    setBusyId(d.id);
    try {
      await api.put(`/defects/${d.id}`, {
        description: (d.description || "").trim(),
        standard: (d.standard || "").trim() || null,
        article: (d.article || "").trim() || null,
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: number) {
    if (!confirm("Opravdu smazat závadu?")) return;
    setBusyId(id);
    try {
      await api.delete(`/defects/${id}`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex">
      <Sidebar mode="dashboard" />
      <main className="flex-1 p-4 compact-main">
        <h1>Editor závad</h1>
        <div className="flex items-center gap-2 mt-3 mb-4">
          <input
            className="border rounded px-2 py-1"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Hledat popis/norma/článek"
          />
          <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={load}>
            Hledat
          </button>
          <label className="ml-4 text-sm flex items-center gap-2">
            <input type="checkbox" checked={onlyGlobal} onChange={(e) => setOnlyGlobal(e.target.checked)} />
            Pouze globální
          </label>
        </div>

        {loading ? (
          <div className="text-gray-500">Načítám…</div>
        ) : (
          <div className="bg-white rounded shadow divide-y">
            {filtered.map((d, idx) => (
              <EditorRow key={d.id} defect={d} onSave={save} onDelete={remove} busy={busyId === d.id} />
            ))}
            {filtered.length === 0 && <div className="p-4 text-gray-500">Žádné položky</div>}
          </div>
        )}
      </main>
    </div>
  );
}

function EditorRow({ defect, onSave, onDelete, busy }: {
  defect: Defect;
  onSave: (d: Defect) => void | Promise<void>;
  onDelete: (id: number) => void | Promise<void>;
  busy: boolean;
}) {
  const [d, setD] = useState<Defect>(defect);
  useEffect(() => setD(defect), [defect]);

  return (
    <div className="p-3 grid grid-cols-12 gap-2 items-center">
      <div className="col-span-5">
        <input
          className="w-full border rounded px-2 py-1"
          value={d.description}
          onChange={(e) => setD({ ...d, description: e.target.value })}
        />
      </div>
      <div className="col-span-2">
        <input
          className="w-full border rounded px-2 py-1"
          value={d.standard || ""}
          onChange={(e) => setD({ ...d, standard: e.target.value })}
          placeholder="Norma"
        />
      </div>
      <div className="col-span-2">
        <input
          className="w-full border rounded px-2 py-1"
          value={d.article || ""}
          onChange={(e) => setD({ ...d, article: e.target.value })}
          placeholder="Článek"
        />
      </div>
      <div className="col-span-1 text-xs text-gray-600">{d.visibility}</div>
      <div className="col-span-2 flex gap-2 justify-end">
        <button
          className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-60"
          onClick={() => onSave(d)}
          disabled={busy}
        >
          Uložit
        </button>
        <button
          className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-60"
          onClick={() => onDelete(d.id)}
          disabled={busy}
        >
          Smazat
        </button>
      </div>
    </div>
  );
}

