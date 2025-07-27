import React, { useState, useContext, ChangeEvent, useEffect } from "react";
import { CatalogContext } from "../context/CatalogContext";

type Komponenta = {
  id: number;
  nazev: string;
  popis: string;
  dimenze: string;
  riso: string;
  ochrana: string;
  poznamka: string;
};

type Board = {
  id: number;
  name: string;
  vyrobce: string;
  typ: string;
  vyrobniCislo: string;
  napeti: string;
  proud: string;
  ip: string;
  odpor: string;
  umisteni: string;
  komponenty: Komponenta[];
};

type BoardFields = Omit<Board, "id" | "komponenty">;

export default function RozvadecePanel() {
  const { types } = useContext(CatalogContext);

  // Rozvaděče
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const selectedBoard = boards.find((b) => b.id === selectedBoardId);

  // Inline editace rozvaděče
  const [isBoardEditing, setIsBoardEditing] = useState(false);
  const [boardEditValues, setBoardEditValues] = useState<BoardFields>({
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

  // Dialog pro nový rozvaděč
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

  // Dialog pro novou komponentu
  const [showCompDialog, setShowCompDialog] = useState(false);
  const [compForm, setCompForm] = useState<{
    typ: string;
    vyrobce: string;
    customVyrobce: string;
    model: string;
    popis: string;
    dimenze: string;
    riso: string;
    ochrana: string;
    poznamka: string;
  }>({
    typ: "",
    vyrobce: "",
    customVyrobce: "",
    model: "",
    popis: "",
    dimenze: "",
    riso: "",
    ochrana: "",
    poznamka: "",
  });

  // Inline editace komponenty
  const [editingCompId, setEditingCompId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Partial<Komponenta>>({});

  const handleBoardEditField = (
  field: keyof BoardFields,
  val: string
  ) => {
  setBoardEditValues(v => ({ ...v, [field]: val }));
};
  // Synchronizace boardEditValues při výběru rozvaděče
  useEffect(() => {
    if (selectedBoard) {
      const { id, komponenty, ...fields } = selectedBoard;
      setBoardEditValues(fields);
      setIsBoardEditing(false);
      setEditingCompId(null);
    }
  }, [selectedBoard]);

  // Handlery pro přidání / úpravu rozvaděče
  const handleAddBoard = () => {
    if (!newBoard.name.trim()) return alert("Název je povinný");
    const id = Date.now();
    setBoards([...boards, { id, komponenty: [], ...newBoard }]);
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
  };
  const handleBoardField = (field: keyof typeof newBoard, val: string) =>
    setNewBoard({ ...newBoard, [field]: val });
  const startBoardEdit = () => selectedBoard && setIsBoardEditing(true);
  const cancelBoardEdit = () => {
    if (!selectedBoard) return;
    const { id, komponenty, ...fields } = selectedBoard;
    setBoardEditValues(fields);
    setIsBoardEditing(false);
  };
  const saveBoardEdit = () => {
    if (!selectedBoard) return;
    setBoards(
      boards.map((b) =>
        b.id === selectedBoard.id ? { ...b, ...boardEditValues } : b
      )
    );
    setIsBoardEditing(false);
  };

  // Handlery pro mazání / kopírování rozvaděče
  const deleteBoard = () => {
    if (!selectedBoard) return;
    setBoards(boards.filter((b) => b.id !== selectedBoard.id));
    setSelectedBoardId(null);
  };
  const copyBoard = () => {
    if (!selectedBoard) return;
    const copy = {
      ...selectedBoard,
      id: Date.now(),
      komponenty: [...selectedBoard.komponenty],
    };
    setBoards([...boards, copy]);
    setSelectedBoardId(copy.id);
  };

  // Handlery pro komponenty
  const openCompDialog = () => {
    setCompForm({
      typ: "",
      vyrobce: "",
      customVyrobce: "",
      model: "",
      popis: "",
      dimenze: "",
      riso: "",
      ochrana: "",
      poznamka: "",
    });
    setShowCompDialog(true);
  };
  const handleCompField = (field: keyof typeof compForm, val: string) => {
    if (field === "vyrobce" && val !== "__own__") {
      setCompForm((f) => ({ ...f, vyrobce: val, customVyrobce: "" }));
    } else {
      setCompForm((f) => ({ ...f, [field]: val }));
    }
  };
  const handleAddComponent = () => {
    if (!selectedBoard) return;
    if (
      !compForm.typ ||
      !compForm.vyrobce ||
      (compForm.vyrobce === "__own__" && !compForm.customVyrobce) ||
      !compForm.model
    ) {
      return alert(
        "Vyber typ, výrobce i model; u vlastního výrobce zadej text."
      );
    }
    const id = Date.now();
    const maker =
      compForm.vyrobce === "__own__"
        ? compForm.customVyrobce
        : compForm.vyrobce;
    const nazev = `${compForm.typ} ${maker} ${compForm.model}`;
    const newComp: Komponenta = {
      id,
      nazev,
      popis: compForm.popis,
      dimenze: compForm.dimenze,
      riso: compForm.riso,
      ochrana: compForm.ochrana,
      poznamka: compForm.poznamka,
    };
    setBoards(
      boards.map((b) =>
        b.id === selectedBoard.id
          ? { ...b, komponenty: [...b.komponenty, newComp] }
          : b
      )
    );
    setShowCompDialog(false);
  };
  const handleDeleteComponent = (compId: number) => {
    if (!selectedBoard) return;
    setBoards(
      boards.map((b) =>
        b.id === selectedBoard.id
          ? {
              ...b,
              komponenty: b.komponenty.filter((k) => k.id !== compId),
            }
          : b
      )
    );
  };
  const handleCopyComponent = (compId: number) => {
    if (!selectedBoard) return;
    const original = selectedBoard.komponenty.find((k) => k.id === compId);
    if (!original) return;
    const copy: Komponenta = { ...original, id: Date.now() };
    setBoards(
      boards.map((b) =>
        b.id === selectedBoard.id
          ? { ...b, komponenty: [...b.komponenty, copy] }
          : b
      )
    );
  };

  // Inline editace řádku komponenty
  const startEdit = (k: Komponenta) => {
    setEditingCompId(k.id);
    setEditValues({ ...k });
  };
  const cancelEdit = () => {
    setEditingCompId(null);
    setEditValues({});
  };
  const handleEditField = (field: keyof Komponenta, val: string) =>
    setEditValues((v) => ({ ...v, [field]: val }));
  const saveEdit = () => {
    if (!selectedBoard || editingCompId == null) return;
    setBoards(
      boards.map((b) =>
        b.id === selectedBoard.id
          ? {
              ...b,
              komponenty: b.komponenty.map((k) =>
                k.id === editingCompId
                  ? { ...(k as any), ...(editValues as any) }
                  : k
              ),
            }
          : b
      )
    );
    cancelEdit();
  };

  // Dependent dropdown data
  const availableMakers =
    types.find((t) => t.name === compForm.typ)?.manufacturers || [];
  const availableModels =
    availableMakers.find((m) => m.name === compForm.vyrobce)?.models || [];

  return (
    <div className="w-full bg-white p-4 rounded shadow mb-8">
      {/* Toolbar rozvaděčů */}
      <div className="flex gap-4 mb-4">
        <button
          className="bg-blue-600 text-white py-1 px-3 rounded"
          onClick={() => setShowBoardDialog(true)}
        >
          ➕ Přidat rozvaděč
        </button>
        <button
          className="bg-gray-300 py-1 px-3 rounded"
          onClick={deleteBoard}
        >
          🗑️ Smazat
        </button>
        <button
          className="bg-gray-300 py-1 px-3 rounded"
          onClick={copyBoard}
        >
          📋 Kopírovat
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Seznam rozvaděčů */}
        <div className="md:w-1/4">
          <ul className="space-y-1 mb-4">
            {boards.map((b) => (
              <li
                key={b.id}
                onClick={() => setSelectedBoardId(b.id)}
                className={`p-2 border rounded cursor-pointer hover:bg-blue-100 ${
                  b.id === selectedBoardId
                    ? "bg-blue-200 font-semibold"
                    : ""
                }`}
              >
                {b.name || "(Bez názvu)"}
              </li>
            ))}
          </ul>
        </div>

        {/* Detail rozvaděče */}
        <div className="flex-1">
          {selectedBoard ? (
            <>
              {/* Nadpis + inline edit pencil */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">
                  Detail rozvaděče:{" "}
                  {isBoardEditing
                    ? boardEditValues.name
                    : selectedBoard.name}
                </h3>
                {isBoardEditing ? (
                  <div>
                    <button
                      onClick={saveBoardEdit}
                      className="px-2 text-green-600"
                    >
                      💾
                    </button>
                    <button
                      onClick={cancelBoardEdit}
                      className="px-2 text-red-600"
                    >
                      ✖️
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startBoardEdit}
                    className="px-2 text-blue-600"
                  >
                    ✏️
                  </button>
                )}
              </div>

              {/* Vlastnosti rozvaděče */}
              <div className="grid md:grid-cols-3 gap-3 mb-4 text-sm">
              {(
                [
                  ["Název", "name"],
                  ["Výrobce", "vyrobce"],
                  ["Typ", "typ"],
                  ["Výrobní číslo", "vyrobniCislo"],
                  ["Napětí", "napeti"],
                  ["Proud", "proud"],
                  ["IP krytí", "ip"],
                  ["Přechodový odpor", "odpor"],
                  ["Umístění", "umisteni"],
                ] as const
              ).map(([label, key]) => (
                <div key={key}>
                  <label className="text-xs font-medium">{label}</label>
                  {isBoardEditing ? (
                    <input
                      className="p-1 border rounded w-full text-sm"
                      value={(boardEditValues as any)[key] as string}
                      onChange={(e) =>
                        handleBoardEditField(
                          key as keyof BoardFields,
                          e.target.value
                        )
                      }
                    />
                  ) : (
                    <div className="p-1 text-sm">
                      {(selectedBoard as any)[key]}
                    </div>
                  )}
                </div>
              ))}
            </div>

              {/* Tabulka komponent */}
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2 text-left">Komponenta</th>
                    <th className="p-2 text-left">Popis</th>
                    <th className="p-2 text-left">Dimenze</th>
                    <th className="p-2 text-left">Riso [MΩ]</th>
                    <th className="p-2 text-left">Ochrana [Ω]</th>
                    <th className="p-2 text-left">Poznámka</th>
                    <th className="p-2 text-left">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBoard.komponenty.map((k, idx) => {
                    const isEditing = k.id === editingCompId;
                    return (
                      <tr key={k.id} className="border-t">
                        <td className="p-2">{idx + 1}</td>
                        {(
                          [
                            "nazev",
                            "popis",
                            "dimenze",
                            "riso",
                            "ochrana",
                            "poznamka",
                          ] as (keyof Komponenta)[]
                        ).map((f) => (
                          <td className="p-2" key={f}>
                            {isEditing ? (
                              <input
                                className="border rounded p-1 w-full text-sm"
                                value={(editValues as any)[f] as string || ""}
                                onChange={(
                                  e: ChangeEvent<HTMLInputElement>
                                ) =>
                                  handleEditField(f, e.target.value)
                                }
                              />
                            ) : (
                              k[f]
                            )}
                          </td>
                        ))}
                        <td className="p-2 whitespace-nowrap">
                          {isEditing ? (
                            <>
                              <button onClick={saveEdit} className="px-2">
                                💾
                              </button>
                              <button onClick={cancelEdit} className="px-2">
                                ✖️
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(k)}
                                className="px-2"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteComponent(k.id)}
                                className="px-2"
                              >
                                🗑️
                              </button>
                              <button
                                onClick={() => handleCopyComponent(k.id)}
                                className="px-2"
                              >
                                📋
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Přidat komponentu */}
              <div className="mt-2 text-right">
                <button
                  className="bg-blue-600 text-white py-1 px-3 rounded text-sm"
                  onClick={openCompDialog}
                >
                  ➕ Přidat komponentu
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-500">
              Vyber rozvaděč pro zobrazení detailů.
            </p>
          )}
        </div>
      </div>

      {/* Dialog Nový Rozvaděč */}
      {showBoardDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4">Nový rozvaděč</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {Object.entries(newBoard).map(([key, val]) => (
                <div key={key}>
                  <label className="text-sm font-medium capitalize">
                    {key}
                  </label>
                  <input
                    className="p-2 border rounded w-full text-sm"
                    value={val}
                    onChange={(e) =>
                      handleBoardField(key as any, e.target.value)
                    }
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <button
                className="bg-gray-300 px-4 py-2 rounded"
                onClick={() => setShowBoardDialog(false)}
              >
                Zrušit
              </button>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded"
                onClick={handleAddBoard}
              >
                Přidat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog Nová Komponenta */}
      {showCompDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Nová komponenta</h2>
            <div className="space-y-3 mb-4 text-sm">
              <div>
                <label className="block text-xs font-medium">Typ</label>
                <select
                  className="p-2 border rounded w-full text-sm"
                  value={compForm.typ}
                  onChange={(e) =>
                    handleCompField("typ", e.target.value)
                  }
                >
                  <option value="">Vyber typ</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium">Výrobce</label>
                {compForm.vyrobce === "__own__" ? (
                  <input
                    className="p-2 border rounded w-full text-sm"
                    placeholder="Zadej vlastního výrobce"
                    value={compForm.customVyrobce}
                    onChange={(e) =>
                      handleCompField("customVyrobce", e.target.value)
                    }
                  />
                ) : (
                  <select
                    className="p-2 border rounded w-full text-sm"
                    value={compForm.vyrobce}
                    onChange={(e) =>
                      handleCompField("vyrobce", e.target.value)
                    }
                    disabled={!compForm.typ}
                  >
                    <option value="">Vyber výrobce</option>
                    {availableMakers.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                    <option
                      value="__own__"
                      className="italic text-gray-400"
                    >
                      Vlastní…
                    </option>
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium">Model</label>
                <select
                  className="p-2 border rounded w-full text-sm"
                  value={compForm.model}
                  onChange={(e) =>
                    handleCompField("model", e.target.value)
                  }
                  disabled={
                    !compForm.vyrobce ||
                    compForm.vyrobce === "__own__"
                  }
                >
                  <option value="">Vyber model</option>
                  {availableModels.map((mo) => (
                    <option key={mo.id} value={mo.name}>
                      {mo.name}
                    </option>
                  ))}
                </select>
              </div>
              {(
                [
                  "popis",
                  "dimenze",
                  "riso",
                  "ochrana",
                  "poznamka",
                ] as (keyof typeof compForm)[]
              ).map((f) => (
                <div key={f}>
                  <label className="block text-xs font-medium capitalize">
                    {f}
                  </label>
                  <input
                    className="p-2 border rounded w-full text-sm"
                    value={(compForm as any)[f]}
                    onChange={(e) =>
                      handleCompField(f, e.target.value)
                    }
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <button
                className="bg-gray-300 px-4 py-2 rounded text-sm"
                onClick={() => setShowCompDialog(false)}
              >
                Zrušit
              </button>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
                onClick={handleAddComponent}
              >
                Přidat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
