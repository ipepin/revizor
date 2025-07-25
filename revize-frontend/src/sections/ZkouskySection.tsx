import React, { useState } from "react";

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
  "Zkouška funkčnosti jištění"
];

export default function ZkouskySection() {
  const [tests, setTests] = useState<{ [key: string]: { checked: boolean; note: string } }>(
    Object.fromEntries(defaultTests.map((t) => [t, { checked: false, note: "" }]))
  );

  const handleToggle = (test: string) => {
    setTests((prev) => ({
      ...prev,
      [test]: { ...prev[test], checked: !prev[test].checked }
    }));
  };

  const handleNoteChange = (test: string, note: string) => {
    setTests((prev) => ({
      ...prev,
      [test]: { ...prev[test], note }
    }));
  };

  return (
    <div className="space-y-4 bg-white p-6 rounded shadow border border-gray-200">
      <h2 className="text-2xl font-semibold text-blue-800 mb-4">🔍 Provedené zkoušky</h2>

      <div className="space-y-3">
        {Object.entries(tests).map(([label, data]) => (
          <div key={label} className="flex flex-col md:flex-row md:items-center gap-2">
            <label className="flex items-center gap-2 w-full md:w-1/2 text-sm">
              <input
                type="checkbox"
                checked={data.checked}
                onChange={() => handleToggle(label)}
                className="accent-blue-600"
              />
              {label}
            </label>
            <input
              type="text"
              className="flex-1 p-2 border rounded"
              placeholder="Poznámka např. Bez závad"
              value={data.note}
              onChange={(e) => handleNoteChange(label, e.target.value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
