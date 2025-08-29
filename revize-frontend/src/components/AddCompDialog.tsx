// src/components/AddCompDialog.tsx
import React, { ChangeEvent, useMemo } from "react";
import { Komponenta } from "../context/RevisionFormContext";

type CompWithParent = Komponenta & { parentId?: number | null };

interface AddCompDialogProps {
  newComp: CompWithParent;
  setNewComp: React.Dispatch<React.SetStateAction<CompWithParent>>;
  defaultComp: CompWithParent;
  isCustom: boolean;
  setIsCustom: React.Dispatch<React.SetStateAction<boolean>>;
  types: { id: number; name: string }[];
  manufacturers: { id: number; name: string }[];
  models: { id: number; name: string }[];
  polesOptions: string[];
  dimenzeOptions: string[];
  parentCandidates: { id: number; label: string }[];
  onParentChange: (pid: number | null) => void;
  onCancel: () => void;
  onAdd: () => void;
}

export default function AddCompDialog({
  newComp,
  setNewComp,
  defaultComp,
  isCustom,
  setIsCustom,
  types,
  manufacturers,
  models,
  polesOptions,
  dimenzeOptions,
  parentCandidates,
  onParentChange,
  onCancel,
  onAdd,
}: AddCompDialogProps) {
  // zobrazit extra pole pro chránič / chráničojistič (RCBO)
  const showBreakerFields = useMemo(() => {
    const src = `${newComp.nazev || ""} ${newComp.typ || ""}`.toLowerCase();
    return /chránič|jističochránič|rcd|rcbo/.test(src);
  }, [newComp.nazev, newComp.typ]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow w-full max-w-3xl">
        <h3 className="text-lg font-semibold mb-4">
          {(newComp as any).id ? "Upravit komponentu" : "Nová komponenta"}
        </h3>

        {/* Nadřazený prvek */}
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1">Nadřazený prvek</label>
          <select
            className="w-full p-1.5 border rounded text-sm"
            value={newComp.parentId ?? 0}
            onChange={(e) => {
              const v = Number(e.target.value);
              onParentChange(!v ? null : v);
            }}
          >
            {parentCandidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {/* Přístroj */}
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1">Přístroj</label>
          <select
            className="w-full p-1.5 border rounded text-sm"
            value={isCustom ? "vlastni" : newComp.nazevId}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "vlastni") {
                setIsCustom(true);
                setNewComp({ ...defaultComp, parentId: newComp.parentId ?? null });
              } else {
                setIsCustom(false);
                const txt = e.target.selectedOptions[0]?.text || "";
                setNewComp((c) => ({
                  ...c,
                  nazevId: val,
                  nazev: txt,
                  popisId: "",
                  popis: "",
                  typId: "",
                  typ: "",
                }));
              }
            }}
          >
            <option value="">-- vyber --</option>
            {types.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
            <option value="vlastni">Vlastní</option>
          </select>
        </div>

        {/* TĚLO FORMULÁŘE: 2 sloupce, menší inputy */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {isCustom ? (
            <>
              {([
                ["nazev", "Název"],
                ["popis", "Výrobce / Popis"],
                ["typ", "Model / Typ"],
                ["poles", "Počet pólů"],
                ["dimenze", "Dimenze"],
                ["riso", "Riso [MΩ]"],
                ["ochrana", "Ochrana [Ω]"],
                ["poznamka", "Poznámka"],
              ] as const).map(([field, label]) => (
                <div key={field}>
                  <label className="block text-xs font-medium">{label}</label>
                  <input
                    type="text"
                    className="w-full p-1.5 border rounded text-sm"
                    value={(newComp as any)[field] || ""}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setNewComp((c) => ({ ...c, [field]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </>
          ) : (
            <>
              {/* Výrobce */}
              <div>
                <label className="block text-xs font-medium">Výrobce</label>
                <select
                  className="w-full p-1.5 border rounded text-sm"
                  value={newComp.popisId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const txt = e.target.selectedOptions[0]?.text || "";
                    setNewComp((c) => ({
                      ...c,
                      popisId: id,
                      popis: txt,
                      typId: "",
                      typ: "",
                    }));
                  }}
                >
                  <option value="">-- vyber --</option>
                  {manufacturers.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Typ / model */}
              <div>
                <label className="block text-xs font-medium">Typ / Model</label>
                <select
                  className="w-full p-1.5 border rounded text-sm"
                  value={newComp.typId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const txt = e.target.selectedOptions[0]?.text || "";
                    setNewComp((c) => ({ ...c, typId: id, typ: txt }));
                  }}
                >
                  <option value="">-- vyber --</option>
                  {models.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Počet pólů */}
              <div>
                <label className="block text-xs font-medium">Počet pólů</label>
                <select
                  className="w-full p-1.5 border rounded text-sm"
                  value={newComp.poles}
                  onChange={(e) => setNewComp((c) => ({ ...c, poles: e.target.value }))}
                >
                  <option value="">-- vyber --</option>
                  {polesOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dimenze */}
              <div>
                <label className="block text-xs font-medium">Dimenze</label>
                <select
                  className="w-full p-1.5 border rounded text-sm"
                  value={newComp.dimenze}
                  onChange={(e) => setNewComp((c) => ({ ...c, dimenze: e.target.value }))}
                >
                  <option value="">-- vyber --</option>
                  {dimenzeOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>

              {/* Riso */}
              <div>
                <label className="block text-xs font-medium">Riso [MΩ]</label>
                <input
                  type="text"
                  className="w-full p-1.5 border rounded text-sm"
                  value={newComp.riso || ""}
                  onChange={(e) => setNewComp((c) => ({ ...c, riso: e.target.value }))}
                />
              </div>

              {/* Ochrana */}
              <div>
                <label className="block text-xs font-medium">Ochrana [Ω]</label>
                <input
                  type="text"
                  className="w-full p-1.5 border rounded text-sm"
                  value={newComp.ochrana || ""}
                  onChange={(e) => setNewComp((c) => ({ ...c, ochrana: e.target.value }))}
                />
              </div>

              {/* Poznámka */}
              <div className="col-span-2">
                <label className="block text-xs font-medium">Poznámka</label>
                <input
                  type="text"
                  className="w-full p-1.5 border rounded text-sm"
                  value={newComp.poznamka || ""}
                  onChange={(e) => setNewComp((c) => ({ ...c, poznamka: e.target.value }))}
                />
              </div>
            </>
          )}

          {/* Extra pole pro chránič / chráničojistič – v obou režimech */}
          {showBreakerFields && (
            <>
              <div>
                <label className="block text-xs font-medium">Vybavovací čas [ms]</label>
                <input
                  type="number"
                  className="w-full p-1.5 border rounded text-sm"
                  value={(newComp as any).vybavovaciCasMs || ""}
                  onChange={(e) =>
                    setNewComp((c) => ({ ...(c as any), vybavovaciCasMs: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium">Vybavovací proud [mA]</label>
                <input
                  type="number"
                  className="w-full p-1.5 border rounded text-sm"
                  value={(newComp as any).vybavovaciProudmA || ""}
                  onChange={(e) =>
                    setNewComp((c) => ({ ...(c as any), vybavovaciProudmA: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium">Dotykové napětí [V]</label>
                <input
                  type="number"
                  className="w-full p-1.5 border rounded text-sm"
                  value={(newComp as any).dotykoveNapetiV || ""}
                  onChange={(e) =>
                    setNewComp((c) => ({ ...(c as any), dotykoveNapetiV: e.target.value }))
                  }
                />
              </div>
            </>
          )}
        </div>

        {/* Akční tlačítka */}
        <div className="flex justify-end gap-2">
          <button className="bg-gray-300 px-4 py-2 rounded" onClick={onCancel}>
            Zrušit
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={onAdd}>
            {(newComp as any).id ? "Uložit změny" : "Přidat komponentu"}
          </button>
        </div>
      </div>
    </div>
  );
}
