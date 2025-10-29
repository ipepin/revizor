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

export default function ZkouskySection() {
  const { form, setForm } = useContext(RevisionFormContext);

  // Toggle checkbox
  const toggleTest = (label: string) => {
    setForm((f) => {
      const prev: TestData = f.tests[label] ?? { checked: false, note: "" };
      const updated = {
        ...f.tests,
        [label]: { ...prev, checked: !prev.checked },
      };
      return { ...f, tests: updated };
    });
  };

  // Poznámka
  const handleNoteChange = (label: string, note: string) => {
    setForm((f) => {
      const prev: TestData = f.tests[label] ?? { checked: false, note: "" };
      const updated = {
        ...f.tests,
        [label]: { ...prev, note },
      };
      return { ...f, tests: updated };
    });
  };

  return (
    <div className="space-y-4 text-sm text-gray-800">
      <h2 className="text-xl font-semibold text-blue-800 mb-3">
        🔍 Provedené zkoušky
      </h2>

      <div className="space-y-3">
        {defaultTests.map((label) => {
          const data: TestData = form.tests[label] ?? { checked: false, note: "" };
          return (
            <div
              key={label}
              className="flex flex-col md:flex-row md:items-center gap-2"
            >
              <label className="flex items-center gap-2 w-full md:w-1/2 text-sm">
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
                placeholder="Poznámka např. Bez závad"
                value={data.note}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleNoteChange(label, e.target.value)
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
