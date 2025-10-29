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
      text: `Revize byla provedena dle platných ČSN s ohledem na normy platné v době výstavby.
Hodnoty impedance smyčky odpovídají požadavkům ČSN 33 2000-4-41 ed. 3 čl. 411.4.4 a požadavky normy se tímto považují za splněné.
Izolační stav byl měřen mezi živými vodiči navzájem a dále mezi živými vodiči a ochranným vodičem. Hodnoty izolačního odporu, které byly naměřeny, jsou vyšší než 1 MΩ, tudíž vyhovují hodnotám dle tabulky 6.1 v ČSN 33 2000-6 čl. 6.4.3.3.
Přechodový odpor byl naměřen v souladu s požadavky ČSN 33 2000-1 až 3 a nepřekročil hodnotu 0,1 Ω.
Na zařízení nebyly v době revize zjištěny závady, které by ohrožovaly bezpečnost a zdraví osob.

Bylo provedeno poučení a doporučení kontroly bezpečnostních prvků.
Ve smyslu vyhlášky Č 48/82 ČÚBP – obsluha elektrotechnických zařízení musí být seznámena s bezpečností ovládání a vypínání těchto zařízení.
Elektrická zařízení musí splňovat všechny požadované funkce a musí být udržována ve stavu odpovídajícím platným předpisům.

Protipožární ochrana: XXXXXXXXXXXX

Za provozuschopnost a bezpečnost zařízení odpovídá provozovatel.`,
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
    <section className="space-y-4 text-sm text-gray-800">
      <h2 className="text-lg font-semibold text-blue-800">Závěr</h2>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Vyber text</label>
        <select
          className="w-full rounded border px-3 py-1.5 text-sm"
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

      <div>
        <textarea
          className="w-full rounded border px-3 py-1.5 text-sm"
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

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
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

      <div className="space-y-2">
        <label className="block text-sm font-medium">
          Platnost revize
        </label>
        <input
          type="date"
          className="w-full rounded border px-3 py-1.5 text-sm"
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
