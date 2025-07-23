import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [projects, setProjects] = useState<any[]>([]);
  const [expandedProjectId, setExpandedProjectId] = useState<number | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectData, setNewProjectData] = useState({ address: "", client: "" });
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const revisionTypes = ["Odběrné místo", "Elektroinstalace", "FVE", "Spotřebič", "Stroj"];

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("http://localhost:8000/projects");
      const data = await res.json();
      setProjects(data);
    } catch (err) {
      console.error("Chyba při načítání projektů:", err);
    }
  };

  const isExpired = (date: string) => new Date(date) < new Date();

  const handleAddRevision = (projectId: number) => {
    setSelectedProjectId(projectId);
    setShowDialog(true);
  };

  const handleSaveNewProject = async () => {
    try {
      const res = await fetch("http://localhost:8000/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProjectData),
      });
      if (!res.ok) throw new Error("Chyba při ukládání");
      setShowNewProjectDialog(false);
      setNewProjectData({ address: "", client: "" });
      fetchProjects();
    } catch (err) {
      console.error("Chyba při uložení projektu:", err);
    }
  };
  const handleDeleteProject = async (projectId: number) => {
    try {
      const res = await fetch(`http://localhost:8000/projects/${projectId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Chyba při mazání");
      alert("✅ Projekt byl úspěšně smazán");
      fetchProjects();
    } catch (err) {
      console.error("Chyba při mazání projektu:", err);
      alert("❌ Nepodařilo se projekt smazat");
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-100 to-blue-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg p-4 flex flex-col">
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-blue-400 mx-auto mb-2 shadow-inner" />
          <div className="font-bold text-blue-900">Ing. Petr Revizní</div>
          <div className="text-sm text-gray-600">Oprávnění: 123456</div>
          <div className="text-sm text-gray-600">Osvědčení: 7891011</div>
          <div className="text-sm text-gray-600">Platnost: 12/2026</div>
        </div>

        <button className="bg-blue-600 text-white px-4 py-2 rounded mb-2 hover:bg-blue-700 transition"
          onClick={() => setShowNewProjectDialog(true)}>
          + Nový projekt
        </button>

        <div className="relative">
          <button
            className="bg-gray-200 px-4 py-2 rounded w-full text-left hover:bg-gray-300 transition"
            onClick={() => setShowSettings(!showSettings)}
          >
            ⚙️ Nastavení
          </button>
          {showSettings && (
            <ul className="absolute left-0 mt-2 bg-white border rounded shadow w-full z-10">
              <li className="p-2 hover:bg-gray-100 cursor-pointer">👤 Profil</li>
              <li className="p-2 hover:bg-gray-100 cursor-pointer">🖨️ Tisk</li>
              <li className="p-2 hover:bg-gray-100 cursor-pointer">🚪 Odhlásit se</li>
            </ul>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6">
        <h1 className="text-3xl font-bold text-blue-800 mb-4">📁 Projekty</h1>

        {/* Filtry */}
        <div className="flex gap-4 mb-4">
          <input
          type="text"
          className="p-2 border rounded w-full mb-4"
          placeholder="Hledat adresu nebo objednatele..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
          
        </div>

        {/* Tabulka projektů */}
        <table className="w-full bg-white border rounded shadow text-sm">
          <thead className="bg-blue-100 text-blue-900">
            <tr>
              <th className="p-2 text-left">🏠 Adresa</th>
              <th className="p-2 text-left">🧾 Objednatel</th>
              <th className="p-2 text-left">📆 Platnost</th>
              <th className="p-2 text-left">📄 Revize</th>
            </tr>
          </thead>
          <tbody>
            {projects
              .filter((p) => {
                const s = search.toLowerCase();
                return (
                  p.address.toLowerCase().includes(s) ||
                  p.client.toLowerCase().includes(s)
                );
              })
              .map((proj) => {
                const expired = proj.revisions?.some((r: any) => isExpired(r.valid_until));
                const isSelected = expandedProjectId === proj.id;
                const sortedRevisions = [...(proj.revisions || [])].sort(
                  (a, b) => new Date(b.date_done).getTime() - new Date(a.date_done).getTime()
                );

                return (
                  <React.Fragment key={proj.id}>
                    <tr
                      className={`cursor-pointer border-t hover:bg-blue-50 ${isSelected ? "bg-blue-100" : ""}`}
                      onClick={() => setExpandedProjectId(isSelected ? null : proj.id)}
                    >
                      <td className="p-2">{proj.address}</td>
                      <td className="p-2">{proj.client}</td>
                      <td className={`p-2 ${expired ? "text-red-600 font-semibold" : "text-green-700"}`}>
                        {expired ? "Revize po platnosti" : "OK"}
                      </td>
                      <td className="p-2">{proj.revisions?.length ?? 0}</td>
                    </tr>

                    {isSelected && (
                      <tr>
                        <td colSpan={4} className="bg-blue-50 p-2">
                          <div className="text-right mb-2">
                            <button className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                              onClick={() => handleAddRevision(proj.id)}>
                              ➕ Přidat revizi
                            </button>
                          </div>
                          <div className="text-right mb-2 flex justify-between">
                          <button
                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                            onClick={() => {
                              if (window.confirm("Opravdu chcete smazat tento projekt včetně všech revizí?")) {
                                handleDeleteProject(proj.id);
                              }
                            }}
                          >
                            🗑️ Smazat projekt
                          </button>

                          
                        </div>
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
                              {sortedRevisions.map((rev) => (
                                <tr key={rev.id} className="border-t">
                                  <td className="p-2">{rev.number}</td>
                                  <td className="p-2">{rev.type}</td>
                                  <td className="p-2">{rev.date_done}</td>
                                  <td className={`p-2 ${isExpired(rev.valid_until) ? "text-red-600 font-semibold" : ""}`}>
                                    {rev.valid_until}
                                  </td>
                                  <td className={`p-2 ${rev.status === "Hotová"
                                    ? "text-green-600 font-semibold"
                                    : "text-blue-600 font-semibold"
                                  }`}>
                                    {rev.status}
                                  </td>
                                  <td className="p-2 space-x-2">
                                    <button className="text-blue-600 hover:underline" onClick={() => navigate(`/revize/${rev.id}`)}>Otevřít</button>
                                    <button
                                        className="text-red-600 hover:underline"
                                        onClick={async () => {
                                          const confirm = window.confirm("Opravdu chceš smazat tuto revizi?");
                                          if (!confirm) return;

                                          try {
                                            const res = await fetch(`http://localhost:8000/revisions/${rev.id}`, {
                                              method: "DELETE"
                                            });

                                            if (!res.ok) throw new Error("Mazání selhalo");

                                            // Refresh projektu po smazání
                                            const updated = await fetch("http://localhost:8000/projects").then(r => r.json());
                                            setProjects(updated);
                                          } catch (err) {
                                            console.error("❌ Chyba při mazání revize:", err);
                                          }
                                        }}
                                      >
                                        Smazat
                                      </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
          </tbody>
        </table>
      </main>
      
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
                <button
                  className="px-4 py-2 bg-gray-300 rounded"
                  onClick={() => setShowNewProjectDialog(false)}
                >
                  Zrušit
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={handleSaveNewProject}
                >
                  Uložit
                </button>
              </div>
            </div>
        </div>
    )}

    {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-80">
            <h2 className="text-lg font-semibold mb-4">Vyber typ revize</h2>
            <ul>
              {["Elektroinstalace", "Spotřebič", "FVE", "Odběrné místo", "Stroj"].map((type) => (
                <li
                  key={type}
                  className="p-2 hover:bg-gray-100 cursor-pointer border-b"
                  onClick={async () => {
                    if (!selectedProjectId) return;

                    const newRevision = {
                      project_id: selectedProjectId,
                      type,
                      number: `RZ-${Math.floor(Math.random() * 1000)}`,
                      date_done: new Date().toISOString().split("T")[0],
                      valid_until: new Date(new Date().setFullYear(new Date().getFullYear() + 4)).toISOString().split("T")[0],
                      status: "Rozpracovaná",
                      data_json: JSON.stringify({ poznámka: "zatím prázdné" })
                    };

                    try {
                      const response = await fetch("http://localhost:8000/revisions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(newRevision)
                      });

                      if (!response.ok) throw new Error("Server error");

                      const result = await response.json();
                      console.log("✅ Revize uložena:", result);
                      // Refresh dat
                      fetchProjects();
                    } catch (error) {
                      console.error("❌ Chyba při ukládání revize:", error);
                    }

                    setShowDialog(false);
                  }}
                >
                  {type}
                </li>
              ))}
            </ul>
            <button
              className="mt-4 px-4 py-2 bg-gray-300 rounded w-full"
              onClick={() => setShowDialog(false)}
            >
              Zrušit
            </button>
          </div>
        </div>
      )}



    </div>
  );
  
}
