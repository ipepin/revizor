import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import api from "../../api/axios";

type Revision = {
  id: number;
  number?: string;
  type?: string;
  status?: string;
  project_id: number;
  date_done?: string;
  valid_until?: string;
};

export default function RevisionsAdminPage() {
  const [items, setItems] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // Note: backend current list endpoint returns only accessible revs; admin-wide listing may need a new endpoint
        const resp = await api.get("/revisions");
        if (mounted) setItems(resp.data || []);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="flex">
      <Sidebar mode="dashboard" />
      <main className="flex-1 p-4 compact-main">
        <h1>Revize všech uživatelů</h1>
        {loading ? (
          <div className="text-gray-500 mt-4">Načítám…</div>
        ) : (
          <div className="bg-white rounded shadow divide-y mt-3">
            {items.map((r) => (
              <div key={r.id} className="p-3">
                <div className="font-medium">{r.number || `Revize #${r.id}`}</div>
                <div className="text-xs text-gray-500">{r.type || ""} • {r.status || ""} • projekt #{r.project_id}</div>
              </div>
            ))}
            {items.length === 0 && <div className="p-4 text-gray-500">Žádné revize</div>}
          </div>
        )}
      </main>
    </div>
  );
}

