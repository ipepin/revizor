import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import api from "../../api/axios";

type AdminUser = { id: number; name?: string; email?: string };
type Revision = { id: number; number?: string; status?: string; type?: string };
type Project = { id: number; address?: string; client?: string; revisions?: Revision[] };
type VvDoc = { id: string; number?: string };

export default function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [expandedUsers, setExpandedUsers] = useState<Record<number, { projects?: Project[]; vvByProject?: Record<number, VvDoc[]>; loading?: boolean }>>({});

  // Načti techniky hned po přihlášení
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingUsers(true);
      try {
        const resp = await api.get("/admin/users");
        const list: AdminUser[] = Array.isArray(resp.data) ? resp.data : [];
        if (mounted) setUsers(list);
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function toggleUser(userId: number) {
    setExpandedUsers((m) => ({ ...m, [userId]: { ...(m[userId] || {}), loading: true } }));
    // když ještě nemáme projekty, načti
    if (!expandedUsers[userId]?.projects) {
      const resp = await api.get("/admin/projects", { params: { owner_id: userId } });
      const projects: Project[] = Array.isArray(resp.data) ? resp.data : [];
      setExpandedUsers((m) => ({ ...m, [userId]: { projects, vvByProject: {}, loading: false } }));
      // automaticky načti VV ke všem projektům
      for (const p of projects) {
        try {
          const r = await api.get(`/admin/projects/${p.id}/vv`);
          const vv: VvDoc[] = Array.isArray(r.data) ? r.data : [];
          setExpandedUsers((m) => ({
            ...m,
            [userId]: {
              ...(m[userId] || {}),
              projects: m[userId]?.projects,
              vvByProject: { ...(m[userId]?.vvByProject || {}), [p.id]: vv },
            },
          }));
        } catch {}
      }
    } else {
      // jen přepnout zobrazení (pokud chceš čisté toggle, ponech uloženo)
      setExpandedUsers((m) => ({ ...m, [userId]: { ...(m[userId] || {}), loading: false, projects: m[userId]?.projects } }));
    }
  }

  async function ensureVv(userId: number, projectId: number) {
    const entry = expandedUsers[userId] || {};
    const vvByProject = entry.vvByProject || {};
    if (!vvByProject[projectId]) {
      const resp = await api.get(`/admin/projects/${projectId}/vv`);
      const vv: VvDoc[] = Array.isArray(resp.data) ? resp.data : [];
      setExpandedUsers((m) => ({
        ...m,
        [userId]: {
          ...(m[userId] || {}),
          projects: m[userId]?.projects,
          vvByProject: { ...(m[userId]?.vvByProject || {}), [projectId]: vv },
        },
      }));
    }
  }

  return (
    <div className="flex">
      <Sidebar mode="dashboard" />
      <main className="flex-1 p-4 compact-main">
        <h1>Administrace</h1>

        <div className="mt-4 bg-white rounded shadow divide-y">
          {loadingUsers ? (
            <div className="p-3 text-gray-500">Načítám techniky…</div>
          ) : users.length === 0 ? (
            <div className="p-3 text-gray-500">Žádní technici</div>
          ) : (
            users.map((u) => {
              const expanded = expandedUsers[u.id];
              const open = Boolean(expanded && expanded.projects);
              return (
                <div key={u.id} className="p-3">
                  <button className="w-full text-left flex items-center justify-between" onClick={() => toggleUser(u.id)}>
                    <div>
                      <div className="font-medium">{u.name || `Uživatel #${u.id}`}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </div>
                    <span className="text-sm text-gray-600">{open ? "Skrýt" : "Zobrazit"}</span>
                  </button>

                  {open && (
                    <div className="mt-3">
                      {(expanded?.projects || []).length === 0 ? (
                        <div className="text-gray-500">Žádné projekty</div>
                      ) : (
                        <div className="border rounded divide-y">
                          {(expanded?.projects || []).map((p) => (
                            <div key={p.id} className="p-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">{p.address || `Projekt #${p.id}`}</div>
                                  <div className="text-xs text-gray-500">{p.client || "—"}</div>
                                </div>
                                {/* VV se načítají automaticky při rozbalení uživatele */}
                              </div>

                              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <div className="text-sm font-semibold mb-1">Revize</div>
                                  <div className="border rounded divide-y">
                                    {(p.revisions || []).map((r) => (
                                      <div key={r.id} className="p-2 flex items-center justify-between">
                                        <div>
                                          <div className="font-medium">{r.number || `Revize #${r.id}`}</div>
                                          <div className="text-xs text-gray-500">{r.type || ""} • {r.status || ""}</div>
                                        </div>
                                        <div className="flex gap-2">
                                          <a className="px-3 py-1 bg-indigo-600 text-white rounded" href={`#/summary/${r.id}`}>Souhrn</a>
                                          <a className="px-3 py-1 bg-gray-200 rounded" href={`#/revize/${r.id}`}>Otevřít</a>
                                        </div>
                                      </div>
                                    ))}
                                    {(p.revisions || []).length === 0 && (
                                      <div className="p-2 text-gray-500">Žádné revize</div>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm font-semibold mb-1">Protokoly VV</div>
                                  <div className="border rounded divide-y">
                                    {((expanded?.vvByProject || {})[p.id] || []).map((v) => (
                                      <div key={v.id} className="p-2 flex items-center justify-between">
                                        <div>{v.number || v.id}</div>
                                        <a className="px-3 py-1 bg-gray-200 rounded" href={`#/vv/${v.id}`}>Otevřít</a>
                                      </div>
                                    ))}
                                    {(!((expanded?.vvByProject || {})[p.id]) || ((expanded?.vvByProject || {})[p.id] || []).length === 0) && (
                                      <div className="p-2 text-gray-500">Žádné protokoly</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
