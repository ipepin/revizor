import React, { useContext, useMemo, useCallback, ChangeEvent } from "react";
import { RevisionFormContext } from "../context/RevisionFormContext";

// Snippety (předpřipravené věty), které lze rychle vkládat/odebírat

type SnipKey =
  | "norms"
  | "insulation"
  | "continuity"
  | "loop"
  | "noDefects"
  | "training"
  | "legal"
  | "fire"
  | "bathrooms"
  | "responsibility";

const ORDER: SnipKey[] = [
  "norms",
  "insulation",
  "continuity",
  "loop",
  "noDefects",
  "training",
  "legal",
  "fire",
  "bathrooms",
  "responsibility",
];

export default function ConclusionSection() {
  const { form, setForm } = useContext(RevisionFormContext);
  const conclusion: any = form.conclusion || {};

  // Proměnné pro snippety (ukládáme do conclusion.vars)
  const vars = (conclusion.vars || {}) as {
    insulationMinMOhm?: string;
    fireProtectionText?: string;
  };

  // Normy → text
  const normsStr = useMemo(() => {
    const arr = Array.isArray(form?.norms) ? form.norms : [];
    const extra = [form?.customNorm1, form?.customNorm2, form?.customNorm3].filter(
      (x: any) => x && String(x).trim().length > 0
    );
    return [...arr, ...extra].filter(Boolean).join(", ");
  }, [form?.norms, form?.customNorm1, form?.customNorm2, form?.customNorm3]);

  // Text pro konkrétní snippet (dynamický podle vars/form)
  const makeText = useCallback(
    (key: SnipKey): string => {
      switch (key) {
        case "norms": {
          const tail = normsStr
            ? ` (s ohledem na normy platné v době výstavby; použité normy: ${normsStr}).`
            : ".";
          return `Revize byla provedena dle platných ČSN${tail}`;
        }
        case "insulation": {
          const m = (vars.insulationMinMOhm || "").trim();
          const extra = m ? ` (nejnižší naměřená hodnota: ${m} MΩ)` : "";
          return `Naměřené hodnoty izolačních odporů jsou ve všech případech vyšší než 1 MΩ, takže vyhovují ČSN 33 2000-6 ed.2:2017, čl. 6.4.3.3.${extra}`;
        }
        case "continuity":
          return "Naměřená hodnota přechodového odporu pospojovacího/ochranného vodiče nepřesáhla 0,1 Ω a svým průřezem splňuje požadavky ČSN 33 2000-5-54 ed. 3:2012, čl. 544.2.";
        case "loop":
          return "Naměřené hodnoty impedance smyček uvedené v revizní zprávě jsou v souladu s dimenzemi předřazených jistících přístrojů a zajišťují tak požadavky ochrany automatickým odpojením od zdroje v předepsané době podle normy ČSN 33 2000-4-41 ed. 3:2018, čl. 411.4.4, a to i při uvažování bezpečnostního součinitele (2/3) dle ČSN 33 2000-6 ed. 2:2017, čl. D.6.4.3.7.3.";
        case "noDefects":
          return "Na zařízení nebyly v době revize zjištěny závady, které by ohrožovaly bezpečnost a zdraví osob.";
        case "training":
          return "Bylo provedeno poučení a doporučena pravidelná kontrola bezpečnostních prvků.";
        case "legal":
          return "Ve smyslu vyhlášky č. 48/82 (BOZP) musí být obsluha elektrotechnických zařízení seznámena s bezpečným ovládáním a vypínáním těchto zařízení. Elektrická zařízení musí splňovat všechny požadované funkce a musí být udržována ve stavu odpovídajícím platným předpisům.";
        case "fire": {
          const t = (vars.fireProtectionText || "").trim();
          return t ? `Protipožární ochrana: ${t}` : "Protipožární ochrana: ";
        }
        case "bathrooms":
          return "Vzhledem k tomu, že se v objektu vyskytují prostory s vanou a sprchou (ČSN 33 2000-7-701 ed. 2).";
        case "responsibility":
          return "Za provozuschopnost a bezpečnost zařízení odpovídá provozovatel.";
      }
    },
    [normsStr, vars.insulationMinMOhm, vars.fireProtectionText]
  );

  // Utility pro práci s velkým textem
  const escapeReg = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const normalize = (s: string) => s.replace(/\s+$/g, "").replace(/\r\n/g, "\n");
  const includesSnip = (all: string, key: SnipKey) => normalize(all).includes(makeText(key));
  const addSnip = (all: string, key: SnipKey) => {
    const txt = makeText(key);
    const base = normalize(all);
    if (!base) return txt;
    if (base.includes(txt)) return base;
    return base + "\n\n" + txt;
  };
  const removeSnip = (all: string, key: SnipKey) => {
    const txt = makeText(key);
    const base = normalize(all);
    const patterns = [
      new RegExp(`(^|\n\n)${escapeReg(txt)}(\n\n|$)`),
      new RegExp(escapeReg(txt)),
    ];
    let out = base;
    for (const re of patterns) out = out.replace(re, (m, p1, p2) => (p1 && p2 ? "\n\n" : ""));
    return out.replace(/^\n+|\n+$/g, "");
  };

  const toggleSnip = (key: SnipKey) => {
    setForm((f: any) => {
      const cur = String(f?.conclusion?.text || "");
      const nextText = includesSnip(cur, key) ? removeSnip(cur, key) : addSnip(cur, key);
      return {
        ...f,
        conclusion: {
          ...(f.conclusion || {}),
          text: nextText,
          vars: { ...(f.conclusion?.vars || {}), ...vars },
        },
      };
    });
  };

  const onVarChange = (patch: Partial<typeof vars>, snip?: SnipKey) => {
    setForm((f: any) => {
      const cur = String(f?.conclusion?.text || "");
      let out = cur;
      if (snip && includesSnip(cur, snip)) {
        const oldTxt = makeText(snip);
        const V = { ...(f.conclusion?.vars || {}), ...vars, ...patch } as any;
        const newTxt = (() => {
          switch (snip) {
            case "insulation": {
              const m = (V.insulationMinMOhm || "").trim();
              const extra = m ? ` (nejnižší naměřená hodnota: ${m} MΩ)` : "";
              return `Naměřené hodnoty izolačních odporů jsou ve všech případech vyšší než 1 MΩ, takže vyhovují ČSN 33 2000-6 ed.2:2017, čl. 6.4.3.3.${extra}`;
            }
            case "fire": {
              const t = (V.fireProtectionText || "").trim();
              return t ? `Protipožární ochrana: ${t}` : "Protipožární ochrana: ";
            }
            default:
              return oldTxt;
          }
        })();
        out = normalize(out).replace(new RegExp(escapeReg(oldTxt), "g"), newTxt);
      }
      return {
        ...f,
        conclusion: { ...(f.conclusion || {}), text: out, vars: { ...(f.conclusion?.vars || {}), ...vars, ...patch } },
      };
    });
  };

  const isActive = (key: SnipKey) => includesSnip(String(conclusion.text || ""), key);

  const label: Record<SnipKey, string> = {
    norms: "Revize dle ČSN",
    insulation: "Izolační odpory",
    continuity: "Přechodový odpor (PE/pospoj.)",
    loop: "Impedance smyček (AOZ)",
    noDefects: "Bez závad (bezpečnost)",
    training: "Poučení obsluhy",
    legal: "BOZP – vyhl. 48/82",
    fire: "Protipožární ochrana",
    bathrooms: "Prostory s vanou/sprchou",
    responsibility: "Odpovědnost provozovatele",
  };

  return (
    <section className="space-y-6 text-sm text-gray-800">
      <h2 className="text-lg font-semibold text-blue-800">Závěr</h2>

      {/* Čipy – rychlé vložení/odebrání vět */}
      <div className="rounded-md border bg-white p-3">
        <div className="flex flex-wrap gap-2">
          {ORDER.map((k) => (
            <button
              key={k}
              type="button"
              className={
                (isActive(k)
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50") +
                " border rounded-full px-3 py-1 text-xs font-medium"
              }
              onClick={() => toggleSnip(k)}
              title={makeText(k)}
            >
              {label[k]}
            </button>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-xs text-gray-600">Nejnižší Riso (MΩ, volitelné)</label>
            <input
              type="text"
              className="w-full rounded border px-3 py-1.5 text-sm"
              placeholder="např. 2.5"
              value={vars.insulationMinMOhm || ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onVarChange({ insulationMinMOhm: e.target.value }, "insulation")}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Protipožární ochrana (volný text)</label>
            <input
              type="text"
              className="w-full rounded border px-3 py-1.5 text-sm"
              placeholder="např. zkontrolována, bez závad / dle dokumentace…"
              value={vars.fireProtectionText || ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onVarChange({ fireProtectionText: e.target.value }, "fire")}
            />
          </div>
        </div>
      </div>

      {/* Editor výsledného textu */}
      <div className="rounded-md border bg-white p-4 space-y-2">
        <label className="text-sm font-medium">Text závěru (plně upravitelný)</label>
        <textarea
          className="w-full rounded border px-3 py-2 text-sm"
          rows={18}
          value={(conclusion.text as string) || ""}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
            setForm((f: any) => ({ ...f, conclusion: { ...(f.conclusion || {}), text: e.target.value } }))
          }
        />
        <p className="text-[11px] text-gray-500">Tip: čipy výše vloží/odeberou připravené odstavce. Můžete libovolně psát a mazat.</p>
      </div>

      {/* Bezpečnost a platnost revize */}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Posouzení bezpečnosti</legend>
        <label className="inline-flex items-center mr-4">
          <input
            type="radio"
            name="safety"
            className="mr-2"
            checked={conclusion.safety === "able"}
            onChange={() => setForm((f: any) => ({ ...f, conclusion: { ...(f.conclusion || {}), safety: "able" } }))}
          />
          Instalace je schopna provozu
        </label>
        <label className="inline-flex items-center">
          <input
            type="radio"
            name="safety"
            className="mr-2"
            checked={conclusion.safety === "not_able"}
            onChange={() => setForm((f: any) => ({ ...f, conclusion: { ...(f.conclusion || {}), safety: "not_able" } }))}
          />
          <span className="text-red-600">Instalace není schopna provozu</span>
        </label>
      </fieldset>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Platnost revize (doporučený termín další revize)</label>
        <input
          type="date"
          className="w-full rounded border px-3 py-1.5 text-sm"
          value={conclusion.validUntil || ""}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            setForm((f: any) => ({
              ...f,
              conclusion: { ...(f.conclusion || {}), validUntil: e.target.value },
            }))
          }
        />
      </div>
    </section>
  );
}
