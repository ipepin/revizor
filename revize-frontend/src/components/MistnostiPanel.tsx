import React, { useState } from "react";

export default function MistnostiPanel() {
  const [rooms, setRooms] = useState<string[]>(["Obývací pokoj"]);
  const [selected, setSelected] = useState<number>(0);

  const handleAdd = () => setRooms([...rooms, `Místnost ${rooms.length + 1}`]);
  const handleDelete = () => {
    if (rooms.length > 1) {
      const updated = [...rooms];
      updated.splice(selected, 1);
      setRooms(updated);
      setSelected(0);
    }
  };

  return (
    <div className="border p-4 rounded bg-white shadow">
      <h3 className="text-lg font-semibold mb-2 text-green-700">🏠 Místnosti</h3>
      <ul className="space-y-1 mb-3">
        {rooms.map((r, i) => (
          <li
            key={i}
            className={`cursor-pointer px-2 py-1 rounded ${
              selected === i ? "bg-green-100 font-bold" : "hover:bg-gray-100"
            }`}
            onClick={() => setSelected(i)}
          >
            {r}
          </li>
        ))}
      </ul>
      <div className="flex gap-2 text-sm">
        <button onClick={handleAdd} className="bg-green-500 text-white px-2 py-1 rounded">+ Přidat</button>
        <button onClick={handleDelete} className="bg-red-500 text-white px-2 py-1 rounded">🗑️ Smazat</button>
      </div>

      <div className="mt-4">
        <h4 className="font-semibold text-sm mb-1">Zařízení v místnosti</h4>
        <p className="text-gray-500 text-sm italic">Zde bude tabulka přístrojů (zásuvky, světla...)</p>
      </div>
    </div>
  );
}
