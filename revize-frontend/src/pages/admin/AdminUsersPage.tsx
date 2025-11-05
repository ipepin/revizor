import React, { FormEvent, useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import api from "../../api/axios";

type AdminUser = {
  id: number;
  name?: string;
  email?: string;
  phone?: string;
  is_admin: boolean;
  is_verified: boolean;
  certificate_number?: string | null;
  authorization_number?: string | null;
  rt_status?: string | null;
  rt_valid_until?: string | null;
  rt_last_checked_at?: string | null;
};

type CreateForm = {
  name: string;
  email: string;
  password: string;
  phone: string;
  certificate_number: string;
  authorization_number: string;
  is_admin: boolean;
  is_verified: boolean;
  lookup_ticr: boolean;
};

const initialCreateForm: CreateForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  certificate_number: "",
  authorization_number: "",
  is_admin: false,
  is_verified: true,
  lookup_ticr: false,
};

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [verified, setVerified] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rtDialog, setRtDialog] = useState<{ user?: AdminUser; data?: any } | null>(null);
  const [confirmDel, setConfirmDel] = useState<AdminUser | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(initialCreateForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timeout);
  }, [toast]);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, any> = {};
      if (q) params.q = q;
      if (verified) params.verified = verified === "true";
      if (role) params.role = role;
      const resp = await api.get("/admin/users", { params });
      setItems(Array.isArray(resp.data) ? resp.data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleCreateChange(key: keyof CreateForm) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
      setCreateForm((prev) => ({ ...prev, [key]: value }));
    };
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);

    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password) {
      setCreateError("Vypln prosim jmeno, e-mail a heslo.");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        phone: createForm.phone.trim() || undefined,
        certificate_number: createForm.certificate_number.trim() || undefined,
        authorization_number: createForm.authorization_number.trim() || undefined,
        is_admin: createForm.is_admin,
        is_verified: createForm.is_verified,
        lookup_ticr: createForm.lookup_ticr && !!createForm.certificate_number.trim(),
      };
      await api.post("/admin/users", payload);
      setToast({ type: "success", message: "Uzivatel byl vytvoren." });
      setCreateForm(initialCreateForm);
      setShowCreate(false);
      await load();
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.message || "Vytvoreni se nezdarilo.";
      setCreateError(detail);
    } finally {
      setCreating(false);
    }
  }

  async function verify(id: number) {
    setBusyId(id);
    try {
      await api.post(`/admin/users/${id}/verify`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleAdmin(user: AdminUser) {
    setBusyId(user.id);
    try {
      await api.patch(`/admin/users/${user.id}`, { is_admin: !user.is_admin });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function verifyRt(user: AdminUser) {
    setBusyId(user.id);
    try {
      const resp = await api.post(`/admin/rt/verify/${user.id}`);
      setRtDialog({ user, data: resp.data });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteUser(id: number) {
    setBusyId(id);
    try {
      await api
        .post("/admin/users/delete", { id })
        .catch(async (err) => {
          const status = err?.response?.status;
          if (status === 404) {
            await api.post(`/admin/users/${id}/delete`);
          } else if (status === 405) {
            await api.delete(`/admin/users/${id}`);
          } else {
            throw err;
          }
        });
      setToast({ type: "success", message: "Uzivatel byl smazan." });
      await load();
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.message || "Mazani selhalo.";
      setToast({ type: "error", message: detail });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: "16rem 1fr" }}>
      <Sidebar mode="dashboard" />
      <main className="p-4">
        <h1>Technici</h1>

        <div className="flex flex-wrap items-center gap-2 mt-3 mb-4">
          <input
            className="border rounded px-2 py-1"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Hledat jmeno/e-mail/telefon"
          />
          <select
            className="border rounded px-2 py-1"
            value={verified}
            onChange={(e) => setVerified(e.target.value)}
          >
            <option value="">Overeni - vsichni</option>
            <option value="true">Jen overeni</option>
            <option value="false">Jen cekajici</option>
          </select>
          <select
            className="border rounded px-2 py-1"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">Role - vsichni</option>
            <option value="admin">Admin</option>
            <option value="user">Uzivatel</option>
          </select>
          <button className="px-2 py-1 text-sm bg-blue-600 text-white rounded" onClick={load}>
            Filtrovat
          </button>
          <button
            className="px-2 py-1 text-sm bg-emerald-600 text-white rounded"
            onClick={() => {
              setShowCreate((prev) => !prev);
              setCreateError(null);
            }}
          >
            {showCreate ? "Zavrit formular" : "Novy uzivatel"}
          </button>
        </div>

        {showCreate && (
          <form
            className="bg-white border rounded p-4 mb-4 space-y-3"
            onSubmit={submitCreate}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col text-sm gap-1">
                Jmeno
                <input
                  className="border rounded px-2 py-1"
                  value={createForm.name}
                  onChange={handleCreateChange("name")}
                  placeholder="Napr. Jan Novak"
                  required
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                E-mail
                <input
                  className="border rounded px-2 py-1"
                  value={createForm.email}
                  onChange={handleCreateChange("email")}
                  placeholder="napr.jan@firma.cz"
                  type="email"
                  required
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Heslo
                <input
                  className="border rounded px-2 py-1"
                  value={createForm.password}
                  onChange={handleCreateChange("password")}
                  type="password"
                  required
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Telefon
                <input
                  className="border rounded px-2 py-1"
                  value={createForm.phone}
                  onChange={handleCreateChange("phone")}
                  placeholder="Napr. 601123456"
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Cislo osvedceni
                <input
                  className="border rounded px-2 py-1"
                  value={createForm.certificate_number}
                  onChange={handleCreateChange("certificate_number")}
                  placeholder="Napr. 1234/XX"
                />
              </label>
              <label className="flex flex-col text-sm gap-1">
                Cislo opravneni
                <input
                  className="border rounded px-2 py-1"
                  value={createForm.authorization_number}
                  onChange={handleCreateChange("authorization_number")}
                  placeholder="Volitelne"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={createForm.is_admin}
                  onChange={handleCreateChange("is_admin")}
                />
                Je administrator
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={createForm.is_verified}
                  onChange={handleCreateChange("is_verified")}
                />
                Overeny ucet
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={createForm.lookup_ticr}
                  onChange={handleCreateChange("lookup_ticr")}
                  disabled={!createForm.certificate_number.trim()}
                />
                Overit ihned v TICR (vyzaduje cislo osvedceni)
              </label>
            </div>

            {createError && (
              <div className="text-sm text-red-600">{createError}</div>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1 text-sm border rounded"
                onClick={() => {
                  setCreateForm(initialCreateForm);
                  setShowCreate(false);
                  setCreateError(null);
                }}
              >
                Zrusit
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-sm bg-emerald-600 text-white rounded"
                disabled={creating}
              >
                {creating ? "Vytvarim..." : "Ulozit uzivatele"}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="text-gray-500">Nacitavam...</div>
        ) : (
          <div className="bg-white rounded shadow divide-y">
            {items.length === 0 && (
              <div className="p-4 text-gray-500">Zadny uzivatel</div>
            )}

            {items.map((user) => (
              <div key={user.id} className="p-3 grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <div className="font-medium">{user.name || `Uzivatel #${user.id}`}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                  {user.phone && <div className="text-xs text-gray-500">{user.phone}</div>}
                </div>

                <div className="col-span-3 text-sm">
                  <div>Overeni: {user.is_verified ? "Ano" : "Ne"}</div>
                  <div>Role: {user.is_admin ? "Admin" : "Uzivatel"}</div>
                </div>

                <div className="col-span-3 text-xs text-gray-600">
                  <div>Ev. c. osvedceni: {user.certificate_number || "-"}</div>
                  <div>Ev. c. opravneni: {user.authorization_number || "-"}</div>
                </div>

                <div className="col-span-2 text-xs text-gray-600">
                  {user.rt_status === "verified" ? (
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 text-2xl leading-none">✓</span>
                      <span className="font-medium">Overeno TICR</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-red-600 text-2xl leading-none">✕</span>
                      <span className="font-medium">Neni v databazi TICR</span>
                    </div>
                  )}
                  <div>Platnost do: {user.rt_valid_until || "-"}</div>
                </div>

                <div className="col-span-2 flex gap-2 justify-end">
                  {!user.is_verified && (
                    <button
                      className="px-2 py-1 text-sm bg-green-600 text-white rounded"
                      disabled={busyId === user.id}
                      onClick={() => verify(user.id)}
                    >
                      Schvalit
                    </button>
                  )}
                  <button
                    className="px-2 py-1 text-sm bg-gray-200 rounded"
                    disabled={busyId === user.id}
                    onClick={() => toggleAdmin(user)}
                  >
                    {user.is_admin ? "Odebrat admina" : "Udelat adminem"}
                  </button>
                  <button
                    className="px-2 py-1 text-sm bg-blue-600 text-white rounded"
                    disabled={busyId === user.id}
                    onClick={() => verifyRt(user)}
                  >
                    Overit v TICR
                  </button>
                  <button
                    className="px-2 py-1 text-sm bg-red-600 text-white rounded"
                    disabled={busyId === user.id}
                    onClick={() => setConfirmDel(user)}
                    title="Smazat technika"
                  >
                    Smazat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {rtDialog && (
          <div
            className="fixed inset-0 bg-black/40 z-50 grid place-items-center"
            onClick={() => setRtDialog(null)}
          >
            <div
              className="bg-white p-6 rounded shadow w-full max-w-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-3">Vysledek overeni v TICR</h3>
              {rtDialog.data?.rt_status === "verified" ? (
                <div className="text-sm text-gray-700 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Byl v databazi TICR nalezen revizni technik:</span>
                  </div>
                  <div>
                    <span className="font-medium">Jmeno:</span> {rtDialog.data?.match?.full_name || rtDialog.user?.name || "-"}
                  </div>
                  <div>
                    <span className="font-medium">Cislo osvedceni:</span> {rtDialog.data?.match?.certificate_number || rtDialog.user?.certificate_number || "-"}
                  </div>
                  <div>
                    <span className="font-medium">Cislo opravneni:</span> {rtDialog.data?.match?.authorization_number || rtDialog.user?.authorization_number || "-"}
                  </div>
                  <div>
                    <span className="font-medium">Rozsah/obory:</span> {(rtDialog.data?.match?.scope || []).join(", ") || "-"}
                  </div>
                  <div>
                    <span className="font-medium">Platnost do:</span> {rtDialog.data?.rt_valid_until || rtDialog.data?.valid_until || "-"}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-700">Technik nebyl v databazi TICR nalezen.</div>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setRtDialog(null)}>
                  Zavrit
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmDel && (
          <div
            className="fixed inset-0 bg-black/40 z-50 grid place-items-center"
            onClick={() => setConfirmDel(null)}
          >
            <div
              className="bg-white p-6 rounded shadow w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-3">Smazat technika?</h3>
              <p className="text-sm text-gray-700 mb-4">
                Tato akce je nevratna. Smaze se uzivatel a vsechna navazana data.
              </p>
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setConfirmDel(null)}>
                  Zrusit
                </button>
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded"
                  onClick={() => {
                    const id = confirmDel.id;
                    setConfirmDel(null);
                    deleteUser(id);
                  }}
                >
                  Smazat
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded shadow text-white ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
