// src/sections/DefectsRecommendationsSection.tsx
import React, { useState, useEffect, useContext, useMemo, useCallback } from "react";
import api from "../api/axios"; // ← náš axios klient s JWT
import { RevisionFormContext, type DefectDraft as RevisionDefectDraft } from "../context/RevisionFormContext";
import { defectNormSuffix } from "../pages/summary-utils/defects";

type Defect = {
  uid: string;
  id?: number;
  description: string;
  standard: string;
  article: string;
};

type DefectPhoto = {
  id: number;
  revision_id: number;
  defect_uid?: string | null;
  caption: string;
  original_name?: string | null;
  mime_type: string;
  file_size: number;
  created_at?: string | null;
};

type CatalogDefect = Omit<Defect, "uid"> & {
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

function makeUid(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatDraftDate(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function mergeDefectDescription(existing: string, selected: string) {
  const current = String(existing || "").trim();
  const incoming = String(selected || "").trim();
  if (!current) return incoming;
  if (!incoming) return current;
  if (current === incoming || current.includes(incoming)) return current;
  return `${current}\n${incoming}`;
}

function DefectPhotoThumb({ revId, photo }: { revId: number; photo: DefectPhoto }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    let active = true;
    let objectUrl = "";
    (async () => {
      try {
        const res = await api.get(`/revisions/${revId}/photos/${photo.id}/thumb`, {
          responseType: "blob",
        });
        objectUrl = URL.createObjectURL(res.data);
        if (active) setSrc(objectUrl);
      } catch (e) {
        console.warn("Nepodařilo se načíst náhled fotografie:", e);
      }
    })();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photo.id, revId]);

  if (!src) {
    return <div className="flex aspect-[5/4] items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-400">Načítám…</div>;
  }

  return (
    <img
      src={src}
      alt={photo.caption || photo.original_name || "Fotografie"}
      className="aspect-[5/4] w-full rounded-lg object-cover"
    />
  );
}

// ————————————————————————————————————————————————————————————————
// Hlavní komponenta
// ————————————————————————————————————————————————————————————————
export default function DefectsRecommendationsSection() {
  const { form, setForm, revId, defectPhotosVersion, notifyDefectPhotosChanged } = useContext(RevisionFormContext);

  const [catalog, setCatalog] = useState<CatalogDefect[]>([]);
  const [photos, setPhotos] = useState<DefectPhoto[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<DefectPhoto | null>(null);
  const [previewSrc, setPreviewSrc] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTargetUid, setPickerTargetUid] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  // nový, vylepšený dialog
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<Omit<Defect, "uid">>({ description: "", standard: "", article: "" });
  const [submitToGlobal, setSubmitToGlobal] = useState(false);
  const addFormValid = (addForm.description || "").trim().length >= 3;

  const [toDelete, setToDelete] = useState<CatalogDefect | null>(null);

  // Vyhledávání v pickeru
  const [pickerQuery, setPickerQuery] = useState("");

  // Řazení – NOVĚ
  type SortBy = "usage" | "id" | "description";
  type SortDir = "asc" | "desc";
  const [sortByPicker, setSortByPicker] = useState<SortBy>("usage");
  const [sortDirPicker, setSortDirPicker] = useState<SortDir>("desc");

  const [sortByEditor, setSortByEditor] = useState<SortBy>("id");
  const [sortDirEditor, setSortDirEditor] = useState<SortDir>("asc");

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

  const loadPhotos = useCallback(async () => {
    if (!revId) return;
    try {
      const res = await api.get<DefectPhoto[]>(`/revisions/${revId}/photos`);
      const next = Array.isArray(res.data) ? res.data : [];
      setPhotos(next);
    } catch (e) {
      console.warn("Nepodařilo se načíst fotky závad:", e);
    }
  }, [revId]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos, defectPhotosVersion]);

  useEffect(() => {
    if (!previewPhoto) {
      setPreviewSrc("");
      return;
    }
    let active = true;
    let objectUrl = "";
    (async () => {
      try {
        const res = await api.get(`/revisions/${revId}/photos/${previewPhoto.id}/file`, {
          responseType: "blob",
        });
        objectUrl = URL.createObjectURL(res.data);
        if (active) setPreviewSrc(objectUrl);
      } catch (e) {
        console.warn("Nepodařilo se načíst plnou fotografii:", e);
      }
    })();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [previewPhoto, revId]);

  // Při otevření pickeru vždy načti čerstvý katalog
  useEffect(() => {
    if (showPicker) loadCatalog();
  }, [showPicker, loadCatalog]);

  useEffect(() => {
    if (showPicker) return;
    setPickerTargetUid(null);
  }, [showPicker]);

  // Při otevření editoru také načti čerstvě
  useEffect(() => {
    if (showEditor) loadCatalog();
  }, [showEditor, loadCatalog]);

  // Přidání ze seznamu do formuláře + do textarea
  async function addDefectToList(d: CatalogDefect) {
    if (pickerTargetUid) {
      setForm((f) => ({
        ...f,
        defects: (f.defects || []).map((defect) =>
          defect.uid === pickerTargetUid
            ? {
                ...defect,
                description: mergeDefectDescription(defect.description, d.description || ""),
                standard: d.standard || "",
                article: d.article || "",
              }
            : defect
        ),
      }));
    } else {
      const item: Defect = {
        uid: makeUid("defect"),
        description: d.description || "",
        standard: d.standard || "",
        article: d.article || "",
      };
      setForm((f) => ({ ...f, defects: [...(f.defects || []), item] }));
    }

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
    setShowPicker(false);
    setPickerTargetUid(null);
  }

  function openPickerForDefect(uid: string) {
    setPickerTargetUid(uid);
    setShowPicker(true);
  }

  function updateDefect(uid: string, patch: Partial<Omit<Defect, "uid" | "id">>) {
    setForm((f) => ({
      ...f,
      defects: (f.defects || []).map((defect) => (defect.uid === uid ? { ...defect, ...patch } : defect)),
    }));
  }

  function deleteDefect(uid: string) {
    if (!window.confirm("Opravdu smazat závadu?")) return;
    setForm((f) => ({
      ...f,
      defects: (f.defects || []).filter((defect) => defect.uid !== uid),
    }));
  }

  // ——— Editor katalogu ———
  function onChangeCatalog(idx: number, field: keyof Omit<Defect, "id" | "uid">, val: string) {
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

  const defectUidSet = useMemo(() => new Set((form.defects || []).map((d) => d.uid)), [form.defects]);
  const defectDrafts = Array.isArray(form.defectDrafts) ? form.defectDrafts : [];
  const unassignedPhotos = useMemo(
    () => photos.filter((photo) => !photo.defect_uid || !defectUidSet.has(photo.defect_uid)),
    [photos, defectUidSet]
  );
  const photosByDefect = useMemo(() => {
    const map = new Map<string, DefectPhoto[]>();
    for (const photo of photos) {
      if (!photo.defect_uid || !defectUidSet.has(photo.defect_uid)) continue;
      const bucket = map.get(photo.defect_uid) || [];
      bucket.push(photo);
      map.set(photo.defect_uid, bucket);
    }
    return map;
  }, [photos, defectUidSet]);

  const assignPhotoToDefect = async (photoId: number, defectUid: string) => {
    const sourcePhoto = photos.find((photo) => photo.id === photoId);
    const inferredText = String(sourcePhoto?.caption || "").trim();

    if (defectUid && inferredText) {
      setForm((f) => ({
        ...f,
        defects: (f.defects || []).map((defect) =>
          defect.uid === defectUid && !String(defect.description || "").trim()
            ? { ...defect, description: inferredText }
            : defect
        ),
      }));
    }

    try {
      await api.patch(`/revisions/${revId}/photos/${photoId}`, {
        defect_uid: defectUid || "",
      });
      notifyDefectPhotosChanged();
    } catch (e) {
      console.warn("Přiřazení fotky k závadě selhalo:", e);
    }
  };

  const deletePhoto = async (photoId: number) => {
    if (!window.confirm("Opravdu smazat fotografii?")) return;
    try {
      await api.delete(`/revisions/${revId}/photos/${photoId}`);
      notifyDefectPhotosChanged();
    } catch (e) {
      console.warn("Mazání fotografie selhalo:", e);
    }
  };

  const createDefectFromPhoto = async (photo: DefectPhoto) => {
    const newDefect: Defect = {
      uid: makeUid("defect"),
      description: photo.caption?.trim() || "Nová závada",
      standard: "",
      article: "",
    };
    setForm((f) => ({ ...f, defects: [...(f.defects || []), newDefect] }));
    try {
      await api.patch(`/revisions/${revId}/photos/${photo.id}`, {
        defect_uid: newDefect.uid,
      });
      notifyDefectPhotosChanged();
    } catch (e) {
      console.warn("Vytvoření závady z fotografie selhalo:", e);
    }
  };

  async function convertDraftToDefect(draft: RevisionDefectDraft) {
    const newDefect: Defect = {
      uid: makeUid("defect"),
      description: draft.text?.trim() || "Nová závada",
      standard: "",
      article: "",
    };
    setForm((f) => ({
      ...f,
      defects: [...(f.defects || []), newDefect],
      defectDrafts: (f.defectDrafts || []).filter((item) => item.uid !== draft.uid),
    }));

    const linkedIds = Array.isArray(draft.linkedPhotoIds) ? draft.linkedPhotoIds : [];
    if (!linkedIds.length) return;

    try {
      await Promise.all(
        linkedIds.map((photoId) =>
          api.patch(`/revisions/${revId}/photos/${photoId}`, {
            defect_uid: newDefect.uid,
          })
        )
      );
      notifyDefectPhotosChanged();
    } catch (e) {
      console.warn("Přiřazení fotek z draftu k závadě selhalo:", e);
    }
  }

  function deleteDefectDraft(uid: string) {
    if (!window.confirm("Opravdu smazat poznámku k závadě?")) return;
    setForm((f) => ({
      ...f,
      defectDrafts: (f.defectDrafts || []).filter((item) => item.uid !== uid),
    }));
  }

  const renderPhotoCard = (photo: DefectPhoto, defectUid?: string) => (
    <div key={photo.id} className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
      <button
        type="button"
        className="block w-full overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={() => setPreviewPhoto(photo)}
        title="Otevřít fotografii"
      >
        <DefectPhotoThumb revId={revId} photo={photo} />
      </button>

      <div className="mt-2.5 space-y-2">
        {photo.caption?.trim() ? (
          <div className="rounded bg-slate-50 px-2 py-1.5 text-xs leading-5 text-slate-700">
            {photo.caption.trim()}
          </div>
        ) : null}

        <div className="grid grid-cols-[minmax(0,118px)_auto] items-start gap-2">
          <select
            className="max-w-[118px] rounded border px-2 py-1 text-xs"
            value={photo.defect_uid || ""}
            onChange={(e) => void assignPhotoToDefect(photo.id, e.target.value)}
          >
            <option value="">Bez přiřazení</option>
            {(form.defects || []).map((defect, index) => (
              <option key={defect.uid} value={defect.uid}>
                {`Závada ${index + 1}`}
              </option>
            ))}
          </select>
          {!defectUid ? (
            <button
              type="button"
              className="rounded bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
              onClick={() => void createDefectFromPhoto(photo)}
            >
              Nová závada z fotky
            </button>
          ) : (
            <div />
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="rounded bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
            onClick={() => void deletePhoto(photo.id)}
          >
            Smazat fotografii
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <section className="space-y-4 text-sm text-gray-800">
      <h2 className="text-lg font-semibold">Závady a doporučení</h2>

      {defectDrafts.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-amber-950">K dopracování</h3>
              <p className="text-sm text-amber-800">
                Rychlé poznámky z terénu. Až je doplníš, převeď je na plnou závadu.
              </p>
            </div>
            <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-800 shadow-sm">
              {defectDrafts.length} pozn.
            </div>
          </div>

          <div className="grid gap-3">
            {defectDrafts.map((draft, index) => (
              <div key={draft.uid} className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Poznámka {index + 1}</div>
                    {formatDraftDate(draft.createdAt) ? (
                      <div className="text-xs text-slate-500">{formatDraftDate(draft.createdAt)}</div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                      onClick={() => void convertDraftToDefect(draft)}
                    >
                      Převést na závadu
                    </button>
                    <button
                      type="button"
                      className="rounded bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
                      onClick={() => deleteDefectDraft(draft.uid)}
                    >
                      Smazat
                    </button>
                  </div>
                </div>

                <div className="rounded border border-amber-100 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-slate-700">
                  {draft.text || "Bez textu."}
                </div>
                {(draft.linkedPhotoIds || []).length > 0 ? (
                  <div className="mt-2 text-xs font-medium text-amber-900">
                    Navázané fotky: {(draft.linkedPhotoIds || []).length}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div data-guide-id="def-text" className="space-y-3">
        {(form.defects || []).length > 0 ? (
          (form.defects || []).map((defect, index) => (
            <div key={defect.uid} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-800">Závada {index + 1}</div>
                  <div className="text-xs text-slate-500">Text závady a norma jsou editované odděleně, bez parsování pomlček.</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    {(photosByDefect.get(defect.uid) || []).length} foto
                  </div>
                  <button
                    type="button"
                    className="rounded bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                    onClick={() => openPickerForDefect(defect.uid)}
                  >
                    Závadovník
                  </button>
                  <button
                    type="button"
                    className="rounded bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
                    onClick={() => deleteDefect(defect.uid)}
                  >
                    Smazat
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Text závady</label>
                  <textarea
                    className="w-full rounded border px-3 py-2 text-sm"
                    rows={4}
                    value={defect.description || ""}
                    onChange={(e) => updateDefect(defect.uid, { description: e.target.value })}
                    placeholder="Popis závady"
                  />
                </div>

                <div className="grid gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Norma</label>
                    <input
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={defect.standard || ""}
                      onChange={(e) => updateDefect(defect.uid, { standard: e.target.value })}
                      placeholder="ČSN ..."
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Článek</label>
                    <input
                      className="w-full rounded border px-3 py-2 text-sm"
                      value={defect.article || ""}
                      onChange={(e) => updateDefect(defect.uid, { article: e.target.value })}
                      placeholder="např. 542.4"
                    />
                  </div>

                  <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-slate-700">
                    <div className="font-medium text-slate-700">Výsledný text do reportu</div>
                    <div className="mt-1 leading-relaxed">
                      <span>{defect.description || "Bez textu závady."}</span>{" "}
                      {defectNormSuffix(defect) ? <strong>{defectNormSuffix(defect)}</strong> : null}
                    </div>
                  </div>
                </div>
              </div>

                <div className="mt-4 border-t border-slate-200 pt-4">
                  <div className="mb-2 text-sm font-semibold text-slate-700">Fotografie závady</div>
                {(photosByDefect.get(defect.uid) || []).length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
                    {(photosByDefect.get(defect.uid) || []).map((photo) => renderPhotoCard(photo, defect.uid))}
                  </div>
                ) : (
                  <div className="rounded border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                    K této závadě zatím není přiřazená žádná fotografie.
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Zatím tu nejsou žádné závady. Přidej je přes katalog, nebo vytvoř novou závadu z fotografie.
          </div>
        )}
      </div>

      <div data-guide-id="def-catalog" className="flex flex-wrap gap-2">
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

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Fotogalerie závad</h3>
            <p className="text-sm text-slate-500">
              Fotky pořízené přes tlačítko `Vyfotit` se ukládají sem. Odtud je přiřadíš ke konkrétním závadám.
            </p>
          </div>
          <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
            {photos.length} foto
          </div>
        </div>

        {unassignedPhotos.length > 0 ? (
          <div className="mb-5">
            <div className="mb-2 text-sm font-semibold text-slate-700">Nepřiřazené fotografie</div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
              {unassignedPhotos.map((photo) => renderPhotoCard(photo))}
            </div>
          </div>
        ) : (
          <div className="mb-5 rounded border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
            Zatím tu nejsou žádné nepřiřazené fotografie. V terénu je přidáš přes tlačítko `Vyfotit` v sidebaru.
          </div>
        )}

      </div>

      {/* ——— PICKER: Výběr ze seznamu závad ——— */}
      {showPicker && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="compact-card w-full max-w-5xl space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold">
                {pickerTargetUid ? "Vyberte náhradu ze závadovníku" : "Vyberte závadu"}
              </h3>
              <button
                className="text-sm text-gray-600 transition hover:text-gray-900"
                onClick={() => {
                  setShowPicker(false);
                  setPickerTargetUid(null);
                }}
              >
                ✖ Zavřít
              </button>
            </div>

            {pickerTargetUid ? (
              <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                Vybranou položku doplníte k existujícímu textu závady. Norma a článek se převezmou ze závadovníku.
              </div>
            ) : null}

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
                onClick={() => {
                  setShowPicker(false);
                  setPickerTargetUid(null);
                }}
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

      {previewPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewPhoto(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div>
                <div className="text-base font-semibold text-slate-800">
                  {previewPhoto.caption || "Fotografie závady"}
                </div>
                <div className="text-xs text-slate-500">{previewPhoto.original_name || "Bez názvu"}</div>
              </div>
              <button
                type="button"
                className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                onClick={() => setPreviewPhoto(null)}
              >
                ✕
              </button>
            </div>
            <div className="flex max-h-[calc(90vh-72px)] items-center justify-center bg-slate-900/90 p-4">
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt={previewPhoto.caption || previewPhoto.original_name || "Fotografie"}
                  className="max-h-[calc(90vh-110px)] max-w-full rounded object-contain"
                />
              ) : (
                <div className="py-16 text-sm text-slate-300">Načítám fotografii…</div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
