import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import api from "../../api/axios";

type Stat = { pendingDefects: number };

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stat>({ pendingDefects: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Approx: fetch defects visible and count pending
        const resp = await api.get("/defects");
        const list = Array.isArray(resp.data) ? resp.data : [];
        const pending = list.filter((d: any) => d?.moderation_status === "pending").length;
        if (mounted) setStats({ pendingDefects: pending });
      } catch (_) {
        if (mounted) setStats({ pendingDefects: 0 });
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
        <h1>Administrace</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="p-4 bg-white rounded shadow">
            <div className="text-sm text-gray-500">Návrhy závad k posouzení</div>
            <div className="text-2xl font-semibold">{loading ? "…" : stats.pendingDefects}</div>
          </div>
        </div>
      </main>
    </div>
  );
}

