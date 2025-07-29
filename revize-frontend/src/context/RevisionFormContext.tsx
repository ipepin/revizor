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

// Typ pro jednu komponentu v rozvaděči
export interface Komponenta {
  id: number;
  nazev: string;
  popis: string;
  dimenze: string;
  riso: string;
  ochrana: string;
  poznamka: string;
}

// Typ pro jeden rozvaděč
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

// Typ pro jednu závadu
export interface Defect {
  description: string;
  standard: string;
  article: string;
}

// Celkový typ formuláře
export type RevisionForm = {
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

  protection_basic: string[];
  protection_fault: string[];
  protection_additional: string[];

  norms: string[];
  customNorm1: string;
  customNorm2: string;
  customNorm3: string;

  boards: Board[];
  rooms: any[];

  defects: Defect[];

  conclusion: {
    text: string;
    safety: "able" | "not_able" | "";
    validUntil: string;
  };
};

type ContextValue = {
  form: RevisionForm;
  setForm: React.Dispatch<React.SetStateAction<RevisionForm>>;
  saveNow: () => void;
  finish: () => void;
};

export const RevisionFormContext = createContext<ContextValue>(null!);

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

    conclusion: {
      text: "",
      safety: "",
      validUntil: "",
    },
  });

  useEffect(() => {
    axios
      .get<{ data_json?: string }>(`/revisions/${revId}`)
      .then((res) => {
        if (res.data.data_json) {
          try {
            setForm(JSON.parse(res.data.data_json));
          } catch {
            console.warn("data_json není validní JSON");
          }
        }
      })
      .catch(() => {
        console.warn("Nelze načíst revizi (neexistuje nebo síť).");
      });
  }, [revId]);

  useEffect(() => {
    const h = setTimeout(() => {
      axios
        .patch(`/revisions/${revId}`, { data_json: JSON.stringify(form) })
        .catch(() => console.warn("Autosave selhal"));
    }, 800);
    return () => clearTimeout(h);
  }, [form, revId]);

  const saveNow = useCallback(() => {
    axios.patch(`/revisions/${revId}`, { data_json: JSON.stringify(form) });
  }, [form, revId]);

  const finish = useCallback(() => {
    axios
      .patch(`/revisions/${revId}`, { data_json: JSON.stringify(form) })
      .then(() => console.log("Revision marked as finished"));
  }, [form, revId]);

  return (
    <RevisionFormContext.Provider value={{ form, setForm, saveNow, finish }}>
      {children}
      <div className="fixed bottom-4 right-4 flex gap-2">
        <button
          onClick={saveNow}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
        >
          Uložit
        </button>
        <button
          onClick={finish}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm"
        >
          Dokončit
        </button>
      </div>
    </RevisionFormContext.Provider>
  );
}
