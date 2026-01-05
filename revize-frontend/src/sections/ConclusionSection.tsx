import React, { useContext, useMemo, useCallback, ChangeEvent, useState } from "react";
import { RevisionFormContext } from "../context/RevisionFormContext";
import { useSnippets } from "../hooks/useSnippets";
import type { Snippet } from "../api/snippets";
import { SnippetManager } from "../components/SnippetManager";

// Zachováme původní pořadí čipů (elektro)
const DEFAULT_LABEL_ORDER = [
  "Revize dle ČSN",
  "Izolační odpory",
  "Přechodový odpor (PE/pospoj.)",
  "Impedance smyček (AOZ)",
  "Bez závad (bezpečnost)",
  "Poučení obsluhy",
  "BOZP – vyhl. 48/82",
  "Protipožární ochrana",
  "Prostory s vanou/sprchou",
  "Odpovědnost provozovatele",
];

export default function ConclusionSection() {
  const { form, setForm } = useContext(RevisionFormContext);
  const conclusion: any = form.conclusion || {};
  const [managerOpen, setManagerOpen] = useState(false);

  const revisionType = ((form as any)?.type || (form as any)?.revType || (form as any)?.typRevize || "").toString();
  const hasLpsData = Boolean((form as any)?.lps);
  const isLps = revisionType.toUpperCase() === "LPS" && hasLpsData;

  const { items: fetchedSnippets, toggleVisible, addSnippet, remove, reload } = useSnippets(isLps ? "LPS" : "EI");

  const lpsStandardCode: string = isLps ? (form as any)?.lps?.standard || "" : "";
  const standardName: string = ((): string => {
    switch (lpsStandardCode) {
      case "CSN_EN_62305":
        return "ČSN EN 62305";
      case "CSN_34_1390":
        return "ČSN 34 1390";
      default:
        return "zvolené normě";
    }
  })();
  const earthThreshold: number = lpsStandardCode === "CSN_EN_62305" ? 10 : lpsStandardCode === "CSN_34_1390" ? 15 : 15;

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

  // Utility pro práci s textem
  const escapeReg = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const normalize = (s: string) => s.replace(/\s+$/g, "").replace(/\r\n/g, "\n");

  // Dynamické texty podle labelu (pro zachování původního chování)
  const getSnippetText = useCallback(
    (snippet: Snippet): string => {
      if (isLps) {
        if (snippet.label === "Odpor zemničů v toleranci") {
          return `Odpor zemničů je v toleranci stanovené normou (≤ ${earthThreshold} Ω).`;
        }
        if (snippet.label === "Odpor zemničů mimo toleranci") {
          return `Odpor zemničů není v toleranci stanovené normou (> ${earthThreshold} Ω).`;
        }
        // ostatní LPS věty přebíráme přímo z DB
        return snippet.body;
      }

      switch (snippet.label) {
        case "Revize dle ČSN": {
          const tail = normsStr
            ? ` (s ohledem na normy platné v době výstavby; použité normy: ${normsStr}).`
            : ".";
          return `Revize byla provedena dle platných ČSN${tail}`;
        }
        case "Izolační odpory": {
          const m = (vars.insulationMinMOhm || "").trim();
          const extra = m ? ` (nejnižší naměřená hodnota: ${m} MΩ)` : "";
          return `Naměřené hodnoty izolačních odporů jsou ve všech případech vyšší než 1 MΩ, takže vyhovují ČSN 33 2000-6 ed.2:2017, čl. 6.4.3.3.${extra}`;
        }
        case "Protipožární ochrana": {
          const t = (vars.fireProtectionText || "").trim();
          return t ? `Protipožární ochrana: ${t}` : "Protipožární ochrana: ";
        }
        default:
          return snippet.body || "";
      }
    },
    [isLps, normsStr, vars.insulationMinMOhm, vars.fireProtectionText, earthThreshold]
  );

  const visibleSnippets = useMemo(() => {
    const list = fetchedSnippets.filter((s) => s.visible !== false);
    const orderMap = new Map<string, number>();
    DEFAULT_LABEL_ORDER.forEach((label, idx) => orderMap.set(label, idx));
    return list.slice().sort((a, b) => {
      const ao = a.order_index ?? orderMap.get(a.label) ?? 999;
      const bo = b.order_index ?? orderMap.get(b.label) ?? 999;
      if (ao !== bo) return ao - bo;
      return a.label.localeCompare(b.label);
    });
  }, [fetchedSnippets]);

  const includesSnip = (all: string, snippet: Snippet) => normalize(all).includes(getSnippetText(snippet));
  const addSnip = (all: string, snippet: Snippet) => {
    const txt = getSnippetText(snippet);
    const base = normalize(all);
    if (!base) return txt;
    if (base.includes(txt)) return base;
    return base + "\n\n" + txt;
  };
  const removeSnip = (all: string, snippet: Snippet) => {
    const txt = getSnippetText(snippet);
    const base = normalize(all);
    const patterns = [
      new RegExp(`(^|\n\n)${escapeReg(txt)}(\n\n|$)`),
      new RegExp(escapeReg(txt)),
    ];
    let out = base;
    for (const re of patterns) out = out.replace(re, (m, p1, p2) => (p1 && p2 ? "\n\n" : ""));
    return out.replace(/^\n+|\n+$/g, "");
  };

  const toggleSnip = (snippet: Snippet) => {
    setForm((f: any) => {
      const cur = String(f?.conclusion?.text || "");
      const nextText = includesSnip(cur, snippet) ? removeSnip(cur, snippet) : addSnip(cur, snippet);
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

  const onVarChange = (patch: Partial<typeof vars>, targetLabel?: string) => {
    setForm((f: any) => {
      const cur = String(f?.conclusion?.text || "");
      let out = cur;
      if (targetLabel) {
        const V = { ...(f.conclusion?.vars || {}), ...vars, ...patch } as any;
        const snippetsInText = visibleSnippets.filter((s) => s.label === targetLabel && includesSnip(cur, s));
        if (snippetsInText.length > 0) {
          snippetsInText.forEach((snippet) => {
            const oldTxt = getSnippetText(snippet);
            const newTxt = (() => {
              if (targetLabel === "Izolační odpory") {
                const m = (V.insulationMinMOhm || "").trim();
                const extra = m ? ` (nejnižší naměřená hodnota: ${m} MΩ)` : "";
                return `Naměřené hodnoty izolačních odporů jsou ve všech případech vyšší než 1 MΩ, takže vyhovují ČSN 33 2000-6 ed.2:2017, čl. 6.4.3.3.${extra}`;
              }
              if (targetLabel === "Protipožární ochrana") {
                const t = (V.fireProtectionText || "").trim();
                return t ? `Protipožární ochrana: ${t}` : "Protipožární ochrana: ";
              }
              return oldTxt;
            })();
            out = normalize(out).replace(new RegExp(escapeReg(oldTxt), "g"), newTxt);
          });
        }
      }
      return {
        ...f,
        conclusion: { ...(f.conclusion || {}), text: out, vars: { ...(f.conclusion?.vars || {}), ...vars, ...patch } },
      };
    });
  };

  const isActive = (snippet: Snippet) => includesSnip(String(conclusion.text || ""), snippet);

  return (
    <>
    <section className="space-y-6 text-sm text-gray-800">
      <h2 className="text-lg font-semibold text-blue-800">Závěr</h2>

      {/* Čipy – rychlé vložení/odebrání vět */}
      <div className="rounded-md border bg-white p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-gray-500">Rychlé věty</div>
          <button
            type="button"
            className="text-xs px-3 py-1 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50"
            onClick={() => setManagerOpen(true)}
          >
            Správa čipů
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleSnippets.map((s) => (
            <button
              key={s.id}
              type="button"
              className={
                (isActive(s)
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50") +
                " border rounded-full px-3 py-1 text-xs font-medium"
              }
              onClick={() => toggleSnip(s)}
              title={getSnippetText(s)}
            >
              {s.label}
            </button>
          ))}
        </div>
        {!isLps && (
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <div>
              <label className="block text-xs text-gray-600">Nejnižší Riso (MΩ, volitelné)</label>
              <input
                type="text"
                className="w-full rounded border px-3 py-1.5 text-sm"
                placeholder="např. 2.5"
                value={vars.insulationMinMOhm || ""}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onVarChange({ insulationMinMOhm: e.target.value }, "Izolační odpory")}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600">Protipožární ochrana (volný text)</label>
              <input
                type="text"
                className="w-full rounded border px-3 py-1.5 text-sm"
                placeholder="např. zkontrolována, bez závad / dle dokumentace…"
                value={vars.fireProtectionText || ""}
                onChange={(e: ChangeEvent<HTMLInputElement>) => onVarChange({ fireProtectionText: e.target.value }, "Protipožární ochrana")}
              />
            </div>
          </div>
        )}
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
          {isLps
            ? <>Instalované hromosvodné zařízení vyhovuje požadavkům normy {standardName} a jeho součásti jsou ve funkčním stavu.</>
            : <>Elektrická instalace vyhovuje požadavkům příslušných norem a je schopna bezpečného provozu.</>}
        </label>
        <label className="inline-flex items-center">
          <input
            type="radio"
            name="safety"
            className="mr-2"
            checked={conclusion.safety === "not_able"}
            onChange={() => setForm((f: any) => ({ ...f, conclusion: { ...(f.conclusion || {}), safety: "not_able" } }))}
          />
          <span className="text-red-600">
            {isLps
              ? <>Instalované hromosvodné zařízení nevyhovuje požadavkům normy {standardName} a jeho součásti nejsou ve funkčním stavu.</>
              : <>Elektrická instalace nevyhovuje požadavkům příslušných norem a není schopna bezpečného provozu.</>}
          </span>
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
    {managerOpen && (
      <SnippetManager
        scope={isLps ? "LPS" : "EI"}
        items={fetchedSnippets}
        onClose={() => setManagerOpen(false)}
        onToggleVisible={toggleVisible}
        onCreate={async (payload) => {
          await addSnippet(payload);
          await reload();
        }}
        onDelete={async (id) => {
          await remove(id);
          await reload();
        }}
      />
    )}
    </>
  );
}
