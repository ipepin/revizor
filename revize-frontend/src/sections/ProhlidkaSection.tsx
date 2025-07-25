import React, { useState } from "react";

const inspectionTasks = [
  "Způsob ochrany před úrazem elektrickým proudem (IEC 60364-4-41)",
  "Protipožární přepážky a ochrana před šířením ohně (IEC 60364-4-42, 5-52:2009)",
  "Volba vodičů dle zatížitelnosti a úbytku napětí (IEC 60364-4-43, 5-52:2009)",
  "Seřízení a koordinace ochranných přístrojů (IEC 60364-5-53:2001)",
  "Přepěťové ochrany SPD (IEC 60364-5-53:2001, AMD2:2015)",
  "Odpojovací a spínací přístroje (IEC 60364-5-53:2001)",
  "Vnější vlivy a mechanická namáhání (IEC 60364-4-42:2010, 5-51:2005, 5-52:2009)",
  "Označení vodičů, výstražné nápisy a schémata (IEC 60364-5-51:2005)",
  "Označení obvodů, svorek atd. (IEC 60364-5-51:2005)",
  "Zakončování kabelů a vodičů (IEC 60364-5-52:2009)"
];

const predefinedDescriptions: Record<string, string> = {
  "Byt": "Byt o velikosti 3+1 se nachází v prvním patře bytového domu. Elektroinstalace je napájena z elektroměrového rozvaděče umístěného v technické místnosti v přízemí. Připojení je realizováno kabelem CYKY 5x6 mm². V bytě je instalována bytová rozvodnice, ze které jsou napájeny zásuvkové i světelné okruhy. Koupelna je vybavena doplňkovým pospojováním, osvětlení je řešeno LED svítidly. Veškeré obvody jsou jištěny proudovými chrániči s vybavovacím proudem 30 mA.",
  "Rodinný dům": "Rodinný dům má dvě nadzemní podlaží a je napájen z hlavního domovního rozvaděče, který je umístěn na fasádě objektu. Vnitřní elektroinstalace je vedena kabely CYKY v PVC chráničkách. V každém podlaží je podružná rozvodnice. Jištění obvodů zajišťují jističe a proudové chrániče. Hromosvod je instalován dle ČSN EN 62305.",
  "FVE": "Fotovoltaická elektrárna je instalována na střeše objektu a připojena k distribuční síti pomocí střídače. DC strana je vedena kabely s dvojitou izolací, přepěťové ochrany jsou instalovány na DC i AC straně. Střídač je uzemněn, výkon systému je 5 kWp. Elektrická schémata a dokumentace byly dodány.",
  "Wallbox": "Nabíjecí stanice pro elektromobil je instalována na vnější zdi garáže a připojena k hlavnímu rozvaděči samostatným kabelem CYKY 5x10 mm². Jištění je provedeno proudovým chráničem typu B. Stanice je osazena přepěťovou ochranou a byla provedena zkouška funkce a komunikace s vozidlem.",
  "Společné prostory": "Společné prostory v bytovém domě zahrnují chodby, sklepy a technické místnosti. Osvětlení je řešeno pomocí LED svítidel s časovým spínačem. Rozvodnice jsou označeny, kryty svorek jsou zajištěny. Všechna kovová zařízení jsou připojena na pospojování. Revize se týkala funkčnosti, označení a mechanického stavu instalace.",
  "Odběrné místo": "Odběrné místo se nachází na veřejně přístupném místě a je osazeno elektroměrovým rozvaděčem v plastovém provedení s třídou krytí IP44. Vnitřní propoje byly zkontrolovány, hromadné dálkové ovládání je funkční. Hlavní jistič odpovídá velikosti rezervovaného příkonu.",
  "Nebytové prostory": "Nebytové prostory jsou určeny ke komerčnímu využití a elektroinstalace odpovídá provozním nárokům. V místnostech jsou zásuvkové a světelné obvody, připojení klimatizace a elektrospotřebičů. Provedeno kontrolní měření izolačního odporu, propojení pospojování a zajištění označení rozvaděčů."
};

export default function ProhlidkaSection() {
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [description, setDescription] = useState("");

  const toggleTask = (task: string) => {
    setSelectedTasks((prev) =>
      prev.includes(task) ? prev.filter((t) => t !== task) : [...prev, task]
    );
  };

  const handleTemplateSelect = (template: string) => {
    setSelectedTemplate(template);
    setDescription(predefinedDescriptions[template] || "");
  };

  return (
    <div className="space-y-6 text-sm text-gray-800">
      <div>
        <h2 className="text-xl font-bold text-blue-800 mb-2">✅ Provedené úkony</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {inspectionTasks.map((task) => (
            <label key={task} className="flex gap-2 items-start">
              <input
                type="checkbox"
                checked={selectedTasks.includes(task)}
                onChange={() => toggleTask(task)}
              />
              <span>{task}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-blue-800 mb-2">🏠 Popis revidovaného objektu</h2>
        <div className="mb-2">
          <label className="font-medium block mb-1">Vyber vzorový text:</label>
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            className="border p-2 rounded w-full"
          >
            <option value="">-- Vyberte možnost --</option>
            {Object.keys(predefinedDescriptions).map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>
        <textarea
          className="w-full border rounded p-2 min-h-[140px]"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    </div>
  );
}
