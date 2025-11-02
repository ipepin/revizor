// src/pages/Dashboard.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { authHeader } from "../api/auth";
import { useUser } from "../context/UserContext";
import { apiUrl } from "../api/base";

export default function Dashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const { token } = useAuth();
  const { profile } = useUser();
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectData, setNewProjectData] = useState({ address: "", client: "" });
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // odemykací dialog (heslo pro dokončenou revizi)
  const [unlockFor, setUnlockFor] = useState<{ projectId: number | null; revId: number | null }>({
    projectId: null,
    revId: null,
  });
  const [unlockPwd, setUnlockPwd] = useState("");
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [unlockErr, setUnlockErr] = useState<string | null>(null);

  const owner_id = (profile as any)?.id ?? (profile as any)?.userId ?? (profile as any)?.user_id ?? undefined;

  // Admin → přesměruj na /admin při vstupu na "/"
  useEffect(() => {
    if ((profile as any)?.isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [profile, navigate]);

  // Načti projekty
  const fetchProjects = async (signal?: AbortSignal) => {
    if (!token) return;
    try {
      const admin = (profile as any)?.isAdmin === true;
      const path = admin ? "/admin/projects" : "/projects";
      const res = await fetch(apiUrl(path), { headers: { ...authHeader(token) }, signal });
      if (!res.ok) {
        setErr(`${res.status} ${res.statusText}`);
        setProjects([]);
        return;
      }
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
      setErr(null);
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setErr("Chyba sítě");
        setProjects([]);
      }
    }
  };

  useEffect(() => {
    if (!token) return;
    const ctrl = new AbortController();
    setLoading(true);
    fetchProjects(ctrl.signal).finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [token]);

  const isExpired = (date: string) => new Date(date) < new Date();

  // otevřít dialog pro přidání revize (zatím pouze skeleton)
  const handleAdd = (projectId: number) => {
    setSelectedProjectId(projectId);
    setShowDialog(true);
  };

  const handleSaveNewProject = async () => {
    const address = newProjectData.address.trim();
    const client = newProjectData.client.trim();
    if (!address || !client) {
      alert("Vyplňte adresu i objednatele.");
      return;
    }

    const payload: any = { address, client };
    if (owner_id != null) payload.owner_id = owner_id;

    try {
      const res = await fetch(apiUrl("/projects"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader(token!) },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let detail = "";
        try {
          const data = await res.json();
          detail = data?.detail ? (Array.isArray(data.detail) ? JSON.stringify(data.detail) : String(data.detail)) : "";
        } catch {}
        throw new Error(`Chyba při ukládání projektu${detail ? `: ${detail}` : ""}`);
      }
      setShowNewProjectDialog(false);
      setNewProjectData({ address: "", client: "" });
      await fetchProjects();
    } catch (err) {
      console.error("Chyba při uložení projektu:", err);
      alert(String(err));
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    try {
      const res = await fetch(apiUrl(`/projects/${projectId}`), {
        method: "DELETE",
        headers: { ...authHeader(token!) },
      });
      if (!res.ok) throw new Error("Chyba při mazání projektu");
      alert("Projekt byl úspěšně smazán");
      await fetchProjects();
    } catch (err) {
      console.error("Chyba při mazání projektu:", err);
      alert("Nepodařilo se projekt smazat");
    }
  };

  const filteredProjects = (projects || []).filter((project: any) => {
    const address = project.address?.toLowerCase() || "";
    const client = project.client?.toLowerCase() || "";
    const query = search.toLowerCase();
    return address.includes(query) || client.includes(query);
  });

  const openRevision = (projectId: number, rev: any) => {
    if ((rev.status || "").toLowerCase() === "dokončená" || (rev.status || "").toLowerCase() === "dokončeno") {
      setUnlockFor({ projectId, revId: rev.id });
      setUnlockPwd("");
      setUnlockErr(null);
    } else {
      navigate(`/revize/${rev.id}`);
    }
  };

  const submitUnlock = async () => {
    if (!unlockFor.revId || !token) return;
    setUnlockBusy(true);
    setUnlockErr(null);
    try {
      const res = await fetch(apiUrl(`/revisions/${unlockFor.revId}/unlock`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader(token) },
        body: JSON.stringify({ password: unlockPwd }),
      });
      if (!res.ok) throw new Error("Unlock failed");
      const data = await res.json();

      setProjects((prev) =>
        prev.map((p) =>
          p.id !== unlockFor.projectId
            ? p
            : {
                ...p,
                revisions: (p.revisions || []).map((r: any) => (r.id === unlockFor.revId ? { ...r, status: data.status } : r)),
              }
        )
      );

      const idToOpen = unlockFor.revId;
      setUnlockFor({ projectId: null, revId: null });
      setUnlockPwd("");
      navigate(`/revize/${idToOpen}`);
    } catch (e) {
      setUnlockErr("Neplatné heslo.");
    } finally {
      setUnlockBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-100 to-blue-50">
      <Sidebar mode="dashboard" onNewProject={() => setShowNewProjectDialog(true)} />

      <main className="compact-main flex-1 space-y-4 p-4 md:p-6">
        <h1 className="mb-3 text-xl font-semibold">Projekty</h1>

        <input
          type="text"
          className="mb-3 w-full rounded border px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="Hledat adresu nebo objednatele..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <table className="compact-table w-full bg-white border rounded-lg shadow-sm">
          <thead className="bg-blue-100 text-blue-900">
            <tr>
              <th className="px-2 py-1 text-left w-10"></th>
              <th className="px-2 py-1 text-left">Adresa</th>
              <th className="px-2 py-1 text-left">Objednatel</th>
              <th className="px-2 py-1 text-left">Revizí</th>
              <th className="px-2 py-1 text-right">Akce</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((p: any) => {
              const expanded = expandedProjectId === p.id;
              const revCount = Array.isArray(p.revisions) ? p.revisions.length : 0;
              return (
                <React.Fragment key={p.id}>
                  <tr className="border-t hover:bg-blue-50/40">
                    <td className="px-2 py-1">
                      <button
                        className="w-6 h-6 rounded bg-blue-600 text-white text-xs"
                        title={expanded ? "Skrýt revize" : "Zobrazit revize"}
                        onClick={() => setExpandedProjectId(expanded ? null : p.id)}
                      >
                        {expanded ? "−" : "+"}
                      </button>
                    </td>
                    <td className="px-2 py-1">{p.address}</td>
                    <td className="px-2 py-1">{p.client}</td>
                    <td className="px-2 py-1">{revCount}</td>
                    <td className="px-2 py-1 text-right">
                      <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => handleAdd(p.id)}>Nová revize</button>
                      <button className="ml-2 px-3 py-1 bg-gray-200 rounded" onClick={() => handleDeleteProject(p.id)}>Smazat</button>
                    </td>
                  </tr>
                  {expanded && (
                    <tr>
                      <td colSpan={5} className="px-2 py-2 bg-white">
                        <div className="border rounded">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-2 py-1 text-left">#</th>
                                <th className="px-2 py-1 text-left">Typ</th>
                                <th className="px-2 py-1 text-left">Stav</th>
                                <th className="px-2 py-1 text-left">Vypracována</th>
                                <th className="px-2 py-1 text-right">Akce</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(p.revisions || []).map((r: any) => (
                                <tr key={r.id} className="border-t hover:bg-gray-50">
                                  <td className="px-2 py-1">{r.number || r.id}</td>
                                  <td className="px-2 py-1">{r.type || "–"}</td>
                                  <td className="px-2 py-1">{r.status || "–"}</td>
                                  <td className="px-2 py-1">{r.date_done || "–"}</td>
                                  <td className="px-2 py-1 text-right">
                                    <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={() => openRevision(p.id, r)}>Otevřít</button>
                                  </td>
                                </tr>
                              ))}
                              {(!p.revisions || p.revisions.length === 0) && (
                                <tr>
                                  <td colSpan={5} className="px-2 py-2 text-gray-500">Žádné revize</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </main>

      {/* Dialog pro odemknutí revize */}
      {unlockFor.revId && (
        <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center" onClick={() => !unlockBusy && setUnlockFor({ projectId: null, revId: null })}>
          <div className="bg-white p-6 rounded shadow w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Odemknout revizi</h3>
            <p className="text-sm text-gray-600">Zadejte heslo k odemknutí dokončené revize.</p>
            <input
              type="password"
              className="mt-3 w-full border rounded px-3 py-2"
              value={unlockPwd}
              onChange={(e) => setUnlockPwd(e.target.value)}
              placeholder="Heslo"
            />
            {unlockErr && <div className="text-red-600 text-sm mt-2">{unlockErr}</div>}
            <div className="mt-4 flex justify-end gap-2">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setUnlockFor({ projectId: null, revId: null })} disabled={unlockBusy}>
                Zrušit
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={submitUnlock} disabled={unlockBusy}>
                Odemknout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
