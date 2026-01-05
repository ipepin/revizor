import React, { useContext, useMemo, useState } from "react";
import { RevisionFormContext } from "../context/RevisionFormContext";
import { useSnippets } from "../hooks/useSnippets";
import type { Snippet } from "../api/snippets";
import { SnippetManager } from "../components/SnippetManager";

export default function LpsConclusionSection() {
  const { form, setForm } = useContext(RevisionFormContext);
  const conclusion: any = form.conclusion || {};
  const [managerOpen, setManagerOpen] = useState(false);

  const { items: fetchedSnippets, toggleVisible, addSnippet, remove, reload } = useSnippets("LPS");

  const lpsStandardCode: string = (form as any)?.lps?.standard || "";
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

  const normalize = (s: string) => s.replace(/\s+$/g, "").replace(/\r\n/g, "\n");

  const visibleSnippets = useMemo(
    () => fetchedSnippets.filter((s) => s.visible !== false),
    [fetchedSnippets]
  );

  const getText = (snippet: Snippet) => {
    if (snippet.label === "Odpor zemničů v toleranci") {
      return `Odpor zemničů je v toleranci stanovené normou (≤ ${earthThreshold} Ω).`;
    }
    if (snippet.label === "Odpor zemničů mimo toleranci") {
      return `Odpor zemničů není v toleranci stanovené normou (> ${earthThreshold} Ω).`;
    }
    return snippet.body || "";
  };

  const addSnippetToText = (snippet: Snippet) => {
    setForm((f: any) => {
      const cur = String(f?.conclusion?.text || "");
      const text = getText(snippet);
      const groups: Record<string, string[]> = {
        earth: [
          `Odpor zemničů je v toleranci stanovené normou (≤ ${earthThreshold} Ω).`,
          `Odpor zemničů není v toleranci stanovené normou (> ${earthThreshold} Ω).`,
        ],
        condition: [
          "Hromosvodné zařízení je v dobrém stavu a odpovídá platným normám.",
          "Hromosvodné zařízení není v dobrém stavu a odpovídá platným normám.",
        ],
        spd: [
          "Byly instalovány ochrany SPD, které jsou funkční.",
          "Byly instalovány ochrany SPD, které nejsou funkční.",
          "Nebyly instalovány ochrany SPD.",
        ],
      };

      const label = snippet.label;
      const groupKey =
        label.indexOf("zemničů") >= 0
          ? "earth"
          : label.indexOf("Hromosvodné zařízení") >= 0
          ? "condition"
          : label.indexOf("SPD") >= 0
          ? "spd"
          : null;

      const removeAll = (textContent: string, arr: string[]) => {
        let out = textContent;
        for (const s of arr) {
          const re = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
          out = out.replace(re, "");
        }
        return out.replace(/\n\n+/g, "\n\n").trim();
      };

      let out = normalize(cur);
      if (groupKey) {
        out = removeAll(out, groups[groupKey] || []);
      }
      out = out ? `${out}\n\n${text}` : text;
      return { ...f, conclusion: { ...(f.conclusion || {}), text: out } };
    });
  };

  const removeSnippetFromText = (snippet: Snippet) => {
    setForm((f: any) => {
      const cur = normalize(String(f?.conclusion?.text || ""));
      const txt = getText(snippet);
      const patterns = [
        new RegExp(`(^|\n\n)${txt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\n\n|$)`),
        new RegExp(txt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      ];
      let out = cur;
      for (const re of patterns) out = out.replace(re, (m, p1, p2) => (p1 && p2 ? "\n\n" : ""));
      out = out.replace(/^\n+|\n+$/g, "");
      return { ...f, conclusion: { ...(f.conclusion || {}), text: out } };
    });
  };

  const isActive = (snippet: Snippet) => normalize(String(conclusion.text || "")).includes(getText(snippet));

  return (
    <>
      <section className="space-y-6 text-sm text-gray-800">
        <h2 className="text-lg font-semibold text-blue-800">Závěr – LPS</h2>

        <div className="rounded-md border bg-white p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">LPS – rychlé věty</div>
            <button
              type="button"
              className="text-xs px-3 py-1 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50"
              onClick={() => setManagerOpen(true)}
            >
              Správa čipů
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {visibleSnippets.map((item) => {
              const active = isActive(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={
                    (active
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50") +
                    " border rounded-full px-3 py-1 text-xs font-medium"
                  }
                  onClick={() => (active ? removeSnippetFromText(item) : addSnippetToText(item))}
                  title={getText(item)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-md border bg-white p-4 space-y-2">
          <label className="text-sm font-medium">Text závěru (plně upravitelný)</label>
          <textarea
            className="w-full rounded border px-3 py-2 text-sm"
            rows={18}
            value={(conclusion.text as string) || ""}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setForm((f: any) => ({ ...f, conclusion: { ...(f.conclusion || {}), text: e.target.value } }))
            }
          />
          <p className="text-[11px] text-gray-500">Tip: čipy výše vloží/odeberou připravené odstavce. Můžete libovolně psát a mazat.</p>
        </div>

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
            Instalované hromosvodné zařízení vyhovuje požadavkům normy {standardName} a jeho součásti jsou ve funkčním stavu.
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
              Instalované hromosvodné zařízení nevyhovuje požadavkům normy {standardName} a jeho součásti nejsou ve funkčním stavu.
            </span>
          </label>
        </fieldset>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Platnost revize (doporučený termín další revize)</label>
          <input
            type="date"
            className="w-full rounded border px-3 py-1.5 text-sm"
            value={conclusion.validUntil || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
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
          scope="LPS"
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
