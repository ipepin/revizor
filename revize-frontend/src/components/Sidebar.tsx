﻿// src/components/Sidebar.tsx
import React, { ChangeEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { useRevisionForm } from "../context/RevisionFormContext";
import { useAuth } from "../context/AuthContext";
import lbRevizeLogo from "../pngs/lb-revize.png";
import { API_DISPLAY_URL, apiUrl } from "../api/base";
import api from "../api/axios";

type Props = {
  mode: "dashboard" | "edit" | "lps-edit" | "catalog" | "summary";
  active?: string;
  onSelect?: (sectionKey: string) => void;
  onNewProject?: () => void;
  actions?: { label: string; onClick: () => void; variant?: "primary" | "secondary" | "outline" }[];
};

function makeUid(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type DraftPhotoChoice = {
  id: number;
  caption?: string | null;
  original_name?: string | null;
  defect_uid?: string | null;
  created_at?: string | null;
};

export default function Sidebar({ mode, active, onSelect, onNewProject, actions }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, token } = useAuth();
  const [showSettings, setShowSettings] = useState(false);

  // potvrzení dokončení
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showDefectDraftModal, setShowDefectDraftModal] = useState(false);
  const [photoCaption, setPhotoCaption] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [defectDraftText, setDefectDraftText] = useState("");
  const [draftPhotoChoices, setDraftPhotoChoices] = useState<DraftPhotoChoice[]>([]);
  const [draftLinkedPhotoIds, setDraftLinkedPhotoIds] = useState<number[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // User context (profil technika + firma)
  const { profile, company, loading } = useUser();

  // dostupné jen pokud jsme uvnitř RevisionEdit provideru
  const { finish, revId, notifyDefectPhotosChanged, form, setForm } = (() => {
    try {
      return useRevisionForm();
    } catch {
      // mimo provider – vrátíme dummy
      return {
        finish: () => Promise.resolve(),
        revId: 0,
        notifyDefectPhotosChanged: () => undefined,
        form: { defectDrafts: [] },
        setForm: () => undefined,
      } as any;
    }
  })();
  const pendingDefectDrafts = Array.isArray(form?.defectDrafts) ? form.defectDrafts.length : 0;

  const editSections = [
    { key: "identifikace", label: "Identifikace" },
    { key: "prohlidka", label: "Prohlídka" },
    { key: "zkousky", label: "Zkoušky" },
    { key: "mereni", label: "Měření" },
    { key: "zavady", label: "Závady a doporučení" },
    { key: "zaver", label: "Závěr" },
  ];
  const lpsEditSections = [
    { key: "lps_info", label: "Identifikace objektu a prohlídka" },
    { key: "lps_measure", label: "Měření, závady a závěr" },
  ];
  const isEditMode = mode === "edit" || mode === "lps-edit";
  const sidebarSections = mode === "lps-edit" ? lpsEditSections : editSections;

  const go = (path: string) => {
    setShowSettings(false);
    navigate(path);
  };

  const isCatalog = mode === "catalog" || location.pathname.startsWith("/katalog");
  const isSummary = mode === "summary";
  // stránka měřicích přístrojů (obě možné cesty)
  const isInstruments =
    location.pathname.startsWith("/instruments") ||
    location.pathname.startsWith("/merici-pristroje");

  const initial = (profile?.fullName?.[0] || "T").toUpperCase();

  // potvrzení dokončení → zavolat finish() a přesměrovat
  const confirmFinish = async () => {
    setFinishing(true);
    try {
      await finish();
    } catch (e) {
      // případně lze doplnit toast; požadavek je každopádně přesměrovat
      console.warn("Dokončení selhalo, přesměrovávám i tak.", e);
    } finally {
      setFinishing(false);
      setShowConfirmFinish(false);
      navigate("/"); // zpět na projekty
    }
  };

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (showPhotoModal) return;
    setPhotoFiles([]);
    setPhotoCaption("");
    setUploadingPhoto(false);
  }, [showPhotoModal]);

  useEffect(() => {
    if (showDefectDraftModal) return;
    setDefectDraftText("");
    setDraftLinkedPhotoIds([]);
    setDraftPhotoChoices([]);
  }, [showDefectDraftModal]);

  const loadDraftPhotoChoices = async () => {
    if (!revId) return;
    try {
      const res = await api.get(`/revisions/${revId}/photos`);
      const allPhotos = Array.isArray(res.data) ? res.data : [];
      const unassigned = allPhotos.filter((photo: DraftPhotoChoice) => !photo.defect_uid);
      setDraftPhotoChoices(unassigned.slice(0, 8));
    } catch (e) {
      console.warn("Nepodarilo se nacist nepirazene fotky pro draft zavady:", e);
      setDraftPhotoChoices([]);
    }
  };

  const openPhotoSourcePicker = () => {
    if (!revId) {
      setToast({ type: "error", message: "Fotky lze pridavat jen v revizi." });
      return;
    }
    setShowPhotoSourceModal(true);
  };

  const openDefectDraftModal = () => {
    if (!revId) {
      setToast({ type: "error", message: "Poznamku lze pridat jen v revizi." });
      return;
    }
    void loadDraftPhotoChoices();
    setShowDefectDraftModal(true);
  };

  const onPhotoSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setShowPhotoSourceModal(false);
    setPhotoFiles(files);
    setPhotoCaption("");
    setShowPhotoModal(true);
    event.target.value = "";
  };

  const uploadDefectPhoto = async () => {
    if (!photoFiles.length || !revId) return;
    setUploadingPhoto(true);
    try {
      for (const file of photoFiles) {
        const body = new FormData();
        body.append("file", file);
        body.append("caption", photoCaption.trim());
        await api.post(`/revisions/${revId}/photos`, body, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      notifyDefectPhotosChanged();
      await loadDraftPhotoChoices();
      setShowPhotoModal(false);
      setToast({
        type: "success",
        message: photoFiles.length > 1 ? `Ulozeno ${photoFiles.length} fotografii.` : "Fotografie ulozena.",
      });
    } catch (e) {
      console.warn("Photo upload failed:", e);
      setToast({ type: "error", message: "Nahrani fotografie selhalo." });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveDefectDraft = () => {
    const text = defectDraftText.trim();
    if (!text) return;
    setForm((current: any) => ({
      ...current,
      defectDrafts: [
        ...(Array.isArray(current?.defectDrafts) ? current.defectDrafts : []),
        {
          uid: makeUid("defect-draft"),
          text,
          createdAt: new Date().toISOString(),
          linkedPhotoIds: [...draftLinkedPhotoIds],
        },
      ],
    }));
    setShowDefectDraftModal(false);
    setToast({ type: "success", message: "Poznamka k zavade ulozena." });
  };

  const sendTestEmail = async () => {
    if (!token) {
      setToast({ type: "error", message: "Nejste prihlasen." });
      return;
    }
    try {
      const res = await fetch(apiUrl("/admin/email/test"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ to_email: "blazek1.jo@gmail.com" }),
      });
      if (!res.ok) {
        let detail = "";
        try {
          const data = await res.json();
          detail = data?.detail || "";
        } catch {
          detail = await res.text();
        }
        throw new Error(detail || "Odeslani selhalo.");
      }
      setToast({ type: "success", message: "Email odeslan." });
    } catch (e) {
      console.warn("Test email failed:", e);
      setToast({ type: "error", message: "Odeslani selhalo." });
    }
  };

  return (
    <>
      <aside className="w-64 bg-white shadow-lg p-4 flex flex-col justify-between sticky top-0 h-screen overflow-y-auto">
        <div>
          {/* Hlavicka se jménem technika, číslem osvědčení a aktivním subjektem */}
          <div className="text-center mb-6">
            <div className="-mb-8 flex justify-center">
              <img
                src={lbRevizeLogo}
                alt="LB-Revize"
                className="w-full max-w-[160px]"
              />
            </div>
            <div className="font-bold text-blue-900">
              {profile?.fullName ?? (loading ? "Načítám…" : "—")}
            </div>

            <div className="text-sm text-gray-600">
              Osvědčení:{" "}
              <span className="font-medium">
                {profile?.certificateNumber || (loading ? "…" : "—")}
              </span>
            </div>

            <div className="text-sm text-gray-600">
              Aktivní subjekt:{" "}
              <span className="font-medium" title={company?.name}>
                {company?.name || (loading ? "…" : "—")}
              </span>
            </div>
          </div>

          {/* Režim EDIT – přepínače sekcí + akce */}
          {isEditMode && (
            <>
              <button
                className="mb-4 bg-gray-200 hover:bg-gray-300 text-left px-4 py-2 rounded transition"
                onClick={() => navigate("/")}
              >
                ← Zpět na projekty
              </button>

              <nav className="flex flex-col gap-2 mb-4">
                {sidebarSections.map((section) => (
                  <button
                    key={section.key}
                    onClick={() => onSelect?.(section.key)}
                    className={`px-4 py-2 rounded text-left transition ${
                      active === section.key
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}
                  >
                    {section.label}
                  </button>
                ))}
              </nav>

              <button
                className="mb-3 w-full rounded bg-amber-500 px-4 py-2 text-left text-white transition hover:bg-amber-600"
                onClick={openPhotoSourcePicker}
                title="Rychle vyfotit nebo vybrat fotografii a pozdeji ji priradit k zavade"
              >
                📷 Vyfotit
              </button>

              <button
                className="mb-3 w-full rounded bg-slate-700 px-4 py-2 text-left text-white transition hover:bg-slate-800"
                onClick={openDefectDraftModal}
                title="Rychle si poznacit zavadu a dodelat ji pozdeji v sekci Závady"
              >
                📝 Poznačit závadu
                {pendingDefectDrafts > 0 ? (
                  <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                    {pendingDefectDrafts}
                  </span>
                ) : null}
              </button>

              {/* Dokončit revizi (s potvrzením) */}
              <button
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition"
                onClick={() => setShowConfirmFinish(true)}
                title="Označit revizi jako dokončenou"
              >
                ✓ Dokončit
              </button>
            </>
          )}

          {/* Režim DASHBOARD – tlačítko Nový projekt (NE na instruments) */}
          {mode === "dashboard" && !isInstruments && (
            <div className="flex justify-center mb-2">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                onClick={() => onNewProject?.()}
              >
                + Nový projekt
              </button>
            </div>
          )}

          {/* Režimy CATALOG / SUMMARY / INSTRUMENTS – jen „Zpět na projekty“ */}
          {(isCatalog || isSummary || isInstruments) && (
            <button
              className="mb-4 bg-gray-200 hover:bg-gray-300 text-left px-4 py-2 rounded transition"
              onClick={() => navigate("/")}
            >
              ← Zpět na projekty
            </button>
          )}

          {/* Režim SUMMARY – LPS: přepínač dvou sekcí + Dokončit */}
          {isSummary && onSelect && (
            <div className="mb-4 space-y-2">
              <button
                className={`w-full px-4 py-2 rounded text-left transition ${active === "lps_info" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
                onClick={() => onSelect?.("lps_info")}
              >
                Identifikace objektu a prohlídka
              </button>
              <button
                className={`w-full px-4 py-2 rounded text-left transition ${active === "lps_measure" ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
                onClick={() => onSelect?.("lps_measure")}
              >
                Měření a závěr
              </button>
              <button
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition"
                onClick={() => setShowConfirmFinish(true)}
                title="Označit revizi jako dokončenou"
              >
                ✓ Dokončit
              </button>
            </div>
          )}

          <hr className="my-4 border-gray-300" />

          {profile?.isAdmin && (
            <div className="mt-4">
              <div className="text-xs text-gray-500 mb-2">Admin</div>
              <div className="flex flex-col gap-2">
                <button
                  className="bg-amber-100 hover:bg-amber-200 text-left px-4 py-2 rounded transition"
                  onClick={() => navigate("/admin")}
                >
                  Přehled administrátora
                </button>
                <button
                  className="bg-amber-100 hover:bg-amber-200 text-left px-4 py-2 rounded transition"
                  onClick={() => navigate("/admin/users")}
                >
                  Technici
                </button>
                <button
                  className="bg-amber-100 hover:bg-amber-200 text-left px-4 py-2 rounded transition"
                  onClick={() => navigate("/admin/defects")}
                >
                  Návrhy závad
                </button>
                <button
                  className="bg-amber-100 hover:bg-amber-200 text-left px-4 py-2 rounded transition"
                  onClick={() => navigate("/admin/defects-editor")}
                >
                  Editor závad
                </button>
                <button
                  className="bg-amber-100 hover:bg-amber-200 text-left px-4 py-2 rounded transition"
                  onClick={() => navigate("/admin/revisions")}
                >
                  Revize všech uživatelů
                </button>
                <button
                  className="bg-amber-100 hover:bg-amber-200 text-left px-4 py-2 rounded transition"
                  onClick={() => navigate("/admin/snippets")}
                >
                  Rychlé věty (správa a schvalování)
                </button>
                <button
                  className="bg-amber-100 hover:bg-amber-200 text-left px-4 py-2 rounded transition"
                  onClick={() => navigate("/admin/norms")}
                >
                  Normy (správa)
                </button>
                <button
                  className="bg-amber-100 hover:bg-amber-200 text-left px-4 py-2 rounded transition"
                  onClick={sendTestEmail}
                >
                  Odeslat testovací email
                </button>
                <div className="text-[11px] text-gray-400 px-1 break-all">
                  API: {API_DISPLAY_URL || "stejny origin"}
                </div>
              </div>
            </div>
          )}

          {actions && actions.length > 0 && (
            <div className="mb-4 space-y-2">
              <div className="text-xs text-gray-500">Exporty</div>
              {actions.map((action, idx) => {
                const base = "w-full px-4 py-2 rounded text-left transition";
                const variant =
                  action.variant === "primary"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : action.variant === "secondary"
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-100 hover:bg-gray-200";
                return (
                  <button
                    key={`${action.label}-${idx}`}
                    className={`${base} ${variant}`}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </button>
                );
              })}
            </div>
          )}
          {/* Nastavení */}
          <div className="relative mt-4">
            <button
              className="bg-gray-200 px-4 py-2 rounded w-full text-left hover:bg-gray-300 transition"
              onClick={() => setShowSettings(!showSettings)}
            >
              ⚙️ Nastavení
            </button>

            {showSettings && (
              <ul className="absolute left-0 mt-2 bg-white border rounded shadow w-full z-10 overflow-hidden">
                <li
                  className={`p-2 hover:bg-gray-100 cursor-pointer ${
                    isCatalog ? "bg-blue-50 font-medium" : ""
                  }`}
                  onClick={() => go("/katalog")}
                >
                  Katalog komponent
                </li>
                <li
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => go("/snippets")}
                >
                  Katalog rychlých vět
                </li>
                <li
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => go("/inspection-templates")}
                >
                  Katalog vzorových textů
                </li>
                <li
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => go("/instruments")}
                >
                  Měřicí přístroje
                </li>
                <li
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => go("/profil")}
                >
                  Profil
                </li>
                <li
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    window.dispatchEvent(new Event("revize-open-guide"));
                    go("/");
                  }}
                >
                  Spustit průvodce
                </li>
                <li
                  className="p-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    logout();
                    go("/login");
                  }}
                >
                  Odhlásit se
                </li></ul>
            )}
          </div>
        </div>
      </aside>

      {/* Potvrzovací dialog „Dokončit“ */}
      {showConfirmFinish && (
        <div
          className="fixed inset-0 bg-black/40 z-50 grid place-items-center"
          onClick={() => !finishing && setShowConfirmFinish(false)}
        >
          <div
            className="bg-white p-6 rounded shadow w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2">Označit revizi jako dokončenou?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Po potvrzení bude revize uzamčena k úpravám. Následně tě přesměruji na přehled projektů.
            </p>
            {pendingDefectDrafts > 0 ? (
              <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Máte {pendingDefectDrafts} poznám{pendingDefectDrafts === 1 ? "ku" : pendingDefectDrafts < 5 ? "ky" : "ek"} k dopracování v sekci Závady.
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-gray-200 rounded"
                onClick={() => setShowConfirmFinish(false)}
                disabled={finishing}
              >
                Zrušit
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-60"
                onClick={confirmFinish}
                disabled={finishing}
                title="Dokončit revizi"
              >
                {finishing ? "Dokončuji…" : pendingDefectDrafts > 0 ? "Dokončit i tak" : "Dokončit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-slate-800">Nová fotografie</div>
                <div className="text-sm text-slate-500">
                  Fotka se uloží do revize a v sekci závad ji pak přiřadíš ke konkrétní závadě.
                </div>
              </div>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-800"
                onClick={() => setShowPhotoModal(false)}
              >
                ✕
              </button>
            </div>

            {photoFiles.length > 0 && (
              <div className="mb-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {photoFiles.length === 1 ? (
                  photoFiles[0].name
                ) : (
                  <div className="space-y-1">
                    <div className="font-medium">{photoFiles.length} souborů vybráno</div>
                    <div className="max-h-24 overflow-auto text-xs text-slate-600">
                      {photoFiles.map((file) => (
                        <div key={`${file.name}-${file.lastModified}`}>{file.name}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <label className="mb-1 block text-sm font-medium text-slate-700">
              {photoFiles.length > 1 ? "Společný krátký popis" : "Krátký popis"}
            </label>
            <textarea
              className="mb-4 w-full rounded border px-3 py-2 text-sm"
              rows={4}
              placeholder="Např. chybějící kryt svorkovnice"
              value={photoCaption}
              onChange={(e) => setPhotoCaption(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded bg-slate-200 px-3 py-2 text-sm text-slate-800 hover:bg-slate-300"
                onClick={() => setShowPhotoModal(false)}
                disabled={uploadingPhoto}
              >
                Zrušit
              </button>
              <button
                type="button"
                className="rounded bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300"
                onClick={uploadDefectPhoto}
                disabled={!photoFiles.length || uploadingPhoto}
              >
                {uploadingPhoto ? "Nahrávám…" : photoFiles.length > 1 ? "Uložit fotografie" : "Uložit fotografii"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPhotoSourceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowPhotoSourceModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3">
              <div className="text-base font-semibold text-slate-800">Přidat fotografii</div>
              <div className="text-sm text-slate-500">
                Vyber, jestli chceš fotku rovnou pořídit, nebo nahrát z telefonu.
              </div>
            </div>

            <div className="space-y-2">
              <label
                className="block w-full cursor-pointer rounded bg-amber-500 px-3 py-2 text-left text-sm font-medium text-white hover:bg-amber-600"
              >
                📷 Vyfotit
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={onPhotoSelected}
                />
              </label>
              <label
                className="block w-full cursor-pointer rounded bg-slate-100 px-3 py-2 text-left text-sm font-medium text-slate-800 hover:bg-slate-200"
              >
                🖼️ Vybrat z telefonu
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={onPhotoSelected}
                />
              </label>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                className="rounded bg-slate-200 px-3 py-2 text-sm text-slate-800 hover:bg-slate-300"
                onClick={() => setShowPhotoSourceModal(false)}
              >
                Zrušit
              </button>
            </div>
          </div>
        </div>
      )}

      {showDefectDraftModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowDefectDraftModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-slate-800">Rychlá poznámka závady</div>
                <div className="text-sm text-slate-500">
                  Zapiš si závadu předběžně. V sekci Závady se ti pak připomene k dopracování.
                </div>
              </div>
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-800"
                onClick={() => setShowDefectDraftModal(false)}
              >
                ✕
              </button>
            </div>

            <label className="mb-1 block text-sm font-medium text-slate-700">Poznámka</label>
            <textarea
              className="mb-4 w-full rounded border px-3 py-2 text-sm"
              rows={4}
              placeholder="Např. chybí kryt svorkovnice v rozvaděči v garáži"
              value={defectDraftText}
              onChange={(e) => setDefectDraftText(e.target.value)}
            />

            {draftPhotoChoices.length > 0 ? (
              <div className="mb-4">
                <div className="mb-1 block text-sm font-medium text-slate-700">Navázat na nepřiřazené fotky</div>
                <div className="max-h-40 space-y-2 overflow-auto rounded border border-slate-200 bg-slate-50 p-2">
                  {draftPhotoChoices.map((photo) => {
                    const checked = draftLinkedPhotoIds.includes(photo.id);
                    return (
                      <label
                        key={photo.id}
                        className="flex cursor-pointer items-start gap-2 rounded bg-white px-2 py-1.5 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={checked}
                          onChange={(e) =>
                            setDraftLinkedPhotoIds((current) =>
                              e.target.checked
                                ? [...current, photo.id]
                                : current.filter((id) => id !== photo.id)
                            )
                          }
                        />
                        <div className="min-w-0">
                          <div className="truncate font-medium">
                            {photo.caption?.trim() || photo.original_name || `Fotka #${photo.id}`}
                          </div>
                          {photo.caption?.trim() && photo.original_name ? (
                            <div className="truncate text-xs text-slate-500">{photo.original_name}</div>
                          ) : null}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded bg-slate-200 px-3 py-2 text-sm text-slate-800 hover:bg-slate-300"
                onClick={() => setShowDefectDraftModal(false)}
              >
                Zrušit
              </button>
              <button
                type="button"
                className="rounded bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                onClick={saveDefectDraft}
                disabled={!defectDraftText.trim()}
              >
                Uložit poznámku
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded shadow text-white ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
