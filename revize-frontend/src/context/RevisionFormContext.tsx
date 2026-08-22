import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import api from "../api/axios";

// â€”â€“â€“ Typ pro jednu komponentu
export interface Komponenta {
  id: number;
  nazevId: string; // ID pĹ™Ă­stroje z katalogu
  nazev: string; // text pro zobrazenĂ­
  popisId: string; // ID vĂ˝robce
  popis: string; // text vĂ˝robce
  typId: string; // ID modelu
  typ: string; // text modelu
  poles: string;
  dimenze: string;
  riso: string;
  ochrana: string;
  poznamka: string;
  vybavovaciCasMs?: string;
  vybavovaciProudmA?: string;
  dotykoveNapetiV?: string;
  parentId?: number | null;
  order?: number;
  rowId?: number | null;
}

export interface Device {
  id: number;
  pocet: number;
  typ: string;
  dimenze: string;
  ochrana: string;
  riso: string;
  podrobnosti: string;
}

export interface Room {
  id: number;
  name: string;
  details: string;
  devices: Device[];
}

// â€”â€“â€“ Typ pro jeden rozvadÄ›ÄŤ (board)
export interface Board {
  id: number;
  name: string;
  vyrobce: string;
  typ: string;
  vyrobniCislo: string;
  napeti: string;
  proud: string;
  supplySystem: string;
  supplyPhase: string;
  ip: string;
  odpor: string;
  umisteni: string;
  poznamkyHtml: string;
  rows?: { id: number; name: string }[];
  komponenty: Komponenta[];
}

// â€”â€“â€“ Data pro jednu zĂˇvadu
export interface Defect {
  uid: string;
  description: string;
  standard: string;
  article: string;
}

export interface DefectDraft {
  uid: string;
  text: string;
  createdAt: string;
  linkedPhotoIds: number[];
}

// â€”â€“â€“ Data pro jednu zkouĹˇku
export type TestData = {
  checked: boolean;
  note: string;
};

// â€”â€“â€“ VolitelnĂ© mÄ›Ĺ™icĂ­ pĹ™Ă­stroje (aby sedÄ›lo na Summary)
export interface Instrument {
  name: string;
  measurement?: string;
  calibration_list?: string;
  calibration?: string;
}

export type UserInstrument = {
  id: string;
  name: string;
  measurement_text: string;
  calibration_code: string;
  serial?: string | null;
  calibration_valid_until?: string | null; // YYYY-MM-DD
  note?: string | null;
};

// â€”â€“â€“ CelkovĂ˝ tvar dat formulĂˇĹ™e
export interface RevisionForm {
  // IdentifikaÄŤnĂ­ Ăşdaje
  evidencni: string;
  uuid: string;
  objekt: string;
  adresa: string;
  objednatel: string;
  typRevize: string;
  sit: string;
  voltage: string;
  date_start: string;
  date_end: string;
  date_created: string;
  documentation: string;
  environment: string;
  extraNotes: string;

  // âś… VYBRANĂ‰ MÄšĹICĂŤ PĹĂŤSTROJE (per revize)
  measuringInstruments: UserInstrument[];

  // MontĂˇĹľnĂ­ firma (volnĂ˝ text)
  montFirma: string;
  montFirmaAuthorization: string;

  // Subjekt revize (OSVÄŚ / firma) + Ăşdaje subjektu
  technicianSubjectType: "osvc" | "company" | "";
  technicianCompanyId: string | number | null; // id firmy, pokud vybrĂˇna
  technicianCompanyName: string;
  technicianCompanyIco: string;
  technicianCompanyDic: string;
  technicianCompanyAddress: string;

  // Ăšdaje reviznĂ­ho technika (z UserContextu, ale uklĂˇdĂˇme do revize pro export)
  technicianName: string;
  technicianCertificateNumber: string;
  technicianAuthorizationNumber: string;

  // Ochrany
  protection_basic: string[];
  protection_fault: string[];
  protection_additional: string[];

  // Normy
  norms: string[];
  customNorm1: string;
  customNorm2: string;
  customNorm3: string;

  // MÄ›Ĺ™enĂ­
  boards: Board[];
  rooms: Room[];
  instruments?: Instrument[]; // volitelnĂ© (kvĹŻli starĂ˝m revizĂ­m)

