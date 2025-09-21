import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import api from "../api/axios";

// —–– Typ pro jednu komponentu
export interface Komponenta {
  id: number;
  nazevId: string; // ID přístroje z katalogu
  nazev: string; // text pro zobrazení
  popisId: string; // ID výrobce
  popis: string; // text výrobce
  typId: string; // ID modelu
  typ: string; // text modelu
  poles: string;
  dimenze: string;
  riso: string;
  ochrana: string;
  poznamka: string;
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

// —–– Typ pro jeden rozvaděč (board)
export interface Board {
  id: number;
  name: string;
  vyrobce: string;
  typ: string;
  vyrobniCislo: string;
  napeti: string;
  proud: string;
  ip: string;
  odpor: string;
  umisteni: string;
  komponenty: Komponenta[];
}

// —–– Data pro jednu závadu
export interface Defect {
  description: string;
  standard: string;
  article: string;
}

// —–– Data pro jednu zkoušku
export type TestData = {
  checked: boolean;
  note: string;
};

// —–– Volitelné měřicí přístroje (aby sedělo na Summary)
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

// —–– Celkový tvar dat formuláře
export interface RevisionForm {
  // Identifikační údaje
  evidencni: string;
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

  // ✅ VYBRANÉ MĚŘICÍ PŘÍSTROJE (per revize)
  measuringInstruments: UserInstrument[];

  // Montážní firma (volný text)
  montFirma: string;
  montFirmaAuthorization: string;

  // Subjekt revize (OSVČ / firma) + údaje subjektu
  technicianSubjectType: "osvc" | "company" | "";
  technicianCompanyId: string | number | null; // id firmy, pokud vybrána
  technicianCompanyName: string;
  technicianCompanyIco: string;
  technicianCompanyDic: string;
  technicianCompanyAddress: string;

  // Údaje revizního technika (z UserContextu, ale ukládáme do revize pro export)
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

  // Měření
  boards: Board[];
  rooms: Room[];
  instruments?: Instrument[]; // volitelné (kvůli starým revizím)

  // Závady
  defects: Defect[];

  // Prohlídka
  performedTasks: string[];
  inspectionTemplate: string;
  inspectionDescription: string;

  // Zkoušky
  tests: Record<string, TestData>;

  // Závěr
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
}

export const RevisionFormContext = createContext<ContextValue>({} as ContextValue);

// —–– Pomocné: bezpečné načtení JSONu (umí objekt i historicky uložený string)
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

// —–– Pomocné: doplní defaulty na chybějící hodnoty (pro staré revize)
// + podpora LEGACY klíče `merici_pristroje` -> measuringInstruments
function withDefaults(p: Partial<RevisionForm>): RevisionForm {
  // LEGACY mapování: starý export mohl mít `merici_pristroje`
  const legacyMeas =
    Array.isArray((p as any)?.measuringInstruments)
      ? (p as any).measuringInstruments
      : Array.isArray((p as any)?.merici_pristroje)
      ? (p as any).merici_pristroje
      : [];

  return {
    evidencni: p.evidencni ?? "",
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

    // ✅ NOVÉ: vždy inicializujeme vybrané přístroje
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

    defects: Array.isArray(p.defects) ? p.defects : [],

    performedTasks: Array.isArray(p.performedTasks) ? p.performedTasks : [],
    inspectionTemplate: p.inspectionTemplate ?? "",
    inspectionDescription: p.inspectionDescription ?? "",

    tests: p.tests ?? {},

    conclusion: {
      text: p.conclusion?.text ?? "",
      safety: p.conclusion?.safety ?? "",
      validUntil: p.conclusion?.validUntil ?? "",
    },
  };
}

export function RevisionFormProvider({
  revId,
  children,
}: {
  revId: number;
  children: ReactNode;
}) {
  const [form, setForm] = useState<RevisionForm>(
    withDefaults({})
  );

  // Načtení existující revize (s JWT přes api klient)
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await api.get(`/revisions/${revId}`, { signal: ctrl.signal });
        const data = res.data;

        // data_json může být string nebo object
        const parsed = safeParseDataJson(data?.data_json);

        // Sloučení s defaulty + přepsání číslem revize
        setForm((prev) => {
          const merged = withDefaults({ ...prev, ...parsed });
          return { ...merged, evidencni: data?.number ?? merged.evidencni };
        });
      } catch (err: any) {
        if (err?.name !== "CanceledError") {
          console.warn("Nelze načíst revizi:", err?.response?.data || err);
        }
      }
    })();
    return () => ctrl.abort();
  }, [revId]);

  // Funkce pro okamžité uložení (PATCH /revisions/:id)
  const saveNow = useCallback(() => {
    // backend čeká objekt (dict), ne string
    api
      .patch(`/revisions/${revId}`, { data_json: form })
      .catch((err) => console.warn("Uložení revize selhalo:", err?.response?.data || err));
  }, [form, revId]);

  // Autosave s 800ms debouncingem
  useEffect(() => {
    const timeout = setTimeout(saveNow, 800);
    return () => clearTimeout(timeout);
  }, [form, saveNow]);

  // Označit dokončení revize
  const finish = useCallback(async () => {
    try {
      await api.patch(`/revisions/${revId}`, {
        data_json: form,
        status: "Dokončená",
      });
      console.log("Revize označena jako 'Dokončená'");
    } catch (err1: any) {
      console.warn("PATCH combined selhal, zkouším sekvenčně:", err1?.response?.data || err1);
      try {
        await api.patch(`/revisions/${revId}`, { data_json: form });
        await api.patch(`/revisions/${revId}`, { status: "Dokončená" });
        console.log("Revize označena jako 'Dokončená' (sekvenčně).");
      } catch (err2) {
        console.warn("Dokončení revize selhalo:", (err2 as any)?.response?.data || err2);
      }
    }
  }, [form, revId]);

  return (
    <RevisionFormContext.Provider value={{ form, setForm, saveNow, finish }}>
      {children}
    </RevisionFormContext.Provider>
  );
}

export function useRevisionForm() {
  return React.useContext(RevisionFormContext);
}
