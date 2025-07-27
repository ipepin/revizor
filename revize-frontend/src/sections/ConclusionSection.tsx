// src/components/ConclusionSection.tsx

import React, { useContext, ChangeEvent } from "react";
import { RevisionFormContext } from "../context/RevisionFormContext";

type Template = {
  id: string;
  label: string;
  text: string;
};

export default function ConclusionSection() {
  const { form, setForm } = useContext(RevisionFormContext);

  const templates: Template[] = [
    {
      id: "base",
      label: "Základní závěr",
      text: `Revize byla provedena dle platných ČSN… (zkráceně)`,
    },
    {
      id: "short",
      label: "Zkrácený závěr",
      text: `Revize provedena dle platných ČSN, všechny…`,
    },
    {
      id: "detailed",
      label: "Detailní závěr",
      text: `Provedena revize dle ČSN, měření impedance…`,
    },
  ];

  const onTemplateChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const tpl = templates.find(t => t.id === e.target.value)!;
    setForm(f => ({
      ...f,
      conclusion: {
        ...f.conclusion,
        text: tpl.text,
      },
    }));
  };

  return (
    <section className="w-full bg-white p-4 rounded shadow mb-8">
      <h2 className="text-lg font-semibold mb-2">Závěr</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Vyber text</label>
        <select
          className="border rounded p-2 w-full text-sm"
          value={templates.find(t => t.text === form.conclusion.text)?.id || ""}
          onChange={onTemplateChange}
        >
          {templates.map(t => (
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
          value={form.conclusion.text}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            setForm(f => ({
              ...f,
              conclusion: { ...f.conclusion, text: e.target.value },
            }))
          }
        />
      </div>

      <fieldset className="mb-4">
        <legend className="font-medium text-sm mb-2">Posouzení bezpečnosti</legend>
        <div className="flex items-center mb-1">
          <input
            type="radio"
            name="safety"
            value="able"
            checked={form.conclusion.safety === "able"}
            onChange={() =>
              setForm(f => ({
                ...f,
                conclusion: { ...f.conclusion, safety: "able" },
              }))
            }
            className="mr-2"
          />
          <label className="text-sm">
            Instalace je schopna provozu.
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="radio"
            name="safety"
            value="not_able"
            checked={form.conclusion.safety === "not_able"}
            onChange={() =>
              setForm(f => ({
                ...f,
                conclusion: { ...f.conclusion, safety: "not_able" },
              }))
            }
            className="mr-2"
          />
          <label className="text-sm text-red-600">
            Instalace není schopna provozu.
          </label>
        </div>
      </fieldset>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Platnost revize</label>
        <input
          type="date"
          className="p-2 border rounded text-sm w-full"
          value={form.conclusion.validUntil}
          onChange={e =>
            setForm(f => ({
              ...f,
              conclusion: { ...f.conclusion, validUntil: e.target.value },
            }))
          }
        />
      </div>
    </section>
);
}