  // ZĂˇvady
  defects: Defect[];
  defectDrafts: DefectDraft[];
  defectsRichText: string;

  // ProhlĂ­dka
  performedTasks: string[];
  inspectionTemplate: string;
  inspectionDescription: string;

  // ZkouĹˇky
  tests: Record<string, TestData>;

  // ZĂˇvÄ›r
  conclusion: {
    text: string;
    safety: "able" | "not_able" | "";
    validUntil: string;
  };
}

interface ContextValue {
  form: RevisionForm;
  setForm: React.Dispatch<React.SetStateAction<RevisionForm>>;
  saveNow: () => void;
  finish: () => Promise<void>;
  revId: number;
  defectPhotosVersion: number;
  notifyDefectPhotosChanged: () => void;
}

export const RevisionFormContext = createContext<ContextValue>({} as ContextValue);

function makeUid(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// â€”â€“â€“ PomocnĂ©: bezpeÄŤnĂ© naÄŤtenĂ­ JSONu (umĂ­ objekt i historicky uloĹľenĂ˝ string)
function safeParseDataJson(raw: unknown): Partial<RevisionForm> {
  if (raw == null) return {};
  if (typeof raw === "object") return raw as Partial<RevisionForm>;
  if (typeof raw === "string") {
    try {
      const once = JSON.parse(raw);
      if (typeof once === "object" && once) return once as Partial<RevisionForm>;
      if (typeof once === "string") {
        try {
          return JSON.parse(once);
        } catch {
          return {};
        }
      }
    } catch {
      return {};
    }
  }
  return {};
}

// â€”â€“â€“ PomocnĂ©: doplnĂ­ defaulty na chybÄ›jĂ­cĂ­ hodnoty (pro starĂ© revize)
// + podpora LEGACY klĂ­ÄŤe `merici_pristroje` -> measuringInstruments
function withDefaults(p: Partial<RevisionForm>): RevisionForm {
  // LEGACY mapovĂˇnĂ­: starĂ˝ export mohl mĂ­t `merici_pristroje`
  const legacyMeas =
    Array.isArray((p as any)?.measuringInstruments)
      ? (p as any).measuringInstruments
      : Array.isArray((p as any)?.merici_pristroje)
      ? (p as any).merici_pristroje
      : [];

  return {
    evidencni: p.evidencni ?? "",
    uuid: p.uuid ?? "",
    objekt: p.objekt ?? "",
    adresa: p.adresa ?? "",
    objednatel: p.objednatel ?? "",
    typRevize: p.typRevize ?? "",
    sit: p.sit ?? "",
    voltage: p.voltage ?? "",
    date_start: p.date_start ?? "",
    date_end: p.date_end ?? "",
    date_created: p.date_created ?? "",
    documentation: p.documentation ?? "",
    environment: p.environment ?? "",
    extraNotes: p.extraNotes ?? "",

    // âś… NOVĂ‰: vĹľdy inicializujeme vybranĂ© pĹ™Ă­stroje
    measuringInstruments: Array.isArray(legacyMeas) ? (legacyMeas as UserInstrument[]) : [],

    montFirma: p.montFirma ?? "",
    montFirmaAuthorization: p.montFirmaAuthorization ?? "",

    technicianSubjectType: p.technicianSubjectType ?? "",
    technicianCompanyId: p.technicianCompanyId ?? null,
    technicianCompanyName: p.technicianCompanyName ?? "",
    technicianCompanyIco: p.technicianCompanyIco ?? "",
    technicianCompanyDic: p.technicianCompanyDic ?? "",
    technicianCompanyAddress: p.technicianCompanyAddress ?? "",

    technicianName: p.technicianName ?? "",
    technicianCertificateNumber: p.technicianCertificateNumber ?? "",
    technicianAuthorizationNumber: p.technicianAuthorizationNumber ?? "",

    protection_basic: Array.isArray(p.protection_basic) ? p.protection_basic : [],
    protection_fault: Array.isArray(p.protection_fault) ? p.protection_fault : [],
    protection_additional: Array.isArray(p.protection_additional) ? p.protection_additional : [],

    norms: Array.isArray(p.norms) ? p.norms : [],
    customNorm1: p.customNorm1 ?? "",
    customNorm2: p.customNorm2 ?? "",
    customNorm3: p.customNorm3 ?? "",

    boards: Array.isArray(p.boards) ? p.boards : [],
    rooms: Array.isArray(p.rooms) ? p.rooms : [],
    instruments: Array.isArray(p.instruments) ? p.instruments : undefined,

    defects: Array.isArray(p.defects)
      ? p.defects.map((d: any) => ({
          uid: String(d?.uid || d?.id || makeUid("defect")),
          description: String(d?.description || ""),
          standard: String(d?.standard || ""),
          article: String(d?.article || ""),
        }))
      : [],
    defectDrafts: Array.isArray((p as any).defectDrafts)
      ? (p as any).defectDrafts.map((item: any) => ({
          uid: String(item?.uid || makeUid("defect-draft")),
          text: String(item?.text || item?.description || ""),
          createdAt: String(item?.createdAt || item?.created_at || new Date().toISOString()),
          linkedPhotoIds: Array.isArray(item?.linkedPhotoIds)
            ? item.linkedPhotoIds
                .map((value: any) => Number(value))
                .filter((value: number) => Number.isFinite(value))
            : [],
        }))
      : [],
    defectsRichText: p.defectsRichText ?? "",

    performedTasks: Array.isArray(p.performedTasks) ? p.performedTasks : [],
    inspectionTemplate: p.inspectionTemplate ?? "",
    inspectionDescription: p.inspectionDescription ?? "",

    tests: p.tests ?? {},

    conclusion: {
      text: p.conclusion?.text ?? "",
      safety: p.conclusion?.safety ?? "",
      validUntil: p.conclusion?.validUntil ?? "",
    },
    // Zachovej LPS data (a další neznámé části)
    lps: (p as any)?.lps ?? {},
  };
}

function syncRevisionValidity(
  form: RevisionForm,
  backendValidUntil?: string | null
): RevisionForm {
  const editorValue = String(form?.conclusion?.validUntil ?? "").trim();
  const fallbackValue = String(backendValidUntil ?? "").trim();
  const nextValidUntil = editorValue || fallbackValue;

  return {
    ...form,
    conclusion: {
      ...form.conclusion,
      validUntil: nextValidUntil,
    },
  };
}

function firstNonEmpty(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function normalizeConclusionSafety(value: unknown): RevisionForm["conclusion"]["safety"] {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return "";

  if (["able", "ok", "vyhovuje", "kladna", "kladná", "pozitivni", "pozitivní"].includes(text)) {
    return "able";
  }

  if (
    [
      "not",
      "not_able",
      "not-able",
      "negative",
      "negativni",
      "negativní",
      "nevyhovuje",
      "neschopna",
      "neschopná",
    ].includes(text)
  ) {
    return "not_able";
  }

  return "";
}

function mergeBackendConclusion(
  parsed: Partial<RevisionForm>,
  data: any
): Partial<RevisionForm> {
  const parsedConclusion = parsed.conclusion ?? {};
  const safety = normalizeConclusionSafety(
    firstNonEmpty(data?.conclusion_safety, parsedConclusion.safety)
  );

  return {
    ...parsed,
    conclusion: {
      ...parsedConclusion,
      text: firstNonEmpty(data?.conclusion_text, parsedConclusion.text),
      safety,
      validUntil: firstNonEmpty(
        data?.conclusion_valid_until,
        data?.valid_until,
        parsedConclusion.validUntil
      ),
    },
  };
}

function dateOrNull(value: unknown) {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

export function RevisionFormProvider({
  revId,
  children,
  training = false,
  initialData,
}: {
  revId: number;
  children: ReactNode;
  training?: boolean;
  initialData?: Partial<RevisionForm>;
}) {
  const [form, setForm] = useState<RevisionForm>(() =>
    withDefaults(initialData ?? {})
  );
  const [defectPhotosVersion, setDefectPhotosVersion] = useState(0);
  const [loaded, setLoaded] = useState(training);
  const latestFormRef = useRef(form);

  useEffect(() => {
    latestFormRef.current = form;
  }, [form]);

  // NaÄŤtenĂ­ existujĂ­cĂ­ revize (s JWT pĹ™es api klient)
  useEffect(() => {
    if (training) {
      setLoaded(true);
      return;
    }
    setLoaded(false);
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await api.get(`/revisions/${revId}`, { signal: ctrl.signal });
        const data = res.data;

        // data_json mĹŻĹľe bĂ˝t string nebo object
        const parsed = mergeBackendConclusion(safeParseDataJson(data?.data_json), data);

        // SlouÄŤenĂ­ s defaulty + pĹ™epsĂˇnĂ­ ÄŤĂ­slem revize
        setForm(() => {
          const merged = withDefaults(parsed);
          return syncRevisionValidity(
            {
              ...merged,
              evidencni: data?.number ?? merged.evidencni,
              uuid: data?.uuid ?? merged.uuid,
            },
            data?.valid_until ?? data?.conclusion_valid_until ?? ""
          );
        });
      } catch (err: any) {
        if (err?.name !== "CanceledError") {
          console.warn("Nelze naÄŤĂ­st revizi:", err?.response?.data || err);
        }
      } finally {
        if (!ctrl.signal.aborted) {
          setLoaded(true);
        }
      }
    })();
    return () => ctrl.abort();
  }, [revId, training]);

  const buildSavePayload = useCallback((sourceForm: RevisionForm) => {
    const syncedForm = syncRevisionValidity(sourceForm);
    const validUntil = dateOrNull(syncedForm.conclusion.validUntil);
    const conclusionSafety = normalizeConclusionSafety(syncedForm.conclusion.safety);
    return {
      data_json: syncedForm,
      valid_until: validUntil,
      conclusion_text: syncedForm.conclusion.text || "",
      conclusion_safety: conclusionSafety,
      conclusion_valid_until: validUntil,
    };
  }, []);

  const saveForm = useCallback((sourceForm: RevisionForm) => {
    if (training || !loaded) return;
    return api
      .patch(`/revisions/${revId}`, buildSavePayload(sourceForm))
      .catch((err) => console.warn("UloĹľenĂ­ revize selhalo:", err?.response?.data || err));
  }, [buildSavePayload, loaded, revId, training]);

  // Funkce pro okamĹľitĂ© uloĹľenĂ­ (PATCH /revisions/:id)
  const saveNow = useCallback(() => {
    void saveForm(latestFormRef.current);
  }, [saveForm]);

  // Autosave s 800ms debouncingem
  useEffect(() => {
    if (training || !loaded) return;
    const timeout = setTimeout(saveNow, 800);
    return () => clearTimeout(timeout);
  }, [form, loaded, saveNow, training]);

  useEffect(() => {
    return () => {
      if (!training && loaded) {
        void saveForm(latestFormRef.current);
      }
    };
  }, [loaded, revId, saveForm, training]);

  // Označit Dokončení revize
  const finish = useCallback(async () => {
    if (training) return;
    const payload = buildSavePayload(latestFormRef.current);
    try {
      await api.patch(`/revisions/${revId}`, {
        ...payload,
        status: "Dokončená",
      });
      console.log("Revize označena jako 'Dokončená'");
    } catch (err1: any) {
      console.warn("PATCH combined selhal, zkouĹˇĂ­m sekvenčně:", err1?.response?.data || err1);
      try {
        await api.patch(`/revisions/${revId}`, payload);
        await api.patch(`/revisions/${revId}`, { status: "Dokončená" });
        console.log("Revize označena jako 'Dokončená' (sekvenčně).");
      } catch (err2) {
        console.warn("Dokončení revize selhalo:", (err2 as any)?.response?.data || err2);
      }
    }
  }, [buildSavePayload, revId, training]);

  const notifyDefectPhotosChanged = useCallback(() => {
    setDefectPhotosVersion((value) => value + 1);
  }, []);

  return (
    <RevisionFormContext.Provider
      value={{ form, setForm, saveNow, finish, revId, defectPhotosVersion, notifyDefectPhotosChanged }}
    >
      {children}
    </RevisionFormContext.Provider>
  );
}

export function useRevisionForm() {
  return React.useContext(RevisionFormContext);
}


