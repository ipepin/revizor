// src/components/NormsSection.tsx

import React, { useContext, ChangeEvent } from "react";
import { RevisionFormContext } from "../context/RevisionFormContext";

const PREDEFINED_NORMS = [
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
  "ČSN 34 1010 Ochrana (1966)",
];

// Pomocná funkce: odstraní mezery a tečky a převede na malá písmena
const normalize = (s: string) =>
  s.replace(/[\s\.]/g, "").toLowerCase();

export default function NormsSection() {
  const { form, setForm } = useContext(RevisionFormContext);

  // Zjistí, zda je daný label považován za zaškrtnutý
  const isChecked = (label: string) => {
    const nl = normalize(label);
    return form.norms.some((n) => {
      const nn = normalize(n);
      return nn === nl || nl.startsWith(nn) || nn.startsWith(nl);
    });
  };

  const toggleNorm = (label: string) => {
    setForm((f) => {
      const existingIndex = f.norms.findIndex((n) => {
        const nn = normalize(n);
        const nl = normalize(label);
        return nn === nl || nl.startsWith(nn) || nn.startsWith(nl);
      });

      let updated: string[];
      if (existingIndex >= 0) {
        // Odeber tu jednu položku
        updated = f.norms.filter((_, i) => i !== existingIndex);
      } else {
        // Přidej celý label
        updated = [...f.norms, label];
      }

      return {
        ...f,
        norms: updated,
      };
    });
  };

  const onCustomChange =
    (field: "customNorm1" | "customNorm2" | "customNorm3") =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setForm((f) => ({ ...f, [field]: val }));
    };

  return (
    <section className="bg-white p-4 rounded shadow mb-6">
      <h2 className="text-lg font-semibold text-blue-800 mb-3">
        Použité normy a zákony
      </h2>

      {/* 1) Předdefinované normy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
        {PREDEFINED_NORMS.map((norm) => (
          <label key={norm} className="flex items-center gap-2">
            <input
              type="checkbox"
              className="accent-blue-600"
              checked={isChecked(norm)}
              onChange={() => toggleNorm(norm)}
            />
            <span>{norm}</span>
          </label>
        ))}
      </div>

      {/* 2) Vlastní normy */}
      <div className="space-y-2">
        <h3 className="font-medium">Vlastní normy</h3>
        <input
          type="text"
          placeholder="Vlastní norma 1"
          className="w-full p-2 border rounded text-sm"
          value={form.customNorm1}
          onChange={onCustomChange("customNorm1")}
        />
        <input
          type="text"
          placeholder="Vlastní norma 2"
          className="w-full p-2 border rounded text-sm"
          value={form.customNorm2}
          onChange={onCustomChange("customNorm2")}
        />
        <input
          type="text"
          placeholder="Vlastní norma 3"
          className="w-full p-2 border rounded text-sm"
          value={form.customNorm3}
          onChange={onCustomChange("customNorm3")}
        />
      </div>
    </section>
  );
}
