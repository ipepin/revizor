// src/components/RozvadecePanel.tsx

import React, { useCallback, useEffect, useMemo, useState } from "react";

import api from "../api/axios";

import { useRevisionForm, Board, Komponenta } from "../context/RevisionFormContext";

import AddCompDialog from "./AddCompDialog";
import RichTextEditor from "./RichTextEditor";



/** Frontendové rozšíření bez zásahu do globálních typů */

type GraphComp = Komponenta & {

  id: number;

  parentId?: number | null;

  order?: number;

  rowId?: number | null;

};

type ComponentEditFocusField =
  | "search"
  | "row"
  | "parent"
  | "poles"
  | "dimenze"
  | "riso"
  | "ochrana"
  | "poznamka";

type InlineComponentField =
  | "poles"
  | "dimenze"
  | "riso"
  | "ochrana"
  | "poznamka"
  | "vybavovaciCasMs"
  | "vybavovaciProudmA"
  | "dotykoveNapetiV";

const OTHER_MANUFACTURER_ID = "__other__";
const OTHER_MANUFACTURER_NAME = "Ostatní";



const BASE_INDENT = 24;       // základní odsazení 1. úrovně (px)

const INDENT_PER_LEVEL = 40; // px – větší odsazení mezi úrovněmi



const polesOptions = ["1", "1+N", "3", "3+N"];

const favoriteDimenze = ["CYKY 3x1,5", "CYKY 3x2,5", "CYKY 5x2,5", "CYKY 5x1,5", "CYKY 5x4", "CYKY 5x6"];



// Pomocný styl pro dvouřádkové omezení i bez Tailwind pluginu

const clamp2: React.CSSProperties = {

  display: "-webkit-box",

  WebkitLineClamp: 2 as any,

  WebkitBoxOrient: "vertical" as any,

  overflow: "hidden",

};



