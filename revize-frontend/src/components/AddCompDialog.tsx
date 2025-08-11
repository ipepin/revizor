// src/components/AddCompDialog.tsx
import React, { ChangeEvent } from "react";
import { Komponenta } from "../context/RevisionFormContext";

interface AddCompDialogProps {
  newComp: Komponenta;
  setNewComp: React.Dispatch<React.SetStateAction<Komponenta>>;
  defaultComp: Komponenta;
  isCustom: boolean;
  setIsCustom: React.Dispatch<React.SetStateAction<boolean>>;
  types: { id: number; name: string }[];
  manufacturers: { id: number; name: string }[];
  models: { id: number; name: string }[];
  polesOptions: string[];
  dimenzeOptions: string[];
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
  onCancel,
  onAdd,
}: AddCompDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow w-full max-w-lg">
        <h3 className="text-lg font-semibold mb-4">Nová komponenta</h3>

        {/* Přístroj */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Přístroj</label>
          <select
            className="w-full p-2 border rounded"
            value={isCustom ? "vlastni" : newComp.nazevId}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "vlastni") {
                setIsCustom(true);
                setNewComp({ ...defaultComp });
              } else {
                setIsCustom(false);
                const txt = e.target.selectedOptions[0].text;
                setNewComp((c) => ({
                  ...c,
                  nazevId: val,
                  nazev: txt,
                  popisId: "",
                  popis: "",
                  typId: "",
                  typ: ""
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

        {isCustom ? (
          <div className="space-y-4 mb-4">
            {[
              ["nazev", "Název"],
              ["popis", "Popis"],
              ["typ", "Typ"],
              ["poles", "Počet pólů"],
              ["dimenze", "Dimenze"],
              ["riso", "Riso [MΩ]"],
              ["ochrana", "Ochrana [Ω]"],
              ["poznamka", "Poznámka"],
            ].map(([field, label]) => (
              <div key={field}>
                <label className="block text-sm font-medium">{label}</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded text-sm"
                  value={(newComp as any)[field] || ""}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setNewComp((c) => ({ ...c, [field]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 mb-4">
            {/* Výrobce */}
            <div>
              <label className="block text-sm font-medium">Výrobce</label>
              <select
                className="w-full p-2 border rounded"
                value={newComp.popisId}
                onChange={(e) => {
                  const id = e.target.value;
                  const txt = e.target.selectedOptions[0].text;
                  setNewComp((c) => ({
                    ...c,
                    popisId: id,
                    popis: txt,
                    typId: "",
                    typ: ""
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

            {/* Typ */}
            <div>
              <label className="block text-sm font-medium">Typ</label>
              <select
                className="w-full p-2 border rounded"
                value={newComp.typId}
                onChange={(e) => {
                  const id = e.target.value;
                  const txt = e.target.selectedOptions[0].text;
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
              <label className="block text-sm font-medium">Počet pólů</label>
              <select
                className="w-full p-2 border rounded"
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
              <label className="block text-sm font-medium">Dimenze</label>
              <select
                className="w-full p-2 border rounded"
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
              <label className="block text-sm font-medium">Riso [MΩ]</label>
              <input
                type="text"
                className="w-full p-2 border rounded text-sm"
                value={newComp.riso}
                onChange={(e) => setNewComp((c) => ({ ...c, riso: e.target.value }))}
              />
            </div>

            {/* Ochrana */}
            <div>
              <label className="block text-sm font-medium">Ochrana [Ω]</label>
              <input
                type="text"
                className="w-full p-2 border rounded text-sm"
                value={newComp.ochrana}
                onChange={(e) => setNewComp((c) => ({ ...c, ochrana: e.target.value }))}
              />
            </div>

            {/* Poznámka */}
            <div>
              <label className="block text-sm font-medium">Poznámka</label>
              <input
                type="text"
                className="w-full p-2 border rounded text-sm"
                value={newComp.poznamka}
                onChange={(e) => setNewComp((c) => ({ ...c, poznamka: e.target.value }))}
              />
            </div>
          </div>
        )}

        {/* Akční tlačítka */}
        <div className="flex justify-end gap-2">
          <button className="bg-gray-300 px-4 py-2 rounded" onClick={onCancel}>
            Zrušit
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={onAdd}>
            Přidat komponentu
          </button>
        </div>
      </div>
    </div>
  );
}
