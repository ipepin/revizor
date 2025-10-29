// src/pages/ProfilePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { useUser } from "../context/UserContext";
import { authHeader } from "../api/auth";
import { apiUrl } from "../api/base"; // ⬅️ JEDNOTNÝ HELPER NA VITE_API_URL

type Company = {
  id: number;
  name: string;
  address?: string | null;
  ico?: string | null;
  dic?: string | null;
  email?: string | null;
  phone?: string | null;
  note?: string | null;
  is_default?: boolean | null;
};

export default function ProfilePage() {
  const { token } = useAuth();

  // ⬇️ z UserContextu bereme setActiveCompany + refreshUser,
  // aby se po změnách ihned propsal Sidebar a zbytek aplikace
  const { setActiveCompany, refreshUser } = useUser();

  // --- Profil uživatele ---
  const [form, setForm] = useState({
    name: "",
    email: "",
    certificate_number: "",
    authorization_number: "",
    address: "",
    ico: "",
    dic: "",
    birth_date: "",
    phone: "",
    active_company_id: null as number | null,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // --- Firmy / subjekty ---
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [editId, setEditId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Company>({
    id: 0,
    name: "",
    address: "",
    ico: "",
    dic: "",
    email: "",
    phone: "",
    note: "",
  });

  const activeCompany = useMemo(
    () => companies.find((c) => c.id === form.active_company_id) || null,
    [companies, form.active_company_id]
  );

  // ---- fetch profile + companies
  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [uRes, cRes] = await Promise.all([
          fetch(apiUrl("/users/me"), { headers: { ...authHeader(token) } }),
          fetch(apiUrl("/users/companies"), { headers: { ...authHeader(token) } }),
        ]);
        if (!uRes.ok) throw new Error(await uRes.text());
        if (!cRes.ok) throw new Error(await cRes.text());
        const uData = await uRes.json();
        const cData = await cRes.json();
        setForm((f) => ({ ...f, ...uData }));
        setCompanies(Array.isArray(cData) ? cData : []);
      } catch {
        setErr("Nepodařilo se načíst profil.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function saveProfile() {
    if (!token) return;
    setSaving(true);
    setErr(null);
    setOk(null);
    try {
      const res = await fetch(apiUrl("/users/me"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader(token) },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setForm((f) => ({ ...f, ...data }));
      setOk("Uloženo.");
      // ⬇️ dotáhni čerstvá data i do UserContextu (Sidebar)
      await refreshUser();
    } catch {
      setErr("Uložení profilu selhalo.");
    } finally {
      setSaving(false);
      setTimeout(() => setOk(null), 1200);
    }
  }

  // ---- company helpers
  function startNew() {
    setEditId("new");
    setDraft({
      id: 0,
      name: "",
      address: "",
      ico: "",
      dic: "",
      email: "",
      phone: "",
      note: "",
    });
  }
  function startEdit(c: Company) {
    setEditId(c.id);
    setDraft({ ...c });
  }
  function cancelEdit() {
    setEditId(null);
    setDraft({
      id: 0,
      name: "",
      address: "",
      ico: "",
      dic: "",
      email: "",
      phone: "",
      note: "",
    });
  }

  async function saveCompany() {
    if (!token) return;
    const isNew = editId === "new";
    try {
      const url = isNew ? apiUrl("/users/companies") : apiUrl(`/users/companies/${draft.id}`);
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...authHeader(token) },
        body: JSON.stringify({
          name: draft.name,
          address: draft.address,
          ico: draft.ico,
          dic: draft.dic,
          email: draft.email,
          phone: draft.phone,
          note: draft.note,
        }),
      });
      if (!res.ok) throw new Error(await res.text());

      // refresh seznamu firem
      setLoadingCompanies(true);
      const cRes = await fetch(apiUrl("/users/companies"), { headers: { ...authHeader(token) } });
      const cData = await cRes.json();
      setCompanies(Array.isArray(cData) ? cData : []);
      setLoadingCompanies(false);

      cancelEdit();

      // ⬇️ ať se případné změny propsnou i do UserContextu
      await refreshUser();
    } catch {
      setLoadingCompanies(false);
      alert("Uložení firmy selhalo.");
    }
  }

  async function deleteCompany(id: number) {
    if (!token) return;
    if (!confirm("Opravdu smazat tento subjekt?")) return;
    try {
      const res = await fetch(apiUrl(`/users/companies/${id}`), {
        method: "DELETE",
        headers: { ...authHeader(token) },
      });
      if (!res.ok) throw new Error(await res.text());

      // refresh seznamu
      const cRes = await fetch(apiUrl("/users/companies"), { headers: { ...authHeader(token) } });
      const cData = await cRes.json();
      setCompanies(Array.isArray(cData) ? cData : []);

      // přenačti profil i UserContext (active_company_id se mohl změnit)
      const uRes = await fetch(apiUrl("/users/me"), { headers: { ...authHeader(token) } });
      const uData = await uRes.json();
      setForm((f) => ({ ...f, ...uData }));

      await refreshUser();
    } catch {
      alert("Mazání selhalo.");
    }
  }

  // ⬇️ PŘEPÍNÁNÍ AKTIVNÍ FIRMY – používáme UserContext.setActiveCompany
  async function onActivateCompany(id: number) {
    try {
      await setActiveCompany(id);   // PATCH /users/me + refreshUser() uvnitř kontextu
      setForm((f) => ({ ...f, active_company_id: id })); // lokální sync pro „zelený řádek“
    } catch {
      alert("Nepodařilo se přepnout aktivní firmu.");
    }
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-100 to-blue-50">
      <Sidebar mode="summary" />

      <main className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4">👤 Profil & subjekt</h1>

        {/* DVA SLOUPCE */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          {/* LEVÝ SLOUPEC – TECHNIK */}
          <section className="bg-white rounded shadow p-4">
            <h2 className="text-lg font-semibold mb-3">Technik</h2>
            {loading ? (
              <div>Načítám…</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    ["name", "Jméno"],
                    ["email", "E-mail"],
                    ["certificate_number", "Číslo osvědčení"],
                    ["authorization_number", "Číslo oprávnění"],
                    ["address", "Adresa (domovská)"],
                    ["ico", "IČO (OSVČ)"],
                    ["dic", "DIČ (OSVČ)"],
                    ["birth_date", "Datum narození (YYYY-MM-DD)"],
                    ["phone", "Telefon"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="block text-sm text-gray-600 mb-1">{label}</label>
                      <input
                        className="w-full p-2 border rounded"
                        value={(form as any)[key] || ""}
                        onChange={(e) => setForm((s) => ({ ...s, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 mt-4">
                  {err && <span className="text-red-600 self-center">{err}</span>}
                  {ok && <span className="text-green-700 self-center">{ok}</span>}
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                    onClick={saveProfile}
                    disabled={saving}
                  >
                    Uložit profil
                  </button>
                </div>
              </>
            )}
          </section>

          {/* PRAVÝ SLOUPEC – FIRMA */}
          <section className="bg-white rounded shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Firma / subjekt</h2>
              {editId === null ? (
                <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={startNew}>
                  Přidat subjekt
                </button>
              ) : (
                <div className="text-sm text-gray-600">Ukládáš nový / upravovaný subjekt…</div>
              )}
            </div>

            {/* AKTIVNÍ SUBJEKT – vizitka */}
            <div className="border rounded p-3 mb-4 bg-green-50/40">
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  Aktivní subjekt:{" "}
                  <span className="text-green-800">
                    {activeCompany ? activeCompany.name : "není zvolen"}
                  </span>
                </div>
                {activeCompany && (
                  <button
                    className="text-sm px-3 py-1 border rounded hover:bg-white"
                    onClick={() => startEdit(activeCompany)}
                  >
                    Upravit aktivní
                  </button>
                )}
              </div>
              {activeCompany && (
                <div className="text-sm text-gray-700 mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <div>Adresa: {activeCompany.address || "-"}</div>
                  <div>IČO: {activeCompany.ico || "-"}</div>
                  <div>DIČ: {activeCompany.dic || "-"}</div>
                  <div>
                    Kontakt: {[activeCompany.email, activeCompany.phone].filter(Boolean).join(" • ") || "-"}
                  </div>
                  {activeCompany.note && <div className="md:col-span-2">Pozn.: {activeCompany.note}</div>}
                </div>
              )}
            </div>

            {/* EDITOR (nový / edit) */}
            {editId !== null && (
              <div className="border rounded p-3 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Název subjektu">
                  <input
                    className="w-full p-2 border rounded"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="např. OSVČ Jan Novák / Elektro s.r.o."
                  />
                </Field>
                <Field label="Adresa">
                  <input
                    className="w-full p-2 border rounded"
                    value={draft.address || ""}
                    onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
                  />
                </Field>
                <Field label="IČO">
                  <input
                    className="w-full p-2 border rounded"
                    value={draft.ico || ""}
                    onChange={(e) => setDraft((d) => ({ ...d, ico: e.target.value }))}
                  />
                </Field>
                <Field label="DIČ">
                  <input
                    className="w-full p-2 border rounded"
                    value={draft.dic || ""}
                    onChange={(e) => setDraft((d) => ({ ...d, dic: e.target.value }))}
                  />
                </Field>
                <Field label="E-mail">
                  <input
                    className="w-full p-2 border rounded"
                    value={draft.email || ""}
                    onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
                  />
                </Field>
                <Field label="Telefon">
                  <input
                    className="w-full p-2 border rounded"
                    value={draft.phone || ""}
                    onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                  />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Poznámka">
                    <input
                      className="w-full p-2 border rounded"
                      value={draft.note || ""}
                      onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                    />
                  </Field>
                </div>

                <div className="md:col-span-2 flex justify-end gap-2">
                  <button className="px-3 py-2 bg-gray-200 rounded" onClick={cancelEdit}>
                    Zrušit
                  </button>
                  <button
                    className="px-3 py-2 bg-blue-600 text-white rounded"
                    onClick={saveCompany}
                    disabled={!draft.name.trim()}
                  >
                    Uložit subjekt
                  </button>
                </div>
              </div>
            )}

            {/* SEZNAM SUBJEKTŮ */}
            <div className="border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left">Název</th>
                    <th className="p-2 text-left">Adresa</th>
                    <th className="p-2 text-left">IČO</th>
                    <th className="p-2 text-left">DIČ</th>
                    <th className="p-2 text-left">Kontakt</th>
                    <th className="p-2 text-center w-44">Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingCompanies && (
                    <tr>
                      <td colSpan={6} className="p-3 text-center text-gray-500">
                        Načítám…
                      </td>
                    </tr>
                  )}
                  {!loadingCompanies && companies.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-3 text-center text-gray-500">
                        Zatím žádné subjekty. Přidej první přes tlačítko nahoře vpravo.
                      </td>
                    </tr>
                  )}
                  {companies.map((c) => {
                    const isActive = c.id === form.active_company_id;
                    return (
                      <tr key={c.id} className={`border-top ${isActive ? "bg-green-50" : ""}`}>
                        <td className="p-2">{c.name}</td>
                        <td className="p-2">{c.address || ""}</td>
                        <td className="p-2">{c.ico || ""}</td>
                        <td className="p-2">{c.dic || ""}</td>
                        <td className="p-2">{[c.email, c.phone].filter(Boolean).join(" • ")}</td>
                        <td className="p-2 text-center">
                          <div className="inline-flex items-center gap-3">
                            {/* Aktivovat */}
                            <button
                              title={isActive ? "Aktivní" : "Nastavit jako aktivní"}
                              onClick={() => !isActive && onActivateCompany(c.id)}
                              className={`p-1 rounded ${isActive ? "text-green-700" : "text-gray-600 hover:bg-gray-100"}`}
                            >
                              {isActive ? "★" : "☆"}
                            </button>
                            {/* Upravit */}
                            <button
                              title="Upravit"
                              onClick={() => startEdit(c)}
                              className="p-1 rounded text-blue-700 hover:bg-blue-50"
                            >
                              ✏️
                            </button>
                            {/* Smazat */}
                            <button
                              title="Smazat"
                              onClick={() => deleteCompany(c.id)}
                              className="p-1 rounded text-red-600 hover:bg-red-50"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
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
