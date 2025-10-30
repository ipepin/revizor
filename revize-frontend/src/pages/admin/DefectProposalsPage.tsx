import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import api from "../../api/axios";

type Defect = {
  id: number;
  description: string;
  standard?: string | null;
  article?: string | null;
  visibility: string;
  moderation_status: string;
  owner_id?: number | null;
  reject_reason?: string | null;
};

export default function DefectProposalsPage() {
  const [items, setItems] = useState<Defect[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [onlyPending, setOnlyPending] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params: any = {};
      if (q) params.q = q;
      // ask server for all defects; optionally filter status on server in future
      const resp = await api.get("/admin/defects", { params });
      setItems(Array.isArray(resp.data) ? resp.data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return (items || []).filter((d) => (onlyPending ? d.moderation_status === "pending" : true));
  }, [items, onlyPending]);

  async function approve(id: number) {
    setBusyId(id);
    try {
      await api.post(`/defects/${id}/approve`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: number) {
    const reason = window.prompt("Důvod zamítnutí (volitelné):", "");
    setBusyId(id);
    try {
      await api.post(`/defects/${id}/reject`, { reason: reason || "" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex">
      <Sidebar mode="dashboard" />
      <main className="flex-1 p-4 compact-main">
        <h1>Návrhy závad</h1>
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
            <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} />
            Pouze čekající
          </label>
        </div>

        {loading ? (
          <div className="text-gray-500">Načítám…</div>
        ) : (
          <div className="bg-white rounded shadow divide-y">
            {filtered.map((d) => (
              <div key={d.id} className="p-3 flex gap-3 items-center">
                <div className="flex-1">
                  <div className="font-medium">{d.description}</div>
                  <div className="text-xs text-gray-500">
                    {d.standard || ""} {d.article ? `• čl. ${d.article}` : ""} • {d.visibility} • {d.moderation_status}
                    {d.reject_reason ? ` • důvod: ${d.reject_reason}` : ""}
                  </div>
                </div>
                {d.moderation_status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      disabled={busyId === d.id}
                      className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-60"
                      onClick={() => approve(d.id)}
                    >
                      Schválit
                    </button>
                    <button
                      disabled={busyId === d.id}
                      className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-60"
                      onClick={() => reject(d.id)}
                    >
                      Zamítnout
                    </button>
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && <div className="p-4 text-gray-500">Žádné položky</div>}
          </div>
        )}
      </main>
    </div>
  );
}
