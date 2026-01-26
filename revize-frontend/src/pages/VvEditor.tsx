// src/pages/VvEditor.tsx
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Download,
  Printer,
  Plus,
  Trash2,
  Info,
  CheckCircle2,
  AlertTriangle,
  BadgeCheck,
} from "lucide-react";
import Sidebar from "../components/Sidebar";
import { API_DISPLAY_URL, apiUrl } from "../api/base";
import { useAuth } from "../context/AuthContext";
import { authHeader } from "../api/auth";

/** ===== Typy ===== */
type Group = "A" | "B" | "C";
type InfluenceItem = {
  group: Group;
  name: string;
  meaning: string;
  normal: boolean;
  requirements: string[];
};
type InfluenceDict = Record<string, InfluenceItem>;

type SpaceRecord = {
  id: string;
  name: string;
  note?: string;
  selections: Record<string, string | undefined>;
  measures?: string;
  intervals?: string;
};
type CommitteeMember = { role: "Předseda" | "Člen"; name: string };
type ProtocolData = {
  objectName: string;
  address?: string;
  preparedBy?: string;
  date?: string;
  submittedDocs?: string; // Předložená dokumentace
  objectDescription?: string; // Stručný popis objektu
  committee: CommitteeMember[];
  spaces: SpaceRecord[];
};
type VvDoc = {
  id: string;
  number: string;
  project_id: number;
  data_json: ProtocolData;
  created_at: string;
  updated_at: string;
};

type GuideStep = {
  key: string;
  targetId: string;
  title: string;
  text: string;
};

const useGuideTarget = (targetId: string | null, active: boolean) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!active || !targetId) {
      setRect(null);
      return;
    }

    const update = () => {
      const el = document.querySelector(`[data-guide-id="${targetId}"]`) as HTMLElement | null;
      if (!el) {
        setRect(null);
        return;
      }
      setRect(el.getBoundingClientRect());
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [targetId, active]);

  return rect;
};

