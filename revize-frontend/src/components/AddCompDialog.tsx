import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Komponenta } from "../context/RevisionFormContext";
import api from "../api/axios";

type CompWithParent = Komponenta & { parentId?: number | null; rowId?: number | null };
type SearchManufacturer = { id: number; name: string; typeId: number };
type CatalogItem = { id: number; name: string; typeId?: number; type_id?: number };
type CatalogChangedPayload = { typeId?: string; manufacturerId?: string };

const OTHER_MANUFACTURER_ID = "__other__";
const OTHER_MANUFACTURER_NAME = "Ostatní";

type SearchOption = {
  kind: "catalogItem" | "type" | "typeManufacturer" | "typeManufacturerModel";
  id: string;
  label: string;
  manufacturerId?: string;
  manufacturerName?: string;
  typeId?: string;
  typeName?: string;
  modelId?: string;
  modelName?: string;
  catalogItemId?: string;
  device?: string;
  manufacturer?: string;
  series?: string;
  manufacturerType?: string;
  ratedCurrentA?: string;
  poleConfiguration?: string;
  characteristic?: string;
  breakingCapacityKa?: string;
  residualCurrentMa?: string;
  rcdType?: string;
};

interface AddCompDialogProps {
  newComp: CompWithParent;
  setNewComp: React.Dispatch<React.SetStateAction<CompWithParent>>;
  defaultComp: CompWithParent;
  isCustom: boolean;
  setIsCustom: React.Dispatch<React.SetStateAction<boolean>>;
  types: { id: number; name: string }[];
  manufacturers: CatalogItem[];
  models: { id: number; name: string }[];
  catalogError?: string;
  polesOptions: string[];
  dimenzeOptions: string[];
  favoriteDimenze?: string[];
  parentCandidates: { id: number; label: string }[];
  rowOptions?: { id: number; label: string }[];
  initialFocusField?:
    | "search"
    | "row"
    | "parent"
    | "poles"
    | "dimenze"
    | "riso"
    | "ochrana"
    | "poznamka"
    | "vybavovaciCasMs"
    | "vybavovaciProudmA";
  onRowChange?: (rowId: number | null) => void;
  onParentChange: (pid: number | null) => void;
  polesWarning?: string;
  onCatalogChanged?: (payload: CatalogChangedPayload) => Promise<void> | void;
  onCancel: () => void;
  onAdd: () => void;
}

const INLINE_EMPTY_STATE = {
  typeMode: "existing" as "existing" | "new",
  manufacturerMode: "existing" as "existing" | "new",
  typeId: "",
  typeName: "",
  manufacturerId: "",
  manufacturerName: "",
  modelName: "",
};

