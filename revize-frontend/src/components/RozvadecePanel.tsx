import React, { useContext, useState, ChangeEvent } from "react";
import { RevisionFormContext, Board, Komponenta } from "../context/RevisionFormContext";

type BoardInput = Omit<Board, "id" | "komponenty">;

export default function RozvadecePanel() {
  const { form, setForm } = useContext(RevisionFormContext);
  const boards = (form?.boards ?? []) as Board[];

  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(
    boards.length > 0 ? boards[0].id : null
  );
  const [showDialog, setShowDialog] = useState(false);
  const [newBoard, setNewBoard] = useState<BoardInput>({
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

  const selectedBoard = boards.find((b) => b?.id === selectedBoardId) || null;

  function handleAddBoard() {
    if (!newBoard.name.trim()) {
      alert("Název je povinný");
      return;
    }
    const id = Date.now();
    const board: Board = { id, komponenty: [], ...newBoard };
    setForm((f) => ({ ...f, boards: [...(f.boards ?? []), board] }));
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
  }

  function handleChangeField(field: keyof BoardInput, value: string) {
    if (selectedBoardId === null) return;
    setForm((f) => ({
      ...f,
      boards: (f.boards ?? []).map((b) =>
        b.id === selectedBoardId ? { ...b, [field]: value } : b
      ),
    }));
  }




  return (
    <section className="bg-white p-4 rounded shadow mb-8">
      <h2 className="text-xl font-bold text-blue-800 mb-4">Rozvaděče</h2>
      <div className="flex gap-6">
        {/* Levý panel */}
        <div className="w-1/4">
          <ul className="space-y-1 mb-4">
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
            className="bg-blue-600 text-white w-full py-2 rounded mb-2 text-sm"
            onClick={() => setShowDialog(true)}
          >
            ➕ Přidat rozvaděč
          </button>
        </div>

        {/* Detail rozvaděče */}
        <div className="flex-1">
          {selectedBoard ? (
            <>
              <h3 className="text-lg font-semibold mb-2">
                Detail: {selectedBoard.name}
              </h3>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
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
                  ] as [keyof BoardInput, string][]
                ).map(([key, label]) => (
                  <div key={key}>
                    <label className="text-sm font-medium">{label}</label>
                    <input
                      className="p-2 border rounded w-full text-sm"
                      value={selectedBoard[key]}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        handleChangeField(key, e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>

              {/* Komponenty */}
              <div className="text-right mb-2">
                <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
                  ➕ Přidat komponentu
                </button>
              </div>
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Komponenta</th>
                    <th className="p-2 text-left">Popis</th>
                    <th className="p-2 text-left">Dimenze</th>
                    <th className="p-2 text-left">Riso</th>
                    <th className="p-2 text-left">Ochrana</th>
                    <th className="p-2 text-left">Poznámka</th>
                    <th className="p-2 text-center">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBoard.komponenty.map((k: Komponenta, i: number) => (
                    <tr key={k.id} className="border-t">
                      <td className="p-2">{i + 1})</td>
                      <td className="p-2">{k.nazev}</td>
                      <td className="p-2">{k.popis}</td>
                      <td className="p-2">{k.dimenze}</td>
                      <td className="p-2">{k.riso}</td>
                      <td className="p-2">{k.ochrana}</td>
                      <td className="p-2">{k.poznamka}</td>
                      <td className="p-2 text-center whitespace-nowrap">
                        <button className="text-red-600 px-2">🗑️</button>
                        <button className="text-gray-600 px-2">📋</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-gray-500">Vyberte rozvaděč pro detail.</p>
          )}
        </div>
      </div>

      {/* Dialog pro přidání nového rozvaděče */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Nový rozvaděč</h3>
            <div className="grid md:grid-cols-2 gap-3 mb-4">
              {/* Každé pole výslovně */}
              <div>
                <label className="capitalize text-sm font-medium">name</label>
                <input
                  className="p-2 border rounded w-full text-sm"
                  value={newBoard.name}
                  onChange={(e) =>
                    setNewBoard((b) => ({ ...b, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="capitalize text-sm font-medium">vyrobce</label>
                <input
                  className="p-2 border rounded w-full text-sm"
                  value={newBoard.vyrobce}
                  onChange={(e) =>
                    setNewBoard((b) => ({ ...b, vyrobce: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="capitalize text-sm font-medium">typ</label>
                <input
                  className="p-2 border rounded w-full text-sm"
                  value={newBoard.typ}
                  onChange={(e) =>
                    setNewBoard((b) => ({ ...b, typ: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="capitalize text-sm font-medium">vyrobniCislo</label>
                <input
                  className="p-2 border rounded w-full text-sm"
                  value={newBoard.vyrobniCislo}
                  onChange={(e) =>
                    setNewBoard((b) => ({
                      ...b,
                      vyrobniCislo: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="capitalize text-sm font-medium">napeti</label>
                <input
                  className="p-2 border rounded w-full text-sm"
                  value={newBoard.napeti}
                  onChange={(e) =>
                    setNewBoard((b) => ({ ...b, napeti: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="capitalize text-sm font-medium">proud</label>
                <input
                  className="p-2 border rounded w-full text-sm"
                  value={newBoard.proud}
                  onChange={(e) =>
                    setNewBoard((b) => ({ ...b, proud: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="capitalize text-sm font-medium">ip</label>
                <input
                  className="p-2 border rounded w-full text-sm"
                  value={newBoard.ip}
                  onChange={(e) =>
                    setNewBoard((b) => ({ ...b, ip: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="capitalize text-sm font-medium">odpor</label>
                <input
                  className="p-2 border rounded w-full text-sm"
                  value={newBoard.odpor}
                  onChange={(e) =>
                    setNewBoard((b) => ({ ...b, odpor: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="capitalize text-sm font-medium">umisteni</label>
                <input
                  className="p-2 border rounded w-full text-sm"
                  value={newBoard.umisteni}
                  onChange={(e) =>
                    setNewBoard((b) => ({ ...b, umisteni: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-300 px-4 py-2 rounded text-sm"
                onClick={() => setShowDialog(false)}
              >
                Zrušit
              </button>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
                onClick={handleAddBoard}
              >
                Přidat
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
