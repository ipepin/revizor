import React, { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import api from "../../api/axios";

type ComponentTypeRow = { id: number; name: string };
type ManufacturerRow = { id: number; name: string; type_id?: number };
type ModelRow = { id: number; name: string };
type Selection =
  | { kind: "type"; item: ComponentTypeRow }
  | { kind: "manufacturer"; item: ManufacturerRow }
  | { kind: "model"; item: ModelRow }
  | null;

type SearchResult = {
  typeId: number;
  typeName: string;
  manufacturerId?: number;
  manufacturerName?: string;
  modelId?: number;
  modelName?: string;
  label: string;
};

type ParametricItem = {
  id: number;
  granularity: string;
  manufacturer: string;
  device: string;
  series: string;
  manufacturer_type?: string | null;
  catalog_number?: string | null;
  rated_current_a?: string | null;
  poles_total?: string | null;
  poles_protected?: string | null;
  pole_configuration?: string | null;
  characteristic?: string | null;
  breaking_capacity_ka?: string | null;
  residual_current_ma?: string | null;
  rcd_type?: string | null;
  voltage_type?: string | null;
  heat_loss_w?: string | null;
  heat_loss_basis?: string | null;
  catalog_status: string;
  verification?: string | null;
  notes?: string | null;
  source_url?: string | null;
};

const emptyParametricDraft: Partial<ParametricItem> = {
  granularity: "variant",
  manufacturer: "",
  device: "",
  series: "",
  manufacturer_type: "",
  catalog_number: "",
  rated_current_a: "",
  poles_total: "",
  poles_protected: "",
  pole_configuration: "",
  characteristic: "",
  breaking_capacity_ka: "",
  residual_current_ma: "",
  rcd_type: "",
  voltage_type: "",
  heat_loss_w: "",
  heat_loss_basis: "",
  catalog_status: "current",
  verification: "",
  notes: "",
  source_url: "",
};

function errorMessage(error: any) {
  return error?.response?.data?.detail || error?.message || "Operace se nezdařila.";
}

export default function CatalogComponentsTab() {
  const [types, setTypes] = useState<ComponentTypeRow[]>([]);
  const [manufacturers, setManufacturers] = useState<ManufacturerRow[]>([]);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<number | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [detailName, setDetailName] = useState("");
  const [newTypeName, setNewTypeName] = useState("");
  const [newManufacturerName, setNewManufacturerName] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedType = useMemo(
    () => types.find((item) => item.id === selectedTypeId) || null,
    [types, selectedTypeId]
  );
  const selectedManufacturer = useMemo(
    () => manufacturers.find((item) => item.id === selectedManufacturerId) || null,
    [manufacturers, selectedManufacturerId]
  );
  const visibleModels = useMemo(() => {
    const query = modelFilter.trim().toLowerCase();
    if (!query) return models;
    return models.filter((model) => model.name.toLowerCase().includes(query));
  }, [models, modelFilter]);

  useEffect(() => {
    loadTypes();
  }, []);

  useEffect(() => {
    if (!selectedTypeId) {
      setManufacturers([]);
      setSelectedManufacturerId(null);
      setModels([]);
      return;
    }
    loadManufacturers(selectedTypeId);
  }, [selectedTypeId]);

  useEffect(() => {
    if (!selectedManufacturerId) {
      setModels([]);
      return;
    }
    loadModels(selectedManufacturerId);
  }, [selectedManufacturerId]);

  useEffect(() => {
    if (!selection) {
      setDetailName("");
      return;
    }
    setDetailName(selection.item.name || "");
  }, [selection]);

  useEffect(() => {
    const query = globalSearch.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      try {
        const response = await api.get("/catalog/search", { params: { q: query, limit: 30 } });
        if (!cancelled) setSearchResults(Array.isArray(response.data) ? response.data : []);
      } catch {
        if (!cancelled) setSearchResults([]);
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [globalSearch]);

  async function loadTypes() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/catalog/types");
      setTypes(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setTypes([]);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadManufacturers(typeId: number) {
    setError("");
    try {
      const response = await api.get("/catalog/manufacturers", { params: { type_id: typeId } });
      setManufacturers(Array.isArray(response.data) ? response.data : []);
      setSelectedManufacturerId(null);
      setModels([]);
    } catch (err) {
      setManufacturers([]);
      setError(errorMessage(err));
    }
  }

  async function loadModels(manufacturerId: number) {
    setError("");
    try {
      const response = await api.get("/catalog/models", {
        params: { manufacturer_id: manufacturerId },
      });
      setModels(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setModels([]);
      setError(errorMessage(err));
    }
  }

  function selectType(item: ComponentTypeRow) {
    setSelectedTypeId(item.id);
    setSelectedManufacturerId(null);
    setSelection({ kind: "type", item });
  }

  function selectManufacturer(item: ManufacturerRow) {
    setSelectedManufacturerId(item.id);
    setSelection({ kind: "manufacturer", item });
  }

  function selectModel(item: ModelRow) {
    setSelection({ kind: "model", item });
  }

  async function addType() {
    const name = newTypeName.trim();
    if (!name) return;
    setError("");
    try {
      const response = await api.post("/catalog/types", { name });
      setTypes((prev) => [...prev, response.data].sort((a, b) => a.name.localeCompare(b.name, "cs")));
      setNewTypeName("");
      setSelectedTypeId(response.data.id);
      setSelection({ kind: "type", item: response.data });
      setMessage("Druh komponentu byl přidán.");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function addManufacturer() {
    const name = newManufacturerName.trim();
    if (!selectedTypeId || !name) return;
    setError("");
    try {
      const response = await api.post("/catalog/manufacturers", {
        name,
        type_id: selectedTypeId,
      });
      setManufacturers((prev) =>
        [...prev, response.data].sort((a, b) => a.name.localeCompare(b.name, "cs"))
      );
      setNewManufacturerName("");
      setSelectedManufacturerId(response.data.id);
      setSelection({ kind: "manufacturer", item: response.data });
      setMessage("Výrobce byl přidán.");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function addModel() {
    const name = newModelName.trim();
    if (!selectedManufacturerId || !name) return;
    setError("");
    try {
      const response = await api.post("/catalog/models", {
        name,
        manufacturer_id: selectedManufacturerId,
      });
      setModels((prev) => [...prev, response.data].sort((a, b) => a.name.localeCompare(b.name, "cs")));
      setNewModelName("");
      setSelection({ kind: "model", item: response.data });
      setMessage("Model byl přidán.");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function saveSelection() {
    if (!selection) return;
    const name = detailName.trim();
    if (!name) return;
    setError("");
    try {
      if (selection.kind === "type") {
        const response = await api.patch(`/catalog/types/${selection.item.id}`, { name });
        setTypes((prev) => prev.map((item) => (item.id === response.data.id ? response.data : item)));
        setSelection({ kind: "type", item: response.data });
      } else if (selection.kind === "manufacturer") {
        const response = await api.patch(`/catalog/manufacturers/${selection.item.id}`, {
          name,
          type_id: selectedTypeId,
        });
        setManufacturers((prev) =>
          prev.map((item) => (item.id === response.data.id ? response.data : item))
        );
        setSelection({ kind: "manufacturer", item: response.data });
      } else {
        const response = await api.patch(`/catalog/models/${selection.item.id}`, {
          name,
          manufacturer_id: selectedManufacturerId,
        });
        setModels((prev) => prev.map((item) => (item.id === response.data.id ? response.data : item)));
        setSelection({ kind: "model", item: response.data });
      }
      setMessage("Změny byly uloženy.");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function deleteSelection() {
    if (!selection) return;
    const label =
      selection.kind === "type"
        ? "druh komponentu"
        : selection.kind === "manufacturer"
          ? "výrobce"
          : "model";
    if (!window.confirm(`Opravdu smazat ${label} "${selection.item.name}"?`)) return;

    setError("");
    try {
      if (selection.kind === "type") {
        await api.delete(`/catalog/types/${selection.item.id}`);
        setTypes((prev) => prev.filter((item) => item.id !== selection.item.id));
        setSelectedTypeId(null);
        setManufacturers([]);
        setModels([]);
      } else if (selection.kind === "manufacturer") {
        await api.delete(`/catalog/manufacturers/${selection.item.id}`);
        setManufacturers((prev) => prev.filter((item) => item.id !== selection.item.id));
        setSelectedManufacturerId(null);
        setModels([]);
      } else {
        await api.delete(`/catalog/models/${selection.item.id}`);
        setModels((prev) => prev.filter((item) => item.id !== selection.item.id));
      }
      setSelection(null);
      setMessage("Položka byla smazána.");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function openSearchResult(result: SearchResult) {
    setGlobalSearch("");
    setSearchResults([]);
    setSelectedTypeId(result.typeId);
    setSelection({ kind: "type", item: { id: result.typeId, name: result.typeName } });

    try {
      const manufacturersResponse = await api.get("/catalog/manufacturers", {
        params: { type_id: result.typeId },
      });
      const nextManufacturers = Array.isArray(manufacturersResponse.data)
        ? manufacturersResponse.data
        : [];
      setManufacturers(nextManufacturers);

      if (result.manufacturerId) {
        setSelectedManufacturerId(result.manufacturerId);
        const manufacturer =
          nextManufacturers.find((item: ManufacturerRow) => item.id === result.manufacturerId) || {
            id: result.manufacturerId,
            name: result.manufacturerName || "",
            type_id: result.typeId,
          };
        setSelection({ kind: "manufacturer", item: manufacturer });

        const modelsResponse = await api.get("/catalog/models", {
          params: { manufacturer_id: result.manufacturerId },
        });
        const nextModels = Array.isArray(modelsResponse.data) ? modelsResponse.data : [];
        setModels(nextModels);

        if (result.modelId) {
          const model =
            nextModels.find((item: ModelRow) => item.id === result.modelId) || {
              id: result.modelId,
              name: result.modelName || "",
            };
          setSelection({ kind: "model", item: model });
        }
      }
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="space-y-4 text-[15px] text-slate-900">
      <div>
        <h2 className="text-xl font-semibold text-blue-900">Správa komponent rozvaděčů</h2>
        <p className="text-sm text-slate-600">
          Hlavní katalog je nově parametrický. Starý katalog druh/výrobce/model zůstává pouze jako fallback pro starší záznamy.
        </p>
      </div>
      <ParametricItemsPanel />
    </div>
  );

  return (
    <div className="space-y-4 text-[15px] text-slate-900">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-blue-900">Editor komponent rozvaděčů</h2>
          <p className="text-sm text-slate-600">
            Správa probíhá ve struktuře druh komponentu, výrobce a model.
          </p>
        </div>

        <div className="relative w-full lg:w-[420px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            className="w-full rounded border border-slate-300 bg-white py-2 pl-9 pr-3 text-[15px] outline-none focus:border-blue-500"
            placeholder="Hledat výrobce nebo model, např. Eaton nebo PL7"
            value={globalSearch}
            onChange={(event) => setGlobalSearch(event.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="absolute right-0 z-20 mt-1 max-h-80 w-full overflow-auto rounded border bg-white shadow-lg">
              {searchResults.map((result) => (
                <button
                  key={`${result.typeId}-${result.manufacturerId || 0}-${result.modelId || 0}`}
                  type="button"
                  className="block w-full border-b px-3 py-2 text-left hover:bg-blue-50"
                  onClick={() => openSearchResult(result)}
                >
                  <div className="font-medium">{result.label}</div>
                  <div className="text-xs text-slate-500">
                    {result.typeName}
                    {result.manufacturerName ? ` / ${result.manufacturerName}` : ""}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {(error || message) && (
        <div
          className={`flex items-center justify-between rounded border px-3 py-2 text-sm ${
            error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          <span>{error || message}</span>
          <button
            type="button"
            className="rounded p-1 hover:bg-white/70"
            onClick={() => {
              setError("");
              setMessage("");
            }}
            title="Zavřít"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1fr_1.25fr_360px]">
        <CatalogColumn
          title="Druhy komponentů"
          count={types.length}
          addPlaceholder="Nový druh"
          addValue={newTypeName}
          onAddValue={setNewTypeName}
          onAdd={addType}
          disabled={loading}
        >
          {types.map((item) => (
            <CatalogRow
              key={item.id}
              active={selectedTypeId === item.id}
              title={item.name}
              onClick={() => selectType(item)}
            />
          ))}
          {!loading && types.length === 0 && <EmptyState text="Žádné druhy komponentů." />}
        </CatalogColumn>

        <CatalogColumn
          title="Výrobci"
          count={manufacturers.length}
          addPlaceholder="Nový výrobce"
          addValue={newManufacturerName}
          onAddValue={setNewManufacturerName}
          onAdd={addManufacturer}
          disabled={!selectedTypeId}
        >
          {manufacturers.map((item) => (
            <CatalogRow
              key={item.id}
              active={selectedManufacturerId === item.id}
              title={item.name}
              subtitle={selectedType?.name || ""}
              onClick={() => selectManufacturer(item)}
            />
          ))}
          {!selectedTypeId && <EmptyState text="Nejprve vyber druh komponentu." />}
          {selectedTypeId && manufacturers.length === 0 && <EmptyState text="Žádní výrobci." />}
        </CatalogColumn>

        <CatalogColumn
          title="Modely"
          count={visibleModels.length}
          addPlaceholder="Nový model"
          addValue={newModelName}
          onAddValue={setNewModelName}
          onAdd={addModel}
          disabled={!selectedManufacturerId}
          extra={
            <input
              className="mb-2 w-full rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
              placeholder="Filtrovat modely"
              value={modelFilter}
              onChange={(event) => setModelFilter(event.target.value)}
            />
          }
        >
          {visibleModels.map((item) => (
            <CatalogRow
              key={item.id}
              active={selection?.kind === "model" && selection.item.id === item.id}
              title={item.name}
              subtitle={selectedManufacturer?.name || ""}
              onClick={() => selectModel(item)}
            />
          ))}
          {!selectedManufacturerId && <EmptyState text="Nejprve vyber výrobce." />}
          {selectedManufacturerId && visibleModels.length === 0 && <EmptyState text="Žádné modely." />}
        </CatalogColumn>

        <DetailPanel
          selection={selection}
          name={detailName}
          onName={setDetailName}
          onSave={saveSelection}
          onDelete={deleteSelection}
          typeName={selectedType?.name || ""}
          manufacturerName={selectedManufacturer?.name || ""}
        />
      </div>

      <ParametricItemsPanel />
    </div>
  );
}

function CatalogColumn({
  title,
  count,
  addPlaceholder,
  addValue,
  onAddValue,
  onAdd,
  disabled,
  extra,
  children,
}: {
  title: string;
  count: number;
  addPlaceholder: string;
  addValue: string;
  onAddValue: (value: string) => void;
  onAdd: () => void;
  disabled?: boolean;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-[420px] rounded border border-slate-200 bg-slate-50">
      <div className="flex items-center justify-between border-b bg-white px-3 py-2">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{count}</span>
      </div>
      <div className="p-3">
        {extra}
        <div className="mb-3 flex gap-2">
          <input
            className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
            placeholder={addPlaceholder}
            value={addValue}
            onChange={(event) => onAddValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onAdd();
            }}
            disabled={disabled}
          />
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-300"
            onClick={onAdd}
            disabled={disabled || !addValue.trim()}
            title="Přidat"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[560px] overflow-auto rounded border bg-white">{children}</div>
      </div>
    </section>
  );
}

function CatalogRow({
  title,
  subtitle,
  active,
  onClick,
}: {
  title: string;
  subtitle?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`block w-full border-b px-3 py-2 text-left last:border-b-0 hover:bg-blue-50 ${
        active ? "bg-blue-100" : "bg-white"
      }`}
      onClick={onClick}
    >
      <div className="font-medium text-slate-900">{title}</div>
      {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="px-3 py-4 text-sm text-slate-500">{text}</div>;
}

function ParametricItemsPanel() {
  const [items, setItems] = useState<ParametricItem[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ParametricItem | null>(null);
  const [draft, setDraft] = useState<Partial<ParametricItem>>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadItems();
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [query]);

  async function loadItems() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/catalog/component-items", {
        params: { q: query.trim() || undefined, limit: 80 },
      });
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setItems([]);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function importDefaultCsv() {
    if (!window.confirm("Načíst výchozí CSV katalog modulových přístrojů? Existující položky se jen aktualizují.")) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/catalog/component-items/import-default");
      setMessage(
        `Import hotov: přidáno ${response.data.inserted}, aktualizováno ${response.data.updated}, přeskočeno ${response.data.skipped}.`
      );
      await loadItems();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function selectItem(item: ParametricItem) {
    setSelected(item);
    setDraft({ ...item });
  }

  function createNewItem() {
    setSelected(null);
    setDraft({ ...emptyParametricDraft });
    setMessage("");
    setError("");
  }

  async function saveSelected() {
    setError("");
    try {
      const payload = {
        ...draft,
        manufacturer: String(draft.manufacturer || "").trim(),
        device: String(draft.device || "").trim(),
        series: String(draft.series || "").trim(),
        catalog_status: String(draft.catalog_status || "current").trim(),
      };

      if (!payload.manufacturer || !payload.device || !payload.series) {
        setError("Vyplň výrobce, druh a řadu.");
        return;
      }

      const response = selected
        ? await api.patch(`/catalog/component-items/${selected.id}`, payload)
        : await api.post("/catalog/component-items", payload);
      const saved = response.data as ParametricItem;
      setItems((prev) =>
        selected ? prev.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...prev]
      );
      setSelected(saved);
      setDraft({ ...saved });
      setMessage(selected ? "Parametrická položka byla uložena." : "Parametrická položka byla přidána.");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function deleteSelected() {
    if (!selected) return;
    if (!window.confirm(`Smazat položku "${selected.manufacturer_type || selected.series}"?`)) return;
    setError("");
    try {
      await api.delete(`/catalog/component-items/${selected.id}`);
      setItems((prev) => prev.filter((item) => item.id !== selected.id));
      setSelected(null);
      setDraft({});
      setMessage("Parametrická položka byla smazána.");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const field = (key: keyof ParametricItem, label: string) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
        value={(draft[key] as string | number | null | undefined) ?? ""}
        onChange={(event) => setDraft((prev) => ({ ...prev, [key]: event.target.value }))}
      />
    </label>
  );

  return (
    <section className="rounded border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-blue-900">Parametrický katalog modulových přístrojů</h3>
          <p className="text-sm text-slate-600">
            Nový katalog pro vyhledávání podle výrobce, řady, typu a elektrických parametrů.
          </p>
        </div>
        <button
          type="button"
          className="rounded bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
          onClick={importDefaultCsv}
          disabled={loading}
        >
          Importovat výchozí CSV
        </button>
        <button
          type="button"
          className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          onClick={createNewItem}
          disabled={loading}
        >
          Nová položka
        </button>
      </div>

      {(error || message) && (
        <div
          className={`mx-4 mt-3 rounded border px-3 py-2 text-sm ${
            error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          {error || message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[1fr_420px]">
        <div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              className="w-full rounded border border-slate-300 py-2 pl-9 pr-3 text-[15px] outline-none focus:border-blue-500"
              placeholder="Hledat např. Eaton PL7 B16, chránič 30 mA, 3P..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="max-h-[620px] overflow-auto rounded border">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-2 py-2">Druh</th>
                  <th className="px-2 py-2">Výrobce</th>
                  <th className="px-2 py-2">Řada / typ</th>
                  <th className="px-2 py-2">Parametry</th>
                  <th className="px-2 py-2">Stav</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={`cursor-pointer border-t hover:bg-blue-50 ${
                      selected?.id === item.id ? "bg-blue-100" : "bg-white"
                    }`}
                    onClick={() => selectItem(item)}
                  >
                    <td className="px-2 py-2 font-medium">{item.device}</td>
                    <td className="px-2 py-2">{item.manufacturer}</td>
                    <td className="px-2 py-2">
                      <div className="font-medium">{item.manufacturer_type || item.series}</div>
                      {item.catalog_number && <div className="text-xs text-slate-500">kat. {item.catalog_number}</div>}
                    </td>
                    <td className="px-2 py-2 text-xs text-slate-700">
                      {[
                        item.rated_current_a ? `${item.rated_current_a} A` : "",
                        item.pole_configuration,
                        item.characteristic ? `char. ${item.characteristic}` : "",
                        item.breaking_capacity_ka ? `${item.breaking_capacity_ka} kA` : "",
                        item.residual_current_ma ? `${item.residual_current_ma} mA` : "",
                        item.rcd_type ? `typ ${item.rcd_type}` : "",
                      ]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </td>
                    <td className="px-2 py-2 text-xs">{item.catalog_status}</td>
                  </tr>
                ))}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                      Žádné položky.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded border bg-slate-50 p-3">
          <h4 className="mb-3 font-semibold text-slate-800">Detail parametrické položky</h4>
          {!selected && Object.keys(draft).length === 0 ? (
            <p className="text-sm text-slate-500">Vyber položku v tabulce.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {field("device", "Druh")}
                {field("manufacturer", "Výrobce")}
                {field("series", "Řada")}
                {field("manufacturer_type", "Typ výrobce")}
                {field("catalog_number", "Katalogové číslo")}
                {field("rated_current_a", "In [A]")}
                {field("pole_configuration", "Póly")}
                {field("characteristic", "Charakteristika")}
                {field("breaking_capacity_ka", "Icn [kA]")}
                {field("residual_current_ma", "IΔn [mA]")}
                {field("rcd_type", "Typ chrániče")}
                {field("catalog_status", "Stav")}
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Poznámka</span>
                <textarea
                  className="min-h-24 w-full rounded border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                  value={draft.notes || ""}
                  onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  onClick={saveSelected}
                >
                  <Check className="h-4 w-4" />
                  Uložit
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                  onClick={deleteSelected}
                  disabled={!selected}
                >
                  <Trash2 className="h-4 w-4" />
                  Smazat
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function DetailPanel({
  selection,
  name,
  onName,
  onSave,
  onDelete,
  typeName,
  manufacturerName,
}: {
  selection: Selection;
  name: string;
  onName: (value: string) => void;
  onSave: () => void;
  onDelete: () => void;
  typeName: string;
  manufacturerName: string;
}) {
  if (!selection) {
    return (
      <aside className="rounded border border-slate-200 bg-white p-4">
        <h3 className="font-semibold text-slate-800">Detail položky</h3>
        <p className="mt-2 text-sm text-slate-500">Vyber položku v katalogu nebo použij vyhledávání.</p>
      </aside>
    );
  }

  const label =
    selection.kind === "type"
      ? "Druh komponentu"
      : selection.kind === "manufacturer"
        ? "Výrobce"
        : "Model";

  return (
    <aside className="rounded border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-800">Detail položky</h3>
          <div className="text-sm text-slate-500">{label}</div>
        </div>
        <Pencil className="h-4 w-4 text-slate-400" />
      </div>

      <label className="mb-1 block text-sm font-medium text-slate-700">Název</label>
      <input
        className="mb-4 w-full rounded border border-slate-300 px-3 py-2 text-[15px] outline-none focus:border-blue-500"
        value={name}
        onChange={(event) => onName(event.target.value)}
      />

      <div className="mb-4 space-y-1 rounded bg-slate-50 p-3 text-sm text-slate-600">
        {selection.kind !== "type" && <div>Druh: {typeName || "-"}</div>}
        {selection.kind === "model" && <div>Výrobce: {manufacturerName || "-"}</div>}
        <div>ID: {selection.item.id}</div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
          onClick={onSave}
          disabled={!name.trim()}
        >
          <Check className="h-4 w-4" />
          Uložit
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          Smazat
        </button>
      </div>
    </aside>
  );
}