export default function AddCompDialog({
  newComp,
  setNewComp,
  defaultComp,
  isCustom,
  setIsCustom,
  types,
  manufacturers,
  models,
  catalogError,
  polesOptions,
  dimenzeOptions,
  favoriteDimenze,
  parentCandidates,
  rowOptions,
  initialFocusField = "search",
  onRowChange,
  onParentChange,
  polesWarning,
  onCatalogChanged,
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
  const [searchError, setSearchError] = useState("");
  const [serverSearchOptions, setServerSearchOptions] = useState<SearchOption[]>([]);
  const [selectedNotice, setSelectedNotice] = useState("");
  const [searchManufacturerCache, setSearchManufacturerCache] = useState<
    Record<string, SearchManufacturer[]>
  >({});
  const [modelCache, setModelCache] = useState<Record<string, { id: number; name: string }[]>>({});

  const [inlineOpen, setInlineOpen] = useState(false);
  const [inlineBusy, setInlineBusy] = useState(false);
  const [inlineError, setInlineError] = useState("");
  const [inlineSuccess, setInlineSuccess] = useState("");
  const [inlineForm, setInlineForm] = useState({ ...INLINE_EMPTY_STATE });
  const [inlineManufacturers, setInlineManufacturers] = useState<CatalogItem[]>([]);
  const rowSelectRef = useRef<HTMLSelectElement | null>(null);
  const parentSelectRef = useRef<HTMLSelectElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const polesSelectRef = useRef<HTMLSelectElement | null>(null);
  const dimenzeSelectRef = useRef<HTMLSelectElement | null>(null);
  const risoInputRef = useRef<HTMLInputElement | null>(null);
  const ochranaInputRef = useRef<HTMLInputElement | null>(null);
  const poznamkaInputRef = useRef<HTMLInputElement | null>(null);
  const vybavovaciCasInputRef = useRef<HTMLInputElement | null>(null);
  const vybavovaciProudInputRef = useRef<HTMLInputElement | null>(null);

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
  const inlineTypeId =
    inlineForm.typeMode === "existing" ? inlineForm.typeId : selectedTypeId || inlineForm.typeId;
  const inlineTypeName =
    inlineForm.typeMode === "new"
      ? inlineForm.typeName
      : types.find((t) => String(t.id) === String(inlineForm.typeId))?.name || "";
  const manufacturersWithOther = useMemo(() => {
    if (!newComp.nazevId) return [] as Array<CatalogItem | { id: string; name: string }>;

    const hasOther = manufacturers.some((m) => m.name === OTHER_MANUFACTURER_NAME);
    const hasSelectedManufacturer =
      !newComp.popisId ||
      manufacturers.some((m) => String(m.id) === String(newComp.popisId)) ||
      newComp.popisId === OTHER_MANUFACTURER_ID;
    const selectedManufacturer =
      !hasSelectedManufacturer && newComp.popis
        ? [{ id: newComp.popisId, name: newComp.popis }]
        : [];

    const base = hasOther
      ? manufacturers
      : [...manufacturers, { id: OTHER_MANUFACTURER_ID, name: OTHER_MANUFACTURER_NAME }];
    return [...selectedManufacturer, ...base];
  }, [manufacturers, newComp.nazevId, newComp.popisId, newComp.popis]);

  const modelsWithSelected = useMemo(() => {
    const hasSelectedModel =
      !newComp.typId || models.some((m) => String(m.id) === String(newComp.typId));
    if (hasSelectedModel || !newComp.typ) return models;
    return [{ id: newComp.typId as any, name: newComp.typ }, ...models];
  }, [models, newComp.typId, newComp.typ]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchError("");
      setServerSearchOptions([]);
      return;
    }

    let cancel = false;
    const fetchSearchData = async () => {
      setSearchError("");
      setSearchBusy(true);
      try {
        const [itemSearchResponse, searchResponse] = await Promise.all([
          api.get("/catalog/component-items/search", { params: { q, limit: 40 } }).catch(() => ({ data: [] })),
          api.get("/catalog/search", { params: { q, limit: 40 } }).catch(() => ({ data: [] })),
        ]);
        if (!cancel) {
          const itemOptions = Array.isArray(itemSearchResponse.data)
            ? itemSearchResponse.data.map((row: any) => ({
                kind: "catalogItem" as const,
                id: `catalog-item-${row.id}`,
                catalogItemId: row.id != null ? String(row.id) : "",
                label: row.label || [row.device, row.manufacturer, row.manufacturerType || row.series].filter(Boolean).join(" "),
                typeName: row.device || "",
                manufacturer: row.manufacturer || "",
                manufacturerName: row.manufacturer || "",
                modelName: row.manufacturerType || row.series || "",
                device: row.device || "",
                series: row.series || "",
                manufacturerType: row.manufacturerType || "",
                ratedCurrentA: row.ratedCurrentA || "",
                poleConfiguration: row.poleConfiguration || "",
                characteristic: row.characteristic || "",
                breakingCapacityKa: row.breakingCapacityKa || "",
                residualCurrentMa: row.residualCurrentMa || "",
                rcdType: row.rcdType || "",
              }))
            : [];
          const legacyOptions = Array.isArray(searchResponse.data)
            ? searchResponse.data.map((row: any) => ({
                kind: row.modelId ? "typeManufacturerModel" : "typeManufacturer",
                id: `server-${row.typeId || ""}-${row.manufacturerId || ""}-${row.modelId || ""}`,
                label: row.label || [row.typeName, row.manufacturerName, row.modelName].filter(Boolean).join(" "),
                typeId: row.typeId != null ? String(row.typeId) : "",
                typeName: row.typeName || "",
                manufacturerId: row.manufacturerId != null ? String(row.manufacturerId) : "",
                manufacturerName: row.manufacturerName || "",
                modelId: row.modelId != null ? String(row.modelId) : "",
                modelName: row.modelName || "",
              }))
            : [];
          setServerSearchOptions(
            [...itemOptions, ...legacyOptions]
          );
        }
      } catch {
        if (!cancel) {
          setServerSearchOptions([]);
          setSearchError("Vyhledávání v katalogu se nepodařilo načíst.");
        }
      } finally {
        if (!cancel) setSearchBusy(false);
      }

      if (!types.length) return;

      const missingTypeIds = types
        .map((t) => String(t.id))
        .filter((id) => !searchManufacturerCache[id]);

      const nextManufacturerCache = { ...searchManufacturerCache };
      if (!missingTypeIds.length) {
        const missingModels = Object.values(nextManufacturerCache)
          .flat()
          .filter((m) => !modelCache[String(m.id)]);
        if (!missingModels.length) return;
      }

      try {
        if (missingTypeIds.length) {
          const results = await Promise.all(
            missingTypeIds.map((typeId) =>
              api
                .get("/catalog/manufacturers", { params: { type_id: typeId } })
                .then((r) => ({ typeId: Number(typeId), rows: Array.isArray(r.data) ? r.data : [] }))
                .catch(() => {
                  setSearchError("Výrobce se nepodařilo načíst.");
                  return { typeId: Number(typeId), rows: [] };
                })
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
                .catch(() => {
                  setSearchError("Modely se nepodařilo načíst.");
                  return { id: m.id, rows: [] };
                })
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
        if (!cancel) setSearchBusy(false);
      }
    };

    fetchSearchData();
    return () => {
      cancel = true;
    };
  }, [searchQuery, types, searchManufacturerCache, modelCache]);

  useEffect(() => {
    if (!inlineOpen) return;
    if (inlineForm.typeMode !== "existing" || !inlineForm.typeId) {
      setInlineManufacturers([]);
      return;
    }

    let cancel = false;
    api
      .get("/catalog/manufacturers", { params: { type_id: inlineForm.typeId } })
      .then((r) => {
        if (!cancel) setInlineManufacturers(Array.isArray(r.data) ? r.data : []);
      })
      .catch(() => {
        if (!cancel) setInlineManufacturers([]);
      });

    return () => {
      cancel = true;
    };
  }, [inlineOpen, inlineForm.typeId, inlineForm.typeMode]);

  useEffect(() => {
    if (!inlineOpen) return;
    setInlineForm((prev) => ({
      ...prev,
      typeId:
        prev.typeId ||
        (selectedTypeId && types.some((t) => String(t.id) === String(selectedTypeId)) ? selectedTypeId : ""),
      manufacturerId: "",
      manufacturerName: "",
    }));
  }, [inlineOpen, selectedTypeId, types]);

  useEffect(() => {
    const focusTarget = () => {
      switch (initialFocusField) {
        case "row":
          rowSelectRef.current?.focus();
          return;
        case "parent":
          parentSelectRef.current?.focus();
          return;
        case "poles":
          polesSelectRef.current?.focus();
          return;
        case "dimenze":
          dimenzeSelectRef.current?.focus();
          return;
        case "riso":
          risoInputRef.current?.focus();
          risoInputRef.current?.select();
          return;
        case "ochrana":
          ochranaInputRef.current?.focus();
          ochranaInputRef.current?.select();
          return;
        case "poznamka":
          poznamkaInputRef.current?.focus();
          poznamkaInputRef.current?.select();
          return;
        case "vybavovaciCasMs":
          vybavovaciCasInputRef.current?.focus();
          vybavovaciCasInputRef.current?.select();
          return;
        case "vybavovaciProudmA":
          vybavovaciProudInputRef.current?.focus();
          vybavovaciProudInputRef.current?.select();
          return;
        case "search":
        default:
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
      }
    };

    const rafId = window.requestAnimationFrame(focusTarget);
    return () => window.cancelAnimationFrame(rafId);
  }, [initialFocusField]);

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

    serverSearchOptions.forEach(add);

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
      if (!typeName || !m.name.toLowerCase().includes(q)) return;
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
        const matchModel = modelLabel.toLowerCase().includes(q) || q.includes(modelLabel.toLowerCase());
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
  }, [searchQuery, types, manufacturers, searchManufacturers, modelCache, selectedTypeId, serverSearchOptions]);

  const handleSearchSelect = (opt: SearchOption) => {
    setSelectedNotice(`Vybráno: ${opt.label}`);
    if (opt.kind === "catalogItem") {
      const manufacturerName = opt.manufacturerName || opt.manufacturer || "";
      const typeName = opt.device || opt.typeName || "";
      const typeMatch = types.find((t) => t.name.trim().toLowerCase() === typeName.trim().toLowerCase());
      const manufacturerMatch = typeMatch
        ? manufacturers.find((m) => m.name.trim().toLowerCase() === manufacturerName.trim().toLowerCase())
        : undefined;
      const modelBase = opt.manufacturerType || opt.series || opt.modelName || "";
      const characteristicSuffix = opt.characteristic ? ` ${opt.characteristic}` : "";
      const currentSuffix = opt.ratedCurrentA ? ` ${opt.ratedCurrentA}A` : "";
      const modelName = `${modelBase}${characteristicSuffix}${currentSuffix}`.trim();
      const modelMatch = manufacturerMatch
        ? models.find((m) => m.name.trim().toLowerCase() === modelName.trim().toLowerCase())
        : undefined;
      setIsCustom(!typeMatch);
      setNewComp({
        ...defaultComp,
        parentId: newComp.parentId ?? null,
        rowId: newComp.rowId ?? null,
        nazevId: typeMatch ? String(typeMatch.id) : "",
        nazev: typeName,
        popisId: manufacturerMatch ? String(manufacturerMatch.id) : `catalog-manufacturer-${manufacturerName}`,
        popis: manufacturerName,
        typId: modelMatch ? String(modelMatch.id) : opt.catalogItemId || "",
        typ: modelName,
        poles: opt.poleConfiguration || "",
        vybavovaciProudmA: opt.residualCurrentMa || "",
      });
    } else if (opt.kind === "type") {
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
    } else {
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
    const normalizedType = (newComp.nazev || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

    return normalizedType === "chranic jistic" || normalizedType === "proudovy chranic";
  }, [newComp.nazev]);

  const saveInlineCatalogItem = async () => {
    setInlineError("");
    setInlineSuccess("");
    const modelName = inlineForm.modelName.trim();

    setInlineBusy(true);
    try {
      let typeId = inlineForm.typeId;
      let typeName = inlineTypeName.trim();

      if (inlineForm.typeMode === "new") {
        if (!inlineForm.typeName.trim()) throw new Error("Doplňte název přístroje.");
        const typeResp = await api.post("/catalog/types", { name: inlineForm.typeName.trim() });
        typeId = String(typeResp.data?.id || "");
        typeName = typeResp.data?.name || inlineForm.typeName.trim();
      }
      if (!typeId) throw new Error("Vyberte přístroj.");

      const wantsManufacturer =
        inlineForm.manufacturerMode === "new"
          ? !!inlineForm.manufacturerName.trim()
          : !!inlineForm.manufacturerId;
      const wantsModel = !!modelName;

      if (!wantsManufacturer && !wantsModel) {
        const notice = `Předvyplněno: ${typeName}`;
        await onCatalogChanged?.({ typeId: String(typeId) });
        setIsCustom(false);
        setNewComp((current) => ({
          ...current,
          nazevId: String(typeId),
          nazev: typeName,
          popisId: "",
          popis: "",
          typId: "",
          typ: "",
        }));
        setSelectedNotice(notice);
        setInlineSuccess("Přístroj byl přidán do katalogu a předvyplněn.");
        setInlineForm({ ...INLINE_EMPTY_STATE, typeId: String(typeId) });
        setInlineOpen(false);
        return;
      }

      let manufacturerId = inlineForm.manufacturerId;
      let manufacturerName = inlineForm.manufacturerName.trim();

      if (inlineForm.manufacturerMode === "new") {
        if (!inlineForm.manufacturerName.trim()) throw new Error("Doplňte název výrobce.");
        const manufacturerResp = await api.post("/catalog/manufacturers", {
          name: inlineForm.manufacturerName.trim(),
          type_id: Number(typeId),
        });
        manufacturerId = String(manufacturerResp.data?.id || "");
        manufacturerName = manufacturerResp.data?.name || inlineForm.manufacturerName.trim();
      } else {
        manufacturerName =
          inlineManufacturers.find((m) => String(m.id) === String(manufacturerId))?.name || "";
      }
      if (!manufacturerId) throw new Error("Vyberte výrobce.");

      if (!wantsModel) {
        const notice = `Předvyplněno: ${[typeName, manufacturerName].filter(Boolean).join(" ")}`;
        await onCatalogChanged?.({ typeId: String(typeId), manufacturerId: String(manufacturerId) });
        setIsCustom(false);
        setNewComp((current) => ({
          ...current,
          nazevId: String(typeId),
          nazev: typeName,
          popisId: String(manufacturerId),
          popis: manufacturerName,
          typId: "",
          typ: "",
        }));
        setSelectedNotice(notice);
        setInlineSuccess("Výrobce byl přidán do katalogu a předvyplněn.");
        setInlineForm({ ...INLINE_EMPTY_STATE, typeId: String(typeId) });
        setInlineOpen(false);
        return;
      }

      const modelResp = await api.post("/catalog/models", {
        name: modelName,
        manufacturer_id: Number(manufacturerId),
      });

      const manufacturersResp = await api.get("/catalog/manufacturers", {
        params: { type_id: Number(typeId) },
      });
      const refreshedManufacturers = Array.isArray(manufacturersResp.data) ? manufacturersResp.data : [];
      const modelsResp = await api.get("/catalog/models", {
        params: { manufacturer_id: Number(manufacturerId) },
      });
      const refreshedModels = Array.isArray(modelsResp.data) ? modelsResp.data : [];

      setSearchManufacturerCache((prev) => ({
        ...prev,
        [String(typeId)]: refreshedManufacturers.map((m: any) => ({
          id: m.id,
          name: m.name || "",
          typeId: Number(typeId),
        })),
      }));
      setModelCache((prev) => ({ ...prev, [String(manufacturerId)]: refreshedModels }));
      setInlineManufacturers(refreshedManufacturers);
      await onCatalogChanged?.({ typeId: String(typeId), manufacturerId: String(manufacturerId) });
      const selectedLabel = [typeName, manufacturerName, modelResp.data?.name || modelName]
        .filter(Boolean)
        .join(" ");

      setIsCustom(false);
      setNewComp((current) => ({
        ...current,
        nazevId: String(typeId),
        nazev: typeName,
        popisId: String(manufacturerId),
        popis: manufacturerName,
        typId: String(modelResp.data?.id || ""),
        typ: modelResp.data?.name || modelName,
      }));
      setSelectedNotice(`Předvyplněno: ${selectedLabel}`);

      setInlineSuccess("Položka byla přidána do katalogu a vybrána.");
      setInlineForm({ ...INLINE_EMPTY_STATE, typeId: String(typeId) });
      setInlineOpen(false);
    } catch (error: any) {
      setInlineError(error?.response?.data?.detail || error?.message || "Uložení do katalogu selhalo.");
    } finally {
      setInlineBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">
          {(newComp as any).id ? "Upravit komponentu" : "Nová komponenta"}
        </h3>

        {rowOptions?.length ? (
          <div className="mb-4">
            <label className="mb-1 block text-xs font-medium">Řada</label>
            <select
              ref={rowSelectRef}
              className="w-full rounded border p-1.5 text-sm"
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
          <label className="mb-1 block text-xs font-medium">Nadřazený prvek</label>
          <select
            ref={parentSelectRef}
            className="w-full rounded border p-1.5 text-sm"
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
          <label className="mb-1 block text-xs font-medium">Vyhledat v katalogu</label>
          <input
            ref={searchInputRef}
            className="w-full rounded border p-1.5 text-sm"
            placeholder="Napište např. Eaton nebo PL7"
            value={searchQuery}
            onChange={(e) => {
              setSelectedNotice("");
              setSearchQuery(e.target.value);
            }}
          />
          {catalogError && (
            <div className="mt-1 rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700">
              {catalogError}
            </div>
          )}
          {searchBusy && <div className="mt-1 text-xs text-gray-500">Načítám možnosti…</div>}
          {searchError && (
            <div className="mt-1 rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700">
              {searchError}
            </div>
          )}
          {selectedNotice && (
            <div className="mt-1 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
              {selectedNotice}
            </div>
          )}
          {!searchBusy && !searchError && searchQuery.trim().length >= 2 && searchOptions.length === 0 && (
            <div className="mt-1 text-xs text-gray-500">Nic nenalezeno. Položku můžete přidat do katalogu níže.</div>
          )}
          {searchOptions.length > 0 && (
            <div className="mt-1 max-h-48 overflow-auto rounded border bg-white text-sm">
              {searchOptions.map((opt) => (
                <button
                  key={`${opt.kind}-${opt.id}`}
                  type="button"
                  className="w-full px-2 py-1 text-left hover:bg-slate-100"
                  onClick={() => handleSearchSelect(opt)}
                >
                  <span className="mr-2 text-[11px] uppercase text-slate-500">
                    {opt.kind === "type" || opt.kind === "typeManufacturer" ? "Přístroj" : "Model"}
                  </span>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mb-4 rounded border border-slate-200 bg-slate-50/70">
          <button
            type="button"
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-slate-700"
            onClick={() => {
              setInlineOpen((prev) => !prev);
              setInlineError("");
              setInlineSuccess("");
            }}
          >
            <span>Nenalezli jste položku? Přidat nový komponent</span>
            <span className="text-slate-500">{inlineOpen ? "−" : "+"}</span>
          </button>

          {inlineOpen && (
            <div className="border-t border-slate-200 px-3 py-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium">Přístroj</label>
                  <div className="mb-2 flex gap-2 text-xs">
                    <button
                      type="button"
                      className={`rounded border px-2 py-1 ${inlineForm.typeMode === "existing" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-700"}`}
                      onClick={() =>
                        setInlineForm((prev) => ({
                          ...prev,
                          typeMode: "existing",
                          typeId: prev.typeId || selectedTypeId || "",
                          typeName: "",
                          manufacturerId: "",
                          manufacturerName: "",
                        }))
                      }
                    >
                      Vybrat existující
                    </button>
                    <button
                      type="button"
                      className={`rounded border px-2 py-1 ${inlineForm.typeMode === "new" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-700"}`}
                      onClick={() =>
                        setInlineForm((prev) => ({
                          ...prev,
                          typeMode: "new",
                          typeName: selectedTypeName || "",
                          manufacturerId: "",
                          manufacturerName: "",
                        }))
                      }
                    >
                      Založit nový
                    </button>
                  </div>

                  {inlineForm.typeMode === "existing" ? (
                    <select
                      className="w-full rounded border p-1.5 text-sm"
                      value={inlineForm.typeId}
                      onChange={(e) =>
                        setInlineForm((prev) => ({
                          ...prev,
                          typeId: e.target.value,
                          manufacturerId: "",
                          manufacturerName: "",
                        }))
                      }
                    >
                      <option value="">-- vyberte přístroj --</option>
                      {types.map((t) => (
                        <option key={t.id} value={String(t.id)}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="w-full rounded border p-1.5 text-sm"
                      value={inlineForm.typeName}
                      placeholder="Např. Jistič"
                      onChange={(e) => setInlineForm((prev) => ({ ...prev, typeName: e.target.value }))}
                    />
                  )}
                </div>

                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium">Výrobce</label>
                  <div className="mb-2 flex gap-2 text-xs">
                    <button
                      type="button"
                      className={`rounded border px-2 py-1 ${inlineForm.manufacturerMode === "existing" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-700"}`}
                      onClick={() =>
                        setInlineForm((prev) => ({
                          ...prev,
                          manufacturerMode: "existing",
                          manufacturerName: "",
                        }))
                      }
                    >
                      Vybrat existující
                    </button>
                    <button
                      type="button"
                      className={`rounded border px-2 py-1 ${inlineForm.manufacturerMode === "new" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-300 bg-white text-slate-700"}`}
                      onClick={() =>
                        setInlineForm((prev) => ({
                          ...prev,
                          manufacturerMode: "new",
                          manufacturerId: "",
                        }))
                      }
                    >
                      Založit nový
                    </button>
                  </div>

                  {inlineForm.manufacturerMode === "existing" ? (
                    <select
                      className="w-full rounded border p-1.5 text-sm"
                      value={inlineForm.manufacturerId}
                      disabled={!inlineTypeId}
                      onChange={(e) =>
                        setInlineForm((prev) => ({
                          ...prev,
                          manufacturerId: e.target.value,
                        }))
                      }
                    >
                      <option value="">
                        {inlineTypeId ? "-- vyberte výrobce --" : "-- nejprve vyberte přístroj --"}
                      </option>
                      {inlineManufacturers.map((m) => (
                        <option key={m.id} value={String(m.id)}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="w-full rounded border p-1.5 text-sm"
                      value={inlineForm.manufacturerName}
                      placeholder="Např. Eaton"
                      onChange={(e) =>
                        setInlineForm((prev) => ({ ...prev, manufacturerName: e.target.value }))
                      }
                    />
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium">Typ / model</label>
                <input
                  className="w-full rounded border p-1.5 text-sm"
                  value={inlineForm.modelName}
                  placeholder="Např. PL7-B16/1"
                  onChange={(e) => setInlineForm((prev) => ({ ...prev, modelName: e.target.value }))}
                />
                <div className="mt-1 text-xs text-slate-500">
                  Můžete vybrat existující přístroj a výrobce a doplnit jen chybějící typ/model.
                </div>
              </div>

              {inlineError && (
                <div className="mt-3 rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                  {inlineError}
                </div>
              )}
              {inlineSuccess && (
                <div className="mt-3 rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                  {inlineSuccess}
                </div>
              )}

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-60"
                  disabled={inlineBusy}
                  onClick={saveInlineCatalogItem}
                >
                  {inlineBusy ? "Ukládám…" : "Přidat do katalogu a vybrat"}
                </button>
              </div>
            </div>
          )}
        </div>

        {!inlineOpen && <div className="mb-4">
          <label className="mb-1 block text-xs font-medium">Přístroj</label>
          <select
            className="w-full rounded border p-1.5 text-sm"
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
            <option value="">-- vyberte --</option>
            {types.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
            <option value="vlastni">Vlastní</option>
          </select>
        </div>}

        {!inlineOpen && <div className="mb-4 grid grid-cols-2 gap-4">
          {isCustom ? (
            <>
              {([
                ["nazev", "Název"],
                ["popis", "Výrobce / popis"],
                ["typ", "Model / typ"],
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
                    className="w-full rounded border p-1.5 text-sm"
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
                  className="w-full rounded border p-1.5 text-sm"
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
                  <option value="">-- vyberte --</option>
                  {manufacturersWithOther.map((m) => (
                    <option key={String(m.id)} value={String(m.id)}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium">Typ / model</label>
                <select
                  className="w-full rounded border p-1.5 text-sm"
                  value={newComp.typId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const txt = e.target.selectedOptions[0]?.text || "";
                    setNewComp((c) => ({ ...c, typId: id, typ: txt }));
                  }}
                >
                  <option value="">-- vyberte --</option>
                  {modelsWithSelected.map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium">Počet pólů</label>
                <select
                  ref={polesSelectRef}
                  className="w-full rounded border p-1.5 text-sm"
                  value={newComp.poles}
                  onChange={(e) => setNewComp((c) => ({ ...c, poles: e.target.value }))}
                >
                  <option value="">-- vyberte --</option>
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
                  ref={dimenzeSelectRef}
                  className="w-full rounded border p-1.5 text-sm"
                  value={newComp.dimenze}
                  onChange={(e) => setNewComp((c) => ({ ...c, dimenze: e.target.value }))}
                >
                  <option value="">-- vyberte --</option>
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
                  ref={risoInputRef}
                  className="w-full rounded border p-1.5 text-sm"
                  value={newComp.riso || ""}
                  onChange={(e) => setNewComp((c) => ({ ...c, riso: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium">Zs [Ω]</label>
                <input
                  type="text"
                  ref={ochranaInputRef}
                  className="w-full rounded border p-1.5 text-sm"
                  value={newComp.ochrana || ""}
                  onChange={(e) => setNewComp((c) => ({ ...c, ochrana: e.target.value }))}
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium">Název obvodu</label>
                <input
                  type="text"
                  ref={poznamkaInputRef}
                  className="w-full rounded border p-1.5 text-sm"
                  value={newComp.poznamka || ""}
                  onChange={(e) => setNewComp((c) => ({ ...c, poznamka: e.target.value }))}
                />
              </div>
            </>
          )}
        </div>}

        {!inlineOpen && showBreakerFields && (
          <div className="mb-4 rounded border border-blue-200 bg-blue-50/60 p-3">
            <div className="mb-3 text-xs text-gray-600">
              U proudových chráničů a jističochráničů vyplňte vybavovací čas a proud.
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium">t [ms]</label>
                <input
                  type="text"
                  ref={vybavovaciCasInputRef}
                  className="w-full rounded border p-1.5 text-sm"
                  value={newComp.vybavovaciCasMs || ""}
                  onChange={(e) => setNewComp((c) => ({ ...c, vybavovaciCasMs: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-xs font-medium">IΔ [mA]</label>
                <input
                  type="text"
                  ref={vybavovaciProudInputRef}
                  className="w-full rounded border p-1.5 text-sm"
                  value={newComp.vybavovaciProudmA || ""}
                  onChange={(e) => setNewComp((c) => ({ ...c, vybavovaciProudmA: e.target.value }))}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button className="rounded bg-gray-300 px-4 py-2" onClick={onCancel}>
            Zrušit
          </button>
          <button className="rounded bg-blue-600 px-4 py-2 text-white" onClick={onAdd}>
            {(newComp as any).id ? "Uložit" : "Přidat"}
          </button>
        </div>
      </div>
    </div>
  );
}
