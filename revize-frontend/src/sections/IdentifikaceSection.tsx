import React, { useState } from "react";
import Tooltip from "../components/Tooltip";
import NormsSection from "../components/NormsSection";

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
  ]
};

export default function IdentifikaceSection() {
  const [form, setForm] = useState({
    evidencni: "RZ-2025-001",
    objekt: "",
    adresa: "",
    objednatel: "",
    typRevize: "Výchozí",
    sit: "TN-C",
    voltage: "",
    date_start: "",
    date_end: "",
    date_created: "",
    protection_basic: [] as string[],
    protection_fault: [] as string[],
    protection_additional: [] as string[],
    documentation: "",
    environment: "",
    extraNotes: ""
  });

  const toggleProtection = (group: "basic" | "fault" | "additional", value: string) => {
    const current = form[`protection_${group}`];
    const updated = current.includes(value)
      ? current.filter((v: string) => v !== value)
      : [...current, value];
    setForm({ ...form, [`protection_${group}`]: updated });
  };

  return (
    <div className="bg-white shadow-md rounded p-6 space-y-6">
      <h2 className="text-2xl font-bold text-blue-800">🧾 Identifikace</h2>

      {/* ZÁKLADNÍ ÚDAJE */}
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="font-semibold">Evidenční číslo</label>
          <input type="text" value={form.evidencni} readOnly className="p-2 border rounded w-full bg-gray-100" />
        </div>
        <div>
          <label className="font-semibold">Revidovaný objekt</label>
          <input type="text" className="p-2 border rounded w-full" value={form.objekt} onChange={e => setForm({ ...form, objekt: e.target.value })} />
        </div>
        <div>
          <label className="font-semibold">Adresa</label>
          <input type="text" className="p-2 border rounded w-full" value={form.adresa} onChange={e => setForm({ ...form, adresa: e.target.value })} />
        </div>
        <div>
          <label className="font-semibold">Objednatel</label>
          <input type="text" className="p-2 border rounded w-full" value={form.objednatel} onChange={e => setForm({ ...form, objednatel: e.target.value })} />
        </div>
        <div>
          <label className="font-semibold">Typ revize</label>
          <select className="p-2 border rounded w-full" value={form.typRevize} onChange={e => setForm({ ...form, typRevize: e.target.value })}>
            {revisionTypes.map(opt => <option key={opt}>{opt}</option>)}
          </select>
        </div>
        <div>
          <label className="font-semibold">Druh sítě</label>
          <select className="p-2 border rounded w-full" value={form.sit} onChange={e => setForm({ ...form, sit: e.target.value })}>
            {networkTypes.map(opt => <option key={opt}>{opt}</option>)}
          </select>
        </div>
        <div>
          <label className="font-semibold">Jmenovité napětí</label>
          <input list="voltages" className="p-2 border rounded w-full" value={form.voltage} onChange={e => setForm({ ...form, voltage: e.target.value })} />
          <datalist id="voltages">{voltageOptions.map(v => <option key={v} value={v} />)}</datalist>
        </div>
      </div>

      {/* DATUMY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="font-semibold">Zahájení revize</label>
          <input type="date" className="p-2 border rounded w-full" value={form.date_start} onChange={e => setForm({ ...form, date_start: e.target.value })} />
        </div>
        <div>
          <label className="font-semibold">Ukončení revize</label>
          <input type="date" className="p-2 border rounded w-full" value={form.date_end} onChange={e => setForm({ ...form, date_end: e.target.value })} />
        </div>
        <div>
          <label className="font-semibold">Vypracování revize</label>
          <input type="date" className="p-2 border rounded w-full" value={form.date_created} onChange={e => setForm({ ...form, date_created: e.target.value })} />
        </div>
      </div>

      {/* NORMY */}
      <NormsSection />

      {/* OCHRANY */}
      {["basic", "fault", "additional"].map((group) => (
        <div key={group}>
          <label className="font-semibold block mb-2 capitalize">
            {group === "basic" && "Základní ochrana"}
            {group === "fault" && "Ochrana při poruše"}
            {group === "additional" && "Doplňková ochrana"}
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {protectionOptions[group as keyof typeof protectionOptions].map((p) => (
              <label key={p.label} className="flex items-center gap-2">
                <input type="checkbox" checked={form[`protection_${group}`].includes(p.label)} onChange={() => toggleProtection(group as any, p.label)} />
                <Tooltip text={p.tooltip}>
                  <span className="underline cursor-help">{p.label}</span>
                </Tooltip>
              </label>
            ))}
          </div>
        </div>
      ))}

      {/* DOKLADY */}
      <div>
        <label className="font-semibold">Projektová dokumentace</label>
        <input type="text" className="p-2 border rounded w-full" value={form.documentation} onChange={e => setForm({ ...form, documentation: e.target.value })} />
      </div>
      <div>
        <label className="font-semibold">Posouzení vnějších vlivů</label>
        <input type="text" className="p-2 border rounded w-full" value={form.environment} onChange={e => setForm({ ...form, environment: e.target.value })} />
      </div>
      <div>
        <label className="font-semibold">Další písemné podklady</label>
        <textarea rows={4} className="p-2 border rounded w-full" value={form.extraNotes} onChange={e => setForm({ ...form, extraNotes: e.target.value })} />
      </div>

      {/* TLAČÍTKO POKRAČOVAT */}
      <div className="text-right">
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
          Pokračovat →
        </button>
      </div>
    </div>
  );
}
