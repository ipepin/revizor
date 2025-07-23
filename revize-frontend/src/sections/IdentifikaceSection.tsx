import React, { useState } from "react";
import Tooltip from "../components/Tooltip";

const voltageOptions = ["230V", "400V", "230V/400V", "12V", "24V"];

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
    { label: "Proudové chrániče (RCD)", tooltip: "Porovnává přívodní a odvodní proud, vypíná při rozdílu." },
    { label: "Doplňující pospojování", tooltip: "Spojuje vodivé části v místnosti kvůli bezpečí." },
  ]
};

export default function IdentifikaceSection() {
  const [form, setForm] = useState({
    date_start: "", date_end: "", date_created: "",
    voltage: "", norm_type: "Výchozí", net_type: "TN-C",
    protection_basic: [] as string[],
    protection_fault: [] as string[],
    protection_additional: [] as string[],
    documentation: "", environment: "", extraNotes: ""
  });

  const toggleProtection = (type: "basic" | "fault" | "additional", value: string) => {
    const current = form[`protection_${type}`];
    const updated = current.includes(value)
      ? current.filter((v: string) => v !== value)
      : [...current, value];
    setForm({ ...form, [`protection_${type}`]: updated });
  };

  return (
    <div className="space-y-6">
      {/* Datumová pole */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="font-semibold">Zahájení revize</label>
          <input type="date" className="p-2 border rounded w-full"
            value={form.date_start} onChange={e => setForm({ ...form, date_start: e.target.value })}
          />
        </div>
        <div>
          <label className="font-semibold">Ukončení revize</label>
          <input type="date" className="p-2 border rounded w-full"
            value={form.date_end} onChange={e => setForm({ ...form, date_end: e.target.value })}
          />
        </div>
        <div>
          <label className="font-semibold">Vypracování revize</label>
          <input type="date" className="p-2 border rounded w-full"
            value={form.date_created} onChange={e => setForm({ ...form, date_created: e.target.value })}
          />
        </div>
      </div>

      {/* Napětí */}
      <div>
        <label className="font-semibold">Jmenovité napětí</label>
        <select className="p-2 border rounded w-full"
          value={form.voltage} onChange={e => setForm({ ...form, voltage: e.target.value })}
        >
          <option value="">-- Vyber nebo napiš vlastní --</option>
          {voltageOptions.map(opt => <option key={opt}>{opt}</option>)}
        </select>
      </div>

      {/* Ochrany */}
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
                <input
                  type="checkbox"
                  checked={form[`protection_${group}`].includes(p.label)}
                  onChange={() => toggleProtection(group as any, p.label)}
                />
                <Tooltip text={p.tooltip}>
                  <span className="underline cursor-help">{p.label}</span>
                </Tooltip>
              </label>
            ))}
          </div>
        </div>
      ))}

      {/* Písemné doklady */}
      <div>
        <label className="font-semibold">Projektová dokumentace</label>
        <input type="text" className="p-2 border rounded w-full"
          value={form.documentation} onChange={e => setForm({ ...form, documentation: e.target.value })}
        />
      </div>

      <div>
        <label className="font-semibold">Posouzení vnějších vlivů</label>
        <input type="text" className="p-2 border rounded w-full"
          value={form.environment} onChange={e => setForm({ ...form, environment: e.target.value })}
        />
      </div>

      <div>
        <label className="font-semibold">Další písemné podklady</label>
        <textarea rows={4} className="p-2 border rounded w-full"
          value={form.extraNotes} onChange={e => setForm({ ...form, extraNotes: e.target.value })}
        />
      </div>
    </div>
  );
}
