import React, { useState } from "react";

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

export default function RozvadecePanel() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [newBoard, setNewBoard] = useState({
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

  const selectedBoard = boards.find((b) => b.id === selectedBoardId);

  const handleAddBoard = () => {
    if (!newBoard.name.trim()) return alert("Název je povinný");
    const id = Date.now();
    setBoards([
      ...boards,
      { id, komponenty: [], ...newBoard },
    ]);
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
    setShowDialog(false);
    setSelectedBoardId(id);
  };

  const handleChangeField = (field: keyof Board, value: string) => {
    if (!selectedBoard) return;
    setBoards(
      boards.map((b) =>
        b.id === selectedBoard.id ? { ...b, [field]: value } : b
      )
    );
  };

  return (
    <div className="w-full bg-white p-2 rounded shadow mb-8">
      <h2 className="text-xl font-bold text-blue-800 mb-2">Rozvaděče</h2>

      {/* Rozvaděče seznam */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:w-1/4">
          <ul className="space-y-1 mb-2">
            {boards.map((b) => (
              <li
                key={b.id}
                onClick={() => setSelectedBoardId(b.id)}
                className={`p-2 border rounded cursor-pointer hover:bg-blue-100 ${
                  b.id === selectedBoardId ? "bg-blue-200 font-semibold" : ""
                }`}
              >
                {b.name || "(Bez názvu)"}
              </li>
            ))}
          </ul>
          <button
            className="bg-blue-600 text-white text-sm px-3 py-1 rounded mb-1"
            onClick={() => setShowDialog(true)}
          >
            ➕ Přidat rozvaděč
          </button>
          <button className="bg-gray-300 text-sm px-3 py-1 rounded mb-1">
            🗑️ Smazat
          </button>
          <button className="bg-gray-300 text-sm px-3 py-1 rounded">
            📋 Kopírovat
          </button>
        </div>

        {/* Detail rozvaděče */}
        <div className="flex-1 border p-2 rounded">
          {selectedBoard ? (
            <>
              <h3 className="text-lg font-semibold mb-2">
                Detail rozvaděče: {selectedBoard.name}
              </h3>
              <div className="grid md:grid-cols-3 gap-2 mb-2">
                {[
                  { label: "Název", key: "name" },
                  { label: "Výrobce", key: "vyrobce" },
                  { label: "Typ", key: "typ" },
                  { label: "Výrobní číslo", key: "vyrobniCislo" },
                  { label: "Napětí", key: "napeti" },
                  { label: "Proud", key: "proud" },
                  { label: "IP krytí", key: "ip" },
                  { label: "Přechodový odpor", key: "odpor" },
                  { label: "Umístění", key: "umisteni" },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="text-xs font-medium">{label}</label>
                    <input
                      className="p-1 border rounded w-full"
                      value={(selectedBoard as any)[key]}
                      onChange={(e) => handleChangeField(key as any, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              {/* Komponenty */}
              <div className="text-right mb-2">
                <button className="bg-blue-600 text-white px-3 py-1 rounded">
                  ➕ Přidat komponentu
                </button>
              </div>

              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Komponenta</th>
                    <th className="p-2 text-left">Popis</th>
                    <th className="p-2 text-left">Dimenze</th>
                    <th className="p-2 text-left">Riso [MΩ]</th>
                    <th className="p-2 text-left">Ochrana [Ω]</th>
                    <th className="p-2 text-left">Poznámka</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBoard.komponenty.map((k) => (
                    <tr key={k.id} className="border-t">
                      <td className="p-2">{k.nazev}</td>
                      <td className="p-2">{k.popis}</td>
                      <td className="p-2">{k.dimenze}</td>
                      <td className="p-2">{k.riso}</td>
                      <td className="p-2">{k.ochrana}</td>
                      <td className="p-2">{k.poznamka}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-gray-500">Vyber rozvaděč pro zobrazení detailů.</p>
          )}
        </div>
      </div>

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-4 rounded shadow w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-3">Nový rozvaděč</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              {Object.entries(newBoard).map(([key, val]) => (
                <div key={key}>
                  <label className="text-xs font-medium capitalize">{key}</label>
                  <input
                    className="p-1 border rounded w-full"
                    value={val}
                    onChange={(e) =>
                      setNewBoard({ ...newBoard, [key]: e.target.value })
                    }
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <button className="bg-gray-300 px-3 py-1 rounded" onClick={() => setShowDialog(false)}>Zrušit</button>
              <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={handleAddBoard}>Přidat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
