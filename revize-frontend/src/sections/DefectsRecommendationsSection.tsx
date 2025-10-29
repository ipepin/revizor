// src/sections/DefectsRecommendationsSection.tsx
import React, { useState, useEffect, ChangeEvent, useContext, useMemo, useCallback } from "react";
import api from "../api/axios"; // ← náš axios klient s JWT
import { RevisionFormContext } from "../context/RevisionFormContext";

type Defect = {
  id?: number;
  description: string;
  standard: string;
  article: string;
};

type CatalogDefect = Defect & {
  visibility?: "global" | "user";
  moderation_status?: "none" | "pending" | "rejected";
  reject_reason?: string | null;
  usage_count?: number;
};

// ————————————————————————————————————————————————————————————————
// Pomocné utily
// ————————————————————————————————————————————————————————————————
function splitStandardArticle(input?: string): { standard: string; article: string } {
  const s = (input || "").trim();
  if (!s) return { standard: "", article: "" };
  const m = s.match(/^(.*?)(?:\s*(?:čl\.?|cl\.?)\s*([0-9A-Za-z.\-\/]+))$/i);
  if (m) {
    return { standard: (m[1] || "").trim(), article: (m[2] || "").trim() };
  }
  return { standard: s, article: "" };
}

function normalizeDefect(raw: any): CatalogDefect {
  const id = raw?.id ?? raw?.defect_id ?? raw?.pk ?? undefined;
  const description = raw?.description ?? raw?.text ?? raw?.name ?? "";

  let standard =
    raw?.standard ?? raw?.norm ?? raw?.norma ?? raw?.standard_code ?? raw?.standard_name ?? "";
  let article = raw?.article ?? raw?.clause ?? raw?.clanek ?? raw?.article_ref ?? "";

  const ref = raw?.reference ?? raw?.standard_article ?? raw?.norm_ref ?? "";
  if ((!standard && !article) && ref) {
    const s = splitStandardArticle(ref);
    standard = s.standard;
    article = s.article;
  }
  if (standard && !article) {
    const s = splitStandardArticle(standard);
    standard = s.standard;
    article = s.article;
  }

  const visibility = raw?.visibility === "global" ? "global" : raw?.visibility === "user" ? "user" : undefined;
  const moderation_status =
    raw?.moderation_status === "pending"
      ? "pending"
      : raw?.moderation_status === "rejected"
      ? "rejected"
      : "none";

  const usage_count =
    typeof raw?.usage_count === "number"
      ? raw.usage_count
      : typeof raw?.uses === "number"
      ? raw.uses
      : 0;

  return {
    id,
    description: String(description || ""),
    standard: String(standard || ""),
    article: String(article || ""),
    visibility,
    moderation_status,
    reject_reason: raw?.reject_reason ?? null,
    usage_count,
  };
}

