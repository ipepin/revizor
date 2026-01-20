// src/components/NormsSection.tsx

import React, { useContext, useEffect, useMemo, useState } from "react";
import { RevisionFormContext } from "../context/RevisionFormContext";
import { fetchNorms, Norm } from "../api/norms";

const normalize = (s: string) => s.replace(/[\s\.]/g, "").toLowerCase();

export default function NormsSection() {
  const { form, setForm } = useContext(RevisionFormContext);
  const [items, setItems] = useState<Norm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customInput, setCustomInput] = useState("");

  const selectedNorms = Array.isArray(form?.norms) ? form.norms : [];
  const customNorms = [form?.customNorm1, form?.customNorm2, form?.customNorm3].filter(
    (x: any) => x && String(x).trim().length > 0
  ) as string[];

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchNorms("EI")
      .then((data) => {
        if (mounted) setItems(data || []);
      })
      .catch((e: any) => {
        if (mounted) setError(e?.message || "Nepodařilo se načíst normy.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const isSelected = (label: string) => {
    const nl = normalize(label);
    return selectedNorms.some((n: string) => {
      const nn = normalize(n);
      return nn === nl || nl.startsWith(nn) || nn.startsWith(nl);
    });
  };

  const addNorm = (label: string) => {
    if (isSelected(label)) return;
    setForm((f: any) => ({
      ...f,
      norms: [...(Array.isArray(f?.norms) ? f.norms : []), label],
    }));
  };

  const removeNorm = (label: string) => {
    const nl = normalize(label);
    setForm((f: any) => ({
      ...f,
      norms: (Array.isArray(f?.norms) ? f.norms : []).filter((n: string) => {
        const nn = normalize(n);
        return !(nn === nl || nl.startsWith(nn) || nn.startsWith(nl));
      }),
    }));
  };

  const toggleNorm = (label: string) => {
    if (isSelected(label)) {
      removeNorm(label);
    } else {
      addNorm(label);
    }
  };

  const removeCustom = (label: string) => {
    const nl = normalize(label);
    setForm((f: any) => ({
      ...f,
      customNorm1: normalize(f.customNorm1 || "") === nl ? "" : f.customNorm1,
      customNorm2: normalize(f.customNorm2 || "") === nl ? "" : f.customNorm2,
      customNorm3: normalize(f.customNorm3 || "") === nl ? "" : f.customNorm3,
    }));
  };

  const addCustom = () => {
    const val = customInput.trim();
    if (!val) return;
    setForm((f: any) => {
      const slots = [f.customNorm1, f.customNorm2, f.customNorm3];
      const idx = slots.findIndex((x: string) => !x || !String(x).trim());
      if (idx === -1) return f;
      const next = { ...f } as any;
      if (idx === 0) next.customNorm1 = val;
      if (idx === 1) next.customNorm2 = val;
      if (idx === 2) next.customNorm3 = val;
      return next;
    });
    setCustomInput("");
  };

  const filtered = useMemo(() => {
    const q = normalize(search);
    if (!q) return items;
    return items.filter((n) => normalize(n.label).includes(q));
  }, [items, search]);

  return (
    <section className="bg-white p-4 rounded shadow mb-6">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold text-blue-800">Použité normy a zákony</h2>
        <button
          type="button"
          className="px-3 py-1.5 text-xs rounded border border-slate-300 hover:bg-slate-50"
          onClick={() => setManagerOpen(true)}
        >
          Vybrat další normu
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-gray-500">Vybrané normy</div>
        <div className="flex flex-wrap gap-2">
          {selectedNorms.map((norm: string) => (
            <button
              key={norm}
              type="button"
              className="border rounded-full px-3 py-1 text-xs bg-white text-slate-700 hover:bg-slate-50"
              onClick={() => removeNorm(norm)}
              title="Kliknutím odeberete"
            >
              {norm}
            </button>
          ))}
          {customNorms.map((norm: string) => (
            <button
              key={norm}
              type="button"
              className="border border-dashed rounded-full px-3 py-1 text-xs bg-white text-slate-700 hover:bg-slate-50"
              onClick={() => removeCustom(norm)}
              title="Kliknutím odeberete"
            >
              {norm}
            </button>
          ))}
          {selectedNorms.length === 0 && customNorms.length === 0 && (
            <div className="text-xs text-gray-400">Zatím žádné normy</div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-xs text-gray-600">Přidat vlastní normu</label>
        <div className="flex flex-wrap gap-2 mt-1">
          <input
            type="text"
            className="flex-1 min-w-[220px] rounded border px-3 py-1.5 text-sm"
            placeholder="Nap?. ?SN ..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
          />
          <button
            type="button"
            className="px-3 py-1.5 text-xs rounded bg-indigo-600 text-white disabled:opacity-50"
            onClick={addCustom}
            disabled={!customInput.trim()}
          >
            Přidat
          </button>
        </div>
        <div className="text-[11px] text-gray-500 mt-1">
          Vlastní normy se ukládají do tří polí (max 3).
        </div>
      </div>

      {managerOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl w-[720px] max-w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Výběr norem (EI)</div>
                <div className="text-xs text-gray-500">Kliknutím přidáte nebo odeberete normu.</div>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-gray-600">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Platná
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    Nahrazená edice
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Zrušená
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="text-sm text-gray-600 hover:text-gray-900"
                onClick={() => setManagerOpen(false)}
              >
                Zavřít
              </button>
            </div>

            <div className="p-4 border-b">
              <input
                type="text"
                className="w-full rounded border px-3 py-2 text-sm"
                placeholder="Hledat v normách..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-auto">
              {loading && <div className="p-4 text-sm text-gray-500">Načítám…</div>}
              {error && <div className="p-4 text-sm text-red-600">{error}</div>}
              {!loading && !error && filtered.length === 0 && (
                <div className="p-4 text-sm text-gray-500">Žádné normy k zobrazení.</div>
              )}
              <ul className="divide-y">
                {filtered.map((norm) => {
                  const active = isSelected(norm.label);
                  const status = (norm.status || "").toUpperCase();
                  const badgeClass =
                    status === "PLATNÁ"
                      ? "bg-emerald-100 text-emerald-700"
                      : status === "NAHRAZENÁ EDICE"
                        ? "bg-amber-100 text-amber-700"
                        : status === "ZRUŠENÁ"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 text-slate-600";
                  return (
                    <li key={norm.id} className="flex items-center justify-between px-4 py-2">
                      <div className="space-y-1">
                        <div className="text-sm text-gray-800">{norm.label}</div>
                        <div className="flex flex-wrap gap-2 text-[11px] text-gray-500">
                          {norm.issued_on && <span>Vydána: {norm.issued_on}</span>}
                          {norm.canceled_on && <span>Zrušena od: {norm.canceled_on}</span>}
                        </div>
                        {status && (
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] ${badgeClass}`}>
                            {norm.status}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        className={
                          active
                            ? "px-3 py-1 text-xs rounded bg-slate-200"
                            : "px-3 py-1 text-xs rounded bg-indigo-600 text-white"
                        }
                        onClick={() => toggleNorm(norm.label)}
                      >
                        {active ? "Odebrat" : "Přidat"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
