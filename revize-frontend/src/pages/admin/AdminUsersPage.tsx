import React, { useEffect, useState } from "react";
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

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [verified, setVerified] = useState<string>(""); // "", "true", "false"
  const [role, setRole] = useState<string>(""); // "", "admin", "user"
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rtDialog, setRtDialog] = useState<{ user?: AdminUser; data?: any } | null>(null);
  const [confirmDel, setConfirmDel] = useState<AdminUser | null>(null);

  async function load() {
    setLoading(true);
    try {
      const params: any = {};
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

  async function verify(id: number) {
    setBusyId(id);
    try {
      await api.post(`/admin/users/${id}/verify`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: number) {
    setBusyId(id);
    try {
      await api.post(`/admin/users/${id}/reject`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function toggleAdmin(u: AdminUser) {
    setBusyId(u.id);
    try {
      await api.patch(`/admin/users/${u.id}`, { is_admin: !u.is_admin });
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
      await api.delete(`/admin/users/${id}`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex">
      <Sidebar mode="dashboard" />
      <main className="flex-1 p-4 compact-main">
        <h1>Technici</h1>
        <div className="flex flex-wrap items-center gap-2 mt-3 mb-4">
          <input className="border rounded px-2 py-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hledat jméno/e‑mail/telefon" />
          <select className="border rounded px-2 py-1" value={verified} onChange={(e) => setVerified(e.target.value)}>
            <option value="">Ověření – všichni</option>
            <option value="true">Jen ověření</option>
            <option value="false">Jen čekající</option>
          </select>
          <select className="border rounded px-2 py-1" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Role – všichni</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
          <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={load}>Filtrovat</button>
        </div>

        {loading ? (
          <div className="text-gray-500">Načítám…</div>
        ) : (
          <div className="bg-white rounded shadow divide-y">
            {items.map((u) => (
              <div key={u.id} className="p-3 grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4">
                  <div className="font-medium">{u.name || `Uživatel #${u.id}`}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </div>
                <div className="col-span-3 text-sm">
                  <div>Ověření: {u.is_verified ? "Ano" : "Ne"}</div>
                  <div>Role: {u.is_admin ? "Admin" : "User"}</div>
                </div>
                <div className="col-span-3 text-xs text-gray-600">
                  <div>Ev. č. osvědčení: {u.certificate_number || "—"}</div>
                  <div>Ev. č. oprávnění: {u.authorization_number || "—"}</div>
                </div>
                <div className="col-span-2 text-xs text-gray-600">
                  {u.rt_status === 'verified' ? (
                    <div className="flex items-center gap-2">
                      <span className="text-green-600 text-2xl leading-none">✓</span>
                      <span className="font-medium">Ověřeno TIČR</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-red-600 text-2xl leading-none">✕</span>
                      <span className="font-medium">Není v databázi TIČR</span>
                    </div>
                  )}
                  <div>Platnost do: {u.rt_valid_until || "—"}</div>
                </div>
                <div className="col-span-2 flex gap-2 justify-end">
                  {u.is_verified ? (
                    <button className="px-3 py-1 bg-amber-200 rounded" disabled={busyId===u.id} onClick={() => reject(u.id)}>Odznačit</button>
                  ) : (
                    <button className="px-3 py-1 bg-green-600 text-white rounded" disabled={busyId===u.id} onClick={() => verify(u.id)}>Schválit</button>
                  )}
                  <button className="px-3 py-1 bg-gray-200 rounded" disabled={busyId===u.id} onClick={() => toggleAdmin(u)}>
                    {u.is_admin ? "Odebrat admina" : "Udělat adminem"}
                  </button>
                  <button className="px-3 py-1 bg-blue-600 text-white rounded" disabled={busyId===u.id} onClick={() => verifyRt(u)}>
                    Ověřit v TIČR
                  </button>
                  <button className="px-3 py-1 bg-red-600 text-white rounded" disabled={busyId===u.id} onClick={() => setConfirmDel(u)} title="Smazat technika">
                    Smazat
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && <div className="p-4 text-gray-500">Žádný uživatel</div>}
          </div>
        )}

        {rtDialog && (
          <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center" onClick={() => setRtDialog(null)}>
            <div className="bg-white p-6 rounded shadow w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-3">Výsledek ověření v TIČR</h3>
              {rtDialog.data?.rt_status === 'verified' ? (
                <div className="text-sm text-gray-700 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    <span>Byl v databázi TIČR nalezen revizní technik:</span>
                  </div>
                  <div><span className="font-medium">Jméno:</span> {rtDialog.data?.match?.full_name || rtDialog.user?.name || "—"}</div>
                  <div><span className="font-medium">Číslo osvědčení:</span> {rtDialog.data?.match?.certificate_number || rtDialog.user?.certificate_number || "—"}</div>
                  <div><span className="font-medium">Číslo oprávnění:</span> {rtDialog.data?.match?.authorization_number || rtDialog.user?.authorization_number || "—"}</div>
                  <div><span className="font-medium">Rozsah/obory:</span> {(rtDialog.data?.match?.scope || []).join(', ') || "—"}</div>
                  <div><span className="font-medium">Platnost do:</span> {rtDialog.data?.rt_valid_until || rtDialog.data?.valid_until || "—"}</div>
                </div>
              ) : (
                <div className="text-sm text-gray-700">Technik nebyl v databázi TIČR nalezen.</div>
              )}
              <div className="flex justify-end gap-2 mt-4">
                <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setRtDialog(null)}>Zavřít</button>
              </div>
            </div>
          </div>
        )}

        {confirmDel && (
          <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center" onClick={() => setConfirmDel(null)}>
            <div className="bg-white p-6 rounded shadow w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-3">Smazat technika?</h3>
              <p className="text-sm text-gray-700 mb-4">Tato akce je nevratná. Smaže se uživatel a navázaná data.</p>
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 bg-gray-200 rounded" onClick={() => setConfirmDel(null)}>Zrušit</button>
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded"
                  onClick={() => { const id = confirmDel.id; setConfirmDel(null); deleteUser(id); }}
                >
                  Smazat
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

