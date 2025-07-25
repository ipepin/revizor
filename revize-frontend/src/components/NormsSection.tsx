import React, { useState } from "react";

const predefinedNorms = [
  "ČSN 33 1500 Revize",
  "ČSN 33 2130 ed.4 Vnitřní rozvody",
  "ČSN 33 2000-6 ed.2 Revize",
  "ČSN 33 2000-4-41 ed.3 Ochrana",
  "ČSN 33 2000-5-54 ed.3 Uzemnění",
  "ČSN 33 2000-5-52 ed.2 Vodiče",
  "ČSN 33 2000-7-701 ed.2 Koupelny",
  "ČSN EN IEC 61439-1 ed.3 Rozváděče",
  "Nařízení vlády 190/2022 Sb.",
  "ČSN 34 1500 Revize (1978)",
  "ČSN 34 1010 Ochrana (1966)"
];

export default function NormsSection() {
  const [selectedNorms, setSelectedNorms] = useState<string[]>([]);
  const [customNorms, setCustomNorms] = useState<string[]>(["", "", ""]);

  const toggleNorm = (norm: string) => {
    setSelectedNorms((prev) =>
      prev.includes(norm)
        ? prev.filter((n) => n !== norm)
        : [...prev, norm]
    );
  };

  const handleCustomChange = (index: number, value: string) => {
    const updated = [...customNorms];
    updated[index] = value;
    setCustomNorms(updated);
  };

  return (
    <div className="bg-gray-50 border border-grey-50 rounded p-4">
      <h2 className="text-lg font-semibold text-grey-900 mb-2">📚 Použité normy a zákony</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-1 mb-4">
        {predefinedNorms.map((norm) => (
          <label key={norm} className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="checkbox"
              checked={selectedNorms.includes(norm)}
              onChange={() => toggleNorm(norm)}
              className="accent-gray-50"
            />
            {norm}
          </label>
        ))}
      </div>

      <div className="space-y-2">
        {customNorms.map((val, i) => (
          <input
            key={i}
            type="text"
            value={val}
            placeholder={`Vlastní norma ${i + 1}`}
            onChange={(e) => handleCustomChange(i, e.target.value)}
            className="w-full p-2 border rounded"
          />
        ))}
      </div>
    </div>
  );
}