export default function RozvadecePanel() {

  const { form, setForm } = useRevisionForm();

  const boards = form.boards;



  // výběr rozvaděče

  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(boards[0]?.id ?? null);

  const selectedBoard = boards.find((b) => b.id === selectedBoardId) || null;

  const supplyPhase = (selectedBoard as any)?.supplyPhase || "";

  const [activeRowId, setActiveRowId] = useState<number>(1);



  // dialog & edit/add stav pro komponenty

  const [showCompDialog, setShowCompDialog] = useState(false);

  const [editingCompId, setEditingCompId] = useState<number | null>(null);
  const [compDialogFocusField, setCompDialogFocusField] = useState<ComponentEditFocusField>("search");



  // inline edit poznámky v DIAGRAMU

  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);

  const [noteDraft, setNoteDraft] = useState("");

  const [editingIdentityId, setEditingIdentityId] = useState<number | null>(null);

  const [identityDraft, setIdentityDraft] = useState({ nazev: "", popis: "", typ: "" });

  const [editingField, setEditingField] = useState<{ nodeId: number; field: InlineComponentField } | null>(null);

  const [fieldDraft, setFieldDraft] = useState("");



  const defaultComp: GraphComp = {

    id: 0,

    nazevId: "",

    nazev: "",

    popisId: "",

    popis: "",

    typId: "",

    typ: "",

    poles: "",

    dimenze: "",

    riso: "",

    ochrana: "",

    poznamka: "",

    vybavovaciCasMs: "",

    vybavovaciProudmA: "",

    dotykoveNapetiV: "",

    parentId: null,

    order: 0,

    rowId: 1,

  };

  const [newComp, setNewComp] = useState<GraphComp>({ ...defaultComp });

  const [isCustom, setIsCustom] = useState(false);



  // katalogy (pro dialog)

  const [types, setTypes] = useState<{ id: number; name: string }[]>([]);

  const [manufacturers, setManufacturers] = useState<{ id: number; name: string }[]>([]);

  const [models, setModels] = useState<{ id: number; name: string }[]>([]);

  const [componentCatalogError, setComponentCatalogError] = useState("");

  const [dimenzeOptions, setDimenzeOptions] = useState<string[]>(favoriteDimenze);



  // === Board dialogy (přidání / editace) ===

  const [showBoardDialog, setShowBoardDialog] = useState(false);

  const [showBoardEditDialog, setShowBoardEditDialog] = useState(false);

  const [newBoard, setNewBoard] = useState<Omit<Board, "id" | "komponenty">>({

    name: "",

    vyrobce: "",

    typ: "",

    vyrobniCislo: "",

    napeti: "",

    proud: "",

    supplySystem: "",

    supplyPhase: "",

    ip: "",

    odpor: "",

    umisteni: "",

    poznamkyHtml: "",

  });



  useEffect(() => {

    let cancel = false;

    setComponentCatalogError("");

    api
      .get("/catalog/types")
      .then((r) => !cancel && setTypes(Array.isArray(r.data) ? r.data : []))
      .catch(() => {
        if (!cancel) setComponentCatalogError("Katalog přístrojů se nepodařilo načíst.");
      });

    return () => {

      cancel = true;

    };

  }, []);

  useEffect(() => {

    let cancel = false;

    if (newComp.nazevId) {

      api

        .get("/catalog/manufacturers", { params: { type_id: newComp.nazevId } })

        .then((r) => {
          if (!cancel) {
            setManufacturers(Array.isArray(r.data) ? r.data : []);
            setComponentCatalogError("");
          }
        })

        .catch(() => {
          if (!cancel) {
            setManufacturers([]);
            setComponentCatalogError("Výrobce se nepodařilo načíst.");
          }
        });

    } else {

      setManufacturers([]);

    }

    setModels([]);

    return () => {

      cancel = true;

    };

  }, [newComp.nazevId]);

  useEffect(() => {

    let cancel = false;

    if (newComp.popisId && newComp.popisId !== OTHER_MANUFACTURER_ID) {

      api

        .get("/catalog/models", { params: { manufacturer_id: newComp.popisId } })

        .then((r) => {
          if (!cancel) {
            setModels(Array.isArray(r.data) ? r.data : []);
            setComponentCatalogError("");
          }
        })

        .catch(() => {
          if (!cancel) {
            setModels([]);
            setComponentCatalogError("Modely se nepodařilo načíst.");
          }
        });

    } else {

      setModels([]);

    }

    return () => {

      cancel = true;

    };

  }, [newComp.popisId]);

  const refreshComponentCatalog = useCallback(
    async ({ typeId, manufacturerId }: { typeId?: string; manufacturerId?: string }) => {
      try {
        setComponentCatalogError("");
        const [typesResponse, manufacturersResponse, modelsResponse] = await Promise.all([
          api.get("/catalog/types"),
          typeId
            ? api.get("/catalog/manufacturers", { params: { type_id: typeId } })
            : Promise.resolve({ data: [] }),
          manufacturerId
            ? api.get("/catalog/models", { params: { manufacturer_id: manufacturerId } })
            : Promise.resolve({ data: [] }),
        ]);

        setTypes(Array.isArray(typesResponse.data) ? typesResponse.data : []);
        if (typeId) {
          setManufacturers(Array.isArray(manufacturersResponse.data) ? manufacturersResponse.data : []);
        }
        if (manufacturerId) {
          setModels(Array.isArray(modelsResponse.data) ? modelsResponse.data : []);
        }
      } catch {
        setComponentCatalogError("Katalog se po uložení nepodařilo obnovit.");
        throw new Error("Katalog se po uložení nepodařilo obnovit.");
      }
    },
    []
  );

  useEffect(() => {
    if (!showCompDialog) return;
    refreshComponentCatalog({
      typeId: newComp.nazevId ? String(newComp.nazevId) : undefined,
      manufacturerId:
        newComp.popisId && newComp.popisId !== OTHER_MANUFACTURER_ID
          ? String(newComp.popisId)
          : undefined,
    }).catch(() => {
      // Chybu zobrazí dialog přes componentCatalogError.
    });
  }, [showCompDialog]);



  useEffect(() => {

    let alive = true;

    (async () => {

      try {

        const res = await api.get("/cables", { params: { offset: 0, limit: 5000 } });

        const rows = Array.isArray(res.data) ? res.data : [];

        const opts = rows

          .map((c: any) => (c.label && c.label.trim() ? c.label.trim() : [c.family, c.spec].filter(Boolean).join(" ")))

          .filter((s: string) => s && s.length > 0);

        const uniq = Array.from(new Set(opts)).sort((a, b) => a.localeCompare(b, "cs"));

        const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");

        const favoriteSet = new Set(favoriteDimenze.map(norm));

        const byNorm = new Map(uniq.map((o) => [norm(o), o]));

        const favorites = favoriteDimenze.map((f) => byNorm.get(norm(f))).filter(Boolean) as string[];

        const rest = uniq.filter((o) => !favoriteSet.has(norm(o)));

        if (alive) setDimenzeOptions([...favorites, ...rest]);

      } catch {

        if (alive) setDimenzeOptions(favoriteDimenze);

      }

    })();

    return () => {

      alive = false;

    };

  }, []);



  useEffect(() => {

    if (!showCompDialog) return;

    if (supplyPhase !== "1f") return;

    const poles = (newComp.poles || "").toString().trim();

    if (poles === "3" || poles === "3+N") {

      setNewComp((c) => ({ ...c, poles: "" }));

    }

  }, [showCompDialog, supplyPhase, newComp.poles]);



  // full name for labels

  const fullName = (c: Partial<GraphComp>) =>

    [c.nazev || c.name, (c.vyrobce || c.popis) === OTHER_MANUFACTURER_NAME ? "" : c.vyrobce || c.popis, c.typ]

      .filter((x) => (x ?? "").toString().trim())

      .join(" ");



  const boardRows = useMemo(() => {

    if (!selectedBoard) return [] as { id: number; name: string }[];

    const rows = (selectedBoard as any).rows;

    if (Array.isArray(rows) && rows.length) return rows;

    return [{ id: 1, name: "Řada 1" }];

  }, [selectedBoard]);



  useEffect(() => {

    if (!boardRows.length) return;

    if (!boardRows.some((r) => r.id === activeRowId)) {

      setActiveRowId(boardRows[0].id);

    }

  }, [boardRows, activeRowId]);



  const rowOptions = useMemo(

    () => boardRows.map((r, idx) => ({ id: r.id, label: r.name || `Řada ${idx + 1}` })),

    [boardRows]

  );



  const parentCandidates = useMemo(() => {

    if (!selectedBoard) return [];

    const list = selectedBoard.komponenty as GraphComp[];

    return [

      { id: 0, label: "(Root - 1. uroven)" },

      ...list.map((c, i) => {

        const note = (c.poznamka || "").toString().trim();

        return {

          id: c.id,

          label: `${i + 1}. ${fullName(c) || ""}${note ? ` - ${note}` : ""}`,

        };

      }),

    ];

  }, [selectedBoard, fullName]);



  const allowedPolesOptions = useMemo(() => {

    if (supplyPhase === "1f") {

      return polesOptions.filter((p) => !p.startsWith("3"));

    }

    return polesOptions;

  }, [supplyPhase]);



  const invalidThreePhase = useMemo(() => {

    if (!selectedBoard || supplyPhase !== "1f") return [];

    return (selectedBoard.komponenty as GraphComp[]).filter((c) =>

      ["3", "3+N"].includes((c.poles || "").toString().trim())

    );

  }, [selectedBoard, supplyPhase]);



  const parentMismatchIds = useMemo(() => {

    if (!selectedBoard) return new Set<number>();

    const list = selectedBoard.komponenty as GraphComp[];

    const byId = new Map(list.map((c) => [c.id, c]));

    const mismatched = new Set<number>();

    list.forEach((c) => {

      const parentId = c.parentId ?? null;

      if (!parentId) return;

      const parent = byId.get(parentId);

      if (!parent) return;

      const parentPoles = (parent.poles || "").toString().trim();

      const childPoles = (c.poles || "").toString().trim();

      if (["1", "1+N"].includes(parentPoles) && ["3", "3+N"].includes(childPoles)) {

        mismatched.add(c.id);

      }

    });

    return mismatched;

  }, [selectedBoard]);



  const parentPolesWarning = useMemo(() => {

    if (!selectedBoard) return "";

    if (!newComp.parentId) return "";

    const list = selectedBoard.komponenty as GraphComp[];

    const parent = list.find((c) => c.id === newComp.parentId);

    if (!parent) return "";

    const parentPoles = (parent.poles || "").toString().trim();

    const childPoles = (newComp.poles || "").toString().trim();

    if (["1", "1+N"].includes(parentPoles) && ["3", "3+N"].includes(childPoles)) {

      return "Varování: nadřazený prvek je 1f, ale vybraný prvek je 3f.";

    }

    return "";

  }, [selectedBoard, newComp.parentId, newComp.poles]);



  function updateBoardRows(nextRows: { id: number; name: string }[]) {

    if (!selectedBoard) return;

    setForm((f) => ({

      ...f,

      boards: f.boards.map((b) => (b.id === selectedBoard.id ? { ...b, rows: nextRows } : b)),

    }));

  }



  function addRow() {

    const nextId = Date.now();

    const nextRows = [...boardRows, { id: nextId, name: `Řada ${boardRows.length + 1}` }];

    updateBoardRows(nextRows);

    setActiveRowId(nextId);

  }



  function renameRow(rowId: number, name: string) {

    const nextRows = boardRows.map((r) => (r.id === rowId ? { ...r, name } : r));

    updateBoardRows(nextRows);

  }



  function moveRow(rowId: number, dir: -1 | 1) {

    const idx = boardRows.findIndex((r) => r.id === rowId);

    if (idx < 0) return;

    const j = idx + dir;

    if (j < 0 || j >= boardRows.length) return;

    const next = [...boardRows];

    const tmp = next[idx];

    next[idx] = next[j];

    next[j] = tmp;

    updateBoardRows(next);

  }



  function deleteRow(rowId: number) {

    if (!selectedBoard) return;

    const list = (selectedBoard.komponenty as GraphComp[]).filter((c) => (c.rowId ?? 1) === rowId);

    if (list.length) return alert("Nejprve smaz prvky v rade.");

    const nextRows = boardRows.filter((r) => r.id !== rowId);

    updateBoardRows(nextRows.length ? nextRows : [{ id: 1, name: "Řada 1" }]);

  }



  function buildRowTree(items: GraphComp[]) {

    const byId = new Map<number, any>();

    items.forEach((c) => byId.set(c.id, { ...c, children: [] }));

    const roots: any[] = [];

    byId.forEach((n) => {

      const pid = n.parentId ?? null;

      const p = pid != null ? byId.get(pid) : null;

      if (p) p.children.push(n);

      else roots.push(n);

    });

    const sortRec = (arr: any[]) => {

      arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      arr.forEach((ch) => sortRec(ch.children));

    };

    sortRec(roots);

    return roots;

  }



  function buildPaths(nodes: any[]) {

    const paths: any[][] = [];

    const walk = (node: any, acc: any[]) => {

      const next = [...acc, node];

      if (!node.children || !node.children.length) {

        paths.push(next);

        return;

      }

      node.children.forEach((ch: any) => walk(ch, next));

    };

    nodes.forEach((n: any) => walk(n, []));

    return paths;

  }



  const renderSchemaNode = (node: any): React.ReactNode => {

    const note = (node.poznamka || "").toString().trim();

    const label = `${fullName(node) || "-"}${note ? ` - ${note}` : ""}`;

    const isMismatch = parentMismatchIds.has(node.id);

    return (

      <div className="flex flex-col gap-2 w-full">

        <button

          type="button"


          className={`inline-flex items-center px-4 py-2 rounded-full border text-base whitespace-normal break-words w-full text-left transition hover:border-blue-400 hover:bg-blue-50 ${

            isMismatch ? "bg-amber-50 border-amber-400 text-amber-900" : "bg-slate-100"

          }`}

          title={isMismatch ? "Nadřazený prvek je 1f, ale tento prvek je 3f." : undefined}

        >

          {label}

        </button>

      </div>

    );

  };



  const renderSchemaTree = (node: any): React.ReactNode => {

    const children = node.children ?? [];

    return (

      <div className="grid grid-cols-[320px_minmax(0,1fr)] gap-x-6 items-start">

        <div className="min-w-0">{renderSchemaNode(node)}</div>

        {children.length > 0 ? (

          <div className="relative">

            <div className="absolute left-2 top-2 bottom-2 w-0.5 border-l-2 border-dashed border-blue-600" />

            <div className="space-y-3">

              {children.map((ch: any) => (

                <div key={ch.id} className="relative pl-6">

                  <span className="absolute left-2 top-4 w-4 border-t-2 border-dashed border-blue-600" />

                  {renderSchemaTree(ch)}

                </div>

              ))}

            </div>

          </div>

        ) : (

          <div />

        )}

      </div>

    );

  };



  /** ================== STROM / DATA ================== */



  // celý název „Jistič Eaton PL‑7 16A“

  // === Board akce ===

  function handleAddBoard() {

    if (!newBoard.name.trim()) return alert("Název povinný");

    const id = Date.now();

    setForm((f) => ({ ...f, boards: [...f.boards, { id, komponenty: [], ...newBoard }] }));

    setShowBoardDialog(false);

    setNewBoard({

      name: "",

      vyrobce: "",

      typ: "",

      vyrobniCislo: "",

      napeti: "",

      proud: "",

      supplySystem: "",

      supplyPhase: "",

      ip: "",

      odpor: "",

      umisteni: "",

      poznamkyHtml: "",

    });

    setSelectedBoardId(id);

  }

  function handleCopyBoard() {

    if (!selectedBoard) return;

    const time = Date.now();

    const copy = {

      ...selectedBoard,

      id: time,

      komponenty: (selectedBoard.komponenty as GraphComp[]).map((c, idx) => ({ ...c, id: time + idx + 1 })),

    };

    setForm((f) => ({ ...f, boards: [...f.boards, copy] }));

    setSelectedBoardId(copy.id);

  }

  function handleDeleteBoard() {

    if (!selectedBoardId) return;

    if (!window.confirm("Opravdu chcete smazat tento rozvaděč?")) return;

    const newBoards = form.boards.filter((b) => b.id !== selectedBoardId);

    setForm((f) => ({ ...f, boards: newBoards }));

    setSelectedBoardId(newBoards[0]?.id ?? null);

  }



  // otevře dialog s předvyplněnými daty aktuálního rozvaděče

  function openEditBoardDialog() {

    if (!selectedBoard) return;

    setNewBoard({

      name: selectedBoard.name || "",

      vyrobce: selectedBoard.vyrobce || "",

      typ: selectedBoard.typ || "",

      vyrobniCislo: selectedBoard.vyrobniCislo || "",

      napeti: selectedBoard.napeti || "",

      proud: selectedBoard.proud || "",

      supplySystem: (selectedBoard as any).supplySystem || "",

      supplyPhase: (selectedBoard as any).supplyPhase || "",

      ip: selectedBoard.ip || "",

      odpor: selectedBoard.odpor || "",

      umisteni: selectedBoard.umisteni || "",

      poznamkyHtml: (selectedBoard as any).poznamkyHtml || (selectedBoard as any).poznamky || "",

    });

    setShowBoardEditDialog(true);

  }

  // uloží změny z dialogu zpět do boards

  function handleSaveBoardEdit() {

    if (!selectedBoard) return;

    setForm((f) => ({

      ...f,

      boards: f.boards.map((b) => (b.id === selectedBoard.id ? { ...b, ...newBoard } : b)),

    }));

    setShowBoardEditDialog(false);

  }



  // === Component akce ===

  function openAddDialog(parentId: number | null, rowId: number) {

    resetInlineEditors();

    setEditingCompId(null);
    setCompDialogFocusField("search");

    setNewComp({ ...defaultComp, parentId, rowId });

    setIsCustom(false);

    setShowCompDialog(true);

    setActiveRowId(rowId);

  }

  function openEditDialog(itemId: number, focusField: ComponentEditFocusField = "search") {

    if (!selectedBoard) return;

    const all = selectedBoard.komponenty as GraphComp[];

    const it = all.find((x) => x.id === itemId);

    if (!it) return;

    resetInlineEditors();

    setEditingCompId(itemId);
    setCompDialogFocusField(focusField);

    setNewComp({ ...defaultComp, ...it }); // předvyplnit

    setIsCustom(!it.nazevId); // pokud není z katalogu

    setShowCompDialog(true);

  }

  function handleConfirmComponent() {

    if (!selectedBoard) return;

    const all = selectedBoard.komponenty as GraphComp[];



    // EDIT

    if (editingCompId != null) {

      const orig = all.find((x) => x.id === editingCompId);

      if (!orig) return;

      const updated: GraphComp = {

        ...orig,

        ...newComp,

        id: orig.id,

        order: orig.order ?? 0,

      };

      const merged = all.map((c) => (c.id === editingCompId ? updated : c));

      setForm((f) => ({

        ...f,

        boards: f.boards.map((b) => (b.id === selectedBoard.id ? { ...b, komponenty: merged } : b)),

      }));

      setShowCompDialog(false);

      setEditingCompId(null);

      return;

    }



    // ADD

    const id = Date.now();

    const rowId = newComp.rowId ?? activeRowId ?? 1;

    const siblings = all.filter((c) => (c.parentId ?? null) === (newComp.parentId ?? null) && (c.rowId ?? 1) === rowId);

    const nextOrder = siblings.length ? Math.max(...siblings.map((s) => s.order ?? 0)) + 1 : 0;

    const comp: GraphComp = { ...newComp, id, order: nextOrder, rowId };

    setForm((f) => ({

      ...f,

      boards: f.boards.map((b) =>

        b.id === selectedBoard.id ? { ...b, komponenty: [...(b.komponenty as GraphComp[]), comp] } : b

      ),

    }));

    setShowCompDialog(false);

  }

  function handleCopyComponent(cId: number) {

    if (!selectedBoard) return;

    const all = selectedBoard.komponenty as GraphComp[];

    const orig = all.find((x) => x.id === cId);

    if (!orig) return;

    const id = Date.now();

    const rowId = orig.rowId ?? 1;

    const siblings = all.filter((c) => (c.parentId ?? null) === (orig.parentId ?? null) && (c.rowId ?? 1) === rowId);

    const nextOrder = siblings.length ? Math.max(...siblings.map((s) => s.order ?? 0)) + 1 : 0;

    const copy = { ...orig, id, order: nextOrder };

    setForm((f) => ({

      ...f,

      boards: f.boards.map((b) =>

        b.id === selectedBoard.id ? { ...b, komponenty: [...(b.komponenty as GraphComp[]), copy] } : b

      ),

    }));

  }

  function handleDeleteComponent(cId: number) {

    if (!selectedBoard) return;

    if (!window.confirm("Smazat prvek včetně celé jeho větve?")) return;

    const all = selectedBoard.komponenty as GraphComp[];

    const toDel = new Set<number>();

    const byParent = new Map<number | null, number[]>();

    all.forEach((c) => {

      const k = (c.parentId ?? null) as number | null;

      byParent.set(k, [...(byParent.get(k) || []), c.id]);

    });

    const dfs = (id: number) => {

      toDel.add(id);

      (byParent.get(id) || []).forEach(dfs);

    };

    dfs(cId);

    const rem = all.filter((c) => !toDel.has(c.id));

    setForm((f) => ({

      ...f,

      boards: f.boards.map((b) => (b.id === selectedBoard.id ? { ...b, komponenty: rem } : b)),

    }));

  }

  function reorderSibling(cId: number, dir: -1 | 1) {

    if (!selectedBoard) return;

    const all = [...(selectedBoard.komponenty as GraphComp[])];

    const me = all.find((c) => c.id === cId);

    if (!me) return;

    const groupKey = me.parentId ?? null;

    const rowKey = me.rowId ?? 1;

    const siblings = all.filter((c) => (c.parentId ?? null) === groupKey && (c.rowId ?? 1) === rowKey).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const i = siblings.findIndex((s) => s.id === cId);

    const j = i + dir;

    if (j < 0 || j >= siblings.length) return;

    const A = siblings[i];

    const B = siblings[j];

    const updated = all.map((c) => {

      if (c.id === A.id) return { ...c, order: B.order ?? 0 };

      if (c.id === B.id) return { ...c, order: A.order ?? 0 };

      return c;

    });

    setForm((f) => ({

      ...f,

      boards: f.boards.map((b) => (b.id === selectedBoard.id ? { ...b, komponenty: updated } : b)),

    }));

  }

  function moveSiblingToTarget(draggedId: number, targetId: number) {

    if (!selectedBoard || draggedId === targetId) return;

    const all = [...(selectedBoard.komponenty as GraphComp[])];

    const dragged = all.find((c) => c.id === draggedId);

    const target = all.find((c) => c.id === targetId);

    if (!dragged || !target) return;

    const groupKey = dragged.parentId ?? null;

    const rowKey = dragged.rowId ?? 1;

    if ((target.parentId ?? null) !== groupKey || (target.rowId ?? 1) !== rowKey) return;

    const siblings = all
      .filter((c) => (c.parentId ?? null) === groupKey && (c.rowId ?? 1) === rowKey)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    const fromIndex = siblings.findIndex((c) => c.id === draggedId);

    const toIndex = siblings.findIndex((c) => c.id === targetId);

    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    const reordered = [...siblings];

    const [moved] = reordered.splice(fromIndex, 1);

    reordered.splice(toIndex, 0, moved);

    const orderValues = siblings.map((c, index) => c.order ?? index);

    const nextOrders = new Map(reordered.map((c, index) => [c.id, orderValues[index] ?? index]));

    const updated = all.map((c) => {

      const nextOrder = nextOrders.get(c.id);

      return nextOrder === undefined ? c : { ...c, order: nextOrder };

    });

    setForm((f) => ({

      ...f,

      boards: f.boards.map((b) => (b.id === selectedBoard.id ? { ...b, komponenty: updated } : b)),

    }));

  }



  // inline edit poznámky – start/uložit/zrušit

  function updateComponentInline(nodeId: number, updater: (component: GraphComp) => GraphComp) {

    if (!selectedBoard) return;

    const all = selectedBoard.komponenty as GraphComp[];

    const updated = all.map((c) => (c.id === nodeId ? updater(c) : c));

    setForm((f) => ({

      ...f,

      boards: f.boards.map((b) => (b.id === selectedBoard.id ? { ...b, komponenty: updated } : b)),

    }));

  }

  function resetInlineEditors() {

    setEditingNoteId(null);

    setNoteDraft("");

    setEditingIdentityId(null);

    setIdentityDraft({ nazev: "", popis: "", typ: "" });

    setEditingField(null);

    setFieldDraft("");

  }

  function startEditIdentity(node: GraphComp) {

    resetInlineEditors();

    setEditingIdentityId(node.id);

    setIdentityDraft({

      nazev: node.nazev || "",

      popis: node.popis || "",

      typ: node.typ || "",

    });

  }

  function cancelEditIdentity() {

    setEditingIdentityId(null);

    setIdentityDraft({ nazev: "", popis: "", typ: "" });

  }

  function saveEditIdentity(nodeId: number) {

    updateComponentInline(nodeId, (component) => ({

      ...component,

      nazev: identityDraft.nazev,

      popis: identityDraft.popis,

      typ: identityDraft.typ,

    }));

    cancelEditIdentity();

  }

  function startEditField(nodeId: number, field: InlineComponentField, current: unknown) {

    resetInlineEditors();

    setEditingField({ nodeId, field });

    setFieldDraft(String(current ?? ""));

  }

  function cancelEditField() {

    setEditingField(null);

    setFieldDraft("");

  }

  function saveEditField(nodeId: number, field: InlineComponentField) {

    updateComponentInline(nodeId, (component) => ({

      ...component,

      [field]: fieldDraft,

    }));

    cancelEditField();

  }

  function startEditNote(nodeId: number, current: string) {

    resetInlineEditors();

    setEditingNoteId(nodeId);

    setNoteDraft(current || "");

  }

  function cancelEditNote() {

    setEditingNoteId(null);

    setNoteDraft("");

  }

  function saveEditNote(nodeId: number) {

    updateComponentInline(nodeId, (component) => ({ ...component, poznamka: noteDraft }));

    cancelEditNote();

  }



  /** ================== RENDER ================== */



  return (

    <section className="bg-white p-4 rounded shadow mb-8">

      <div className="flex gap-6 mb-4">

        {/* Sidebar – seznam rozvaděčů + akce */}

        <aside className="w-1/4">

          <h2 className="text-lg font-semibold mb-2">Rozvaděče:</h2>

          <div className="border rounded p-2 mb-3">

            <ul className="space-y-1">

              {boards.map((b) => (

                <li

                  key={b.id}

                  onClick={() => setSelectedBoardId(b.id)}

                  className={`p-2 rounded cursor-pointer hover:bg-blue-50 ${

                    b.id === selectedBoardId ? "bg-blue-100 font-semibold" : ""

          }`}

        >

                  {b.name || "(bez názvu)"}

                </li>

              ))}

            </ul>

          </div>



          {/* Tlačítka vedle sebe a na střed */}

          <div className="flex gap-2 justify-center mb-3">

            <button

              className="bg-green-600 text-white px-3 py-1 rounded text-sm"

              onClick={() => setShowBoardDialog(true)}

              title="Přidat rozvaděč"

            >

              ➕ Přidat

            </button>

            {selectedBoard && (

              <>

                <button

                  className="bg-yellow-500 text-white px-3 py-1 rounded text-sm"

                  onClick={handleCopyBoard}

                  title="Kopírovat vybraný"

                >

                  📄 Kopírovat

                </button>

                <button

                  className="bg-red-600 text-white px-3 py-1 rounded text-sm"

                  onClick={handleDeleteBoard}

                  title="Smazat vybraný"

                >

                  🗑️ Smazat

                </button>

              </>

            )}

          </div>

        </aside>



        {/* Pravý panel – detail rozvaděče + DIAGRAM */}

        <div className="flex-1 overflow-auto p-4">

          {selectedBoard ? (

            <>

              {/* Titulek + tužka */}

              <div className="flex items-center justify-between mb-2">

                <h3 className="text-lg font-semibold">{selectedBoard.name || "(bez názvu)"}</h3>

                <button

                  className="text-xs border px-2 py-1 rounded"

                  title="Upravit vlastnosti rozvaděče"

                  onClick={openEditBoardDialog}

                >

                  ✏️ Upravit rozvaděč

                </button>

              </div>



              {/* Hlavičkové údaje rozvaděče */}

              <div className="grid md:grid-cols-3 gap-4 mb-3">

                {(

                  [

                    ["vyrobce", "Výrobce"],

                    ["typ", "Typ"],

                    ["vyrobniCislo", "Výrobní číslo"],

                    ["napeti", "Napětí"],

                    ["proud", "Proud"],

                    ["supplySystem", "Síť (TN-C/TN-S)"],

                    ["supplyPhase", "Fáze přívodu"],

                    ["ip", "IP krytí"],

                    ["odpor", "Přechodový odpor"],

                    ["umisteni", "Umístění"],

                  ] as [keyof Omit<Board, "id" | "komponenty" | "name">, string][]

                ).map(([k, label]) => (

                  <div key={k}>

                    <label className="block text-sm text-gray-500">{label}</label>

                    <div className="p-2">{(selectedBoard as any)[k]}</div>

                  </div>

                ))}

              </div>



              {invalidThreePhase.length > 0 && (

                <div className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">

                  <div className="font-semibold">Přívod je 1f, ale některé prvky jsou 3f:</div>

                  <div className="mt-1 space-y-1">

                    {invalidThreePhase.map((c) => (

                      <div key={c.id}>{fullName(c) || "-"}</div>

                    ))}

                  </div>

                </div>

              )}

              <div className="mb-4 rounded border border-slate-200 bg-slate-50 p-3">
                <div className="mb-2 text-sm font-semibold">Poznámky k rozvaděči</div>
                <RichTextEditor
                  value={(selectedBoard as any).poznamkyHtml || (selectedBoard as any).poznamky || ""}
                  onChange={(html) =>
                    setForm((f) => ({
                      ...f,
                      boards: f.boards.map((b) =>
                        b.id === selectedBoard.id ? { ...b, poznamkyHtml: html } : b
                      ),
                    }))
                  }
                  placeholder="Sem si můžete průběžně zapisovat závady nebo poznámky k rozvaděči"
                  minHeightClassName="min-h-[110px]"
                />
              </div>



              {/* DIAGRAM */}

              {/* Rady */}

              <div className="flex items-center justify-between mb-2">

                <h4 className="text-sm font-semibold">Řady</h4>

                <button

                  className="text-xs border px-2 py-1 rounded"

                  onClick={addRow}

                >

                  + Přidat řadu

                </button>

              </div>

              <div className="space-y-4">

                {boardRows.map((row) => {

                  const rowItems = (selectedBoard.komponenty as GraphComp[]).filter(

                    (c) => (c.rowId ?? 1) === row.id

                  );

                  const roots = buildRowTree(rowItems);



                  return (

                    <div key={row.id} className="border border-dashed rounded p-3">

                      <div className="flex items-center justify-between gap-2 mb-2">

                        <input

                          className="text-sm font-semibold border rounded px-2 py-1 w-48"

                          value={row.name}

                          onChange={(e) => renameRow(row.id, e.target.value)}

                        />

                        <div className="flex items-center gap-2">

                          <button

                            className="text-xs border px-2 py-1 rounded"

                            title="Nahoru"

                            onClick={() => moveRow(row.id, -1)}

                          >

                            ^

                          </button>

                          <button

                            className="text-xs border px-2 py-1 rounded"

                            title="Dolů"

                            onClick={() => moveRow(row.id, 1)}

                          >

                            v

                          </button>

                          <button

                            className="text-xs border px-2 py-1 rounded"

                            onClick={() => openAddDialog(null, row.id)}

                          >

                            + Přidat prvek

                          </button>

                          <button

                            className="text-xs border px-2 py-1 rounded text-red-700"

                            onClick={() => deleteRow(row.id)}

                          >

                            Smazat řadu

                          </button>

                        </div>

                      </div>



                      {roots.length ? (

                        <CompactDiagram

                          roots={roots}

                          fullName={fullName}

                          onAddChild={(pid) => openAddDialog(pid, row.id)}

                          onEdit={(id, focusField) => openEditDialog(id, focusField)}

                          onMoveUp={(id) => reorderSibling(id, -1)}

                          onMoveDown={(id) => reorderSibling(id, 1)}

                          onMoveToSibling={moveSiblingToTarget}

                          onCopy={handleCopyComponent}

                          onDelete={handleDeleteComponent}

                          onStartEditIdentity={startEditIdentity}

                          editingIdentityId={editingIdentityId}

                          identityDraft={identityDraft}

                          setIdentityDraft={setIdentityDraft}

                          onSaveIdentity={saveEditIdentity}

                          onCancelIdentity={cancelEditIdentity}

                          onStartEditField={startEditField}

                          editingField={editingField}

                          fieldDraft={fieldDraft}

                          setFieldDraft={setFieldDraft}

                          onSaveField={saveEditField}

                          onCancelField={cancelEditField}

                          // inline edit poznamky:

                          onStartEditNote={startEditNote}

                          editingNoteId={editingNoteId}

                          noteDraft={noteDraft}

                          setNoteDraft={setNoteDraft}

                          onSaveNote={saveEditNote}

                          onCancelNote={cancelEditNote}

                        />

                      ) : (

                        <div className="text-gray-500 text-sm">Žádná komponenta v řadě.</div>

                      )}

                    </div>

                  );

                })}

              </div>




            </>

          ) : (

            <div className="text-gray-500">Vyberte rozvaděč</div>

          )}

        </div>

      </div>



      {selectedBoard && (
        <div className="mt-4 w-full">
          <div className="text-base font-semibold text-slate-700 mb-2">Schéma (strom)</div>
          {(() => {
            const allRoots = buildRowTree(selectedBoard.komponenty as GraphComp[]);
            return allRoots.length ? (
              <div className="w-full overflow-x-auto">
                <div className="space-y-6 min-w-[1200px]">
                  <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-x-4 items-start">
                    <div className="flex flex-col items-end gap-1 text-xs text-slate-600 pt-1 pr-3">
                      <div className="font-semibold text-slate-700">
                        {(selectedBoard as any).supplySystem || "—"}
                      </div>
                      <div className="font-semibold text-slate-700">
                        {(selectedBoard as any).supplyPhase || "—"}
                      </div>
                      <div className="text-xs text-blue-700 font-semibold mt-2 hidden">P</div>
                    </div>
                    <div className="relative flex flex-col gap-6">
                      <div className="absolute left-0 top-4 bottom-4 w-0.5 border-l-2 border-dashed border-blue-600" />
                      <span className="absolute -left-5 top-4 w-5 border-t-2 border-dashed border-blue-600" />
                      {allRoots.map((root: any) => (
                        <div key={root.id} className="relative pl-6">
                          <span className="absolute left-0 top-4 w-6 border-t-2 border-dashed border-blue-600" />
                          {renderSchemaTree(root)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Žádná komponenta.</div>
            );
          })()}
        </div>
      )}

      {/* Dialog – nový rozvaděč */}

      {showBoardDialog && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white p-6 rounded shadow w-full max-w-3xl max-h-[90vh] overflow-y-auto">

            <h3 className="text-lg font-semibold mb-4">Nový rozvaděč</h3>

            <div className="grid grid-cols-1 gap-3">

              {(

                [

                  ["name", "Název"],

                  ["vyrobce", "Výrobce"],

                  ["typ", "Typ"],

                  ["vyrobniCislo", "Výrobní číslo"],

                  ["napeti", "Napětí"],

                  ["proud", "Proud"],

                  ["ip", "IP krytí"],

                  ["odpor", "Přechodový odpor"],

                  ["umisteni", "Umístění"],

                ] as [keyof Omit<Board, "id" | "komponenty">, string][]

              ).map(([field, label]) => (

                <div key={field}>

                  <label className="block text-sm font-medium mb-1">{label}</label>

                  <input

                    type="text"

                    className="w-full p-2 border rounded"

                    value={(newBoard as any)[field]}

                    onChange={(e) => setNewBoard((b) => ({ ...b, [field]: e.target.value }))}

                  />

                </div>

              ))}

                <div>
                  <label className="block text-sm font-medium mb-1">Síť (TN)</label>
                  <select
                    className="w-full p-2 border rounded"
                    value={(newBoard as any).supplySystem || ""}
                    onChange={(e) => setNewBoard((b) => ({ ...b, supplySystem: e.target.value }))}
                  >
                    <option value="">-- vyber --</option>
                    <option value="TN-C">TN-C</option>
                    <option value="TN-C-S">TN-C-S</option>
                    <option value="TN-S">TN-S</option>
                  </select>
                </div>
              <div>

                <label className="block text-sm font-medium mb-1">Fáze přívodu</label>

                <select

                  className="w-full p-2 border rounded"

                  value={(newBoard as any).supplyPhase || ""}

                  onChange={(e) => setNewBoard((b) => ({ ...b, supplyPhase: e.target.value }))}

                >

                  <option value="">-- vyber --</option>

                  <option value="1f">1f</option>

                  <option value="3f">3f</option>

                </select>

              </div>

            </div>

            <div className="flex justify-end gap-2 mt-6">

              <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowBoardDialog(false)}>

                Zrušit

              </button>

              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleAddBoard}>

                Přidat

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Dialog – upravit rozvaděč */}

      {showBoardEditDialog && (

        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white p-6 rounded shadow w-full max-w-3xl max-h-[90vh] overflow-y-auto">

            <h3 className="text-lg font-semibold mb-4">Upravit rozvaděč</h3>

            <div className="grid grid-cols-1 gap-3">

              {(

                [

                  ["name", "Název"],

                  ["vyrobce", "Výrobce"],

                  ["typ", "Typ"],

                  ["vyrobniCislo", "Výrobní číslo"],

                  ["napeti", "Napětí"],

                  ["proud", "Proud"],

                  ["ip", "IP krytí"],

                  ["odpor", "Přechodový odpor"],

                  ["umisteni", "Umístění"],

                ] as [keyof Omit<Board, "id" | "komponenty">, string][]

              ).map(([field, label]) => (

                <div key={field}>

                  <label className="block text-sm font-medium mb-1">{label}</label>

                  <input

                    type="text"

                    className="w-full p-2 border rounded"

                    value={(newBoard as any)[field] || ""}

                    onChange={(e) => setNewBoard((b) => ({ ...b, [field]: e.target.value }))}

                  />

                </div>

              ))}

              <div>

                <label className="block text-sm font-medium mb-1">Síť (TN)</label>

                <select

                  className="w-full p-2 border rounded"

                  value={(newBoard as any).supplySystem || ""}

                  onChange={(e) => setNewBoard((b) => ({ ...b, supplySystem: e.target.value }))}

                >

                  <option value="">-- vyber --</option>

                  <option value="TN-C">TN-C</option>

                  <option value="TN-S">TN-S</option>

                </select>

              </div>

              <div>

                <label className="block text-sm font-medium mb-1">Fáze přívodu</label>

                <select

                  className="w-full p-2 border rounded"

                  value={(newBoard as any).supplyPhase || ""}

                  onChange={(e) => setNewBoard((b) => ({ ...b, supplyPhase: e.target.value }))}

                >

                  <option value="">-- vyber --</option>

                  <option value="1f">1f</option>

                  <option value="3f">3f</option>

                </select>

              </div>

            </div>

            <div className="flex justify-end gap-2 mt-6">

              <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowBoardEditDialog(false)}>

                Zrušit

              </button>

              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleSaveBoardEdit}>

                Uložit

              </button>

            </div>

          </div>

        </div>

      )}



      {/* Dialog přidání / úpravy komponenty */}

      {showCompDialog && (

        <AddCompDialog

          newComp={newComp}

          setNewComp={setNewComp}

          defaultComp={defaultComp}

          isCustom={isCustom}

          setIsCustom={setIsCustom}

          types={types}

          manufacturers={manufacturers}

          models={models}

          catalogError={componentCatalogError}

          polesOptions={allowedPolesOptions}

          dimenzeOptions={dimenzeOptions}

          favoriteDimenze={favoriteDimenze}

          parentCandidates={parentCandidates}

          polesWarning={parentPolesWarning}

          rowOptions={rowOptions}

          initialFocusField={compDialogFocusField}

          onRowChange={(rid) => {

            const rowId = rid ?? rowOptions[0]?.id ?? 1;

            const list = (selectedBoard?.komponenty as GraphComp[]) || [];

            setNewComp((c) => {

              const keepParent = list.some((item) => item.id === (c.parentId ?? 0));

              return { ...c, rowId, parentId: keepParent ? c.parentId ?? null : null };

            });

            setActiveRowId(rowId);

          }}

          onParentChange={(pid) => setNewComp((c) => ({ ...c, parentId: pid ?? null }))}

          onCatalogChanged={refreshComponentCatalog}

          onCancel={() => {

            setShowCompDialog(false);

            setIsCustom(false);

            setEditingCompId(null);

          }}

          onAdd={handleConfirmComponent}

        />

      )}

    </section>

  );

}



