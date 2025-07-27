import React, { useState, useEffect, ChangeEvent } from "react";

type Device = {
  id: number;
  typ: string;
  dimenze: string;
  pocet: number;
  ochrana: string;
  riso: string;
  podrobnosti: string;
};

type Room = {
  id: number;
  name: string;
  details: string;
  devices: Device[];
};

export default function RoomPanel() {
  // katalog typů a dimenzí
  const deviceTypes = [
    "Zásuvka 230V",
    "Zásuvka 400V",
    "Lustr",
    "Světlo LED",
    "Světlo nástěnné",
  ];
  const allDimensions: string[] = [];
  for (const typ of ["CYKY", "AYKY"]) {
    for (const prurez of [
      "2×1,5","3×1,5","5×1,5",
      "2×2,5","3×2,5","5×2,5",
      "3×4","3×6","3×10","3×16","3×25","3×35",
    ]) {
      allDimensions.push(`${typ} ${prurez}`);
    }
  }
  for (const prurez of ["1,5","2,5","4","6","10","16","25","35"]) {
    allDimensions.push(`CYA ${prurez}`);
  }

  // stav místností
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  // inline editace místnosti
  const [isRoomEditing, setIsRoomEditing] = useState(false);
  const [roomEdit, setRoomEdit] = useState({ name: "", details: "" });

  // dialog pro přidání místnosti
  const [showRoomDialog, setShowRoomDialog] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: "", details: "" });

  // dialog pro přidání přístroje
  const [showDeviceDialog, setShowDeviceDialog] = useState(false);
  const [deviceForm, setDeviceForm] = useState({
    pocet: 1,
    typ: "",
    dimenze: "",
    customDimenze: "",
    ochrana: "",
    riso: "",
    podrobnosti: "",
  });

  // inline editace přístroje
  const [editingDeviceId, setEditingDeviceId] = useState<number | null>(null);
  const [deviceEdit, setDeviceEdit] = useState<Partial<Device>>({});

  // synchronizace inline-edit místnosti
  useEffect(() => {
    if (!selectedRoom) return;
    setRoomEdit({ name: selectedRoom.name, details: selectedRoom.details });
    setIsRoomEditing(false);
    setEditingDeviceId(null);
  }, [selectedRoomId]);

  // —— Handlery místností ——
  const handleAddRoom = () => {
    if (!newRoom.name.trim()) return alert("Zadej název místnosti");
    const id = Date.now();
    setRooms([...rooms, { id, devices: [], ...newRoom }]);
    setNewRoom({ name: "", details: "" });
    setShowRoomDialog(false);
    setSelectedRoomId(id);
  };
  const handleRoomDialogField = (field: "name" | "details", val: string) =>
    setNewRoom(r => ({ ...r, [field]: val }));
  const startRoomEdit = () => selectedRoom && setIsRoomEditing(true);
  const cancelRoomEdit = () => {
    if (!selectedRoom) return;
    setRoomEdit({ name: selectedRoom.name, details: selectedRoom.details });
    setIsRoomEditing(false);
  };
  const saveRoomEdit = () => {
    if (!selectedRoom) return;
    setRooms(rs =>
      rs.map(r => r.id === selectedRoom.id ? { ...r, ...roomEdit } : r)
    );
    setIsRoomEditing(false);
  };
  const deleteRoom = () => {
    if (!selectedRoom) return;
    setRooms(rs => rs.filter(r => r.id !== selectedRoom.id));
    setSelectedRoomId(null);
  };
  const copyRoom = () => {
    if (!selectedRoom) return;
    const copy: Room = {
      ...selectedRoom,
      id: Date.now(),
      devices: [...selectedRoom.devices],
    };
    setRooms(rs => [...rs, copy]);
    setSelectedRoomId(copy.id);
  };

  // —— Handlery přístrojů ——
  const openDeviceDialog = () => {
    setDeviceForm({
      pocet: 1,
      typ: "",
      dimenze: "",
      customDimenze: "",
      ochrana: "",
      riso: "",
      podrobnosti: "",
    });
    setShowDeviceDialog(true);
  };
  const handleDeviceField = (field: keyof typeof deviceForm, val: string | number) => {
    if (field === "dimenze" && val !== "__own__") {
      setDeviceForm(df => ({ ...df, dimenze: val as string, customDimenze: "" }));
    } else if (field === "pocet") {
      setDeviceForm(df => ({ ...df, pocet: Number(val) }));
    } else {
      setDeviceForm(df => ({ ...df, [field]: val }));
    }
  };
  const handleAddDevice = () => {
    if (
      !selectedRoom ||
      !deviceForm.typ ||
      (!deviceForm.dimenze && !deviceForm.customDimenze)
    ) {
      return alert("Vyber typ a dimenzi (nebo zadej vlastní)");
    }
    const id = Date.now();
    const dim = deviceForm.dimenze === "__own__"
      ? deviceForm.customDimenze
      : deviceForm.dimenze;
    const newDev: Device = {
      id,
      pocet: deviceForm.pocet,
      typ: deviceForm.typ,
      dimenze: dim,
      ochrana: deviceForm.ochrana,
      riso: deviceForm.riso,
      podrobnosti: deviceForm.podrobnosti,
    };
    setRooms(rs =>
      rs.map(r => r.id === selectedRoom.id
        ? { ...r, devices: [...r.devices, newDev] }
        : r
      )
    );
    setShowDeviceDialog(false);
  };
  const deleteDevice = (id: number) => {
    if (!selectedRoom) return;
    setRooms(rs =>
      rs.map(r => r.id === selectedRoom.id
        ? { ...r, devices: r.devices.filter(d => d.id !== id) }
        : r
      )
    );
  };
  const copyDevice = (id: number) => {
    if (!selectedRoom) return;
    const orig = selectedRoom.devices.find(d => d.id === id);
    if (!orig) return;
    const copy = { ...orig, id: Date.now() };
    setRooms(rs =>
      rs.map(r => r.id === selectedRoom.id
        ? { ...r, devices: [...r.devices, copy] }
        : r
      )
    );
  };

  // —— Inline editace přístroje ——
  const startEditDevice = (d: Device) => {
    setEditingDeviceId(d.id);
    setDeviceEdit({ ...d });
  };
  const cancelEditDevice = () => {
    setEditingDeviceId(null);
    setDeviceEdit({});
  };
  const handleEditDeviceField = (field: keyof Device, val: string) =>
    setDeviceEdit(v => ({ ...v, [field]: field === "pocet" ? Number(val) : val }));
  const saveEditDevice = () => {
    if (!selectedRoom || editingDeviceId == null) return;
    setRooms(rs =>
      rs.map(r => r.id === selectedRoom.id
        ? {
            ...r,
            devices: r.devices.map(d =>
              d.id === editingDeviceId
                ? { ...(d as any), ...(deviceEdit as any) }
                : d
            ),
          }
        : r
      )
    );
    cancelEditDevice();
  };

  return (
    <div className="w-full bg-white p-4 rounded shadow mb-8">
      <h2 className="text-xl font-bold text-blue-800 mb-4">Místnosti</h2>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Levý sloupec */}
        <div className="md:w-1/4">
          <div className="flex gap-4 mb-4">
            <button
              className="bg-blue-600 text-white py-1 px-3 rounded text-sm"
              onClick={() => setShowRoomDialog(true)}
            >
              ➕ Přidat místnost
            </button>
            <button
              className="bg-gray-300 py-1 px-3 rounded text-sm"
              onClick={deleteRoom}
            >
              🗑️ Smazat
            </button>
            <button
              className="bg-gray-300 py-1 px-3 rounded text-sm"
              onClick={copyRoom}
            >
              📋 Kopírovat
            </button>
          </div>
          <ul className="space-y-1">
            {rooms.map(r => (
              <li
                key={r.id}
                onClick={() => setSelectedRoomId(r.id)}
                className={`p-2 border rounded cursor-pointer hover:bg-blue-100 ${
                  r.id === selectedRoomId ? "bg-blue-200 font-semibold" : ""
                }`}
              >
                {r.name || "(Bez názvu)"}
              </li>
            ))}
          </ul>
        </div>

        {/* Pravý sloupec */}
        <div className="flex-1">
          {selectedRoom ? (
            <>
              {/* Inline editace názvu */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">
                  Místnost:{" "}
                  {isRoomEditing ? roomEdit.name : selectedRoom.name}
                </h3>
                {isRoomEditing ? (
                  <div>
                    <button onClick={saveRoomEdit} className="px-2 text-green-600">💾</button>
                    <button onClick={cancelRoomEdit} className="px-2 text-red-600">✖️</button>
                  </div>
                ) : (
                  <button onClick={startRoomEdit} className="px-2 text-blue-600">✏️</button>
                )}
              </div>

              {/* Políčka místnosti */}
              <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm">
                {(["name","details"] as const).map(key => (
                  <div key={key}>
                    <label className="block text-xs font-medium">
                      {key==="name" ? "Název" : "Podrobnosti"}
                    </label>
                    {isRoomEditing ? (
                      <input
                        className="p-2 border rounded w-full text-sm"
                        value={(roomEdit as any)[key]}
                        onChange={e => setRoomEdit(v => ({ ...v, [key]: e.target.value }))}
                      />
                    ) : (
                      <div className="p-2 text-sm">{(selectedRoom as any)[key]}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Tabulka zařízení */}
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Počet</th>
                    <th className="p-2 text-left">Typ</th>
                    <th className="p-2 text-left">Dimenze</th>
                    <th className="p-2 text-left">Ochrana</th>
                    <th className="p-2 text-left">Riso</th>
                    <th className="p-2 text-left">Podrobnosti</th>
                    <th className="p-2 text-left">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRoom.devices.map(d => {
                    const isEd = d.id === editingDeviceId;
                    return (
                      <tr key={d.id} className="border-t">
                        {(["pocet","typ","dimenze","ochrana","riso","podrobnosti"] as const).map(field => (
                          <td className="p-2" key={field}>
                            {isEd ? (
                              field==="pocet" ? (
                                <input
                                  type="number"
                                  min={1}
                                  className="border rounded p-1 w-16 text-sm"
                                  value={(deviceEdit as any)[field] ?? d[field]}
                                  onChange={(e) => handleEditDeviceField(field, e.target.value)}
                                />
                              ) : (
                                <input
                                  className="border rounded p-1 w-full text-sm"
                                  value={(deviceEdit as any)[field] ?? d[field]}
                                  onChange={(e) => handleEditDeviceField(field, e.target.value)}
                                />
                              )
                            ) : (
                              d[field as keyof Device]
                            )}
                          </td>
                        ))}
                        <td className="p-2 whitespace-nowrap">
                          {isEd ? (
                            <>
                              <button onClick={saveEditDevice} className="px-2">💾</button>
                              <button onClick={cancelEditDevice} className="px-2">✖️</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEditDevice(d)} className="px-2">✏️</button>
                              <button onClick={() => deleteDevice(d.id)} className="px-2">🗑️</button>
                              <button onClick={() => copyDevice(d.id)} className="px-2">📋</button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Přidat přístroj */}
              <div className="mt-2 text-right">
                <button
                  className="bg-blue-600 text-white py-1 px-3 rounded text-sm"
                  onClick={openDeviceDialog}
                >
                  ➕ Přidat přístroj
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-500">Vyber místnost pro zobrazení detailů.</p>
          )}
        </div>
      </div>

      {/* Dialog: Přidat místnost */}
      {showRoomDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Nová místnost</h2>
            <div className="space-y-3 mb-4 text-sm">
              <div>
                <label className="block text-xs font-medium">Název</label>
                <input
                  className="p-2 border rounded w-full text-sm"
                  value={newRoom.name}
                  onChange={e => handleRoomDialogField("name", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium">Podrobnosti</label>
                <input
                  className="p-2 border rounded w-full text-sm"
                  value={newRoom.details}
                  onChange={e => handleRoomDialogField("details", e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="bg-gray-300 py-1 px-3 rounded text-sm" onClick={() => setShowRoomDialog(false)}>
                Zrušit
              </button>
              <button className="bg-blue-600 text-white py-1 px-3 rounded text-sm" onClick={handleAddRoom}>
                Přidat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog: Přidat přístroj */}
      {showDeviceDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Nový přístroj</h2>
            <div className="space-y-3 mb-4 text-sm">
              <div>
                <label className="block text-xs font-medium">Počet</label>
                <input
                  type="number"
                  min={1}
                  className="p-2 border rounded w-full text-sm"
                  value={deviceForm.pocet}
                  onChange={e => handleDeviceField("pocet", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium">Typ</label>
                <select
                  className="p-2 border rounded w-full text-sm"
                  value={deviceForm.typ}
                  onChange={e => handleDeviceField("typ", e.target.value)}
                >
                  <option value="">Vyber typ</option>
                  {deviceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium">Dimenze</label>
                {deviceForm.dimenze === "__own__" ? (
                  <input
                    className="p-2 border rounded w-full text-sm"
                    placeholder="Zadej vlastní dimenzi"
                    value={deviceForm.customDimenze}
                    onChange={e => handleDeviceField("customDimenze", e.target.value)}
                  />
                ) : (
                  <select
                    className="p-2 border rounded w-full text-sm"
                    value={deviceForm.dimenze}
                    onChange={e => handleDeviceField("dimenze", e.target.value)}
                  >
                    <option value="">Vyber dimenzi</option>
                    {allDimensions.map(d => <option key={d} value={d}>{d}</option>)}
                    <option value="__own__" className="italic text-gray-400">Vlastní…</option>
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium">Ochrana</label>
                <input
                  className="p-2 border rounded w-full text-sm"
                  value={deviceForm.ochrana}
                  onChange={e => handleDeviceField("ochrana", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium">Riso</label>
                <input
                  className="p-2 border rounded w-full text-sm"
                  value={deviceForm.riso}
                  onChange={e => handleDeviceField("riso", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium">Podrobnosti</label>
                <input
                  className="p-2 border rounded w-full text-sm"
                  value={deviceForm.podrobnosti}
                  onChange={e => handleDeviceField("podrobnosti", e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="bg-gray-300 py-1 px-3 rounded text-sm" onClick={() => setShowDeviceDialog(false)}>
                Zrušit
              </button>
              <button className="bg-blue-600 text-white py-1 px-3 rounded text-sm" onClick={handleAddDevice}>
                Přidat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
