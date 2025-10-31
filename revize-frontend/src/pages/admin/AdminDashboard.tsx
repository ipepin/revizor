import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import api from "../../api/axios";

type AdminUser = { id: number; name?: string; email?: string };
type Revision = { id: number; number?: string; status?: string; type?: string };
type Project = { id: number; address?: string; client?: string; revisions?: Revision[] };
type VvDoc = { id: string; number?: string };

export default function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [expanded, setExpanded] = useState<Record<number, { vv?: VvDoc[] }>>({});
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // load users
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingUsers(true);
      try {
        const resp = await api.get("/admin/users");
        const list: AdminUser[] = Array.isArray(resp.data) ? resp.data : [];
        if (mounted) {
          setUsers(list);
          if (list.length && activeUserId == null) setActiveUserId(list[0].id);
        }
      } finally {
        if (mounted) setLoadingUsers(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // load projects for active user
  useEffect(() => {
    if (!activeUserId) {
      setProjects([]);
      return;
    }
    let mounted = true;
    (async () => {
      setLoadingProjects(true);
      try {
        const resp = await api.get("/admin/projects", { params: { owner_id: activeUserId } });
        const list: Project[] = Array.isArray(resp.data) ? resp.data : [];
        if (mounted) setProjects(list);
      } finally {
        if (mounted) setLoadingProjects(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeUserId]);

  async function toggleProject(pid: number) {
    setExpanded((m) => ({ ...m, [pid]: { vv: m[pid]?.vv } }));
    // lazy load VV docs if not present
    if (!expanded[pid]?.vv) {
      const resp = await api.get(`/admin/projects/${pid}/vv`);
      const vv: VvDoc[] = Array.isArray(resp.data) ? resp.data : [];
      setExpanded((m) => ({ ...m, [pid]: { vv } }));
    }
  }

  return (
    <div className="flex">
      <Sidebar mode="dashboard" />
      <main className="flex-1 p-4 compact-main">
        <h1>Administrace</h1>

        {/* Tabs: technicians */}
        <div className="mt-4 overflow-x-auto">
          <div className="inline-flex gap-2 border-b">
            {loadingUsers ? (
              <div className="text-gray-500 px-2 py-1">Načítám techniky…</div>
            ) : users.length === 0 ? (
              <div className="text-gray-500 px-2 py-1">Žádní technici</div>
            ) : (
              users.map((u) => (
                <button
                  key={u.id}
                  className={`px-3 py-1 rounded-t ${activeUserId === u.id ? "bg-white border border-b-0" : "bg-gray-100"}`}
                  onClick={() => setActiveUserId(u.id)}
                  title={u.email}
                >
                  {u.name || `Uživatel #${u.id}`}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Projects for active technician */}
        <div className="mt-4">
          {loadingProjects ? (
            <div className="text-gray-500">Načítám projekty…</div>
          ) : projects.length === 0 ? (
            <div className="text-gray-500">Žádné projekty</div>
          ) : (
            <div className="bg-white rounded shadow divide-y">
              {projects.map((p) => (
                <div key={p.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{p.address || `Projekt #${p.id}`}</div>
                      <div className="text-xs text-gray-500">{p.client || "—"}</div>
                    </div>
                    <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => toggleProject(p.id)}>
                      Detaily
                    </button>
                  </div>

                  {/* Details: revisions + VV docs */}
                  {expanded[p.id] && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          {(expanded[p.id]?.vv || []).map((v) => (
                            <div key={v.id} className="p-2 flex items-center justify-between">
                              <div>{v.number || v.id}</div>
                              <a className="px-3 py-1 bg-gray-200 rounded" href={`#/vv/${v.id}`}>Otevřít</a>
                            </div>
                          ))}
                          {(!expanded[p.id]?.vv || expanded[p.id]?.vv?.length === 0) && (
                            <div className="p-2 text-gray-500">Žádné protokoly</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