// ————————————————————————————————————————————————————————————————
// Hlavní komponenta
// ————————————————————————————————————————————————————————————————
export default function DefectsRecommendationsSection() {
  const { form, setForm } = useContext(RevisionFormContext);

  const [catalog, setCatalog] = useState<CatalogDefect[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  // nový, vylepšený dialog
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<Defect>({ description: "", standard: "", article: "" });
  const [submitToGlobal, setSubmitToGlobal] = useState(false);
  const addFormValid = (addForm.description || "").trim().length >= 3;

  const [toDelete, setToDelete] = useState<CatalogDefect | null>(null);

  // Controlled textarea state
  const [defectsText, setDefectsText] = useState<string>("");

  // Vyhledávání v pickeru
  const [pickerQuery, setPickerQuery] = useState("");

  // Řazení – NOVĚ
  type SortBy = "usage" | "id" | "description";
  type SortDir = "asc" | "desc";
  const [sortByPicker, setSortByPicker] = useState<SortBy>("usage");
  const [sortDirPicker, setSortDirPicker] = useState<SortDir>("desc");

  const [sortByEditor, setSortByEditor] = useState<SortBy>("id");
  const [sortDirEditor, setSortDirEditor] = useState<SortDir>("asc");

  // Inicializace textarea z form.defects
  useEffect(() => {
    const initial = (form.defects || []).map(
      (d, i) => `${i + 1}) ${d.description} - ${d.standard} - ${d.article}`
    );
    setDefectsText(initial.join("\n"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Načtení katalogu (normalizace polí)
  const loadCatalog = useCallback(async () => {
    try {
      const res = await api.get<any[]>("/defects");
      const normalized = (res.data || []).map(normalizeDefect);
      setCatalog(normalized);
    } catch (e) {
      alert("Chyba při načítání katalogu závad");
    }
  }, []);

  // Při otevření pickeru vždy načti čerstvý katalog
  useEffect(() => {
    if (showPicker) loadCatalog();
  }, [showPicker, loadCatalog]);

  // Při otevření editoru také načti čerstvě
  useEffect(() => {
    if (showEditor) loadCatalog();
  }, [showEditor, loadCatalog]);

  // Přidání ze seznamu do formuláře + do textarea
  async function addDefectToList(d: CatalogDefect) {
    const item: Defect = {
      description: d.description || "",
      standard: d.standard || "",
      article: d.article || "",
    };
    setForm((f) => ({ ...f, defects: [...(f.defects || []), item] }));

    // optimistické zvýšení použití v lokálním katalogu
    if (d.id) {
      setCatalog((prev) =>
        prev.map((x) => (x.id === d.id ? { ...x, usage_count: (x.usage_count || 0) + 1 } : x))
      );
      // pokus o informování backendu (tichá chyba)
      try {
        await api.post(`/defects/${d.id}/use`);
      } catch {
        // ignore
      }
    }

    setDefectsText((prev) => {
      const lines = prev ? prev.split("\n") : [];
      const nextIndex = lines.filter((l) => l.trim().length > 0).length + 1;
      const newLine = `${nextIndex}) ${item.description} - ${item.standard} - ${item.article}`;
      return prev && prev.trim().length ? prev + "\n" + newLine : newLine;
    });
    setShowPicker(false);
  }

  // Textarea → parsování do form.defects
  function onChangeTextarea(e: ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    setDefectsText(text);
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const cleaned = line.replace(/^\s*\d+\)\s*/, "");
        const parts = cleaned.split(/\s-\s/); // očekáváme "popis - standard - článek"
        return {
          description: parts[0] || "",
          standard: parts[1] || "",
          article: parts[2] || "",
        };
      });
    setForm((f) => ({ ...f, defects: lines }));
  }

  // ——— Editor katalogu ———
  function onChangeCatalog(idx: number, field: keyof Omit<Defect, "id">, val: string) {
    setCatalog((c) => c.map((d, i) => (i === idx ? { ...d, [field]: val } : d)));
  }

  async function saveCatalogItem(idx: number) {
    const d = catalog[idx];
    if (!d?.id) return;
    try {
      await api.put(`/defects/${d.id}`, {
        description: d.description,
        standard: d.standard,
        article: d.article,
      });
      await loadCatalog();
    } catch {
      alert("Chyba při ukládání změn");
    }
  }

  function confirmDelete(d: CatalogDefect) {
    setToDelete(d);
  }

  async function deleteCatalogItem() {
    if (!toDelete?.id) return;
    try {
      await api.delete(`/defects/${toDelete.id}`);
      setToDelete(null);
      await loadCatalog();
    } catch {
      setToDelete(null);
      alert("Chyba při mazání položky");
    }
  }

  // ——— Nový vylepšený dialog: vytvoření položky ———
  const previewLine = useMemo(() => {
    const parts = [addForm.description?.trim(), addForm.standard?.trim(), addForm.article?.trim()].filter(Boolean);
    return parts.join(" - ");
  }, [addForm]);

  // TOP normy podle usage_count (fallback na statický seznam)
  const fallbackStandards = [
    "ČSN 33 2000-1 ed.2:2009",
    "ČSN 33 2000-5-51 ed.3:2022",
    "ČSN 33 2000-5-54 ed.3:2012",
    "ČSN 33 2000-6 ed.2:2017",
    "ČSN EN 61439-1",
    "ČSN 33 2000-7-701",
  ];

  const dynamicQuickStandards = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of catalog) {
      const s = (d.standard || "").trim();
      if (!s) continue;
      counts.set(s, (counts.get(s) || 0) + (d.usage_count || 0));
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
    const top = sorted.slice(0, 6);
    if (top.length > 0) return top;
    return fallbackStandards;
  }, [catalog]);

  function onKeyDownAddModal(e: React.KeyboardEvent<HTMLDivElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter" && addFormValid) {
      void createCatalogItem();
    }
  }

  async function createCatalogItem() {
    try {
      const res = await api.post("/defects", {
        description: (addForm.description || "").trim(),
        standard: (addForm.standard || "").trim(),
        article: (addForm.article || "").trim(),
      });

      const created = res?.data as CatalogDefect | undefined;
      if (created?.id && submitToGlobal) {
        try {
          await api.post(`/defects/${created.id}/submit`, { note: "" });
        } catch {
          console.warn("Submit k posouzení selhal.");
        }
      }

      setAddForm({ description: "", standard: "", article: "" });
      setSubmitToGlobal(false);
      setShowAddModal(false);
      await loadCatalog();
    } catch {
      alert("Chyba při vytváření položky");
    }
  }

  // ——— Filtrování + Řazení v PICKERU ———
  const filteredCatalog = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    let arr = q
      ? catalog.filter((d) => {
          const hay = `${d.description} ${d.standard} ${d.article}`.toLowerCase();
          return hay.includes(q);
        })
      : [...catalog];

    const dir = sortDirPicker === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      if (sortByPicker === "usage") {
        const av = a.usage_count ?? 0;
        const bv = b.usage_count ?? 0;
        return (av - bv) * dir;
      }
      if (sortByPicker === "id") {
        const av = a.id ?? 0;
        const bv = b.id ?? 0;
        return (av - bv) * dir;
      }
      // description
      return a.description.localeCompare(b.description) * dir;
    });

    return arr;
  }, [catalog, pickerQuery, sortByPicker, sortDirPicker]);

  // ——— Řazení v EDITORU ———
  const sortedEditorCatalog = useMemo(() => {
    const dir = sortDirEditor === "asc" ? 1 : -1;
    const arr = [...catalog];
    arr.sort((a, b) => {
      if (sortByEditor === "usage") {
        const av = a.usage_count ?? 0;
        const bv = b.usage_count ?? 0;
        return (av - bv) * dir;
      }
      if (sortByEditor === "id") {
        const av = a.id ?? 0;
        const bv = b.id ?? 0;
        return (av - bv) * dir;
      }
      return a.description.localeCompare(b.description) * dir;
    });
    return arr;
  }, [catalog, sortByEditor, sortDirEditor]);

  return (
    <section className="space-y-4 text-sm text-gray-800">
      <h2 className="text-lg font-semibold">Závady a doporučení</h2>

      <textarea
        className="w-full rounded border px-3 py-1.5 text-sm whitespace-pre-wrap"
        rows={6}
        placeholder="Každá závada na samostatném řádku"
        value={defectsText}
        onChange={onChangeTextarea}
      />

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          onClick={() => setShowPicker(true)}
        >
          ➕ Přidat závadu
        </button>
        <button
          className="rounded bg-gray-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-700"
          onClick={() => setShowEditor(true)}
        >
          ⚙️ Editor katalogu
        </button>
      </div>

      {/* ——— PICKER: Výběr ze seznamu závad ——— */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="compact-card w-full max-w-5xl space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold">Vyberte závadu</h3>
              <button
                className="text-sm text-gray-600 transition hover:text-gray-900"
                onClick={() => setShowPicker(false)}
              >
                ✖ Zavřít
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                className="flex-1 min-w-[240px] rounded border px-3 py-1.5 text-sm"
                placeholder="Hledat v popisu / normě / článku…"
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Řadit podle</label>
                <select
                  className="rounded border px-3 py-1.5 text-sm"
                  value={sortByPicker}
                  onChange={(e) => setSortByPicker(e.target.value as any)}
                >
                  <option value="usage">Použití</option>
                  <option value="id">ID</option>
                  <option value="description">Název</option>
                </select>
                <button
                  className="rounded border px-2 py-1 text-sm"
                  title={sortDirPicker === "asc" ? "Řadit sestupně" : "Řadit vzestupně"}
                  onClick={() => setSortDirPicker((d) => (d === "asc" ? "desc" : "asc"))}
                >
                  {sortDirPicker === "asc" ? "↑" : "↓"}
                </button>
              </div>
              <button
                className="ml-auto rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                onClick={() => setShowAddModal(true)}
              >
                ➕ Nová položka
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto rounded border">
              <table className="compact-table w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left">Závada</th>
                    <th className="px-2 py-1 text-left">Norma</th>
                    <th className="px-2 py-1 text-left">Článek</th>
                    <th className="px-2 py-1 text-right">Použití</th>
                    <th className="px-2 py-1 text-center">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCatalog.map((d) => (
                    <tr key={d.id ?? `${d.description}-${d.standard}-${d.article}`} className="border-t">
                      <td className="px-2 py-1">
                        {d.description}{" "}
                        {d.visibility === "global" ? (
                          <span className="ml-1 text-[10px] bg-blue-100 text-blue-800 px-1 rounded align-middle">🌐</span>
                        ) : null}
                        {d.moderation_status === "pending" ? (
                          <span className="ml-1 text-[10px] bg-yellow-100 text-yellow-800 px-1 rounded align-middle">⏳</span>
                        ) : null}
                      </td>
                      <td className="px-2 py-1">{d.standard || "—"}</td>
                      <td className="px-2 py-1">{d.article || "—"}</td>
                      <td className="px-2 py-1 text-right font-mono tabular-nums">{d.usage_count ?? 0}</td>
                      <td className="px-2 py-1 text-center">
                        <button className="px-2 text-green-600" onClick={() => addDefectToList(d)}>✔️</button>
                      </td>
                    </tr>
                  ))}
                  {filteredCatalog.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-gray-600">
                        Nic nenalezeno. Přidej novou položku →
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 text-sm">
              <button
                className="rounded bg-gray-200 px-3 py-1.5"
                onClick={() => setShowPicker(false)}
              >
                Zavřít
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ——— EDITOR KATALOGU ——— */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="compact-card w-full max-w-6xl max-h-[85vh] overflow-auto space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold">Editor katalogu závad</h3>
              <button className="text-sm text-gray-600 transition hover:text-gray-900" onClick={() => setShowEditor(false)}>
                ✖ Zavřít
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-gray-600">
                Úpravy prováděj přímo v tabulce. Přidávání je přes <b>„Nová položka“</b>.
              </p>

              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-700">Řadit podle</label>
                <select
                  className="rounded border px-3 py-1.5 text-sm"
                  value={sortByEditor}
                  onChange={(e) => setSortByEditor(e.target.value as any)}
                >
                  <option value="id">ID</option>
                  <option value="usage">Použití</option>
                  <option value="description">Název</option>
                </select>
                <button
                  className="rounded border px-2 py-1 text-sm"
                  title={sortDirEditor === "asc" ? "Řadit sestupně" : "Řadit vzestupně"}
                  onClick={() => setSortDirEditor((d) => (d === "asc" ? "desc" : "asc"))}
                >
                  {sortDirEditor === "asc" ? "↑" : "↓"}
                </button>

                <button
                  className="ml-2 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
                  onClick={() => setShowAddModal(true)}
                >
                  ➕ Nová položka
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-auto rounded border">
              <table className="compact-table w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left">Závada</th>
                    <th className="px-2 py-1 text-left">Norma</th>
                    <th className="px-2 py-1 text-left">Článek</th>
                    <th className="px-2 py-1 text-right">Použití</th>
                    <th className="px-2 py-1 text-center whitespace-nowrap">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEditorCatalog.map((d, idx) => (
                    <tr key={d.id ?? `edit-${idx}`} className="border-t">
                      <td className="px-2 py-1">
                        <input
                          className="w-full rounded border px-3 py-1 text-sm"
                          value={d.description}
                          onChange={(e) => onChangeCatalog(idx, "description", e.target.value)}
                        />
                        <div className="mt-1 text-[10px] text-gray-500">
                          {d.visibility === "global" ? "🌐 společná" : "👤 uživatelská"}{" "}
                          {d.moderation_status === "pending" ? "• čeká na schválení" : ""}
                          {d.moderation_status === "rejected" ? `• zamítnuto (${d.reject_reason || "bez důvodu"})` : ""}
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full rounded border px-3 py-1 text-sm"
                          value={d.standard}
                          onChange={(e) => onChangeCatalog(idx, "standard", e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full rounded border px-3 py-1 text-sm"
                          value={d.article}
                          onChange={(e) => onChangeCatalog(idx, "article", e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1 text-right font-mono tabular-nums">{d.usage_count ?? 0}</td>
                      <td className="px-2 py-1 text-center whitespace-nowrap">
                        <button className="px-2 text-green-600" onClick={() => saveCatalogItem(idx)} title="Uložit úpravy">💾</button>
                        {d.visibility === "user" && d.moderation_status !== "pending" && d.id && (
                          <button
                            className="px-2 text-blue-600"
                            title="Navrhnout do společného závadovníku"
                            onClick={async () => {
                              try {
                                await api.post(`/defects/${d.id}/submit`, { note: "" });
                                await loadCatalog();
                              } catch {
                                alert("Odeslání ke schválení selhalo");
                              }
                            }}
                          >
                            ⬆️
                          </button>
                        )}
                        <button className="px-2 text-red-600" onClick={() => confirmDelete(d)} title="Smazat">🗑️</button>
                      </td>
                    </tr>
                  ))}
                  {sortedEditorCatalog.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-center text-gray-600">Katalog je prázdný.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end text-sm">
              <button className="rounded bg-gray-200 px-3 py-1.5" onClick={() => setShowEditor(false)}>
                Zavřít
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ——— MODAL: NOVÁ POLOŽKA ——— */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center" onKeyDown={onKeyDownAddModal}>
          <div className="compact-card w-full max-w-4xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Nová závada</h3>
                <div className="text-sm text-gray-500">
                  Vyplň popis, případně normu a článek. Uložit: <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd>
                </div>
              </div>
              <button className="text-gray-600 transition hover:text-gray-900" onClick={() => setShowAddModal(false)}>
                ✖
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="font-semibold text-sm">Popis závady</label>
                <textarea
                  rows={6}
                  className="w-full rounded border px-3 py-1.5"
                  placeholder="Např. Ochranné pospojování - HOP…"
                  value={addForm.description}
                  onChange={(e) => setAddForm((s) => ({ ...s, description: e.target.value }))}
                />
                <div className="mt-2 text-xs text-gray-500">
                  Piš celou větu – bude se propisovat do protokolu i do textového pole výše.
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="font-semibold text-sm">Norma</label>
                  <input
                    className="w-full rounded border px-3 py-1.5"
                    placeholder="ČSN …"
                    value={addForm.standard}
                    onChange={(e) => setAddForm((s) => ({ ...s, standard: e.target.value }))}
                  />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {dynamicQuickStandards.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                        onClick={() => setAddForm((f) => ({ ...f, standard: s }))}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-sm">Článek</label>
                  <input
                    className="w-full rounded border px-3 py-1.5"
                    placeholder="např. 542.4"
                    value={addForm.article}
                    onChange={(e) => setAddForm((s) => ({ ...s, article: e.target.value }))}
                  />
                </div>

                <div className="pt-2">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={submitToGlobal}
                      onChange={(e) => setSubmitToGlobal(e.target.checked)}
                    />
                    Navrhnout ke schválení do společného závadovníku
                  </label>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1 text-sm font-semibold">Náhled zápisu</div>
              <div className="rounded border bg-gray-50 px-3 py-2 text-sm">
                {previewLine || <span className="text-gray-400">— nic k zobrazení —</span>}
              </div>
            </div>

            <div className="flex justify-end gap-2 text-sm">
              <button className="rounded bg-gray-200 px-3 py-1.5" onClick={() => setShowAddModal(false)}>
                Zrušit
              </button>
              <button
                className={`rounded px-3 py-1.5 font-medium text-white transition ${
                  addFormValid ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-300 cursor-not-allowed"
                }`}
                onClick={createCatalogItem}
                disabled={!addFormValid}
                title={!addFormValid ? "Vyplň alespoň popis" : "Uložit (Ctrl/⌘ + Enter)"}
              >
                Uložit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ——— Potvrzení mazání ——— */}
      {toDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="compact-card w-full max-w-lg space-y-3">
            <h3 className="text-base font-semibold">Opravdu smazat položku?</h3>
            <p>
              {toDelete.description} ({toDelete.standard || "—"}, čl. {toDelete.article || "—"})
            </p>
            <div className="flex justify-end gap-2 text-sm">
              <button className="rounded bg-gray-200 px-3 py-1.5" onClick={() => setToDelete(null)}>
                Zrušit
              </button>
              <button className="rounded bg-red-600 px-3 py-1.5 text-white" onClick={deleteCatalogItem}>
                Smazat
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
