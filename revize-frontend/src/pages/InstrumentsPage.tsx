// src/pages/InstrumentsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { authHeader } from "../api/auth";
import { apiUrl } from "../api/base";

type Instrument = {
  id: string;
  name: string;
  measurement_text: string;
  calibration_code: string;
  serial?: string | null;
  calibration_valid_until?: string | null; // YYYY-MM-DD
  note?: string | null;
};

export default function InstrumentsPage() {
  const { token } = useAuth();

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

  const isEdit = useMemo(() => !!editId && editId !== "new", [editId]);
  const title = isEdit ? "Upravit přístroj" : "Přidat přístroj";

  async function load() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/users/instruments"), {
        headers: { ...authHeader(token) },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Instrument[];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError("Načtení selhalo.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
    setError(null);
  }

  async function save() {
    if (!token) return;

    if (!draft.name?.trim()) {
      setError("Pole \"Název přístroje\" je povinné.");
      return;
    }
    if (!draft.measurement_text?.trim()) {
      setError("Pole \"Měření\" je povinné.");
      return;
    }
    if (!draft.calibration_code?.trim()) {
      setError("Pole \"Kalibrační list\" je povinné.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const isNew = editId === "new";
      const url = isNew
        ? apiUrl("/users/instruments")
        : apiUrl(`/users/instruments/${draft.id}`);
      const method = isNew ? "POST" : "PATCH";

      const body = {
        name: draft.name,
        measurement_text: draft.measurement_text,
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
      const res = await fetch(apiUrl(`/users/instruments/${id}`), {
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
          <h1 className="text-2xl font-semibold">Měřicí přístroje</h1>
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

              <Field label="Kalibrační list / evidenční číslo">
                <input
                  className="w-full p-2 border rounded"
                  value={draft.calibration_code || ""}
                  onChange={e => setDraft(d => ({ ...d, calibration_code: e.target.value }))}
                  placeholder="např. 2025-03/123"
                />
              </Field>

              <Field label="Sériové číslo (volitelně)">
                <input
                  className="w-full p-2 border rounded"
                  value={draft.serial || ""}
                  onChange={e => setDraft(d => ({ ...d, serial: e.target.value }))}
                  placeholder="např. M3155-001234"
                />
              </Field>

              <Field label="Platnost kalibrace do (YYYY-MM-DD, volitelně)">
                <input
                  className="w-full p-2 border rounded"
                  value={draft.calibration_valid_until || ""}
                  onChange={e => setDraft(d => ({ ...d, calibration_valid_until: e.target.value }))}
                  placeholder="např. 2026-12-31"
                />
              </Field>

              <Field label="Měření">
                <input
                  className="w-full p-2 border rounded"
                  value={draft.measurement_text || ""}
                  onChange={e => setDraft(d => ({ ...d, measurement_text: e.target.value }))}
                  placeholder="např. R (Ω), Zs (Ω), IΔn (mA), …"
                />
              </Field>

              <Field label="Poznámka (volitelně)">
                <input
                  className="w-full p-2 border rounded"
                  value={draft.note || ""}
                  onChange={e => setDraft(d => ({ ...d, note: e.target.value }))}
                  placeholder="volitelný popis"
                />
              </Field>
            </div>

            <div className="mt-4 flex gap-2">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={cancelEdit} disabled={saving}>Zrušit</button>
              <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={save} disabled={saving}>
                {saving ? "Ukládám…" : "Uložit"}
              </button>
            </div>
          </section>
        )}

        {/* Seznam */}
        <section className="bg-white rounded shadow">
          {loading ? (
            <div className="p-4 text-gray-500">Načítám…</div>
          ) : items.length === 0 ? (
            <div className="p-4 text-gray-500">Žádné přístroje</div>
          ) : (
            <div className="divide-y">
              {items.map((it) => (
                <div key={it.id} className="p-3 grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <div className="font-medium">{it.name}</div>
                    <div className="text-xs text-gray-500">{it.serial || "-"}</div>
                  </div>
                  <div className="col-span-4 text-xs text-gray-600">
                    <div>Kalibrační: {it.calibration_code || "-"}</div>
                    <div>Platnost: {it.calibration_valid_until || "-"}</div>
                  </div>
                  <div className="col-span-3 flex gap-2 justify-end">
                    <button className="px-3 py-1 bg-gray-200 rounded" onClick={() => startEdit(it)}>Upravit</button>
                    <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={() => remove(it.id)}>Smazat</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }: React.PropsWithChildren<{ label: string }>) {
  return (
    <label className="block">
      <div className="text-sm text-slate-500 mb-1">{label}</div>
      {children}
    </label>
  );
}
