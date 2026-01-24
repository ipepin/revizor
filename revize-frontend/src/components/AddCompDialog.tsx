// src/components/AddCompDialog.tsx
import React, { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Komponenta } from "../context/RevisionFormContext";
import api from "../api/axios";

type CompWithParent = Komponenta & { parentId?: number | null; rowId?: number | null };

type SearchManufacturer = { id: number; name: string; typeId: number };

type SearchOption = {
  kind: "type" | "typeManufacturer" | "typeManufacturerModel";
  id: string;
  label: string;
  manufacturerId?: string;
  manufacturerName?: string;
  typeId?: string;
  typeName?: string;
  modelId?: string;
  modelName?: string;
};

interface AddCompDialogProps {
  newComp: CompWithParent;
  setNewComp: React.Dispatch<React.SetStateAction<CompWithParent>>;
  defaultComp: CompWithParent;
  isCustom: boolean;
  setIsCustom: React.Dispatch<React.SetStateAction<boolean>>;
  types: { id: number; name: string }[];
  manufacturers: { id: number; name: string; typeId?: number; type_id?: number }[];
  models: { id: number; name: string }[];
  polesOptions: string[];
  dimenzeOptions: string[];
  favoriteDimenze?: string[];
  parentCandidates: { id: number; label: string }[];
  rowOptions?: { id: number; label: string }[];
  onRowChange?: (rowId: number | null) => void;
  onParentChange: (pid: number | null) => void;
  polesWarning?: string;
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
  favoriteDimenze,
  parentCandidates,
  rowOptions,
  onRowChange,
  onParentChange,
  polesWarning,
  onCancel,
  onAdd,
}: AddCompDialogProps) {
  const normalizeDim = (value: string) => value.toLowerCase().replace(/\s+/g, "");
  const favoriteSet = useMemo(
    () => new Set((favoriteDimenze || []).map((v) => normalizeDim(v))),
    [favoriteDimenze]
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchManufacturerCache, setSearchManufacturerCache] = useState<
    Record<string, SearchManufacturer[]>
  >({});
  const [modelCache, setModelCache] = useState<Record<string, { id: number; name: string }[]>>({});

  const selectedType = useMemo(() => {
    if (newComp.nazevId) {
      const hit = types.find((t) => String(t.id) === String(newComp.nazevId));
      if (hit) return hit;
    }
    if (newComp.nazev) {
      return types.find((t) => t.name === newComp.nazev);
    }
    return undefined;
  }, [newComp.nazevId, newComp.nazev, types]);

  const selectedTypeName = selectedType?.name || "";
  const selectedTypeId = newComp.nazevId ? String(newComp.nazevId) : undefined;

  const searchManufacturers = useMemo(
    () => Object.values(searchManufacturerCache).flat(),
    [searchManufacturerCache]
  );

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2 || !types.length) return;

    const fetchSearchData = async () => {
      const missingTypeIds = types
        .map((t) => String(t.id))
        .filter((id) => !searchManufacturerCache[id]);

      const nextManufacturerCache = { ...searchManufacturerCache };
      const pendingManufacturers = Object.values(nextManufacturerCache).flat();
      const missingManufacturers = pendingManufacturers.filter((m) => !modelCache[String(m.id)]);

      if (!missingTypeIds.length && !missingManufacturers.length) return;

      setSearchBusy(true);
      try {
        if (missingTypeIds.length) {
          const results = await Promise.all(
            missingTypeIds.map((typeId) =>
              api
                .get("/catalog/manufacturers", { params: { type_id: typeId } })
                .then((r) => ({
                  typeId: Number(typeId),
                  rows: Array.isArray(r.data) ? r.data : [],
                }))
                .catch(() => ({ typeId: Number(typeId), rows: [] }))
            )
          );

          results.forEach((r) => {
            nextManufacturerCache[String(r.typeId)] = (r.rows || []).map((m: any) => ({
              id: m.id,
              name: m.name || "",
              typeId: r.typeId,
            }));
          });
          setSearchManufacturerCache(nextManufacturerCache);
        }

        const allManufacturers = Object.values(nextManufacturerCache).flat();
        const missingModels = allManufacturers.filter((m) => !modelCache[String(m.id)]);

        if (missingModels.length) {
          const modelResults = await Promise.all(
            missingModels.map((m) =>
              api
                .get("/catalog/models", { params: { manufacturer_id: m.id } })
                .then((r) => ({ id: m.id, rows: Array.isArray(r.data) ? r.data : [] }))
                .catch(() => ({ id: m.id, rows: [] }))
            )
          );

          setModelCache((prev) => {
            const next = { ...prev };
            modelResults.forEach((r) => {
              next[String(r.id)] = r.rows;
            });
            return next;
          });
        }
      } finally {
        setSearchBusy(false);
      }
    };

    fetchSearchData();
  }, [searchQuery, types, searchManufacturerCache, modelCache]);

  const searchOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [] as SearchOption[];

    const out: SearchOption[] = [];
    const seen = new Set<string>();
    const add = (opt: SearchOption) => {
      if (seen.has(opt.id)) return;
      seen.add(opt.id);
      out.push(opt);
    };

    const typeMatches = types.filter((t) => t.name.toLowerCase().includes(q));
    const fallbackManufacturers = manufacturers
      .map((m) => ({
        id: m.id,
        name: m.name,
        typeId:
          typeof m.typeId === "number"
            ? m.typeId
            : typeof m.type_id === "number"
              ? m.type_id
              : selectedTypeId
                ? Number(selectedTypeId)
                : -1,
      }))
      .filter((m) => m.typeId > 0);

    const manufacturersAll = searchManufacturers.length ? searchManufacturers : fallbackManufacturers;

    typeMatches.forEach((t) =>
      add({ kind: "type", id: `type-${t.id}`, label: t.name, typeId: String(t.id), typeName: t.name })
    );

    manufacturersAll.forEach((m) => {
      const typeName = types.find((t) => t.id === m.typeId)?.name;
      if (!typeName) return;
      if (!m.name.toLowerCase().includes(q)) return;

      add({
        kind: "typeManufacturer",
        id: `type-manufacturer-${m.typeId}-${m.id}`,
        label: `${typeName} ${m.name}`,
        manufacturerId: String(m.id),
        manufacturerName: m.name,
        typeId: String(m.typeId),
        typeName,
      });
    });

    manufacturersAll.forEach((m) => {
      const typeName = types.find((t) => t.id === m.typeId)?.name;
      if (!typeName) return;
      const modelsForM = modelCache[String(m.id)] || [];

      modelsForM.forEach((model) => {
        const modelLabel = model.name || "";
        const modelLower = modelLabel.toLowerCase();
        const matchModel = modelLower.includes(q) || q.includes(modelLower);
        if (!matchModel) return;

        add({
          kind: "typeManufacturerModel",
          id: `tmm-${m.typeId}-${m.id}-${model.id}`,
          label: `${typeName} ${m.name} ${modelLabel}`,
          manufacturerId: String(m.id),
          manufacturerName: m.name,
          typeId: String(m.typeId),
          typeName,
          modelId: String(model.id),
          modelName: modelLabel,
        });
      });
    });

    return out.slice(0, 20);
  }, [searchQuery, types, manufacturers, searchManufacturers, modelCache]);

  const handleSearchSelect = (opt: SearchOption) => {
    if (opt.kind === "type") {
      setIsCustom(false);
      setNewComp({
        ...defaultComp,
        parentId: newComp.parentId ?? null,
        rowId: newComp.rowId ?? null,
        nazevId: opt.typeId || opt.id,
        nazev: opt.typeName || opt.label,
      });
    } else if (opt.kind === "typeManufacturer") {
      setIsCustom(false);
      setNewComp({
        ...defaultComp,
        parentId: newComp.parentId ?? null,
        rowId: newComp.rowId ?? null,
        nazevId: opt.typeId || "",
        nazev: opt.typeName || "",
        popisId: opt.manufacturerId || "",
        popis: opt.manufacturerName || "",
        typId: "",
        typ: "",
      });
    } else if (opt.kind === "typeManufacturerModel") {
      setIsCustom(false);
      setNewComp({
        ...defaultComp,
        parentId: newComp.parentId ?? null,
        rowId: newComp.rowId ?? null,
        nazevId: opt.typeId || selectedTypeId || "",
        nazev: opt.typeName || selectedTypeName || "",
        popisId: opt.manufacturerId || "",
        popis: opt.manufacturerName || "",
        typId: opt.modelId || "",
        typ: opt.modelName || "",
      });
    }
    setSearchQuery("");
  };

  const showBreakerFields = useMemo(() => {
    const src = `${newComp.nazev || ""} ${newComp.typ || ""}`.toLowerCase();
    return /chránič|chráničojistič|rcd|rcbo/.test(src);
  }, [newComp.nazev, newComp.typ]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow w-full max-w-3xl">
        <h3 className="text-lg font-semibold mb-4">
          {(newComp as any).id ? "Upravit komponentu" : "Nová komponenta"}
        </h3>

        {rowOptions?.length ? (
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1">Řada</label>
            <select
              className="w-full p-1.5 border rounded text-sm"
              value={newComp.rowId ?? rowOptions[0]?.id ?? 1}
              onChange={(e) => onRowChange?.(Number(e.target.value) || null)}
            >
              {rowOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

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

        <div className="mb-4">
          <label className="block text-xs font-medium mb-1">Vyhledat v katalogu</label>
          <input
            className="w-full p-1.5 border rounded text-sm"
            placeholder="Napiš např. Eaton nebo PL7"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchBusy && <div className="mt-1 text-xs text-gray-500">Načítám možnosti…</div>}
          {searchOptions.length > 0 && (
            <div className="mt-1 border rounded bg-white max-h-48 overflow-auto text-sm">
              {searchOptions.map((opt) => (
                <button
                  key={`${opt.kind}-${opt.id}`}
                  type="button"
                  className="w-full text-left px-2 py-1 hover:bg-slate-100"
                  onClick={() => handleSearchSelect(opt)}
                >
                  <span className="text-[11px] uppercase text-slate-500 mr-2">
                    {opt.kind === "type" || opt.kind === "typeManufacturer" ? "Přístroj" : "Model"}
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium mb-1">Přístroj</label>
          <select
            className="w-full p-1.5 border rounded text-sm"
            value={isCustom ? "vlastni" : newComp.nazevId}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "vlastni") {
                setIsCustom(true);
                setNewComp({
                  ...defaultComp,
                  parentId: newComp.parentId ?? null,
                  rowId: newComp.rowId ?? null,
                });
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
                ["ochrana", "Zs [Ω]"],
                ["poznamka", "Název obvodu"],
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
                {polesWarning && (
                  <div className="mt-2 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                    {polesWarning}
                  </div>
                )}
              </div>

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
                      {favoriteSet.has(normalizeDim(o)) ? `★ ${o}` : o}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium">Riso [MΩ]</label>
                <input
                  type="text"
                  className="w-full p-1.5 border rounded text-sm"
                  value={newComp.riso || ""}
                  onChange={(e) => setNewComp((c) => ({ ...c, riso: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium">Zs [Ω]</label>
                <input
                  type="text"
                  className="w-full p-1.5 border rounded text-sm"
                  value={newComp.ochrana || ""}
                  onChange={(e) => setNewComp((c) => ({ ...c, ochrana: e.target.value }))}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium">Název obvodu</label>
                <input
                  type="text"
                  className="w-full p-1.5 border rounded text-sm"
                  value={newComp.poznamka || ""}
                  onChange={(e) => setNewComp((c) => ({ ...c, poznamka: e.target.value }))}
                />
              </div>
            </>
          )}
        </div>

        {showBreakerFields && (
          <div className="text-xs text-gray-500 mb-4">
            U proudových chráničů a chráničojističů vyplňte vybavovací proud a čas.
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-300 rounded" onClick={onCancel}>
            Zrušit
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={onAdd}>
            {(newComp as any).id ? "Uložit" : "Přidat"}
          </button>
        </div>
      </div>
    </div>
  );
}
