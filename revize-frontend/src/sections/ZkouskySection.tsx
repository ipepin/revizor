// src/sections/ZkouskySection.tsx

import React, { useContext, ChangeEvent } from "react";
import { RevisionFormContext, TestData } from "../context/RevisionFormContext";

const defaultTests = [
  "Spojitost ochranných vodičů",
  "Izolační odpor",
  "Proudový chránič – vybavovací proud",
  "Proudový chránič – čas vypnutí",
  "Impedance smyčky",
  "Úbytek napětí",
  "Ověření sledování fází",
  "Funkčnost přepěťové ochrany",
  "Proudová zatížitelnost vodičů",
  "Zkouška funkčnosti jištění",
];

const DEFAULT_NOTE = "Bez závad";

export default function ZkouskySection() {
  const { form, setForm } = useContext(RevisionFormContext);

  const toggleTest = (label: string) => {
    setForm((f) => {
      const prev: TestData = f.tests[label] ?? { checked: false, note: "" };
      return {
        ...f,
        tests: {
          ...f.tests,
          [label]: { ...prev, checked: !prev.checked },
        },
      };
    });
  };

  const handleNoteChange = (label: string, note: string) => {
    setForm((f) => {
      const prev: TestData = f.tests[label] ?? { checked: false, note: "" };
      return {
        ...f,
        tests: {
          ...f.tests,
          [label]: { ...prev, note },
        },
      };
    });
  };

  const fillDefaultNote = (label: string) => {
    setForm((f) => {
      const prev: TestData = f.tests[label] ?? { checked: false, note: "" };
      return {
        ...f,
        tests: {
          ...f.tests,
          [label]: { ...prev, note: DEFAULT_NOTE },
        },
      };
    });
  };

  const clearNote = (label: string) => {
    setForm((f) => {
      const prev: TestData = f.tests[label] ?? { checked: false, note: "" };
      return {
        ...f,
        tests: {
          ...f.tests,
          [label]: { ...prev, note: "" },
        },
      };
    });
  };

  return (
    <div className="space-y-4 text-sm text-gray-800">
      <h2 className="text-xl font-semibold text-blue-800">Provedené zkoušky</h2>

      <div data-guide-id="zk-tests" className="space-y-3">
        {defaultTests.map((label) => {
          const data: TestData = form.tests[label] ?? { checked: false, note: "" };
          return (
            <div key={label} className="flex flex-col gap-2 md:flex-row md:items-center">
              <label className="flex w-full items-center gap-2 text-sm md:w-1/2">
                <input
                  type="checkbox"
                  checked={data.checked}
                  onChange={() => toggleTest(label)}
                  className="accent-blue-600"
                />
                {label}
              </label>
              <input
                type="text"
                className="flex-1 rounded border px-3 py-1.5"
                placeholder="Poznámka, např. Bez závad"
                value={data.note}
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleNoteChange(label, e.target.value)}
              />
              <button
                type="button"
                className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                onClick={() => fillDefaultNote(label)}
              >
                Bez závad
              </button>
              <button
                type="button"
                className="rounded-full border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                onClick={() => clearNote(label)}
                title="Vymazat poznámku"
              >
                X
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
