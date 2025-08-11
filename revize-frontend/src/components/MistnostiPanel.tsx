// src/components/MistnostiPanel.tsx
import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { useRevisionForm, Room, Device as RoomDevice } from "../context/RevisionFormContext";

type CatalogDevice = {
  id: number;
  name: string;
  manufacturer?: string | null;
  model?: string | null;
  trida?: string | null;
  ip?: string | null;
};

type Cable = {
  id: number;
  label?: string | null;
  family?: string | null;
  spec?: string | null;
};

const GENERIC_ITEMS: { label: string }[] = [
  { label: "Zásuvka 230V" },
  { label: "Zásuvka 400V" },
  { label: "Světlo" },
  { label: "Světlo LED" },
  { label: "Světlo nástěnné – venkovní" },
  { label: "Vypínač" },
  { label: "Ventilátor" },
  { label: "Termostat" },
  { label: "Detektor kouře" },
  { label: "Přepěťová ochrana" },
  { label: "Nouzové svítidlo" },
];

function fmtCatalogName(d: CatalogDevice) {
  const right = [d.manufacturer, d.model].filter(Boolean).join(" ");
  return [d.name, right].filter(Boolean).join(" – ");
}

type NewDevForm = {
  pocet: number;
  dimenze: string;
  ochrana: string;
  riso: string;
  podrobnosti: string;
};

const NEW_DEV_DEFAULT: NewDevForm = {
  pocet: 1,
  dimenze: "",
  ochrana: "",
  riso: "",
  podrobnosti: "",
};

