import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { authHeader } from "../api/auth";

type Instrument = {
  id: string;
  name: string;
  measurement_text: string;             // ⬅️ povinné textové pole
  calibration_code: string;
  serial?: string | null;
  calibration_valid_until?: string | null; // YYYY-MM-DD
  note?: string | null;
};

export default function InstrumentsPage() {
  const { token } = useAuth();
  const API = "/api";

  const [items, setItems] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editId, setEditId] = useState<"new" | string | null>(null);
  const [draft, setDraft] = useState<Instrument>({
    id: "",
    name: "",
    measurement_text: "",
    calibration_code: "",
    serial: "",
    calibration_valid_until: "",
    note: "",
  } as Instrument);

  const isEdit = useMemo(() => editId && editId !== "new", [editId]);
  const title = isEdit ? "Upravit přístroj" : "Přidat přístroj";

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/users/instruments`, { headers: { ...authHeader(token) } });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Instrument[];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError("Načítání selhalo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [token]);

  function startNew() {
    setEditId("new");
    setDraft({
      id: "",
      name: "",
      measurement_text: "",
      calibration_code: "",
      serial: "",
      calibration_valid_until: "",
      note: "",
    } as Instrument);
  }

  function startEdit(it: Instrument) {
    setEditId(it.id);
    setDraft({ ...it });
  }

  function cancelEdit() {
    setEditId(null);
  }

  async function save() {
    if (!token) return;
    // ✅ Validace povinného pole
    if (!draft.measurement_text || !draft.measurement_text.trim()) {
      setError("Pole „Měření“ je povinné.");
      return;
    }
    if (!draft.name || !draft.name.trim()) {
      setError("Pole „Název přístroje“ je povinné.");
      return;
    }
    if (!draft.calibration_code || !draft.calibration_code.trim()) {
      setError("Pole „Kalibrační list“ je povinné.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const isNew = editId === "new";
      const url = isNew
        ? `${API}/users/instruments`
        : `${API}/users/instruments/${draft.id}`;
      const method = isNew ? "POST" : "PATCH";
      const body = {
        name: draft.name,
        measurement_text: draft.measurement_text, // ⬅️ posíláme text
        calibration_code: draft.calibration_code,
        serial: draft.serial || null,
        calibration_valid_until: draft.calibration_valid_until || null,
        note: draft.note || null,
      };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeader(token) },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
      cancelEdit();
    } catch (e: any) {
      setError(e?.message || "Uložení selhalo.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!token) return;
    if (!confirm("Opravdu smazat přístroj?")) return;
    try {
      const res = await fetch(`${API}/users/instruments/${id}`, {
        method: "DELETE",
        headers: { ...authHeader(token) },
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
    } catch (e: any) {
      alert(e?.message || "Mazání selhalo.");
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar mode="dashboard" />

      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">🧪 Měřící přístroje</h1>
          {editId === null && (
            <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={startNew}>
              + Přidat přístroj
            </button>
          )}
        </div>

        {/* Editor */}
        {editId !== null && (
          <section className="bg-white rounded shadow p-4 mb-6">
            <h2 className="text-lg font-semibold mb-3">{title}</h2>
            {error && <div className="mb-2 text-red-600">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Název přístroje">
                <input
                  className="w-full p-2 border rounded"
                  value={draft.name || ""}
                  onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                  placeholder="např. Metrel MI 3155"
                />
              </Field>

              <Field label="Kalibrační list – evidenční číslo">
                <input
                  className="w-full p-2 border rounded"
                  value={draft.calibration_code || ""}
                  onChange={e => setDraft(d => ({ ...d, calibration_code: e.target.value }))}
                  placeholder="např. 2025-03/123"
                />
              </Field>

              <Field label="Sériové číslo (volitelné)">
                <input
                  className="w-full p-2 border rounded"
                  value={draft.serial || ""}
                  onChange={e => setDraft(d => ({ ...d, serial: e.target.value }))}
                  placeholder="např. M3155-001234"
                />
              </Field>

              <Field label="Platnost kalibrace do (YYYY-MM-DD, volitelné)">
                <input
                  type="date"
                  className="w-full p-2 border rounded"
                  value={draft.calibration_valid_until || ""}
                  onChange={e => setDraft(d => ({ ...d, calibration_valid_until: e.target.value }))}
                />
              </Field>

              {/* ⬇️ NOVÁ podoba “Měření” */}
              <div className="md:col-span-2">
                <Field label="Měření (povinné)">
                  <input
                    className="w-full p-2 border rounded"
                    value={draft.measurement_text || ""}
                    onChange={e => setDraft(d => ({ ...d, measurement_text: e.target.value }))}
                    placeholder="např. spojitost PE, izolační odpor, poruchová smyčka, RCD…"
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Poznámka (volitelné)">
                  <input
                    className="w-full p-2 border rounded"
                    value={draft.note || ""}
                    onChange={e => setDraft(d => ({ ...d, note: e.target.value }))}
                    placeholder="libovolná poznámka k přístroji"
                  />
                </Field>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                onClick={save}
                disabled={saving}
              >
                {saving ? "Ukládám…" : "Uložit"}
              </button>
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={cancelEdit}>
                Zrušit
              </button>
            </div>
          </section>
        )}

        {/* Seznam */}
        <section className="bg-white rounded shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Název</th>
                <th className="p-2 text-left">Měření</th>
                <th className="p-2 text-left">Kal. list</th>
                <th className="p-2 text-left">S/N</th>
                <th className="p-2 text-left">Platnost do</th>
                <th className="p-2 text-left">Pozn.</th>
                <th className="p-2 text-center w-40">Akce</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="p-3 text-center text-gray-500">Načítám…</td></tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={7} className="p-3 text-center text-gray-500">Zatím žádné přístroje.</td></tr>
              )}
              {items.map(it => (
                <tr key={it.id} className="border-t">
                  <td className="p-2">{it.name}</td>
                  <td className="p-2">{it.measurement_text}</td>
                  <td className="p-2">{it.calibration_code}</td>
                  <td className="p-2">{it.serial}</td>
                  <td className="p-2">{it.calibration_valid_until}</td>
                  <td className="p-2">{it.note}</td>
                  <td className="p-2 text-center">
                    <button className="px-2 py-1 text-blue-700 hover:underline" onClick={() => startEdit(it)}>Upravit</button>
                    <button className="px-2 py-1 text-red-700 hover:underline" onClick={() => remove(it.id)}>Smazat</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-gray-600 mb-1">{label}</span>
      {children}
    </label>
  );
}
