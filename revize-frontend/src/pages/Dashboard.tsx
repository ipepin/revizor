// src/pages/Dashboard.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { authHeader } from "../api/auth";
import { useUser } from "../context/UserContext";
import { apiUrl } from "../api/base";
// VV store (vytvĂˇĹ™enĂ­ VV protokolĹŻ)
import { useVvDocs } from "../context/VvDocsContext";

export default function Dashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const { token } = useAuth();
  const { profile } = useUser(); // kvĹŻli owner_id
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectData, setNewProjectData] = useState({ address: "", client: "" });
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // unlock modal (heslo pro dokonÄŤenou revizi)
  const [unlockFor, setUnlockFor] = useState<{ projectId: number | null; revId: number | null }>({
    projectId: null,
    revId: null,
  });
  const [unlockPwd, setUnlockPwd] = useState("");
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [unlockErr, setUnlockErr] = useState<string | null>(null);

  // URL backendu z env, fallback na localhost


  // owner_id z profilu
  const owner_id =
    (profile as any)?.id ??
    (profile as any)?.userId ??
    (profile as any)?.user_id ??
    undefined;

  // VV context (jen pro vytvoĹ™enĂ­ zĂˇznamu; listing bereme pĹ™Ă­mo z BE)
  const { add: addVvDoc } = useVvDocs();

  // Pokud je admin, přesměruj na admin dashboard (při vstupu na "/")
  useEffect(() => {
    if ((profile as any)?.isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [profile, navigate]);

  // Seznam VV protokolĹŻ per projekt
  const [vvByProject, setVvByProject] = useState<Record<number, any[]>>({});
  const [vvLoading, setVvLoading] = useState<Record<number, boolean>>({});

  // NaÄŤti projekty
  const fetchProjects = async (signal?: AbortSignal) => {
    if (!token) return;
    try {
      const admin = (profile as any)?.isAdmin === true;
      const path = admin ? "/admin/projects" : "/projects";
      const res = await fetch(apiUrl(path), {
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

  // pĹ™idĂˇnĂ­ (otevĹ™e vĂ˝bÄ›rovĂ˝ dialog)
  const handleAdd = (projectId: number) => {
    setSelectedProjectId(projectId);
    setShowDialog(true);
  };

  // naÄŤtenĂ­ VV listu pro konkrĂ©tnĂ­ projekt
  const loadVvForProject = async (projectId: number) => {
    if (!token) return;
    setVvLoading((m) => ({ ...m, [projectId]: true }));
    try {
      const res = await fetch(apiUrl(`/vv/project/${projectId}`), {
        headers: { ...authHeader(token) },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const list = await res.json(); // [{ id, number, project_id, data_json, ... }]
      setVvByProject((m) => ({ ...m, [projectId]: list }));
    } catch (e) {
      setVvByProject((m) => ({ ...m, [projectId]: [] }));
    } finally {
      setVvLoading((m) => ({ ...m, [projectId]: false }));
    }
  };

  const handleSaveNewProject = async () => {
    const address = newProjectData.address.trim();
    const client = newProjectData.client.trim();
    if (!address || !client) {
      alert("VyplĹ adresu i objednatele.");
      return;
    }

    const name = `${address} â€” ${client}`;
    const payload: any = {
      name,
      address,
      client,
      shared_with_user_ids: [],
    };
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
        throw new Error(`Chyba pĹ™i uklĂˇdĂˇnĂ­ projektu${detail ? `: ${detail}` : ""}`);
      }
      setShowNewProjectDialog(false);
      setNewProjectData({ address: "", client: "" });
      await fetchProjects();
    } catch (err) {
      console.error("Chyba pĹ™i uloĹľenĂ­ projektu:", err);
      alert(String(err));
    }
  };

  const handleDeleteProject = async (projectId: number) => {
    try {
      const res = await fetch(apiUrl(`/projects/${projectId}`), {
        method: "DELETE",
        headers: { ...authHeader(token!) },
      });
      if (!res.ok) throw new Error("Chyba pĹ™i mazĂˇnĂ­ projektu");
      alert("âś… Projekt byl ĂşspÄ›ĹˇnÄ› smazĂˇn");
      await fetchProjects();
    } catch (err) {
      console.error("Chyba pĹ™i mazĂˇnĂ­ projektu:", err);
      alert("âťŚ NepodaĹ™ilo se projekt smazat");
    }
  };

  const filteredProjects = (projects || []).filter((project: any) => {
    const address = project.address?.toLowerCase() || "";
    const client = project.client?.toLowerCase() || "";
    const query = search.toLowerCase();
    return address.includes(query) || client.includes(query);
  });

  // jen tyto typy revizĂ­
  const revisionTypes = ["Elektroinstalace", "FVE"];

  // otevĹ™enĂ­ revize
  const openRevision = (projectId: number, rev: any) => {
    if ((rev.status || "").toLowerCase() === "dokonÄŤenĂˇ") {
      setUnlockFor({ projectId, revId: rev.id });
      setUnlockPwd("");
      setUnlockErr(null);
    } else {
      navigate(`/revize/${rev.id}`);
    }
  };

  // odeslĂˇnĂ­ hesla (odemknutĂ­ dokonÄŤenĂ© revize)
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
      const data = await res.json(); // { status: "RozpracovanĂˇ" }

      setProjects((prev) =>
        prev.map((p) =>
          p.id !== unlockFor.projectId
            ? p
            : {
                ...p,
                revisions: (p.revisions || []).map((r: any) =>
                  r.id === unlockFor.revId ? { ...r, status: data.status } : r
                ),
              }
        )
      );

      const idToOpen = unlockFor.revId;
      setUnlockFor({ projectId: null, revId: null });
      setUnlockPwd("");
      navigate(`/revize/${idToOpen}`);
    } catch (e) {
      setUnlockErr("NeplatnĂ© heslo.");
    } finally {
      setUnlockBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-100 to-blue-50">
      <Sidebar mode="dashboard" onNewProject={() => setShowNewProjectDialog(true)} />

      <main className="compact-main flex-1 space-y-4 p-4 md:p-6">
        <h1 className="mb-3 flex items-center gap-2">
          <span className="text-lg">đź“</span>
          Projekty
        </h1>

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
              <th className="px-2 py-1 text-left">#</th>
              <th className="px-2 py-1 text-left">đźŹ  Adresa</th>
              <th className="px-2 py-1 text-left">đź§ľ Objednatel</th>
              <th className="px-2 py-1 text-left">đź“† Platnost</th>
              <th className="px-2 py-1 text-left">đź“„ Revize</th>
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
                    <td className="px-2 py-1 font-mono">{proj.id}</td>
                    <td className="px-2 py-1">{proj.address}</td>
                    <td className="px-2 py-1">{proj.client}</td>
                    <td className={`px-2 py-1 ${expired ? "text-red-600 font-semibold" : "text-green-700"}`}>
                      {expired ? "Revize po platnosti" : "OK"}
                    </td>
                    <td className="px-2 py-1">{proj.revisions?.length ?? 0}</td>
                  </tr>

                  {isSelected && (
                    <tr>
                      <td colSpan={5} className="bg-blue-50 px-3 py-2">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          {/* PĹ™idat: revize + VV */}
                          <button
                            className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                            onClick={() => handleAdd(proj.id)}
                          >
                            âž• PĹ™idat
                          </button>
                          <button
                            className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
                            onClick={() => {
                              if (window.confirm("Opravdu chcete smazat tento projekt vÄŤetnÄ› vĹˇech revizĂ­?")) {
                                handleDeleteProject(proj.id);
                              }
                            }}
                          >
                            đź—‘ď¸Ź Smazat projekt
                          </button>
                        </div>

                        {/* ReviznĂ­ zprĂˇvy */}
                        <table className="compact-table w-full bg-white border rounded-md shadow-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-2 py-1 text-left">#</th>
                              <th className="px-2 py-1 text-left">Typ</th>
                              <th className="px-2 py-1 text-left">Datum</th>
                              <th className="px-2 py-1 text-left">Platnost</th>
                              <th className="px-2 py-1 text-left">Stav</th>
                              <th className="px-2 py-1 text-left">Akce</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sortedRevisions.map((rev: any) => {
                              const isDone = (rev.status || "").toLowerCase() === "dokonÄŤenĂˇ";
                              return (
                                <tr key={rev.id} className={`border-t ${isDone ? "bg-green-50" : ""}`}>
                                  <td className="px-2 py-1">{rev.number}</td>
                                  <td className="px-2 py-1">{rev.type}</td>
                                  <td className="px-2 py-1">{rev.date_done}</td>
                                  <td className={`px-2 py-1 ${isExpired(rev.valid_until) ? "text-red-600 font-semibold" : ""}`}>
                                    {rev.valid_until}
                                  </td>
                                  <td className={`px-2 py-1 ${isDone ? "text-green-700" : "text-blue-600"}`}>
                                    {rev.status}
                                  </td>
                                  <td className="px-2 py-1">
                                    <div className="flex flex-wrap gap-2 text-sm">
                                      <button
                                        className="text-blue-600 hover:underline"
                                        onClick={() => openRevision(proj.id, rev)}
                                        title={isDone ? "DokonÄŤeno â€“ otevĹ™Ă­t po zadĂˇnĂ­ hesla" : "OtevĹ™Ă­t"}
                                      >
                                        OtevĹ™Ă­t
                                      </button>
                                      <button
                                        className="text-red-600 hover:underline"
                                        onClick={async () => {
                                          const confirmDelete = window.confirm("Opravdu chceĹˇ smazat tuto revizi?");
                                          if (!confirmDelete) return;
                                          try {
                                            const res = await fetch(apiUrl(`/revisions/${rev.id}`), {
                                              method: "DELETE",
                                              headers: { ...authHeader(token!) },
                                            });
                                            if (!res.ok) throw new Error("MazĂˇnĂ­ selhalo");
                                            fetchProjects();
                                          } catch (err) {
                                            console.error("âťŚ Chyba pĹ™i mazĂˇnĂ­ revize:", err);
                                          }
                                        }}
                                      >
                                        Smazat
                                      </button>
                                      <button
                                        onClick={() => navigate(`/summary/${rev.id}`)}
                                        className="text-green-600 hover:underline"
                                      >
                                        Souhrn
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {/* mezera */}
                        <div className="h-4" />

                        {/* VV Protokoly */}
                        <div className="rounded-md border border-slate-200 bg-white p-3">
                          <div className="mb-2 rounded border border-transparent bg-gray-100 px-3 py-2 text-sm font-semibold">
                            Protokoly o urÄŤenĂ­ vnÄ›jĹˇĂ­ch vlivĹŻ
                          </div>
                          <table className="compact-table w-full">
                            <thead>
                              <tr>
                                <th className="px-2 py-1 text-left">#</th>
                                <th className="px-2 py-1 text-left">NĂˇzev / Prostor</th>
                                <th className="px-2 py-1 text-left">Datum</th>
                                <th className="px-2 py-1 text-left">Akce</th>
                              </tr>
                            </thead>
                            <tbody>
                              {vvLoading[proj.id] && (
                                <tr><td className="px-2 py-1" colSpan={4}>NaÄŤĂ­tĂˇm VVâ€¦</td></tr>
                              )}
                              {!vvLoading[proj.id] && (vvByProject[proj.id]?.length ?? 0) === 0 && (
                                <tr><td className="px-2 py-1" colSpan={4}>Ĺ˝ĂˇdnĂ© protokoly.</td></tr>
                              )}
                              {(vvByProject[proj.id] || []).map((vv: any) => {
                                const spaceName = vv.data_json?.spaces?.[0]?.name ?? "â€”";
                                const date = vv.data_json?.date ?? "â€”";
                                return (
                                  <tr key={vv.id} className="border-t">
                                    <td className="px-2 py-1 font-mono">{vv.number ?? vv.id}</td>
                                    <td className="px-2 py-1">
                                      {vv.data_json?.objectName || "bez nĂˇzvu"} Â·{" "}
                                      <span className="text-slate-500">{spaceName}</span>
                                    </td>
                                    <td className="px-2 py-1">{date}</td>
                                    <td className="px-2 py-1">
                                      <div className="flex flex-wrap gap-2 text-sm">
                                        <button
                                          className="text-blue-600 hover:underline"
                                          onClick={() => navigate(`/vv/${vv.id}`)}
                                        >
                                          OtevĹ™Ă­t
                                        </button>
                                        <button
                                          className="text-red-600 hover:underline"
                                          onClick={async () => {
                                            if (!window.confirm("Opravdu chceĹˇ smazat tento VV protokol?")) return;
                                            try {
                                              const res = await fetch(apiUrl(`/vv/${vv.id}`), {
                                                method: "DELETE",
                                                headers: { ...authHeader(token!) },
                                              });
                                              if (!res.ok) throw new Error("MazĂˇnĂ­ selhalo");
                                              loadVvForProject(proj.id);
                                            } catch (err) {
                                              console.error("âťŚ Chyba pĹ™i mazĂˇnĂ­ VV:", err);
                                            }
                                          }}
                                        >
                                          Smazat
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Dialog â€žPĹ™idatâ€ś: VV + zĂşĹľenĂ© revize */}
                        {showDialog && selectedProjectId === proj.id && (
                          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                          <div className="compact-card w-80 space-y-4">
                            <h2 className="text-base font-semibold">Vyber, co chceĹˇ pĹ™idat</h2>

                              {/* VV */}
                              <div
                                className="cursor-pointer rounded border px-3 py-2 hover:bg-gray-100"
                                onClick={async () => {
                                  setShowDialog(false);
                                  try {
                                    // vytvoĹ™enĂ­ VV v DB pĹ™es context (POST /vv)
                                    const created = await addVvDoc(proj.id, {
                                      objectName: proj.address ? `${proj.address}` : "Objekt",
                                      address: proj.address || "",
                                    });
                                    // otevĹ™i editor VV (/vv/:id)
                                    navigate(`/vv/${created.id}`);
                                    // refresh listu VV
                                    loadVvForProject(proj.id);
                                  } catch (err: any) {
                                    console.error("âťŚ VV create failed:", err?.response?.data || err);
                                    alert("NepodaĹ™ilo se zaloĹľit VV protokol.");
                                  }
                                }}
                              >
                                PosouzenĂ­ vnÄ›jĹˇĂ­ch vlivĹŻ (VV)
                              </div>

                              {/* Revize */}
                              <ul className="overflow-hidden rounded border text-sm">
                                {revisionTypes.map((type, idx) => (
                                  <li
                                    key={type}
                                    className={`p-2 hover:bg-gray-100 cursor-pointer ${
                                      idx < revisionTypes.length - 1 ? "border-b" : ""
                                    }`}
                                    onClick={async () => {
                                      setShowDialog(false);
                                      const newRevision: any = {
                                        project_id: proj.id,
                                        type,
                                        date_done: new Date().toISOString().split("T")[0],
                                        valid_until: new Date(new Date().setFullYear(new Date().getFullYear() + 4))
                                          .toISOString()
                                          .split("T")[0],
                                        status: "RozpracovanĂˇ",
                                        data_json: { poznĂˇmka: "zatĂ­m prĂˇzdnĂ©" },
                                      };
                                      if (owner_id != null) newRevision.owner_id = owner_id;

                                      try {
                                        const response = await fetch(apiUrl("/revisions"), {
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
                                        console.error("âťŚ Chyba pĹ™i uklĂˇdĂˇnĂ­ revize:", error);
                                        alert(String(error));
                                      }
                                    }}
                                  >
                                    {type}
                                  </li>
                                ))}
                              </ul>

                              <button
                                className="mt-2 w-full rounded bg-gray-200 px-3 py-1.5 text-sm"
                                onClick={() => setShowDialog(false)}
                              >
                                ZruĹˇit
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

      {/* NovĂ˝ projekt dialog */}
      {showNewProjectDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="compact-card w-full max-w-md space-y-4">
            <h2 className="text-base font-semibold">NovĂ˝ projekt</h2>
            <input
              type="text"
              className="w-full rounded border px-3 py-1.5"
              placeholder="Adresa"
              value={newProjectData.address}
              onChange={(e) => setNewProjectData({ ...newProjectData, address: e.target.value })}
            />
            <input
              type="text"
              className="w-full rounded border px-3 py-1.5"
              placeholder="Objednatel"
              value={newProjectData.client}
              onChange={(e) => setNewProjectData({ ...newProjectData, client: e.target.value })}
            />
            <div className="flex justify-end gap-2 text-sm">
              <button className="rounded bg-gray-200 px-3 py-1.5" onClick={() => setShowNewProjectDialog(false)}>
                ZruĹˇit
              </button>
              <button
                className="rounded bg-blue-600 px-3 py-1.5 font-medium text-white transition hover:bg-blue-700"
                onClick={handleSaveNewProject}
                title="UloĹľit novĂ˝ projekt"
              >
                UloĹľit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock modal â€“ heslo pro dokonÄŤenou revizi */}
      {unlockFor.revId !== null && (
        <div
          className="fixed inset-0 bg-black/40 grid place-items-center z-50"
          onClick={() => setUnlockFor({ projectId: null, revId: null })}
        >
          <div className="compact-card w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold">Revize je dokonÄŤenĂˇ</h3>
            <p className="text-sm text-gray-600">Pro otevĹ™enĂ­ zadej svĂ© heslo.</p>
            <input
              type="password"
              className="w-full rounded border px-3 py-1.5"
              placeholder="Heslo"
              value={unlockPwd}
              onChange={(e) => setUnlockPwd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitUnlock()}
              autoFocus
            />
            {unlockErr && <div className="text-red-600 text-sm mb-2">{unlockErr}</div>}
            <div className="flex justify-end gap-2 text-sm">
              <button
                className="rounded bg-gray-200 px-3 py-1.5"
                onClick={() => setUnlockFor({ projectId: null, revId: null })}
                disabled={unlockBusy}
              >
                ZruĹˇit
              </button>
              <button
                className="rounded bg-blue-600 px-3 py-1.5 font-medium text-white"
                onClick={submitUnlock}
                disabled={unlockBusy || !unlockPwd}
              >
                Odemknout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


