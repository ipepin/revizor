// src/context/RevisionFormContext.tsx

import React, {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import axios from "axios";

axios.defaults.baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// —–– Typ pro jednu komponentu
export interface Komponenta {
  id: number;
  nazevId: string;    // ID přístroje z katalogu
  nazev: string;      // text pro zobrazení
  popisId: string;    // ID výrobce
  popis: string;      // text výrobce
  typId: string;      // ID modelu
  typ: string;        // text modelu
  poles: string;
  dimenze: string;
  riso: string;
  ochrana: string;
  poznamka: string;
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
  rooms: any[];

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
  finish: () => void;
}

export const RevisionFormContext = createContext<ContextValue>(
  {} as ContextValue
);

export function RevisionFormProvider({
  revId,
  children,
}: {
  revId: number;
  children: ReactNode;
}) {
  const [form, setForm] = useState<RevisionForm>({
    evidencni: "",
    objekt: "",
    adresa: "",
    objednatel: "",
    typRevize: "",
    sit: "",
    voltage: "",
    date_start: "",
    date_end: "",
    date_created: "",
    documentation: "",
    environment: "",
    extraNotes: "",
    protection_basic: [],
    protection_fault: [],
    protection_additional: [],
    norms: [],
    customNorm1: "",
    customNorm2: "",
    customNorm3: "",
    boards: [],
    rooms: [],
    defects: [],
    performedTasks: [],
    inspectionTemplate: "",
    inspectionDescription: "",
    tests: {},
    conclusion: {
      text: "",
      safety: "",
      validUntil: "",
    },
  });

  // Načtení existující revize
  useEffect(() => {
    axios
      .get(`/revisions/${revId}`)
      .then((res) => {
        const data = res.data;
        let parsedJson: Partial<RevisionForm> = {};
        if (data.data_json) {
          try {
            parsedJson = JSON.parse(data.data_json);
          } catch {
            console.warn("data_json není validní JSON");
          }
        }
        setForm((f) => ({
          ...f,
          ...parsedJson,
          evidencni: data.number ?? f.evidencni,
        }));
      })
      .catch((err) => {
        console.warn("Nelze načíst revizi:", err);
      });
  }, [revId]);

  // Funkce pro okamžité uložení
  const saveNow = useCallback(() => {
    axios
      .patch(`/revisions/${revId}`, {
        data_json: JSON.stringify(form),
      })
      .catch((err) => console.warn("Uložení revize selhalo:", err));
  }, [form, revId]);

  // Autosave s 800ms debouncingem
  useEffect(() => {
    const timeout = setTimeout(saveNow, 800);
    return () => clearTimeout(timeout);
  }, [form, saveNow]);

  // Označit dokončení revize
  const finish = useCallback(() => {
    saveNow();
    console.log("Revision marked as finished");
  }, [saveNow]);

  return (
    <RevisionFormContext.Provider
      value={{ form, setForm, saveNow, finish }}
    >
      {children}
    </RevisionFormContext.Provider>
  );
}

export function useRevisionForm() {
  return React.useContext(RevisionFormContext);
}
