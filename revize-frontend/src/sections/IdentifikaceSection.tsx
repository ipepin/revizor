// src/sections/IdentifikaceSection.tsx

import React, { useContext, ChangeEvent } from "react";
import Tooltip from "../components/Tooltip";
import NormsSection from "../components/NormsSection";
import { RevisionFormContext, RevisionForm } from "../context/RevisionFormContext";

const voltageOptions = ["230V", "400V", "230V/400V", "12V", "24V"];
const revisionTypes = ["Výchozí", "Pravidelná", "Mimořádná"];
const networkTypes = ["TN-C", "TN-S", "TN-C-S", "TT", "IT"];

const protectionOptions = {
  basic: [
    { label: "Základní izolace", tooltip: "Izolace živých částí, která brání přímému dotyku." },
    { label: "Přepážky a kryty", tooltip: "Fyzické bariéry k živým částem." },
    { label: "Zábrany", tooltip: "Brání neúmyslnému dotyku." },
    { label: "Ochrana polohou", tooltip: "Živé části nejsou běžně přístupné." },
    { label: "Omezení napětí (ELV)", tooltip: "Napětí sníženo na bezpečnou úroveň." },
    { label: "Omezení proudu", tooltip: "Omezování proudu a náboje při dotyku." },
    { label: "Řízení potenciálu", tooltip: "Vyrovnání potenciálu mezi částmi." },
  ],
  fault: [
    { label: "Automatické odpojení od zdroje", tooltip: "Odpojení při poruše zabrání dotykovému napětí." },
    { label: "Ochranné pospojování", tooltip: "Spojení všech neživých částí a uzemnění." },
    { label: "Elektrické oddělení", tooltip: "Izolace obvodu od země a jiných obvodů." },
    { label: "Přídavná izolace", tooltip: "Druhá vrstva izolace." },
    { label: "Ochranné stínění", tooltip: "Kovový kryt nebo síť proti rušení." },
    { label: "Nevodivé okolí", tooltip: "Použité materiály s nízkou vodivostí." },
  ],
  additional: [
    { label: "Proudové chrániče (RCD)", tooltip: "Vypíná obvod při rozdílu proudu." },
    { label: "Doplňující pospojování", tooltip: "Spojuje vodivé části v místnosti kvůli bezpečí." },
  ],
};

export default function IdentifikaceSection() {
  const { form, setForm } = useContext(RevisionFormContext);

  type FormElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

  const onField =
    (field: keyof RevisionForm) =>
    (e: ChangeEvent<FormElement>) => {
      setForm({ ...form, [field]: e.target.value });
    };

  const toggleProtection = (
  group: "basic" | "fault" | "additional",
  value: string
) => {
  const key = `protection_${group}` as keyof RevisionForm;
  const current = (form[key] as string[]) || [];
  const updated = current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
  setForm({ ...form, [key]: updated });
};

  return (
    <div className="bg-white shadow-md rounded p-6 space-y-6">
      <h2 className="text-2xl font-bold text-blue-800">🧾 Identifikace</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="font-semibold">Evidenční číslo</label>
          <input
            type="text"
            value={form.evidencni || ""}
            readOnly
            className="p-2 border rounded w-full bg-gray-100"
          />
        </div>
        <div>
          <label className="font-semibold">Revidovaný objekt</label>
          <input
            type="text"
            className="p-2 border rounded w-full"
            value={form.objekt || ""}
            onChange={onField("objekt")}
          />
        </div>
        <div>
          <label className="font-semibold">Adresa</label>
          <input
            type="text"
            className="p-2 border rounded w-full"
            value={form.adresa || ""}
            onChange={onField("adresa")}
          />
        </div>
        <div>
          <label className="font-semibold">Objednatel</label>
          <input
            type="text"
            className="p-2 border rounded w-full"
            value={form.objednatel || ""}
            onChange={onField("objednatel")}
          />
        </div>
        <div>
          <label className="font-semibold">Typ revize</label>
          <select
            className="p-2 border rounded w-full"
            value={form.typRevize || ""}
            onChange={onField("typRevize")}
          >
            {revisionTypes.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-semibold">Druh sítě</label>
          <select
            className="p-2 border rounded w-full"
            value={form.sit || ""}
            onChange={onField("sit")}
          >
            {networkTypes.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-semibold">Jmenovité napětí</label>
          <input
            list="voltages"
            className="p-2 border rounded w-full"
            value={form.voltage || ""}
            onChange={onField("voltage")}
          />
          <datalist id="voltages">
            {voltageOptions.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(
          [
            ["date_start", "Zahájení revize"],
            ["date_end", "Ukončení revize"],
            ["date_created", "Vypracování revize"],
          ] as const
        ).map(([field, label]) => (
          <div key={field}>
            <label className="font-semibold">{label}</label>
            <input
              type="date"
              className="p-2 border rounded w-full"
              value={(form as any)[field] || ""}
              onChange={onField(field as keyof RevisionForm)}
            />
          </div>
        ))}
      </div>

      <NormsSection />

      {(["basic", "fault", "additional"] as const).map((group) => (
        <div key={group}>
          <label className="font-semibold block mb-2 capitalize">
            {{
              basic: "Základní ochrana",
              fault: "Ochrana při poruše",
              additional: "Doplňková ochrana",
            }[group]}
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {protectionOptions[group].map((p) => (
              <label key={p.label} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={(form as any)[`protection_${group}`]?.includes(p.label) || false}
                  onChange={() => toggleProtection(group, p.label)}
                />
                <Tooltip text={p.tooltip}>
                  <span className="underline cursor-help">{p.label}</span>
                </Tooltip>
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="font-semibold">Projektová dokumentace</label>
          <input
            type="text"
            className="p-2 border rounded w-full"
            value={form.documentation || ""}
            onChange={onField("documentation")}
          />
        </div>
        <div>
          <label className="font-semibold">Posouzení vnějších vlivů</label>
          <input
            type="text"
            className="p-2 border rounded w-full"
            value={form.environment || ""}
            onChange={onField("environment")}
          />
        </div>
      </div>
      <div>
        <label className="font-semibold">Další písemné podklady</label>
        <textarea
          rows={4}
          className="p-2 border rounded w-full"
          value={form.extraNotes || ""}
          onChange={onField("extraNotes")}
        />
      </div>

      <div className="text-right">
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Pokračovat →
        </button>
      </div>
    </div>
  );
}