function GuideOverlay({
  active,
  targetId,
  title,
  text,
  isLast,
  onNext,
  onClose,
}: {
  active: boolean;
  targetId: string | null;
  title: string;
  text: string;
  isLast: boolean;
  onNext: () => void;
  onClose: () => void;
}) {
  const rect = useGuideTarget(targetId, active);
  if (!active || !rect) return null;

  const bubbleWidth = 360;
  const margin = 12;
  const rightSpace = window.innerWidth - rect.right;
  const leftSpace = rect.left;
  const placeRight = rightSpace > bubbleWidth + margin || leftSpace < bubbleWidth + margin;
  const left = placeRight
    ? Math.min(rect.right + margin, window.innerWidth - bubbleWidth - margin)
    : Math.max(margin, rect.left - bubbleWidth - margin);
  const top = Math.min(Math.max(margin, rect.top), window.innerHeight - 220);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/25" onClick={onClose} />
      <div
        className="absolute rounded-lg border-2 border-blue-500 pointer-events-none"
        style={{
          top: Math.max(rect.top - 6, 0),
          left: Math.max(rect.left - 6, 0),
          width: rect.width + 12,
          height: rect.height + 12,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.25)",
        }}
      />
      <div
        className="absolute z-10 w-full max-w-sm rounded-lg border bg-white p-4 shadow-xl"
        style={{ top, left, width: bubbleWidth }}
      >
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="mt-1 text-sm text-slate-600">{text}</div>
        <div className="mt-3 flex justify-end gap-2">
          <button className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50" onClick={onClose}>
            {"Zavřít"}
          </button>
          <button className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700" onClick={onNext}>
            {isLast ? "Dokončit" : "Pokračovat"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** ===== Pomocné ===== */
const uuid = () =>
  (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
const emptyProtocol = (): ProtocolData => ({
  objectName: "",
  address: "",
  preparedBy: "",
  date: new Date().toISOString().slice(0, 10),
  submittedDocs: "",
  objectDescription: "",
  committee: [{ role: "Předseda", name: "" }],
  spaces: [
    {
      id: uuid(),
      name: "Hlavní prostor",
      note: "",
      selections: {},
      measures: "",
      intervals: "",
    },
  ],
});
const groupTitle = (g: Group) =>
  g === "A"
    ? "A – Podmínky prostředí"
    : g === "B"
    ? "B – Využití a rizika"
    : "C – Stavební vlastnosti";
const groups: Group[] = ["A", "B", "C"];

function buildInfluenceFamilies(dict: InfluenceDict) {
  const fam: Record<
    string,
    {
      code: string;
      name: string;
      group: Group;
      items: Array<{
        code: string;
        meaning: string;
        normal: boolean;
        requirements: string[];
      }>;
    }
  > = {};
  for (const [clsCode, item] of Object.entries(dict)) {
    const m = clsCode.match(/^([A-Z]{2})[0-9A-Z]+$/);
    if (!m) continue;
    const prefix = m[1];
    if (!fam[prefix])
      fam[prefix] = { code: prefix, name: item.name, group: item.group, items: [] };
    fam[prefix].name = item.name;
    fam[prefix].group = item.group;
    fam[prefix].items.push({
      code: clsCode,
      meaning: item.meaning,
      normal: item.normal,
      requirements: item.requirements || [],
    });
  }
  for (const f of Object.values(fam))
    f.items.sort((a, b) =>
      a.code.localeCompare(b.code, "cs-CZ", { numeric: true })
    );
  return Object.values(fam).sort((a, b) =>
    a.group === b.group
      ? a.code.localeCompare(b.code)
      : a.group.localeCompare(b.group)
  );
}

/** ===== Dedup + kategorizace požadavků ===== */
const catOrder = [
  "Krytí / IP",
  "Voda",
  "Prach",
  "Materiály a koroze",
  "Rozváděče",
  "Svítidla",
  "Ochrana / RCD / pospojování",
  "Teplota",
  "Sluneční záření / UV",
  "Požár a výbuch",
  "Ostatní",
] as const;
type Category = (typeof catOrder)[number];

function normalize(s: string) {
  return s
    .toLocaleLowerCase("cs")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.;,:]+$/g, "")
    .trim();
}
function categorize(req: string): Category {
  const r = normalize(req);
  if (/\bip(x?\d)|\bkryti\b/.test(r)) return "Krytí / IP";
  if (/(kapajici|postrik|trysk|vlna|ponor|voda|ipx\d)/.test(r)) return "Voda";
  if (/\bprach|\bip5x|\bip6x/.test(r)) return "Prach";
  if (/(koro|povrch|materi|nater|pokoven|galvan)/.test(r))
    return "Materiály a koroze";
  if (/(rozvad[eě]c)/.test(r)) return "Rozváděče";
  if (/(svitid)/.test(r)) return "Svítidla";
  if (/(rcd|proud.*chranic|pospoj|ochran|uzem)/.test(r))
    return "Ochrana / RCD / pospojování";
  if (/(teplot)/.test(r)) return "Teplota";
  if (/(slunec|uv)/.test(r)) return "Sluneční záření / UV";
  if (/(ex |exd|60079|vybuch|horlav)/.test(r)) return "Požár a výbuch";
  return "Ostatní";
}
function dedupAndGroup(lines: string[]) {
  const seen = new Set<string>();

  const buckets = catOrder.reduce((acc, c) => {
    acc[c] = [];
    return acc;
  }, {} as Record<Category, string[]>);

  for (const raw of lines) {
    const key = normalize(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    buckets[categorize(raw)].push(raw.trim());
  }

  return catOrder
    .map((c) => ({ category: c, items: buckets[c] }))
    .filter((g) => g.items.length);
}
function toColumns<T>(arr: T[], cols: number): T[][] {
  const rows = Math.ceil(arr.length / cols);
  const out: T[][] = Array.from({ length: cols }, () => []);
  for (let i = 0; i < arr.length; i++) out[i % cols].push(arr[i]);
  const table: T[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: T[] = [];
    for (let c = 0; c < cols; c++) row.push(out[c][r]);
    table.push(row);
  }
  return table;
}

/** ===== Komponenta ===== */
export default function VvEditor() {
  const { id: vvId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const isTraining = new URLSearchParams(location.search).get("training") === "1";

  const [guideOn, setGuideOn] = useState(
    new URLSearchParams(location.search).get("guide") === "1"
  );
  const [guideIndex, setGuideIndex] = useState(0);
  const guideSteps: GuideStep[] = [
    {
      key: "identifikace-zaklad",
      targetId: "vv-identifikace",
      title: "Z\u00e1kladn\u00ed \u00fadaje protokolu",
      text:
        "Vypl\u0148 n\u00e1zev objektu, adresu, zpracoval a datum. \u010c\u00edslo protokolu se dopln\u00ed automaticky po ulo\u017een\u00ed.",
    },
    {
      key: "identifikace-podklady",
      targetId: "vv-identifikace",
      title: "Podklady a popis",
      text:
        "Do \u201eP\u0159edlo\u017een\u00e1 dokumentace\u201c napi\u0161, z jak\u00fdch podklad\u016f vych\u00e1z\u00ed\u0161. Stru\u010dn\u00fd popis objektu pom\u016f\u017ee p\u0159i obhajob\u011b protokolu.",
    },
    {
      key: "komise",
      targetId: "vv-komise",
      title: "Komise",
      text:
        "Dopl\u0148 p\u0159edsedu a \u010dleny komise. Dal\u0161\u00ed osoby p\u0159id\u00e1\u0161 tla\u010d\u00edtkem \u201eP\u0159idat\u201c, odstranit jde ikonou ko\u0161e.",
    },
    {
      key: "prostory",
      targetId: "vv-prostory",
      title: "Prostory",
      text:
        "P\u0159idej m\u00edstnosti a vyber aktivn\u00ed prostor vlevo. V\u0161echny dal\u0161\u00ed volby se vztahuj\u00ed k vybran\u00e9mu prostoru.",
    },
    {
      key: "vlivy-tridy",
      targetId: "vv-vlivy",
      title: "T\u0159\u00eddy vn\u011bj\u0161\u00edch vliv\u016f",
      text:
        "Pro aktivn\u00ed prostor zvol t\u0159\u00eddy v ka\u017ed\u00e9 skupin\u011b A/B/C. \u0160t\u00edtky ozna\u010duj\u00ed norm\u00e1ln\u00ed vlivy.",
    },
    {
      key: "vlivy-opatreni",
      targetId: "vv-vlivy",
      title: "Opat\u0159en\u00ed a intervaly",
      text:
        "Dopl\u0148 technick\u00e1 opat\u0159en\u00ed a intervaly pravideln\u00fdch reviz\u00ed pro aktivn\u00ed prostor.",
    },
    {
      key: "vlivy-souhrn",
      targetId: "vv-vlivy",
      title: "Souhrn po\u017eadavk\u016f",
      text:
        "Souhrn se sestavuje automaticky podle vybran\u00fdch t\u0159\u00edd. Zkontroluj, zda d\u00e1v\u00e1 smysl pro dan\u00fd prostor.",
    },
    {
      key: "export",
      targetId: "vv-export",
      title: "Export",
      text:
        "Hotov\u00fd protokol m\u016f\u017ee\u0161 vytisknout do PDF nebo ulo\u017eit jako JSON pro archivaci.",
    },
  ];

  useEffect(() => {
    const enabled = new URLSearchParams(location.search).get("guide") === "1";
    setGuideOn(enabled);
    setGuideIndex(0);
  }, [location.search]);

  const closeGuide = () => {
    const ok = window.confirm("Opravdu chcete ukončit průvodce?");
    if (!ok) return;
    setGuideOn(false);
    navigate("/", { replace: true });
  };

  const handleNext = () => {
    const isLast = guideIndex >= guideSteps.length - 1;
    if (isLast) {
      closeGuide();
      return;
    }
    setGuideIndex((i) => Math.min(i + 1, guideSteps.length - 1));
  };

  useEffect(() => {
    if (!guideOn) return;
    const step = guideSteps[guideIndex];
    if (!step) return;
    const el = document.querySelector(`[data-guide-id="${step.targetId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [guideOn, guideIndex, guideSteps]);

  const [doc, setDoc] = useState<VvDoc | null>(null);
  const [data, setData] = useState<ProtocolData>(emptyProtocol());
  const [busy, setBusy] = useState(false);

  const [influences, setInfluences] = useState<InfluenceDict | null>(null);
  const [families, setFamilies] = useState<
    ReturnType<typeof buildInfluenceFamilies>
  >([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);

  // GET /vv/:id
  useEffect(() => {
    if (isTraining) {
      const base = emptyProtocol();
      setDoc({
        id: "training",
        number: "CVI?N?",
        project_id: 0,
        data_json: base,
        created_at: "",
        updated_at: "",
      });
      setData(base);
      setActiveSpaceId(base.spaces?.[0]?.id || null);
      return;
    }
    if (!vvId || !token) return;
    let alive = true;
    setBusy(true);
    (async () => {
      try {
        const res = await fetch(apiUrl(`/vv/${vvId}`), {
          headers: { ...authHeader(token) },
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const payload = (await res.json()) as VvDoc;
        if (!alive) return;
        setDoc(payload);
        const base = emptyProtocol();
        const merged: ProtocolData = { ...base, ...(payload?.data_json || {}) };
        if (merged.submittedDocs === undefined) merged.submittedDocs = "";
        if (merged.objectDescription === undefined) merged.objectDescription = "";
        setData(merged);
        setActiveSpaceId(merged.spaces?.[0]?.id || null);
      } catch (e) {
        console.error("VV GET error:", e);
        alert("Nepodařilo se načíst dokument VV. (GET)");
      } finally {
        alive && setBusy(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [vvId, token, isTraining]);

  // načtení JSON slovníku
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/vv_data/vv_data.json`, { cache: "no-store" });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const j = (await res.json()) as any;
        if (!j || typeof j !== "object" || Array.isArray(j))
          throw new Error("Neplatná data: očekáván objekt AA1:{…} atd.");
        let skipped = 0;
        const dict: InfluenceDict = {};
        for (const [k, v] of Object.entries(j)) {
          const ok =
            typeof k === "string" &&
            /^[A-Z]{2}[0-9A-Z]+$/.test(k) &&
            v &&
            typeof (v as any).group === "string" &&
            typeof (v as any).name === "string" &&
            typeof (v as any).meaning === "string" &&
            typeof (v as any).normal === "boolean" &&
            Array.isArray((v as any).requirements);
          if (ok) dict[k] = v as InfluenceItem;
          else skipped++;
        }
        if (!Object.keys(dict).length)
          throw new Error("Neplatná data: prázdný slovník.");
        if (!alive) return;
        setInfluences(dict);
        setFamilies(buildInfluenceFamilies(dict));
        setLoadErr(
          skipped ? `Varování: přeskočeno ${skipped} neplatných položek` : null
        );
      } catch (e: any) {
        console.error("VV JSON load error:", e);
        if (!alive) return;
        setLoadErr(
          `Nelze načíst vv_data/vv_data.json: ${
            e?.message || String(e)
          }.\n(Ujisti se, že soubor je v public/vv_data/vv_data.json a otevře se jako JSON.)`
        );
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Autosave (PUT /vv/:id) — debounced
  const saveTimer = useRef<number | null>(null);
  const lastSaved = useRef<string>("");
  const scheduleSave = (payload: ProtocolData) => {
    if (isTraining) return;
    if (!doc?.id || !token) return;
    const key = JSON.stringify(payload);
    if (key === lastSaved.current) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        const res = await fetch(apiUrl(`/vv/${doc.id}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeader(token) },
          body: JSON.stringify({ data_json: payload }),
        });
        if (!res.ok) throw new Error(await res.text());
        lastSaved.current = key;
      } catch (e) {
        console.error("VV PUT error:", e);
      }
    }, 800);
  };
  const patch = (upd: Partial<ProtocolData>) => {
    const next = { ...data, ...upd } as ProtocolData;
    setData(next);
    scheduleSave(next);
  };
  const updateSpace = (id: string, upd: Partial<SpaceRecord>) => {
    const nextSpaces = data.spaces.map((s) =>
      s.id === id ? { ...s, ...upd } : s
    );
    const next = { ...data, spaces: nextSpaces } as ProtocolData;
    setData(next);
    scheduleSave(next);
  };
  const addSpace = () => {
    const rec: SpaceRecord = {
      id: uuid(),
      name: `Prostor ${data.spaces.length + 1}`,
      note: "",
      selections: {},
      measures: "",
      intervals: "",
    };
    const next = { ...data, spaces: [...data.spaces, rec] } as ProtocolData;
    setData(next);
    setActiveSpaceId(rec.id);
    scheduleSave(next);
  };
  const removeSpace = (id: string | null) => {
    if (!id || data.spaces.length === 1) return;
    const arr = data.spaces.filter((s) => s.id !== id);
    const next = { ...data, spaces: arr } as ProtocolData;
    setData(next);
    setActiveSpaceId(arr[0]?.id || null);
    scheduleSave(next);
  };

  const activeSpace =
    data.spaces.find((s) => s.id === (activeSpaceId || "")) || data.spaces[0];

  /** Requirements (dedup) */
  const requirementsForSpaceRaw = (space: SpaceRecord): string[] => {
    if (!influences) return [];
    const reqs: string[] = [];
    for (const fam of families) {
      const selCode = space.selections[fam.code];
      if (!selCode) continue;
      const item = influences[selCode];
      if (!item) continue;
      reqs.push(...(item.requirements || []));
    }
    return reqs;
  };
  const groupedReqForActive = useMemo(
    () => dedupAndGroup(requirementsForSpaceRaw(activeSpace)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeSpaceId, JSON.stringify(activeSpace?.selections), influences, families]
  );

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vv-${doc?.number || doc?.id || "protokol"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const doPrint = () => window.print();

  const API_DISPLAY = API_DISPLAY_URL;

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-100 to-blue-50">
      {/* Zabaleno do app-sidebar kvůli tisku */}
      <div className="app-sidebar">
        <Sidebar
          mode="catalog"
          actions={[
            { label: "Export PDF", onClick: doPrint, variant: "outline" },
            { label: "Export JSON", onClick: exportJson, variant: "outline" },
          ]}
        />
      </div>

      <main className="compact-main flex-1 space-y-4 p-4 md:p-6">
        {/* PRINT CSS */}
        <style>{`
          @media print {
            @page { size: A4; margin: 10mm 12mm; }
            .no-print, .app-sidebar { display: none !important; }
            .print-sheet { display: block !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            * { page-break-inside: avoid; }
          }
        `}</style>

        {/* Toolbar */}
        <div className="no-print mb-3 flex items-center gap-2" data-guide-id="vv-export">
          <button
            onClick={() => navigate("/")}
            className="rounded-lg border bg-white px-3 py-1.5 hover:bg-slate-50"
            title="Zpět na projekty"
          >
            ⬅️ Zpět
          </button>
          <div className="ml-auto flex gap-2">
            <button
              onClick={exportJson}
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 hover:shadow-sm"
              title="Export JSON"
            >
              <Download className="h-4 w-4" /> JSON
            </button>
            <button
              onClick={doPrint}
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-1.5 hover:shadow-sm"
              title="Tisk do PDF"
            >
              <Printer className="h-4 w-4" /> PDF
            </button>
          </div>
        </div>

        {/* Chyby JSON */}
        {loadErr && (
          <div className="no-print mb-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 px-4 py-3 text-sm whitespace-pre-line">
            {loadErr}
          </div>
        )}

        {/* ===== FORM ===== */}
        {influences && (
          <div className="no-print grid gap-3 md:grid-cols-3">
            {/* Identifikace + textové bloky */}
            <div className="md:col-span-2 rounded-lg border bg-white p-4 shadow-sm" data-guide-id="vv-identifikace">
              <h2 className="mb-3 text-lg font-semibold">Identifikace</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-sm">Objekt / Název</span>
                  <input
                    value={data.objectName}
                    onChange={(e) => patch({ objectName: e.target.value })}
                    className="rounded-lg border px-3 py-1.5"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm">Adresa</span>
                  <input
                    value={data.address}
                    onChange={(e) => patch({ address: e.target.value })}
                    className="rounded-lg border px-3 py-1.5"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm">Zpracoval</span>
                  <input
                    value={data.preparedBy}
                    onChange={(e) => patch({ preparedBy: e.target.value })}
                    className="rounded-lg border px-3 py-1.5"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm">Datum</span>
                  <input
                    type="date"
                    value={data.date}
                    onChange={(e) => patch({ date: e.target.value })}
                    className="rounded-lg border px-3 py-1.5"
                  />
                </label>
              </div>
              <div className="mt-4 grid gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Předložená dokumentace</span>
                  <textarea
                    className="min-h-[80px] rounded-lg border px-3 py-1.5"
                    value={data.submittedDocs || ""}
                    onChange={(e) => patch({ submittedDocs: e.target.value })}
                    placeholder="Projektová dokumentace, výkresy, prohlášení o shodě, seznam zařízení…"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Stručný popis objektu</span>
                  <textarea
                    className="min-h-[80px] rounded-lg border px-3 py-1.5"
                    value={data.objectDescription || ""}
                    onChange={(e) => patch({ objectDescription: e.target.value })}
                    placeholder="Typ budovy, využití, technologie, specifika provozu…"
                  />
                </label>
              </div>
            </div>

                          {/* Komise */}
            <div className="rounded-lg border bg-white p-4 shadow-sm relative" data-guide-id="vv-komise">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                Komise <Info className="h-4 w-4 opacity-60" />
              </h2>
              <div className="space-y-2">
                {data.committee.map((m, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 items-center">
                    <select
                      className="rounded-lg border px-2 py-1.5"
                      value={m.role}
                      onChange={(e) => {
                        const next = [...data.committee];
                        next[i] = {
                          ...m,
                          role: e.target.value as CommitteeMember["role"],
                        };
                        patch({ committee: next });
                      }}
                    >
                      <option value="Předseda">Předseda</option>
                      <option value="Člen">Člen</option>
                    </select>
                    <input
                      className="rounded-lg border px-3 py-1.5 col-span-2"
                      value={m.name}
                      onChange={(e) => {
                        const next = [...data.committee];
                        next[i] = { ...m, name: e.target.value };
                        patch({ committee: next });
                      }}
                      placeholder="Jméno a příjmení"
                    />
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() =>
                      patch({
                        committee: [...data.committee, { role: "Člen", name: "" }],
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:shadow-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Přidat člena
                  </button>
                  {data.committee.length > 1 && (
                    <button
                      onClick={() =>
                        patch({ committee: data.committee.slice(0, -1) })
                      }
                      className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:shadow-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                      Odebrat
                    </button>
                  )}
                </div>
              </div>
            </div>

                          {/* Prostory & editor */}
            <aside className="rounded-lg border bg-white p-4 shadow-sm h-max relative" data-guide-id="vv-prostory">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-lg">Prostory</h2>
                <button
                  onClick={addSpace}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                  Nový
                </button>
              </div>
              <div className="space-y-2">
                {data.spaces.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSpaceId(s.id)}
                    className={`w-full text-left rounded-lg border px-3 py-1.5 hover:shadow-sm ${
                      activeSpaceId === s.id ? "bg-slate-50 border-slate-300" : ""
                    }`}
                  >
                    <div className="font-medium">{s.name}</div>
                    {s.note && (
                      <div className="text-xs text-slate-500 line-clamp-2">
                        {s.note}
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {data.spaces.length > 1 && (
                <button
                  onClick={() => removeSpace(activeSpaceId)}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 hover:shadow-sm"
                >
                  <Trash2 className="h-4 w-4" />
                  Smazat vybraný
                </button>
              )}

              
            </aside>

            <section className="md:col-span-2 rounded-lg border bg-white p-4 shadow-sm" data-guide-id="vv-vlivy">

                            {/* Legenda pro fialové „normální“ třídy */}
              <div className="text-xs text-slate-500 mb-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 bg-purple-50 border-purple-200 text-purple-800">
                  <BadgeCheck className="h-3 w-3" /> normální vliv
                </span>
                <span>Fialově podbarveno jsou třídy považované za normální.</span>
              </div>

              <div className="grid gap-3 md:grid-cols-2 mb-3">
                <label className="flex flex-col gap-1">
                  <span className="text-sm">Název prostoru</span>
                  <input
                    className="rounded-lg border px-3 py-1.5"
                    value={activeSpace.name}
                    onChange={(e) =>
                      updateSpace(activeSpace.id, { name: e.target.value })
                    }
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm">Poznámka</span>
                  <input
                    className="rounded-lg border px-3 py-1.5"
                    value={activeSpace.note || ""}
                    onChange={(e) =>
                      updateSpace(activeSpace.id, { note: e.target.value })
                    }
                  />
                </label>
              </div>

              {/* Skupiny A/B/C – výběr */}
              {groups.map((grp) => (
                <section key={grp} className="mt-6">
                  <h3 className="font-semibold mb-2 text-slate-700">
                    {groupTitle(grp)}
                  </h3>
                  <div className="divide-y rounded-lg border">
                    {families
                      .filter((f) => f.group === grp)
                      .map((fam) => {
                        const sel = activeSpace.selections[fam.code];
                        const selected = sel ? influences?.[sel] : undefined;
                        const normals = fam.items
                          .filter((x) => influences?.[x.code]?.normal)
                          .map((x) => x.code)
                          .join(", ");
                        return (
                          <div
                            key={fam.code}
                            className="p-3 grid md:grid-cols-[240px_1fr] gap-4"
                          >
                            <div className="font-medium flex items-center gap-2">
                              <span className="font-mono text-xs bg-slate-100 rounded px-1.5 py-0.5">
                                {fam.code}
                              </span>
                              <span className="text-slate-700">{fam.name}</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {fam.items.map((cls) => {
                                  const meta = influences![cls.code];
                                  const checked = sel === cls.code;
                                  const isNormal = !!meta?.normal;
                                  const base =
                                    "cursor-pointer inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:shadow-sm transition";
                                  const normalStyle = isNormal
                                    ? " bg-purple-50 border-purple-200 text-purple-900"
                                    : " bg-white";
                                  const checkedStyle = checked
                                    ? " ring-1 ring-blue-300 bg-blue-50 border-blue-300"
                                    : "";
                                  return (
                                    <label
                                      key={cls.code}
                                      className={`${base}${normalStyle}${checkedStyle}`}
                                      title={meta.meaning}
                                    >
                                      <input
                                        type="radio"
                                        className="hidden"
                                        name={`sel-${activeSpace.id}-${fam.code}`}
                                        checked={checked}
                                        onChange={() =>
                                          updateSpace(activeSpace.id, {
                                            selections: {
                                              ...activeSpace.selections,
                                              [fam.code]: cls.code,
                                            },
                                          })
                                        }
                                      />
                                      <span className="font-mono text-xs bg-slate-100 rounded px-1.5 py-0.5">
                                        {cls.code}
                                      </span>
                                      <span>{`${cls.code} — ${meta.meaning}`}</span>
                                      {isNormal && (
                                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-100 border border-purple-200 text-purple-900">
                                          <BadgeCheck className="h-3 w-3" /> normální
                                        </span>
                                      )}
                                    </label>
                                  );
                                })}
                              </div>

                              {sel && selected && (
                                <div className="rounded-lg border bg-slate-50 p-3 text-sm">
                                  <div className="grid md:grid-cols-[160px_1fr] gap-2">
                                    <div className="text-slate-600">
                                      Vybraná třída
                                    </div>
                                    <div className="font-mono">{sel}</div>

                                    <div className="text-slate-600">
                                      Normální vliv?
                                    </div>
                                    <div>
                                      {selected.normal ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                          <CheckCircle2 className="h-4 w-4" />
                                          Ano
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                                          <AlertTriangle className="h-4 w-4" />
                                          Ne
                                        </span>
                                      )}
                                    </div>

                                    <div className="text-slate-600">Význam</div>
                                    <div>{selected.meaning || "—"}</div>

                                    <div className="text-slate-600">
                                      Požadavky
                                    </div>
                                    <div>
                                      {selected.requirements?.length ? (
                                        <ul className="list-disc ml-5 space-y-1">
                                          {selected.requirements.map((t, i) => (
                                            <li key={i}>{t}</li>
                                          ))}
                                        </ul>
                                      ) : (
                                        "—"
                                      )}
                                    </div>

                                    <div className="text-slate-600">
                                      Vlivy považované za normální
                                    </div>
                                    <div className="font-mono">
                                      {normals || "—"}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </section>
              ))}

              {/* Opatření / intervaly */}
              <section className="mt-6 grid md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-2">
                  <div className="font-semibold flex items-center gap-2">
                    Návrh technických opatření{" "}
                    <Info className="h-4 w-4 opacity-60" />
                  </div>
                  <textarea
                    className="min-h-[120px] rounded-lg border px-3 py-1.5"
                    value={activeSpace.measures || ""}
                    onChange={(e) =>
                      updateSpace(activeSpace.id, { measures: e.target.value })
                    }
                    placeholder="Doplň konkrétní technická opatření (IP, materiály, ochrany, značení, revizní body)…"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <div className="font-semibold flex items-center gap-2">
                    Návrh termínů pravidelných revizí{" "}
                    <Info className="h-4 w-4 opacity-60" />
                  </div>
                  <textarea
                    className="min-h-[120px] rounded-lg border px-3 py-1.5"
                    value={activeSpace.intervals || ""}
                    onChange={(e) =>
                      updateSpace(activeSpace.id, { intervals: e.target.value })
                    }
                    placeholder="Např. každé 3 roky (běžné prostory); častěji v agresivním prostředí – dle NV 190/2022 Sb. a norem."
                  />
                </label>
              </section>

              {/* Souhrn (screen) */}
              <section className="mt-6">
                <h3 className="font-semibold mb-2 text-slate-700">
                  Souhrn požadavků (vybraný prostor) – setříděno
                </h3>
                {groupedReqForActive.length ? (
                  <div className="grid md:grid-cols-2 gap-3">
                    {groupedReqForActive.map((g) => (
                      <div key={g.category} className="rounded-lg border p-3">
                        <div className="font-medium mb-2">{g.category}</div>
                        <ul className="list-disc ml-5 space-y-1">
                          {g.items.map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500">—</div>
                )}
              </section>
            </section>
          </div>
        )}

        {/* ===== PRINT (A4, 1 strana) ===== */}
        {influences && (
          <div className="print-sheet hidden">
            <div
              style={{
                maxWidth: "175mm",
                margin: "0 auto",
                fontSize: "11px",
                lineHeight: 1.25,
                paddingTop: "6mm",
                paddingBottom: "6mm",
              }}
            >
              {/* Nadpis + hlavička */}
              <div
                style={{
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: "15px",
                  marginBottom: "2.5mm",
                }}
              >
                PROTOKOL o určení vnějších vlivů
              </div>
              <div style={{ textAlign: "center", marginBottom: "3mm" }}>
                {data.objectName || "—"} · {data.address || "—"} ·{" "}
                {data.date || "—"} · Zpracoval: {data.preparedBy || "—"}
                {doc?.number ? <> · Číslo: {doc.number}</> : null}
              </div>

              {(data.submittedDocs || data.objectDescription) && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "4mm",
                    marginBottom: "3mm",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: "1mm" }}>
                      Předložená dokumentace
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>
                      {data.submittedDocs || "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: "1mm" }}>
                      Stručný popis objektu
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>
                      {data.objectDescription || "—"}
                    </div>
                  </div>
                </div>
              )}

              {/* Komise */}
              <table
                style={{
                  width: "100%",
                  marginBottom: "3mm",
                  borderCollapse: "collapse",
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ width: "28mm", border: "1px solid #333", padding: "3px" }}>
                      Předseda
                    </td>
                    <td style={{ border: "1px solid #333", padding: "3px" }}>
                      {data.committee.find((m) => m.role === "Předseda")?.name ||
                        "—"}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: "1px solid #333", padding: "3px" }}>
                      Členové
                    </td>
                    <td style={{ border: "1px solid #333", padding: "3px" }}>
                      {data.committee
                        .filter((m) => m.role === "Člen")
                        .map((m) => m.name)
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Tabulka vlivů (aktivní prostor) */}
              <div style={{ fontWeight: 600, marginBottom: "1mm" }}>
                Určení vnějších vlivů — {activeSpace?.name || "—"}
              </div>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginBottom: "3mm",
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        border: "1px solid #333",
                        padding: "3px",
                        textAlign: "left",
                      }}
                    >
                      Vliv
                    </th>
                    <th
                      style={{
                        border: "1px solid #333",
                        padding: "3px",
                        textAlign: "left",
                      }}
                    >
                      Označení
                    </th>
                    <th
                      style={{
                        border: "1px solid #333",
                        padding: "3px",
                        textAlign: "left",
                      }}
                    >
                      Normální třídy
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {families.map((fam) => {
                    const sel = activeSpace?.selections[fam.code] || "";
                    const normals = fam.items
                      .filter((x) => influences![x.code]?.normal)
                      .map((x) => x.code)
                      .join(", ");
                    return (
                      <tr key={fam.code}>
                        <td style={{ border: "1px solid #333", padding: "3px" }}>
                          <span style={{ fontFamily: "monospace" }}>{fam.code}</span>{" "}
                          — {fam.name}
                        </td>
                        <td
                          style={{
                            border: "1px solid #333",
                            padding: "3px",
                            fontFamily: "monospace",
                          }}
                        >
                          {sel || "—"}
                        </td>
                        <td
                          style={{
                            border: "1px solid #333",
                            padding: "3px",
                            fontFamily: "monospace",
                          }}
                        >
                          {normals || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* SOUHRN POŽADAVKŮ – 2–3 sloupce (dedup) */}
              <div style={{ fontWeight: 600, marginBottom: "1mm" }}>
                Souhrn požadavků vyplývajících z určených vlivů
              </div>
              {groupedReqForActive.length ? (
                groupedReqForActive.map((g, gi) => {
                  const cols = g.items.length > 14 ? 3 : 2;
                  const rows = toColumns(g.items, cols);
                  return (
                    <div key={gi} style={{ marginBottom: "2mm" }}>
                      <div style={{ fontWeight: 600, margin: "0 0 0.5mm 0" }}>
                        {g.category}
                      </div>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <tbody>
                          {rows.map((r, ri) => (
                            <tr key={ri}>
                              {r.map((cell, ci) => (
                                <td
                                  key={ci}
                                  style={{
                                    border: "1px solid #333",
                                    padding: "2px 3px",
                                    width: `${100 / cols}%`,
                                  }}
                                >
                                  {cell ? <span>• {cell}</span> : <span>&nbsp;</span>}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: "#555" }}>—</div>
              )}

              {/* Doložka – prázdné místo na ruční doplnění */}
              <div style={{ marginTop: "5mm" }}>V ____________ dne ____________</div>

              {/* Podpisy */}
              <div style={{ display: "flex", gap: "8mm", marginTop: "10mm" }}>
                {data.committee.map((m, i) => (
                  <div key={i} style={{ flex: 1 }}>
                    <div
                      style={{
                        borderTop: "1px solid #333",
                        paddingTop: "3mm",
                        textAlign: "center",
                      }}
                    >
                      {m.name || "__________"}
                      <br />
                      <span style={{ fontSize: "10px" }}>{m.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer status */}
        <div className="no-print text-sm text-slate-500 mt-6">
          Backend: <span className="font-mono">{API_DISPLAY}</span> •{" "}
          {busy ? "Načítám…" : "Připraveno"}
        </div>
      </main>
      <GuideOverlay
        active={guideOn}
        targetId={guideSteps[guideIndex]?.targetId || null}
        title={guideSteps[guideIndex]?.title || ""}
        text={guideSteps[guideIndex]?.text || ""}
        isLast={guideIndex >= guideSteps.length - 1}
        onNext={handleNext}
        onClose={closeGuide}
      />
    </div>
  );
}
