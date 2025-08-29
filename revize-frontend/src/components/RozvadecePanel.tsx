// src/components/RozvadecePanel.tsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { useRevisionForm, Board, Komponenta } from "../context/RevisionFormContext";
import AddCompDialog from "./AddCompDialog";

/** Frontendové rozšíření bez zásahu do globálních typů */
type GraphComp = Komponenta & {
  id: number;
  parentId?: number | null;
  order?: number;
};

const BASE_INDENT = 24;       // základní odsazení 1. úrovně (px)
const INDENT_PER_LEVEL = 40; // px – větší odsazení mezi úrovněmi

const polesOptions = ["1", "1+N", "3", "3+N"];
const dimenzeOptions: string[] = [
  ...["CYKY", "AYKY"].flatMap((t) =>
    ["2×1,5", "3×1,5", "5×1,5", "2×2,5", "3×2,5", "5×2,5", "3×4", "3×6", "3×10", "3×16", "3×25", "3×35"].map(
      (p) => `${t} ${p}`
    )
  ),
  ...["1,5", "2,5", "4", "6", "10", "16", "25", "35"].map((p) => `CYA ${p}`),
];

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

  // dialog & edit/add stav pro komponenty
  const [showCompDialog, setShowCompDialog] = useState(false);
  const [editingCompId, setEditingCompId] = useState<number | null>(null);

  // inline edit poznámky v DIAGRAMU
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

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
    parentId: null,
    order: 0,
  };
  const [newComp, setNewComp] = useState<GraphComp>({ ...defaultComp });
  const [isCustom, setIsCustom] = useState(false);

  // katalogy (pro dialog)
  const [types, setTypes] = useState<{ id: number; name: string }[]>([]);
  const [manufacturers, setManufacturers] = useState<{ id: number; name: string }[]>([]);
  const [models, setModels] = useState<{ id: number; name: string }[]>([]);

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
    ip: "",
    odpor: "",
    umisteni: "",
  });

  useEffect(() => {
    let cancel = false;
    api.get("/catalog/types").then((r) => !cancel && setTypes(r.data)).catch(() => {});
    return () => {
      cancel = true;
    };
  }, []);
  useEffect(() => {
    let cancel = false;
    if (newComp.nazevId) {
      api
        .get("/catalog/manufacturers", { params: { type_id: newComp.nazevId } })
        .then((r) => !cancel && setManufacturers(r.data))
        .catch(() => {});
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
    if (newComp.popisId) {
      api
        .get("/catalog/models", { params: { manufacturer_id: newComp.popisId } })
        .then((r) => !cancel && setModels(r.data))
        .catch(() => {});
    } else {
      setModels([]);
    }
    return () => {
      cancel = true;
    };
  }, [newComp.popisId]);

  /** ================== STROM / DATA ================== */

  // celý název „Jistič Eaton PL‑7 16A“
  const fullName = (c: Partial<GraphComp>) =>
    [c.nazev, c.popis, c.typ].filter((x) => (x ?? "").toString().trim()).join(" ");

  // strom pro diagram
  type TreeNode = GraphComp & { children: TreeNode[] };
  const treeRoots: TreeNode[] = useMemo(() => {
    if (!selectedBoard) return [];
    const items = (selectedBoard.komponenty as GraphComp[]).map((c) => ({
      ...c,
      parentId: c.parentId ?? null,
      order: c.order ?? 0,
    }));
    const byId = new Map<number, TreeNode>();
    items.forEach((c) => byId.set(c.id, { ...(c as any), children: [] }));
    const roots: TreeNode[] = [];
    byId.forEach((n) => {
      if (n.parentId == null) roots.push(n);
      else {
        const p = byId.get(n.parentId);
        if (p) p.children.push(n);
        else roots.push(n);
      }
    });
    const sortRec = (arr: TreeNode[]) => {
      arr.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      arr.forEach((ch) => sortRec(ch.children));
    };
    sortRec(roots);
    return roots;
  }, [selectedBoard]);

  // kandidáti do selectu „Nadřazený prvek“
  const parentCandidates = useMemo(() => {
    if (!selectedBoard) return [];
    const list = selectedBoard.komponenty as GraphComp[];
    return [
      { id: 0, label: "(žádný – 1. úroveň)" },
      ...list.map((c, i) => ({
        id: c.id,
        label: `${i + 1}. ${fullName(c) || "—"}`,
      })),
    ];
  }, [selectedBoard]);

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
      ip: "",
      odpor: "",
      umisteni: "",
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
      ip: selectedBoard.ip || "",
      odpor: selectedBoard.odpor || "",
      umisteni: selectedBoard.umisteni || "",
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
  function openAddDialog(parentId: number | null) {
    setEditingCompId(null);
    setNewComp({ ...defaultComp, parentId });
    setIsCustom(false);
    setShowCompDialog(true);
  }
  function openEditDialog(itemId: number) {
    if (!selectedBoard) return;
    const all = selectedBoard.komponenty as GraphComp[];
    const it = all.find((x) => x.id === itemId);
    if (!it) return;
    setEditingCompId(itemId);
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
    const siblings = all.filter((c) => (c.parentId ?? null) === (newComp.parentId ?? null));
    const nextOrder = siblings.length ? Math.max(...siblings.map((s) => s.order ?? 0)) + 1 : 0;
    const comp: GraphComp = { ...newComp, id, order: nextOrder };
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
    const siblings = all.filter((c) => (c.parentId ?? null) === (orig.parentId ?? null));
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
    const siblings = all.filter((c) => (c.parentId ?? null) === groupKey).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
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

  // inline edit poznámky – start/uložit/zrušit
  function startEditNote(nodeId: number, current: string) {
    setEditingNoteId(nodeId);
    setNoteDraft(current || "");
  }
  function cancelEditNote() {
    setEditingNoteId(null);
    setNoteDraft("");
  }
  function saveEditNote(nodeId: number) {
    if (!selectedBoard) return;
    const all = selectedBoard.komponenty as GraphComp[];
    const updated = all.map((c) => (c.id === nodeId ? { ...c, poznamka: noteDraft } : c));
    setForm((f) => ({
      ...f,
      boards: f.boards.map((b) => (b.id === selectedBoard.id ? { ...b, komponenty: updated } : b)),
    }));
    setEditingNoteId(null);
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

              {/* DIAGRAM */}
              <CompactDiagram
                roots={treeRoots}
                fullName={fullName}
                onAddChild={(pid) => openAddDialog(pid)}
                onEdit={(id) => openEditDialog(id)}
                onMoveUp={(id) => reorderSibling(id, -1)}
                onMoveDown={(id) => reorderSibling(id, 1)}
                onCopy={handleCopyComponent}
                onDelete={handleDeleteComponent}
                // inline edit poznámky:
                onStartEditNote={startEditNote}
                editingNoteId={editingNoteId}
                noteDraft={noteDraft}
                setNoteDraft={setNoteDraft}
                onSaveNote={saveEditNote}
                onCancelNote={cancelEditNote}
              />

              {/* Hlavní akce */}
              <div className="mt-4 flex justify-end">
                <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm" onClick={() => openAddDialog(null)}>
                  ➕ Přidat komponentu 1. úrovně
                </button>
              </div>
            </>
          ) : (
            <div className="text-gray-500">Vyberte rozvaděč</div>
          )}
        </div>
      </div>

      {/* Dialog – nový rozvaděč */}
      {showBoardDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-md">
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
          <div className="bg-white p-6 rounded shadow w-full max-w-md">
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
          polesOptions={polesOptions}
          dimenzeOptions={dimenzeOptions}
          parentCandidates={parentCandidates}
          onParentChange={(pid) => setNewComp((c) => ({ ...c, parentId: pid ?? null }))}
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
  onCopy,
  onDelete,
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
  onEdit: (id: number) => void;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
  onCopy: (id: number) => void;
  onDelete: (id: number) => void;
  onStartEditNote: (id: number, current: string) => void;
  editingNoteId: number | null;
  noteDraft: string;
  setNoteDraft: (v: string) => void;
  onSaveNote: (id: number) => void;
  onCancelNote: () => void;
}) {
  const render = (node: any, depth: number): React.ReactNode => {
    const hasChildren = (node.children?.length ?? 0) > 0;
    return (
      <div key={node.id}>
        {/* řádek uzlu */}
        <div
          className="flex items-center gap-2 px-2 py-1.5 border-b hover:bg-blue-50/40"
            style={{ paddingLeft: BASE_INDENT + depth * INDENT_PER_LEVEL }}

        >
          <div className="flex-1 min-w-0">
            <div className="truncate font-medium">
              {node.cislo ? `${node.cislo} – ` : ""}
              {fullName(node)}
            </div>
            {/* bublina s detaily (menší písmo, 2 řádky max) */}
            <div className="text-[14px] text-gray-600 line-clamp-2" style={clamp2}>
              {node.poles && <span className="mr-3">póly: {node.poles}</span>}
              {node.dimenze && <span className="mr-3">dim.: {node.dimenze}</span>}
              {node.riso && <span className="mr-3">Riso: {node.riso} Ω</span>}
              {node.ochrana && <span className="mr-3">Zs: {node.ochrana} Ω</span>}
              {/* NOVÉ – zobrazit jen pokud existují */}
              {node.vybavovaciCasMs && (
                <span className="mr-3">tᵣ: {node.vybavovaciCasMs} ms</span>
              )}
              {node.vybavovaciProudmA && (
                <span className="mr-3">Iᵣ: {node.vybavovaciProudmA} mA</span>
              )}
              {node.dotykoveNapetiV && (
                <span className="mr-3">Uₜ: {node.dotykoveNapetiV} V</span>
              )}

              {/* Poznámka – dvojklikem editor */}
              {editingNoteId === node.id ? (
                <span className="inline-flex items-center gap-1">
                  <input
                    className="border px-1 py-0.5 text-[12px] rounded"
                    autoFocus
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
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
                    onClick={() => onSaveNote(node.id)}
                    title="Uložit"
                  >
                    Uložit
                  </button>
                  <button
                    className="text-[12px] px-1 py-0.5 border rounded"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={onCancelNote}
                    title="Zrušit"
                  >
                    Zrušit
                  </button>
                </span>
              ) : (
                <span
                  className="italic"
                  onDoubleClick={() => onStartEditNote(node.id, node.poznamka || "")}
                  title="Dvojklikem upravit poznámku"
                  style={{ cursor: "text" }}
                >
                  Pozn.: {node.poznamka || "—"}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 whitespace-nowrap">
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
              📄
            </button>
            <button
              className="text-xs bg-red-600 text-white px-2 py-0.5 rounded"
              title="Smazat"
              onClick={() => onDelete(node.id)}
            >
              🗑️
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