export default function MistnostiPanel() {
  const { form, setForm } = useRevisionForm();
  const rooms = (form.rooms as Room[]) || [];
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(rooms[0]?.id ?? null);

  // jedna tužka ovládá název + poznámky
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [editingDeviceId, setEditingDeviceId] = useState<number | null>(null);

  // dialogy
  const [showAddDialog, setShowAddDialog] = useState(false);

  // katalog přístrojů
  const [catalog, setCatalog] = useState<CatalogDevice[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // vyhledávání + filtry + řazení v katalogu
  const [q, setQ] = useState("");
  const [fName, setFName] = useState("");
  const [fMan, setFMan] = useState("");
  const [fModel, setFModel] = useState("");
  const [fCls, setFCls] = useState("");
  const [fIp, setFIp] = useState("");
  const [sortKey, setSortKey] = useState<keyof CatalogDevice>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // DIMENZE (combobox z DB)
  const [dimOptions, setDimOptions] = useState<string[]>([]);
  const [loadingDims, setLoadingDims] = useState(false);

  // mezidialog pro potvrzení přidání (katalog i obecné)
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [newDev, setNewDev] = useState<NewDevForm>({ ...NEW_DEV_DEFAULT });

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId) || null;

  // načíst katalog
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingCatalog(true);
      try {
        const res = await api.get<CatalogDevice[]>("/devices", { params: { offset: 0, limit: 5000 } });
        if (alive) setCatalog(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (alive) setCatalog([]);
      } finally {
        if (alive) setLoadingCatalog(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // načíst dimenze (např. z /cables)
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadingDims(true);
      try {
        const res = await api.get<Cable[]>("/cables", { params: { offset: 0, limit: 5000 } });
        const rows = Array.isArray(res.data) ? res.data : [];
        const opts = rows
          .map((c) => (c.label && c.label.trim() ? c.label.trim() : [c.family, c.spec].filter(Boolean).join(" ")))
          .filter((s) => s && s.length > 0);
        const uniq = Array.from(new Set(opts)).sort((a, b) => a.localeCompare(b, "cs"));
        if (alive) setDimOptions(uniq);
      } catch {
        if (alive) setDimOptions([]);
      } finally {
        if (alive) setLoadingDims(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // filtrování + řazení katalogu
  const filteredCatalog = useMemo(() => {
    const term = q.trim().toLowerCase();
    let out = catalog.filter((d) => {
      const byQ =
        !term ||
        (d.name ?? "").toLowerCase().includes(term) ||
        (d.manufacturer ?? "").toLowerCase().includes(term) ||
        (d.model ?? "").toLowerCase().includes(term) ||
        (d.trida ?? "").toLowerCase().includes(term) ||
        (d.ip ?? "").toLowerCase().includes(term);

      const byName = !fName || (d.name ?? "").toLowerCase().includes(fName.toLowerCase());
      const byMan = !fMan || (d.manufacturer ?? "").toLowerCase().includes(fMan.toLowerCase());
      const byModel = !fModel || (d.model ?? "").toLowerCase().includes(fModel.toLowerCase());
      const byCls = !fCls || (d.trida ?? "").toLowerCase().includes(fCls.toLowerCase());
      const byIp = !fIp || (d.ip ?? "").toLowerCase().includes(fIp.toLowerCase());

      return byQ && byName && byMan && byModel && byCls && byIp;
    });

    out.sort((a: any, b: any) => {
      const av = String(a?.[sortKey] ?? "").toLowerCase();
      const bv = String(b?.[sortKey] ?? "").toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return out;
  }, [catalog, q, fName, fMan, fModel, fCls, fIp, sortKey, sortDir]);

  function toggleSort(key: keyof CatalogDevice) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  // přidání zařízení do místnosti
  function addDeviceToRoom(typ: string, init?: Partial<RoomDevice>) {
    if (!selectedRoom) return;
    const newItem: RoomDevice = {
      id: Date.now(),
      pocet: init?.pocet ?? 1,
      typ,
      dimenze: init?.dimenze ?? "",
      ochrana: init?.ochrana ?? "",
      riso: init?.riso ?? "",
      podrobnosti: init?.podrobnosti ?? "",
    };
    setForm((f) => ({
      ...f,
      rooms: (f.rooms as Room[]).map((r) =>
        r.id === selectedRoom.id ? { ...r, devices: [...(r.devices || []), newItem] } : r
      ),
    }));
  }

  function resetAddState() {
    setQ("");
    setFName("");
    setFMan("");
    setFModel("");
    setFCls("");
    setFIp("");
  }

  // mezikrok – otevřít parametry pro obecnou položku
  function addGeneric(label: string) {
    setPendingLabel(label);
    setNewDev({ ...NEW_DEV_DEFAULT });
  }
  // mezikrok – otevřít parametry pro katalogový záznam
  function openConfirmFor(d: CatalogDevice) {
    setPendingLabel(fmtCatalogName(d));
    setNewDev({ ...NEW_DEV_DEFAULT });
  }
  function confirmAddPending() {
    if (!pendingLabel) return;
    addDeviceToRoom(pendingLabel, {
      pocet: newDev.pocet,
      dimenze: newDev.dimenze,
      ochrana: newDev.ochrana,
      riso: newDev.riso,
      podrobnosti: newDev.podrobnosti,
    });
    setPendingLabel(null);
    setNewDev({ ...NEW_DEV_DEFAULT });
    setShowAddDialog(false);
    resetAddState();
  }

  // CRUD – místnosti
  function addRoom() {
    const id = Date.now();
    const newRoom: Room = { id, name: "Nová místnost", details: "", devices: [] };
    setForm((f) => ({ ...f, rooms: [...(f.rooms as Room[]), newRoom] }));
    setSelectedRoomId(id);
    setEditingRoomId(id);
  }

  function copyRoom() {
    const r = rooms.find((x) => x.id === selectedRoomId);
    if (!r) return;
    const newId = Date.now();
    const copied: Room = {
      id: newId,
      name: `${r.name} – kopie`,
      details: r.details,
      devices: (r.devices || []).map((d) => ({ ...d, id: Date.now() + Math.random() })),
    };
    setForm((f) => ({ ...f, rooms: [...(f.rooms as Room[]), copied] }));
    setSelectedRoomId(newId);
    setEditingRoomId(null);
  }

  function deleteRoom(id: number) {
    if (!confirm("Opravdu smazat místnost včetně zařízení?")) return;
    setForm((f) => ({ ...f, rooms: (f.rooms as Room[]).filter((r) => r.id !== id) }));
    if (selectedRoomId === id) {
      const left = rooms.filter((r) => r.id !== id);
      setSelectedRoomId(left[0]?.id ?? null);
    }
  }

  function updateRoomField(id: number, field: keyof Pick<Room, "name" | "details">, val: string) {
    setForm((f) => ({
      ...f,
      rooms: (f.rooms as Room[]).map((r) => (r.id === id ? { ...r, [field]: val } : r)),
    }));
  }

  // CRUD – zařízení
  function updateDevice(roomId: number, devId: number, field: keyof RoomDevice, val: string | number) {
    setForm((f) => ({
      ...f,
      rooms: (f.rooms as Room[]).map((r) =>
        r.id === roomId
          ? { ...r, devices: (r.devices || []).map((d) => (d.id === devId ? { ...d, [field]: val as any } : d)) }
          : r
      ),
    }));
  }

  function deleteDevice(roomId: number, devId: number) {
    setForm((f) => ({
      ...f,
      rooms: (f.rooms as Room[]).map((r) =>
        r.id === roomId ? { ...r, devices: (r.devices || []).filter((d) => d.id !== devId) } : r
      ),
    }));
    if (editingDeviceId === devId) setEditingDeviceId(null);
  }

  return (
    <section className="bg-white p-4 rounded shadow mb-8">
      <div className="flex gap-6">
        {/* LEVÁ STRANA: tabulka místností */}
        <aside className="w-80">
          <h2 className="text-lg font-semibold mb-2">Místnosti</h2>
          <div className="border rounded overflow-hidden">
            <div className="max-h-[60vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Název</th>
                    <th className="p-2 text-right w-24">Zařízení</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-t cursor-pointer hover:bg-blue-50 ${
                        r.id === selectedRoomId ? "bg-blue-100" : ""
                      }`}
                      onClick={() => setSelectedRoomId(r.id)}
                    >
                      <td className="p-2">{r.name || "(bez názvu)"}</td>
                      <td className="p-2 text-right">{(r.devices || []).length}</td>
                    </tr>
                  ))}
                  {rooms.length === 0 && (
                    <tr>
                      <td className="p-3 text-center text-gray-500" colSpan={2}>
                        Žádné místnosti.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <button className="flex-1 bg-blue-600 text-white py-1 rounded text-sm" onClick={addRoom}>
              ➕ Přidat
            </button>
            {selectedRoom && (
              <>
                <button className="flex-1 bg-yellow-500 text-white py-1 rounded text-sm" onClick={copyRoom}>
                  📄 Kopírovat
                </button>
                <button
                  className="flex-1 bg-red-600 text-white py-1 rounded text-sm"
                  onClick={() => deleteRoom(selectedRoom.id)}
                >
                  🗑️ Smazat
                </button>
              </>
            )}
          </div>
        </aside>

        {/* PRAVÁ STRANA */}
        <div className="flex-1">
          {selectedRoom ? (
            <>
              {/* HLAVIČKA DETAILU + tužka vpravo */}
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold">Detail místnosti</h3>
                <button
                  className="px-3 py-2 border rounded"
                  title={editingRoomId === selectedRoom.id ? "Ukončit editaci" : "Upravit název a poznámky"}
                  onClick={() => setEditingRoomId((p) => (p === selectedRoom.id ? null : selectedRoom.id))}
                >
                  ✏️ {editingRoomId === selectedRoom.id ? "Uložit" : "Upravit"}
                </button>
              </div>

              {/* VLASTNOSTI (název + poznámky) */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Název místnosti</label>
                  {editingRoomId === selectedRoom.id ? (
                    <input
                      className="w-full p-2 border rounded"
                      value={selectedRoom.name}
                      onChange={(e) => updateRoomField(selectedRoom.id, "name", e.target.value)}
                    />
                  ) : (
                    <div className="p-2 rounded bg-gray-50 whitespace-pre-wrap">
                      {selectedRoom.name || <span className="text-gray-400">(nenastaveno)</span>}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Poznámky</label>
                  {editingRoomId === selectedRoom.id ? (
                    <textarea
                      rows={2}
                      className="w-full p-2 border rounded"
                      value={selectedRoom.details}
                      onChange={(e) => updateRoomField(selectedRoom.id, "details", e.target.value)}
                    />
                  ) : (
                    <div className="p-2 rounded bg-gray-50 whitespace-pre-wrap">
                      {selectedRoom.details || <span className="text-gray-400">(žádné)</span>}
                    </div>
                  )}
                </div>
              </div>

              {/* TLAČÍTKO PŘIDAT PŘÍSTROJ */}
              <div className="flex justify-end mb-3">
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm"
                  onClick={() => setShowAddDialog(true)}
                >
                  ➕ Přidat přístroj
                </button>
              </div>

              {/* TABULKA PŘÍSTROJŮ */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-center w-20">Počet</th>
                      <th className="p-2 text-left">Typ</th>
                      <th className="p-2 text-left">Dimenze</th>
                      <th className="p-2 text-left">Ochrana</th>
                      <th className="p-2 text-left">Riso</th>
                      <th className="p-2 text-left">Podrobnosti</th>
                      <th className="p-2 text-center w-32">Akce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedRoom.devices || []).map((d) => {
                      const isEd = editingDeviceId === d.id;
                      return (
                        <tr key={d.id} className="border-t">
                          <td className="p-2 text-center">
                            {isEd ? (
                              <input
                                type="number"
                                min={1}
                                className="w-20 p-1 border rounded text-center"
                                value={d.pocet}
                                onChange={(e) =>
                                  updateDevice(selectedRoom.id, d.id, "pocet", Number(e.target.value || 1))
                                }
                              />
                            ) : (
                              d.pocet
                            )}
                          </td>
                          <td className="p-2">{d.typ}</td>
                          <td className="p-2">
                            {isEd ? (
                              <input
                                list="dimOptions"
                                className="w-full p-1 border rounded"
                                value={d.dimenze}
                                onChange={(e) => updateDevice(selectedRoom.id, d.id, "dimenze", e.target.value)}
                                placeholder={loadingDims ? "Načítám…" : "Vyber nebo napiš…"}
                              />
                            ) : (
                              d.dimenze
                            )}
                          </td>
                          <td className="p-2">
                            {isEd ? (
                              <input
                                className="w-full p-1 border rounded"
                                value={d.ochrana}
                                onChange={(e) => updateDevice(selectedRoom.id, d.id, "ochrana", e.target.value)}
                              />
                            ) : (
                              d.ochrana
                            )}
                          </td>
                          <td className="p-2">
                            {isEd ? (
                              <input
                                className="w-full p-1 border rounded"
                                value={d.riso}
                                onChange={(e) => updateDevice(selectedRoom.id, d.id, "riso", e.target.value)}
                              />
                            ) : (
                              d.riso
                            )}
                          </td>
                          <td className="p-2">
                            {isEd ? (
                              <input
                                className="w-full p-1 border rounded"
                                value={d.podrobnosti}
                                onChange={(e) => updateDevice(selectedRoom.id, d.id, "podrobnosti", e.target.value)}
                              />
                            ) : (
                              d.podrobnosti
                            )}
                          </td>
                          <td className="p-2 text-center space-x-2">
                            <button
                              className="text-blue-600 hover:underline"
                              onClick={() => setEditingDeviceId((p) => (p === d.id ? null : d.id))}
                            >
                              ✏️ {isEd ? "Uložit" : "Upravit"}
                            </button>
                            <button
                              className="text-red-600 hover:underline"
                              onClick={() => deleteDevice(selectedRoom.id, d.id)}
                            >
                              Smazat
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {(!selectedRoom.devices || selectedRoom.devices.length === 0) && (
                      <tr>
                        <td className="p-4 text-center text-gray-500" colSpan={7}>
                          Žádné přístroje. Přidej pomocí tlačítka nahoře vpravo.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* datalist pro Dimenzi (sdílený) */}
                <datalist id="dimOptions">
                  {dimOptions.map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </div>
            </>
          ) : (
            <div className="text-gray-500">Vyber místnost vlevo.</div>
          )}
        </div>
      </div>

      {/* DIALOG: Přidat přístroj */}
      {showAddDialog && selectedRoom && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-5xl relative">
            <h3 className="text-lg font-semibold mb-4">Přidat přístroj do místnosti</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Obecné položky */}
              <div className="md:col-span-1">
                <div className="text-sm font-medium mb-2">Obecné položky</div>
                <div className="flex flex-wrap gap-2">
                  {GENERIC_ITEMS.map((g) => (
                    <button
                      key={g.label}
                      className="px-3 py-1 border rounded hover:bg-gray-100"
                      onClick={() => addGeneric(g.label)}
                      title={`Přidat „${g.label}“`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Vloží se jako text (bez výrobce/typu). Před vložením nastavíš parametry.
                </p>
              </div>

              {/* Katalog */}
              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    placeholder="Hledat v katalogu… (název, výrobce, typ, IP, třída)"
                    className="w-full p-2 border rounded"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                  {q && (
                    <button className="px-3 py-2 bg-gray-200 rounded" onClick={() => setQ("")}>
                      ✕
                    </button>
                  )}
                </div>

                <div className="border rounded max-h-80 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <ThSort label="Přístroj" onClick={() => toggleSort("name")} active={sortKey === "name"} dir={sortDir} />
                        <ThSort label="Výrobce" onClick={() => toggleSort("manufacturer")} active={sortKey === "manufacturer"} dir={sortDir} />
                        <ThSort label="Typ" onClick={() => toggleSort("model")} active={sortKey === "model"} dir={sortDir} />
                        <ThSort label="Třída" onClick={() => toggleSort("trida")} active={sortKey === "trida"} dir={sortDir} />
                        <ThSort label="IP" onClick={() => toggleSort("ip")} active={sortKey === "ip"} dir={sortDir} />
                        <th className="p-2 text-center w-24">Akce</th>
                      </tr>
                      {/* filtrovací řádek */}
                      <tr className="bg-white">
                        <th className="p-1">
                          <input className="w-full p-1 border rounded" placeholder="filtr" value={fName} onChange={(e) => setFName(e.target.value)} />
                        </th>
                        <th className="p-1">
                          <input className="w-full p-1 border rounded" placeholder="filtr" value={fMan} onChange={(e) => setFMan(e.target.value)} />
                        </th>
                        <th className="p-1">
                          <input className="w-full p-1 border rounded" placeholder="filtr" value={fModel} onChange={(e) => setFModel(e.target.value)} />
                        </th>
                        <th className="p-1">
                          <input className="w-full p-1 border rounded" placeholder="filtr" value={fCls} onChange={(e) => setFCls(e.target.value)} />
                        </th>
                        <th className="p-1">
                          <input className="w-full p-1 border rounded" placeholder="filtr" value={fIp} onChange={(e) => setFIp(e.target.value)} />
                        </th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {loadingCatalog && (
                        <tr><td className="p-3 text-center text-gray-500" colSpan={6}>Načítám…</td></tr>
                      )}
                      {!loadingCatalog && filteredCatalog.length === 0 && (
                        <tr><td className="p-3 text-center text-gray-500" colSpan={6}>Nic nenalezeno.</td></tr>
                      )}
                      {filteredCatalog.map((d) => (
                        <tr key={d.id} className="border-t hover:bg-blue-50">
                          <td className="p-2">{d.name}</td>
                          <td className="p-2">{d.manufacturer || ""}</td>
                          <td className="p-2">{d.model || ""}</td>
                          <td className="p-2">{d.trida || ""}</td>
                          <td className="p-2">{d.ip || ""}</td>
                          <td className="p-2 text-center">
                            <button className="text-blue-600 hover:underline" onClick={() => openConfirmFor(d)}>
                              Přidat
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowAddDialog(false)}>
                Zavřít
              </button>
            </div>

            {/* Mezidialog s parametry nového zařízení (pro katalog i obecné položky) */}
            {pendingLabel && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
                <div className="bg-white rounded shadow p-5 w-full max-w-xl">
                  <h4 className="text-lg font-semibold mb-3">Parametry přístroje</h4>
                  <p className="text-sm text-gray-700 mb-4">{pendingLabel}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Počet</label>
                      <input
                        type="number"
                        min={1}
                        className="w-full p-2 border rounded"
                        value={newDev.pocet}
                        onChange={(e) =>
                          setNewDev((s) => ({ ...s, pocet: Math.max(1, Number(e.target.value || 1)) }))
                        }
                      />
                    </div>

                    <div>
                      <label className="text-xs text-gray-600">
                        Dimenze {loadingDims && <span className="text-[10px] text-gray-500">(načítám…)</span>}
                      </label>
                      <input
                        list="dimOptionsAddDialog"
                        className="w-full p-2 border rounded"
                        placeholder={loadingDims ? "Načítám…" : "Vyber nebo napiš…"}
                        value={newDev.dimenze}
                        onChange={(e) => setNewDev((s) => ({ ...s, dimenze: e.target.value }))}
                      />
                      <datalist id="dimOptionsAddDialog">
                        {dimOptions.map((o) => (
                          <option key={o} value={o} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="text-xs text-gray-600">Ochrana</label>
                      <input
                        className="w-full p-2 border rounded"
                        value={newDev.ochrana}
                        onChange={(e) => setNewDev((s) => ({ ...s, ochrana: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Riso</label>
                      <input
                        className="w-full p-2 border rounded"
                        value={newDev.riso}
                        onChange={(e) => setNewDev((s) => ({ ...s, riso: e.target.value }))}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs text-gray-600">Poznámka</label>
                      <textarea
                        rows={2}
                        className="w-full p-2 border rounded"
                        value={newDev.podrobnosti}
                        onChange={(e) => setNewDev((s) => ({ ...s, podrobnosti: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setPendingLabel(null)}>
                      Zpět
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={confirmAddPending}>
                      Přidat do místnosti
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ThSort({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th className="p-2 text-left select-none">
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${active ? "text-blue-700" : "text-gray-800"}`}
        title="Seřadit"
      >
        <span>{label}</span>
        {active && <span>{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}
