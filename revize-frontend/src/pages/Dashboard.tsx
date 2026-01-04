// src/pages/Dashboard.tsx (obnovený původní vzhled + VV + mazání s heslem)
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { authHeader } from "../api/auth";
import { useUser } from "../context/UserContext";
import { useVvDocs } from "../context/VvDocsContext";
import { apiUrl } from "../api/base";

function normalizeStatus(s?: string): string {
  const raw = (s || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  const done = ["dokončeno", "dokončené", "dokončená", "dokoncená"];
  const inProgress = ["rozpracovaná", "rozpracovana", "rozpracovaný", "rozpracovane"];
  if (done.includes(lower)) return "Dokončeno";
  if (inProgress.includes(lower)) return "Rozpracovaná";
  return raw;
}

export default function Dashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const { token } = useAuth();
  const { profile, company } = useUser();  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectData, setNewProjectData] = useState({ address: "", client: "" });
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // unlock modal (heslo pro dokončenou revizi)
  const [unlockFor, setUnlockFor] = useState<{ projectId: number | null; revId: number | null}>({ projectId: null, revId: null });
  const [unlockPwd, setUnlockPwd] = useState("");
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [unlockErr, setUnlockErr] = useState<string | null>(null);

  // owner_id z profilu
  const owner_id = (profile as any)?.id ?? (profile as any)?.userId ?? (profile as any)?.user_id ?? undefined;

  // VV context (pro vytvoření VV)
  const { add: addVvDoc } = useVvDocs();

  // VV per projekt
  const [vvByProject, setVvByProject] = useState<Record<number, any[]>>({});
  const [vvLoading, setVvLoading] = useState<Record<number, boolean>>({});

  // Dialog mazání s heslem
  type DeleteKind = 'project' | 'revision' | 'vv';
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    kind: DeleteKind;
    id: number | string | null;
    projectId?: number | null;
    password: string;
    busy: boolean;
    err: string | null;
  }>({ open: false, kind: 'project', id: null, projectId: null, password: '', busy: false, err: null });

  const confirmDelete = async () => {
    if (!token || !deleteDialog.id) return;
    setDeleteDialog((d) => ({ ...d, busy: true, err: null }));
    try {
      let url = '';
      if (deleteDialog.kind === 'project') url = apiUrl(`/projects/${deleteDialog.id}`);
      else if (deleteDialog.kind === 'revision') url = apiUrl(`/revisions/${deleteDialog.id}`);
      else url = apiUrl(`/vv/${deleteDialog.id}`);

      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeader(token!) },
        body: JSON.stringify({ password: deleteDialog.password })
      });
      if (!res.ok) throw new Error(`${res.status}`);

      if (deleteDialog.kind === 'vv' && deleteDialog.projectId) {
        await loadVvForProject(deleteDialog.projectId);
      } else {
        await fetchProjects();
      }
      setDeleteDialog({ open: false, kind: 'project', id: null, projectId: null, password: '', busy: false, err: null });
    } catch (e: any) {
      setDeleteDialog((d) => ({ ...d, err: 'Mazání selhalo', busy: false }));
    }
  };

  // Načti projekty
  const fetchProjects = async (signal?: AbortSignal) => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl("/projects"), {
        headers: { ...authHeader(token) },
        signal,
      });
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
        setErr("Network error");
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

  // přidání (otevře výběrový dialog)
  const handleAdd = (projectId: number) => {
    setSelectedProjectId(projectId);
    setShowDialog(true);
  };

  // načtení VV listu pro konkrétní projekt (lazy při rozbalení)
  const loadVvForProject = async (projectId: number) => {
    if (!token) return;
    setVvLoading((m) => ({ ...m, [projectId]: true }));
    try {
      const res = await fetch(apiUrl(`/vv/project/${projectId}`), {
        headers: { ...authHeader(token) },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const list = await res.json();
      setVvByProject((m) => ({ ...m, [projectId]: list }));
    } catch {
      setVvByProject((m) => ({ ...m, [projectId]: [] }));
    } finally {
      setVvLoading((m) => ({ ...m, [projectId]: false }));
    }
  };

  const handleSaveNewProject = async () => {
    const address = newProjectData.address.trim();
    const client = newProjectData.client.trim();
    if (!address || !client) {
      alert("Vyplň adresu i objednatele.");
      return;
    }

    const name = `${address} — ${client}`;
    const payload: any = { name, address, client, shared_with_user_ids: [] };
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

  const handleDeleteProject = async (projectId: number, password: string) => {
    try {
      const res = await fetch(apiUrl(`/projects/${projectId}`), {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeader(token!) },
        body: JSON.stringify({ password })
      });
      if (!res.ok) throw new Error("Chyba při mazání projektu");
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

  // jen tyto typy revizí
  const revisionTypes = ["Elektroinstalace", "FVE", "LPS"];

  // otevření revize
  const openRevision = (projectId: number, rev: any) => {
    if (normalizeStatus(rev.status) === "Dokončená") {
      setUnlockFor({ projectId, revId: rev.id });
      setUnlockPwd("");
      setUnlockErr(null);
    } else {
      ((rev?.type||'').toUpperCase()==='LPS' ? navigate(`/revize-lps/${rev.id}`) : navigate(`/revize/${rev.id}`));
    }
  };

  // odeslání hesla (odemknutí dokončené revize)
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
      {
        const rev = projects.flatMap(p => (p.revisions||[])).find((r:any)=>r.id===idToOpen);
        const isLps = ((rev?.type||'').toUpperCase()==='LPS');
        navigate(isLps ? `/revize-lps/${idToOpen}` : `/revize/${idToOpen}`);
      }
    } catch (e) {
      setUnlockErr("Neplatné heslo.");
    } finally {
      setUnlockBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-100 to-blue-50">
      <Sidebar mode="dashboard" onNewProject={() => setShowNewProjectDialog(true)} />

      <main className="flex-1 p-6">
        <h1 className="text-3xl font-bold text-blue-800 mb-4">📁 Projekty</h1>

        <input
          type="text"
          className="p-2 border rounded w-full mb-4"
          placeholder="Hledat adresu nebo objednatele..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <table className="w-full bg-white border rounded shadow text-sm">
          <thead className="bg-blue-100 text-blue-900">
            <tr>
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">🏠 Adresa</th>
              <th className="p-2 text-left">🧾 Objednatel</th>
              <th className="p-2 text-left">📆 Platnost</th>
              <th className="p-2 text-left">📄 Revize</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((proj: any) => {
              const expired = proj.revisions?.some((r: any) => isExpired(r.valid_until));
              const isSelected = expandedProjectId === proj.id;
              const sortedRevisions = Array.isArray(proj.revisions)
                ? [...proj.revisions].sort(
                    (a: any, b: any) => new Date(b.date_done).getTime() - new Date(a.date_done).getTime()
















                  )
                : [];

              return (
                <React.Fragment key={proj.id}>
                  <tr
                    className={`cursor-pointer border-t hover:bg-blue-50 ${isSelected ? "bg-blue-100" : ""}`}
                    onClick={async () => {
                      const next = isSelected ? null : proj.id;
                      setExpandedProjectId(next);
                      if (!isSelected && !vvByProject[proj.id]) {
                        await loadVvForProject(proj.id);
                      }
                    }}
                  >
                    <td className="p-2 font-mono">{proj.id}</td>
                    <td className="p-2">{proj.address}</td>
                    <td className="p-2">{proj.client}</td>
                    <td className={`p-2 ${expired ? "text-red-600 font-semibold" : "text-green-700"}`}>
                      {expired ? "Revize po platnosti" : "OK"}
                    </td>
                    <td className="p-2">{proj.revisions?.length ?? 0}</td>
                  </tr>

                  {isSelected && (
                    <tr>
                      <td colSpan={5} className="bg-blue-50 p-2">
                        <div className="text-right mb-2 flex justify-between">
                          {/* Přidat: revize + VV */}
                          <button
                            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                            onClick={() => handleAdd(proj.id)}
                          >
                            ➕ Přidat
                          </button>
                          <button
                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                            onClick={() => setDeleteDialog({ open: true, kind: 'project', id: proj.id, projectId: null, password: '', busy: false, err: null })}
                          >
                            🗑️ Smazat projekt
                          </button>
                        </div>

                        {/* Revizní zprávy */}                        <h2 className="text-xl font-semibold text-slate-800 mb-2">Revizní zprávy</h2>
                        <table className="w-full text-sm bg-white border rounded">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="p-2 text-left">#</th>
                              <th className="p-2 text-left">Typ</th>
                              <th className="p-2 text-left">Datum</th>
                              <th className="p-2 text-left">Platnost</th>
                              <th className="p-2 text-left">Stav</th>
                              <th className="p-2 text-left">Akce</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedRevisions.map((rev: any) => {
                              const isDone = normalizeStatus(rev.status) === "Dokončená";
                              return (
                                <tr key={rev.id} className={`border-t ${isDone ? "bg-green-50" : ""}`}>
                                  <td className="p-2">{rev.number}</td>
                                  <td className="p-2">{rev.type}</td>
                                  <td className="p-2">{rev.date_done}</td>
                                  <td className={`p-2 ${isExpired(rev.valid_until) ? "text-red-600 font-semibold" : ""}`}>
                                    {rev.valid_until}
                                  </td>
                                  <td className={`p-2 ${isDone ? "text-green-700" : "text-blue-600"}`}>
{normalizeStatus(rev.status)}
                                  </td>
                                  <td className="p-2 space-x-2">
                                    <button
                                      className="text-blue-600 hover:underline"
                                      onClick={() => openRevision(proj.id, rev)}
                                      title={isDone ? "Dokončeno – otevřít po zadání hesla" : "Otevřít"}
                                    >
                                      Otevřít
                                    </button>
                                    <button
                                      className="text-red-600 hover:underline"
                                      onClick={() => setDeleteDialog({ open: true, kind: 'revision', id: rev.id, projectId: proj.id, password: '', busy: false, err: null }) }
                                    >
                                      Smazat
                                    </button>
                                    <button
                                      onClick={() => navigate(`/summary/${rev.id}`)}
                                      className="text-green-600 hover:underline"
                                    >
                                      Souhrn
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {/* mezera */}
                        <div className="h-4" />

                        {/* VV Protokoly */}                        <h2 className="text-xl font-semibold text-slate-800 mb-2 mt-6">Protokoly o VV</h2>                        <div className="bg-white border rounded">
                          <table className="w-full text-sm">
                            <thead>
                              <tr>
                                <th className="p-2 text-left">#</th>
                                <th className="p-2 text-left">Název / Prostor</th>
                                <th className="p-2 text-left">Datum</th>
                                <th className="p-2 text-left">Akce</th>
                              </tr>
                            </thead>
                            <tbody>
                              {vvLoading[proj.id] && (
                                <tr><td className="p-2" colSpan={4}>Načítám VV…</td></tr>
                              )}
                              {!vvLoading[proj.id] && (vvByProject[proj.id]?.length ?? 0) === 0 && (
                                <tr><td className="p-2" colSpan={4}>Žádné protokoly.</td></tr>
                              )}
                              {(vvByProject[proj.id] || []).map((vv: any) => {
                                const spaceName = vv.data_json?.spaces?.[0]?.name ?? "—";
                                const date = vv.data_json?.date ?? "—";
                                return (
                                  <tr key={vv.id} className="border-t">
                                    <td className="p-2 font-mono">{vv.number ?? vv.id}</td>
                                    <td className="p-2">
                                      {vv.data_json?.objectName || "bez názvu"} · {" "}
                                      <span className="text-slate-500">{spaceName}</span>
                                    </td>
                                    <td className="p-2">{date}</td>
                                    <td className="p-2 space-x-3">
                                      <button
                                        className="text-blue-600 hover:underline"
                                        onClick={() => navigate(`/vv/${vv.id}`)}
                                      >
                                        Otevřít
                                      </button>
                                      <button
                                        className="text-red-600 hover:underline"
                                      onClick={() => setDeleteDialog({ open: true, kind: 'vv', id: vv.id, projectId: proj.id, password: '', busy: false, err: null }) }
                                      >
                                        Smazat
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Dialog „Přidat“: VV + zúžené revize */}
                        {showDialog && selectedProjectId === proj.id && (
                          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white p-6 rounded shadow w-80">
                              <h2 className="text-lg font-semibold mb-4">Vyber, co chceš přidat</h2>

                              {/* VV */}
                              <div
                                className="p-2 mb-2 hover:bg-gray-100 cursor-pointer border rounded"
                                onClick={async () => {
                                  setShowDialog(false);
                                  try {
                                    const created = await addVvDoc(proj.id, {
                                      objectName: proj.address ? `${proj.address}` : "Objekt",
                                      address: proj.address || "",
                                    });
                                    navigate(`/vv/${created.id}`);
                                    loadVvForProject(proj.id);
                                  } catch (err: any) {
                                    console.error("❌ VV create failed:", err?.response?.data || err);
                                    alert("Nepodařilo se založit VV protokol.");
                                  }
                                }}
                              >
                                Posouzení vnějších vlivů (VV)
                              </div>

                              {/* Revize */}
                              <ul className="border rounded">
                                {revisionTypes.map((type, idx) => (
                                  <li
                                    key={type}
                                    className={`p-2 hover:bg-gray-100 cursor-pointer ${idx < revisionTypes.length - 1 ? "border-b" : ""}`}
                                    onClick={async () => {
                                      setShowDialog(false);
                                      const newRevision: any = {
                                        project_id: proj.id,
                                        type,
                                        date_done: new Date().toISOString().split("T")[0],
                                        valid_until: new Date(new Date().setFullYear(new Date().getFullYear() + 4))
                                          .toISOString()
                                          .split("T")[0],
                                        status: "Rozpracovaná",
                                        data_json: { poznámka: "zatím prázdné" },
                                      };
                                      if (type === "LPS") {
                                        const prof: any = profile || {};
                                        const comp: any = company || {};
                                        newRevision.data_json = {
                                          ...(newRevision.data_json || {}),
                                          technicianName: prof.fullName || prof.name || "",
                                          technicianCertificateNumber: prof.certificateNumber || "",
                                          technicianAuthorizationNumber: prof.authorizationNumber || "",
                                          technicianCompanyName: comp.name || "",
                                          technicianCompanyIco: (comp as any).ico || "",
                                          technicianCompanyDic: (comp as any).dic || "",
                                          technicianCompanyAddress: comp.address || "",
                                        };
                                      }
                                      if (owner_id != null) newRevision.owner_id = owner_id;
                                      if (type === "LPS") {
                                        const existingLps = Array.isArray(proj.revisions) ? proj.revisions.filter((r: any) => (r?.type || "").toUpperCase() === "LPS") : [];
                                        const seq = (existingLps?.length || 0) + 1;
                                        newRevision.number = `LPS-${proj.id}-${String(seq).padStart(3, '0')}`;
                                      }

                                      try {
                                        const response = await fetch(apiUrl(`/revisions`), {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json", ...authHeader(token!) },
                                          body: JSON.stringify(newRevision),
                                        });
                                        if (!response.ok) {
                                          let detail = "";
                                          try {
                                            const data = await response.json();
                                            detail = data?.detail
                                              ? (Array.isArray(data.detail) ? JSON.stringify(data.detail) : String(data.detail))
                                              : "";
                                          } catch {}
                                          throw new Error(`Server error${detail ? `: ${detail}` : ""}`);
                                        }
                                        fetchProjects();
                                      } catch (error) {
                                        console.error("❌ Chyba při ukládání revize:", error);
                                        alert(String(error));
                                      }
                                    }}
                                  >
                                    {type}
                                  </li>
                                ))}
                              </ul>

                              <button className="mt-4 px-4 py-2 bg-gray-300 rounded w-full" onClick={() => setShowDialog(false)}>
                                Zrušit
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </main>

      {/* Nový projekt dialog */}
      {showNewProjectDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-96">
            <h2 className="text-lg font-semibold mb-4">Nový projekt</h2>
            <input
              type="text"
              className="w-full p-2 mb-2 border rounded"
              placeholder="Adresa"
              value={newProjectData.address}
              onChange={(e) => setNewProjectData({ ...newProjectData, address: e.target.value })}
            />
            <input
              type="text"
              className="w-full p-2 mb-4 border rounded"
              placeholder="Objednatel"
              value={newProjectData.client}
              onChange={(e) => setNewProjectData({ ...newProjectData, client: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowNewProjectDialog(false)}>
                Zrušit
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={handleSaveNewProject} title="Uložit nový projekt">
                Uložit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock modal – heslo pro dokončenou revizi */}
      {unlockFor.revId !== null && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50" onClick={() => setUnlockFor({ projectId: null, revId: null })}>
          <div className="bg-white p-5 rounded shadow w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-2">Revize je dokončená</h3>
            <p className="text-sm text-gray-600 mb-3">Pro otevření zadej své heslo.</p>
            <input
              type="password"
              className="w-full p-2 border rounded mb-2"
              placeholder="Heslo"
              value={unlockPwd}
              onChange={(e) => setUnlockPwd(e.target.value)}
              onKeyDown={(e) => (e.key === "Enter" ? submitUnlock() : null)}
              autoFocus
            />
            {unlockErr && <div className="text-red-600 text-sm mb-2">{unlockErr}</div>}
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 bg-gray-200 rounded" onClick={() => setUnlockFor({ projectId: null, revId: null })} disabled={unlockBusy}>
                Zrušit
              </button>
              <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={submitUnlock} disabled={unlockBusy || !unlockPwd}>
                Odemknout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal – potvrzení s heslem */}
      {deleteDialog.open && (
        <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center" onClick={() => !deleteDialog.busy && setDeleteDialog({ ...deleteDialog, open: false })}>
          <div className="bg-white p-5 rounded shadow w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold mb-2">Smazat {deleteDialog.kind === "project" ? "projekt" : deleteDialog.kind === "revision" ? "revizi" : "VV protokol"}</h3>
            <p className="text-sm text-gray-600 mb-3">Pro potvrzení zadej své heslo.</p>
            <input type="password" className="w-full p-2 border rounded mb-2" placeholder="Heslo" value={deleteDialog.password} onChange={(e) => setDeleteDialog({ ...deleteDialog, password: e.target.value })} onKeyDown={(e) => (e.key === "Enter" ? confirmDelete() : null)} autoFocus />
            {deleteDialog.err && <div className="text-red-600 text-sm mb-2">{deleteDialog.err}</div>}
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 bg-gray-200 rounded" onClick={() => setDeleteDialog({ ...deleteDialog, open: false })} disabled={deleteDialog.busy}>Zrušit</button>
              <button className="px-3 py-2 bg-red-600 text-white rounded" onClick={confirmDelete} disabled={deleteDialog.busy || !deleteDialog.password}>Smazat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

























