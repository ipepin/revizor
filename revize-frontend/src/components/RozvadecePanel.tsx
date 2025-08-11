// src/components/RozvadecePanel.tsx
import React, { useState, useEffect, useRef } from "react";
import api from "../api/axios"; // ← axios klient s JWT z interceptora
import { useRevisionForm, Board, Komponenta } from "../context/RevisionFormContext";
import ComponentRow from "./ComponentRow";
import AddCompDialog from "./AddCompDialog";

const polesOptions = ["1", "1+N", "3", "3+N"];
const dimenzeOptions: string[] = [
  ...["CYKY", "AYKY"].flatMap((t) =>
    ["2×1,5", "3×1,5", "5×1,5", "2×2,5", "3×2,5", "5×2,5", "3×4", "3×6", "3×10", "3×16", "3×25", "3×35"].map(
      (p) => `${t} ${p}`
    )
  ),
  ...["1,5", "2,5", "4", "6", "10", "16", "25", "35"].map((p) => `CYA ${p}`),
];

export default function RozvadecePanel() {
  const { form, setForm } = useRevisionForm();
  const boards = form.boards;

  // State for boards
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(boards[0]?.id ?? null);
  const [showBoardDialog, setShowBoardDialog] = useState(false);
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
  const selectedBoard = boards.find((b) => b.id === selectedBoardId) || null;

  // State for components
  const boardRef = useRef<HTMLDivElement>(null);
  const [showCompDialog, setShowCompDialog] = useState(false);
  const defaultComp: Komponenta = {
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
  };
  const [newComp, setNewComp] = useState<Komponenta>({ ...defaultComp });
  const [isCustom, setIsCustom] = useState(false);
  const [editingCompId, setEditingCompId] = useState<number | null>(null);
  const [selectedCompId, setSelectedCompId] = useState<number | null>(null);

  // Catalog data
  const [types, setTypes] = useState<{ id: number; name: string }[]>([]);
  const [manufacturers, setManufacturers] = useState<{ id: number; name: string }[]>([]);
  const [models, setModels] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    let cancel = false;
    api
      .get("/catalog/types")
      .then((r) => !cancel && setTypes(r.data))
      .catch(() => {});
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

  // Handlers
  function handleAddBoard() {
    if (!newBoard.name.trim()) return alert("Název povinný");
    const id = Date.now();
    setForm((f) => ({ ...f, boards: [...f.boards, { id, komponenty: [], ...newBoard }] }));
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
    setShowBoardDialog(false);
    setSelectedBoardId(id);
  }

  function handleCopyBoard() {
    if (!selectedBoard) return;
    const copy = {
      ...selectedBoard,
      id: Date.now(),
      komponenty: selectedBoard.komponenty.map((c) => ({ ...c, id: Date.now() + Math.random() })),
    };
    setForm((f) => ({ ...f, boards: [...f.boards, copy] }));
    setSelectedBoardId(copy.id);
  }

  function handleDeleteBoard() {
    if (!selectedBoardId) return;
    if (window.confirm("Opravdu chcete smazat tento rozvaděč?")) {
      const newBoards = form.boards.filter((b) => b.id !== selectedBoardId);
      setForm((f) => ({ ...f, boards: newBoards }));
      setSelectedBoardId(newBoards[0]?.id ?? null);
    }
  }

  function handleAddComponent() {
    if (!selectedBoardId) return;
    const comp: Komponenta = { ...newComp, id: Date.now() };
    setForm((f) => ({
      ...f,
      boards: f.boards.map((b) => (b.id === selectedBoardId ? { ...b, komponenty: [...b.komponenty, comp] } : b)),
    }));
    setNewComp({ ...defaultComp });
    setIsCustom(false);
    setShowCompDialog(false);
  }

  function handleCopyComponent(cId: number) {
    if (!selectedBoard) return;
    const orig = selectedBoard.komponenty.find((x) => x.id === cId);
    if (!orig) return;
    const copy = { ...orig, id: Date.now() };
    setForm((f) => ({
      ...f,
      boards: f.boards.map((b) => (b.id === selectedBoardId ? { ...b, komponenty: [...b.komponenty, copy] } : b)),
    }));
  }

  function handleDeleteComponent(cId: number) {
    setForm((f) => ({
      ...f,
      boards: f.boards.map((b) =>
        b.id === selectedBoardId ? { ...b, komponenty: b.komponenty.filter((x) => x.id !== cId) } : b
      ),
    }));
    if (selectedCompId === cId) setSelectedCompId(null);
    if (editingCompId === cId) setEditingCompId(null);
  }

  function updateCompField(cId: number, field: keyof Komponenta, val: string) {
    setForm((f) => ({
      ...f,
      boards: f.boards.map((b) =>
        b.id === selectedBoardId
          ? { ...b, komponenty: b.komponenty.map((x) => (x.id === cId ? { ...x, [field]: val } : x)) }
          : b
      ),
    }));
  }

  function renderCell(c: Komponenta, field: keyof Komponenta, isEd: boolean) {
    const val = c[field] as string;
    if (!isEd) return <span onDoubleClick={() => setEditingCompId(c.id)}>{val}</span>;
    if (field === "poles" || field === "dimenze") {
      const opts = field === "poles" ? polesOptions : dimenzeOptions;
      return (
        <select
          className="w-full p-1 border rounded"
          value={val}
          onChange={(e) => updateCompField(c.id, field, e.target.value)}
        >
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        className="w-full p-1 border rounded text-sm"
        value={val}
        onChange={(e) => updateCompField(c.id, field, e.target.value)}
      />
    );
  }

  return (
    <section className="bg-white p-4 rounded shadow mb-8">
      <div className="flex gap-6 mb-4">
        <aside className="w-1/4">
          <h2 className="text-lg font-semibold mb-2">Rozvaděče:</h2>
          <div className="border rounded p-2 mb-4">
            <ul className="space-y-1">
              {boards.map((b) => (
                <li
                  key={b.id}
                  onClick={() => {
                    setSelectedBoardId(b.id);
                  }}
                  className={`p-2 rounded cursor-pointer hover:bg-blue-50 ${
                    b.id === selectedBoardId ? "bg-blue-100 font-semibold" : ""
                  }`}
                >
                  {b.name || "(bez názvu)"}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-2 mb-4">
            <button className="flex-1 bg-blue-600 text-white py-1 rounded text-sm" onClick={() => setShowBoardDialog(true)}>
              ➕ Přidat rozvaděč
            </button>
            {selectedBoard && (
              <>
                <button className="flex-1 bg-yellow-500 text-white py-1 rounded text-sm" onClick={handleCopyBoard}>
                  📄 Kopírovat rozvaděč
                </button>
                <button className="flex-1 bg-red-600 text-white py-1 rounded text-sm" onClick={handleDeleteBoard}>
                  🗑️ Smazat rozvaděč
                </button>
              </>
            )}
          </div>
          {showBoardDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded shadow w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Nový rozvaděč</h3>
                <div className="grid grid-cols-1 gap-4">
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
                    Přidat rozvaděč
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>

        <div className="flex-1 overflow-auto p-4" ref={boardRef}>
          {selectedBoard ? (
            <div className="grid md:grid-cols-3 gap-4">
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
              ).map(([k, label]) => (
                <div key={k}>
                  <label className="block text-sm font-medium">{label}</label>
                  <div className="p-2">{(selectedBoard as any)[k]}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500">Vyberte rozvaděč</div>
          )}
        </div>
      </div>

      {selectedBoard && (
        <>
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                {["#", "Přístroj", "Výrobce", "Typ", "Počet pólů", "Dimenze", "Riso [Ω]", "Ochrana [Ω]", "Poznámka", "Akce"].map(
                  (h) => (
                    <th key={h} className="p-2 text-center">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {selectedBoard.komponenty.map((c, i) => (
                <ComponentRow
                  key={c.id}
                  c={c}
                  index={i}
                  isEditing={c.id === editingCompId}
                  onSelect={() => setSelectedCompId(c.id)}
                  onEditToggle={() => setEditingCompId((p) => (p === c.id ? null : c.id))}
                  onCopy={() => handleCopyComponent(c.id)}
                  onDelete={() => handleDeleteComponent(c.id)}
                  onSave={() => setEditingCompId(null)}
                  renderCell={renderCell}
                />
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex justify-end">
            <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm" onClick={() => setShowCompDialog(true)}>
              ➕ Přidat komponentu
            </button>
          </div>
        </>
      )}

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
          onCancel={() => {
            setShowCompDialog(false);
            setIsCustom(false);
          }}
          onAdd={handleAddComponent}
        />
      )}
    </section>
  );
}
