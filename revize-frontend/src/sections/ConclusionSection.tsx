// src/components/ConclusionSection.tsx
import React, { useContext, ChangeEvent } from "react";
import { RevisionFormContext } from "../context/RevisionFormContext";

type Template = { id: string; label: string; text: string };


export default function ConclusionSection() {
  const { form, setForm } = useContext(RevisionFormContext);

  const templates: Template[] = [
    {
      id: "base",
      label: "Základní závěr",
      text: `Revize byla provedena dle platných ČSN s ohledem na normy platné v době výstavby. Hodnoty impedance smyčky odpovídají požadavkům ČSN 33 2000-4-41 ed. 3 čl. 411.4.4 a požadavky normy se tímto považují za splněné. Izolační stav byl měřen mezi živými vodiči navzájem a dále mezi živými vodiči a ochranným vodičem. Hodnoty izolačního odporu, které byly naměřeny jsou vyšší, než 1 MΩ, tudíž vyhovují hodnotám dle tabulky 6.1. v ČSN 33 2000-6 čl.6.4.3.3. Přechodový odpor byl naměřen plně v souladu s požadavky ČSN 33 2000-1 až 3 a nepřekročil hodnotu 0,1 Ω. Na zařízení nebyly v době revize zjištěny závady, které ohrožují bezpečnost a zdraví osob. Za provozuschopnost a bezpečnost zařízení zodpovídá provozovatel.`,
    },
    {
      id: "short",
      label: "Zkrácený závěr",
      text: `Revize provedena dle platných ČSN, všechny měřené parametry vyhovují. Instalace je bezpečná a provozuschopná.`,
    },
  ];

  const onTemplateChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const tpl = templates.find((t) => t.id === e.target.value);
    if (!tpl) return;
    setForm((f) => ({
      ...f,
      conclusion: { ...(f.conclusion || {}), text: tpl.text },
    }));
  };

  const conclusion = form.conclusion || {};

  return (
    <section className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-bold text-blue-800 mb-4">Závěr</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Vyber text</label>
        <select
          className="border rounded p-2 w-full text-sm"
          value={
            templates.find((t) => t.text === conclusion.text)?.id || ""
          }
          onChange={onTemplateChange}
        >
          <option value="">-- Vyberte šablonu --</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <textarea
          className="w-full p-2 border rounded text-sm"
          rows={6}
          value={conclusion.text || ""}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              conclusion: { ...(f.conclusion || {}), text: e.target.value },
            }))
          }
        />
      </div>

      <fieldset className="mb-4">
        <legend className="font-medium text-sm mb-2">
          Posouzení bezpečnosti
        </legend>
        <label className="inline-flex items-center mr-4">
          <input
            type="radio"
            name="safety"
            className="mr-2"
            checked={conclusion.safety === "able"}
            onChange={() =>
              setForm((f) => ({
                ...f,
                conclusion: { ...(f.conclusion || {}), safety: "able" },
              }))
            }
          />
          Instalace je schopna provozu
        </label>
        <label className="inline-flex items-center">
          <input
            type="radio"
            name="safety"
            className="mr-2"
            checked={conclusion.safety === "not_able"}
            onChange={() =>
              setForm((f) => ({
                ...f,
                conclusion: { ...(f.conclusion || {}), safety: "not_able" },
              }))
            }
          />
          <span className="text-red-600">Instalace není schopna provozu</span>
        </label>
      </fieldset>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Platnost revize
        </label>
        <input
          type="date"
          className="border rounded p-2 w-full text-sm"
          value={conclusion.validUntil || ""}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              conclusion: {
                ...(f.conclusion || {}),
                validUntil: e.target.value,
              },
            }))
          }
        />
      </div>
    </section>
  );
}