/* ================== Kompaktní DIAGRAM (1 řádek + bublina detailů + inline edit poznámky) ================== */

function CompactDiagram({

  roots,

  fullName,

  onAddChild,

  onEdit,

  onMoveUp,

  onMoveDown,

  onMoveToSibling,

  onCopy,

  onDelete,

  onStartEditIdentity,

  editingIdentityId,

  identityDraft,

  setIdentityDraft,

  onSaveIdentity,

  onCancelIdentity,

  onStartEditField,

  editingField,

  fieldDraft,

  setFieldDraft,

  onSaveField,

  onCancelField,

  // inline poznámka:

  onStartEditNote,

  editingNoteId,

  noteDraft,

  setNoteDraft,

  onSaveNote,

  onCancelNote,

}: {

  roots: any[];

  fullName: (c: any) => string;

  onAddChild: (parentId: number) => void;

  onEdit: (id: number, focusField?: ComponentEditFocusField) => void;

  onMoveUp: (id: number) => void;

  onMoveDown: (id: number) => void;

  onMoveToSibling: (draggedId: number, targetId: number) => void;

  onCopy: (id: number) => void;

  onDelete: (id: number) => void;

  onStartEditIdentity: (node: GraphComp) => void;

  editingIdentityId: number | null;

  identityDraft: { nazev: string; popis: string; typ: string };

  setIdentityDraft: React.Dispatch<React.SetStateAction<{ nazev: string; popis: string; typ: string }>>;

  onSaveIdentity: (id: number) => void;

  onCancelIdentity: () => void;

  onStartEditField: (id: number, field: InlineComponentField, current: unknown) => void;

  editingField: { nodeId: number; field: InlineComponentField } | null;

  fieldDraft: string;

  setFieldDraft: (value: string) => void;

  onSaveField: (id: number, field: InlineComponentField) => void;

  onCancelField: () => void;

  onStartEditNote: (id: number, current: string) => void;

  editingNoteId: number | null;

  noteDraft: string;

  setNoteDraft: (v: string) => void;

  onSaveNote: (id: number) => void;

  onCancelNote: () => void;

}) {

  const [draggedItem, setDraggedItem] = useState<{ id: number; parentId: number | null; rowId: number } | null>(null);

  const [dragOverId, setDragOverId] = useState<number | null>(null);

  function focusLeftEditor(event: React.FocusEvent<HTMLElement>) {

    const nextFocused = event.relatedTarget as Node | null;

    return !nextFocused || !event.currentTarget.contains(nextFocused);

  }

  function isSameSiblingLevel(node: GraphComp, dragged: { id: number; parentId: number | null; rowId: number } | null) {

    if (!dragged || dragged.id === node.id) return false;

    return (node.parentId ?? null) === dragged.parentId && (node.rowId ?? 1) === dragged.rowId;

  }

  const render = (node: any, depth: number): React.ReactNode => {

    const hasChildren = (node.children?.length ?? 0) > 0;

    const title =

      [node.nazev || node.name, (node.vyrobce || node.popis) === OTHER_MANUFACTURER_NAME ? "" : node.vyrobce || node.popis, node.typ]

        .filter((v) => (v ?? "").toString().trim())

        .join(" ") || fullName(node);

    const renderInlineValueEditor = (
      field: InlineComponentField,
      label: string,
      currentValue: unknown,
      suffix = ""
    ) => {
      const isEditing = editingField?.nodeId === node.id && editingField.field === field;

      if (isEditing) {
        return (
          <span
            className="mr-3 inline-flex items-center gap-1"
            onBlur={(e) => {
              if (focusLeftEditor(e)) onSaveField(node.id, field);
            }}
          >
            <span>{label}:</span>
            <input
              className="border px-1 py-0.5 text-[12px] rounded"
              autoFocus
              value={fieldDraft}
              onChange={(e) => setFieldDraft(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveField(node.id, field);
                if (e.key === "Escape") onCancelField();
              }}
              style={{ minWidth: 90 }}
            />
            {suffix ? <span>{suffix}</span> : null}
            <button
              className="text-[12px] px-1 py-0.5 border rounded"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                onSaveField(node.id, field);
              }}
              title="Uložit"
            >
              Uložit
            </button>
            <button
              className="text-[12px] px-1 py-0.5 border rounded"
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                onCancelField();
              }}
              title="Zrušit"
            >
              Zrušit
            </button>
          </span>
        );
      }

      return (
        <span
          className="mr-3 rounded px-1 py-0.5 transition hover:bg-blue-50 hover:text-blue-700"
          onClick={(e) => {
            e.stopPropagation();
            onStartEditField(node.id, field, currentValue);
          }}
          title={`Klikni pro úpravu: ${label}`}
          style={{ cursor: "text" }}
        >
          {label}: {String(currentValue ?? "").trim() || "—"}{suffix}
        </span>
      );
    };

    return (

      <div key={node.id}>

        {/* řádek uzlu */}

        <div

          className={`flex items-center gap-2 border-b px-2 py-1.5 hover:bg-blue-50/40 ${
            dragOverId === node.id ? "bg-blue-100/70 ring-1 ring-inset ring-blue-300" : ""
          }`}

          style={{ paddingLeft: BASE_INDENT + depth * INDENT_PER_LEVEL }}

          onDragOver={(e) => {
            if (!isSameSiblingLevel(node, draggedItem)) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
            if (dragOverId !== node.id) setDragOverId(node.id);
          }}
          onDragLeave={(e) => {
            e.stopPropagation();
            if (dragOverId === node.id) setDragOverId(null);
          }}
          onDrop={(e) => {
            if (!draggedItem || !isSameSiblingLevel(node, draggedItem)) return;
            e.preventDefault();
            e.stopPropagation();
            onMoveToSibling(draggedItem.id, node.id);
            setDraggedItem(null);
            setDragOverId(null);
          }}

        >

          <div className="flex-1 min-w-0">

            {editingIdentityId === node.id ? (
              <div
                className="flex flex-wrap items-center gap-1"
                onBlur={(e) => {
                  if (focusLeftEditor(e)) onSaveIdentity(node.id);
                }}
              >
                <input
                  className="min-w-[120px] border px-1 py-0.5 text-[12px] rounded"
                  autoFocus
                  value={identityDraft.nazev}
                  onChange={(e) => setIdentityDraft((prev) => ({ ...prev, nazev: e.target.value }))}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSaveIdentity(node.id);
                    if (e.key === "Escape") onCancelIdentity();
                  }}
                  placeholder="Přístroj"
                />
                <input
                  className="min-w-[120px] border px-1 py-0.5 text-[12px] rounded"
                  value={identityDraft.popis}
                  onChange={(e) => setIdentityDraft((prev) => ({ ...prev, popis: e.target.value }))}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSaveIdentity(node.id);
                    if (e.key === "Escape") onCancelIdentity();
                  }}
                  placeholder="Výrobce"
                />
                <input
                  className="min-w-[120px] border px-1 py-0.5 text-[12px] rounded"
                  value={identityDraft.typ}
                  onChange={(e) => setIdentityDraft((prev) => ({ ...prev, typ: e.target.value }))}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onSaveIdentity(node.id);
                    if (e.key === "Escape") onCancelIdentity();
                  }}
                  placeholder="Model"
                />
                <button
                  className="text-[12px] px-1 py-0.5 border rounded"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaveIdentity(node.id);
                  }}
                  title="Uložit"
                >
                  Uložit
                </button>
                <button
                  className="text-[12px] px-1 py-0.5 border rounded"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelIdentity();
                  }}
                  title="Zrušit"
                >
                  Zrušit
                </button>
              </div>
            ) : (
              <span
                className="block truncate font-semibold text-[13px] rounded px-1 py-0.5 transition hover:bg-blue-50 hover:text-blue-700"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEditIdentity(node);
                }}
                title="Klikni pro úpravu přístroje, výrobce a modelu"
                style={{ cursor: "text" }}
              >
                {node.cislo ? `${node.cislo} • ` : ""}
                {title}
              </span>
            )}

            {/* bublina s detaily (menší písmo, 2 řádky max) */}

            <div
              className="text-[12px] text-gray-600"
              style={clamp2}
            >
















              {/* Poznámka – dvojklikem editor */}

              {editingNoteId === node.id ? (

                <span className="inline-flex items-center gap-1">

                  <input

                    className="border px-1 py-0.5 text-[12px] rounded"

                    autoFocus

                    value={noteDraft}

                    onChange={(e) => setNoteDraft(e.target.value)}

                    onClick={(e) => e.stopPropagation()}

                    onBlur={() => onSaveNote(node.id)}

                    onKeyDown={(e) => {

                      if (e.key === "Enter") onSaveNote(node.id);

                      if (e.key === "Escape") onCancelNote();

                    }}

                    style={{ minWidth: 160 }}

                  />

                  <button

                    className="text-[12px] px-1 py-0.5 border rounded"

                    onMouseDown={(e) => e.preventDefault()}

                    onClick={(e) => {
                      e.stopPropagation();
                      onSaveNote(node.id);
                    }}

                    title="Uložit"

                  >

                    Uložit

                  </button>

                  <button

                    className="text-[12px] px-1 py-0.5 border rounded"

                    onMouseDown={(e) => e.preventDefault()}

                    onClick={(e) => {
                      e.stopPropagation();
                      onCancelNote();
                    }}

                    title="Zrušit"

                  >

                    Zrušit

                  </button>

                </span>

              ) : (

                <span

                  className="italic rounded px-1 py-0.5 transition hover:bg-blue-50 hover:text-blue-700"

                  onClick={(e) => {
                    e.stopPropagation();
                    onStartEditNote(node.id, node.poznamka || "");
                  }}

                  title="Dvojklikem upravit poznámku"

                  style={{ cursor: "text" }}

                >

                  Název obvodu: {node.poznamka || "—"}

                </span>

              )}

              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                {renderInlineValueEditor("poles", "Póly", node.poles)}
                {renderInlineValueEditor("dimenze", "Dim.", node.dimenze)}
                {renderInlineValueEditor("riso", "Riso", node.riso, " MΩ")}
                {renderInlineValueEditor("ochrana", "Zs", node.ochrana, " Ω")}
                {(node.vybavovaciCasMs || editingField?.nodeId === node.id && editingField.field === "vybavovaciCasMs") &&
                  renderInlineValueEditor("vybavovaciCasMs", "tΔ", node.vybavovaciCasMs, " ms")}
                {(node.vybavovaciProudmA || editingField?.nodeId === node.id && editingField.field === "vybavovaciProudmA") &&
                  renderInlineValueEditor("vybavovaciProudmA", "IΔ", node.vybavovaciProudmA, " mA")}
                {(node.dotykoveNapetiV || editingField?.nodeId === node.id && editingField.field === "dotykoveNapetiV") &&
                  renderInlineValueEditor("dotykoveNapetiV", "U_t", node.dotykoveNapetiV, " V")}
              </div>

            </div>

          </div>

          <div className="flex items-center gap-1 whitespace-nowrap">

            <button
              type="button"
              className={`text-xs border px-2 py-0.5 rounded select-none ${
                editingIdentityId === node.id || editingNoteId === node.id || editingField?.nodeId === node.id
                  ? "cursor-not-allowed opacity-40"
                  : "cursor-grab active:cursor-grabbing"
              }`}
              title="Přetáhni pro přesun v rámci stejné úrovně"
              draggable={!(editingIdentityId === node.id || editingNoteId === node.id || editingField?.nodeId === node.id)}
              onDragStart={(e) => {
                e.stopPropagation();
                setDraggedItem({ id: node.id, parentId: node.parentId ?? null, rowId: node.rowId ?? 1 });
                setDragOverId(null);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(node.id));
              }}
              onDragEnd={() => {
                setDraggedItem(null);
                setDragOverId(null);
              }}
              onClick={(e) => e.preventDefault()}
            >
              ::
            </button>

            <button className="text-xs border px-2 py-0.5 rounded" title="Upravit" onClick={() => onEdit(node.id)}>

              ✏️

            </button>

            <button className="text-xs border px-2 py-0.5 rounded" title="Nahoru" onClick={() => onMoveUp(node.id)}>

              ▲

            </button>

            <button className="text-xs border px-2 py-0.5 rounded" title="Dolů" onClick={() => onMoveDown(node.id)}>

              ▼

            </button>

            <button className="text-xs border px-2 py-0.5 rounded" title="Kopírovat" onClick={() => onCopy(node.id)}>

              ⧉

            </button>

            <button

              className="text-xs bg-red-600 text-white px-2 py-0.5 rounded"

              title="Smazat"

              onClick={() => onDelete(node.id)}

            >

              🗑

            </button>

            <button

              className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded"

              title="Přidat potomka"

              onClick={() => onAddChild(node.id)}

            >

              +

            </button>

          </div>

        </div>



        {/* děti */}

        {hasChildren && node.children.map((ch: any) => render(ch, depth + 1))}

      </div>

    );

  };



  return (

    <div className="w-full border rounded">

      {roots.length ? roots.map((n) => render(n, 0)) : <div className="p-3 text-gray-500">Žádné prvky.</div>}

    </div>

  );

}

