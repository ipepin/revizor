// src/context/RevisionFormContext.tsx

import React, { createContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";

export interface RevisionForm {
  defects: string[];
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

export const RevisionFormContext = createContext<ContextValue>(null!);

export function RevisionFormProvider({
  revId,
  children,
}: {
  revId: number;
  children: ReactNode;
}) {
  const [form, setForm] = useState<RevisionForm>({
    defects: [],
    conclusion: { text: "", safety: "", validUntil: "" },
  });

  // autosave s debounce 800ms
  useEffect(() => {
    const h = setTimeout(() => {
      axios.patch(`/revisions/${revId}`, {
        defects: form.defects.join("\n"),
        conclusion_text: form.conclusion.text,
        conclusion_safety: form.conclusion.safety,
        conclusion_valid_until: form.conclusion.validUntil,
      });
    }, 800);
    return () => clearTimeout(h);
  }, [form, revId]);

  const saveNow = () => {
    axios.patch(`/revisions/${revId}`, {
      defects: form.defects.join("\n"),
      conclusion_text: form.conclusion.text,
      conclusion_safety: form.conclusion.safety,
      conclusion_valid_until: form.conclusion.validUntil,
    });
  };

  const finish = () => {
    axios
      .patch(`/revisions/${revId}`, {
        defects: form.defects.join("\n"),
        conclusion_text: form.conclusion.text,
        conclusion_safety: form.conclusion.safety,
        conclusion_valid_until: form.conclusion.validUntil,
      })
      .then(() => {
        // např. redirect nebo změnit status revize na "dokončená"
      });
  };

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
