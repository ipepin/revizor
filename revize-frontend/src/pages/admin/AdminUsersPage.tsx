import React, { useEffect, useMemo, useState } from "react";
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
};

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [verified, setVerified] = useState<string>(""); // "", "true", "false"
  const [role, setRole] = useState<string>(""); // "", "admin", "user"
  const [busyId, setBusyId] = useState<number | null>(null);

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

  return (
    <div className="flex">
      <Sidebar mode="dashboard" />
      <main className="flex-1 p-4 compact-main">
        <h1>Technici</h1>
        <div className="flex flex-wrap items-center gap-2 mt-3 mb-4">
          <input className="border rounded px-2 py-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hledat jméno/e-mail/telefon" />
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
                <div className="col-span-2 flex gap-2 justify-end">
                  {u.is_verified ? (
                    <button className="px-3 py-1 bg-amber-200 rounded" disabled={busyId===u.id} onClick={() => reject(u.id)}>Odznačit</button>
                  ) : (
                    <button className="px-3 py-1 bg-green-600 text-white rounded" disabled={busyId===u.id} onClick={() => verify(u.id)}>Schválit</button>
                  )}
                  <button className="px-3 py-1 bg-gray-200 rounded" disabled={busyId===u.id} onClick={() => toggleAdmin(u)}>
                    {u.is_admin ? "Odebrat admina" : "Udělat adminem"}
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && <div className="p-4 text-gray-500">Žádní uživatelé</div>}
          </div>
        )}
      </main>
    </div>
  );
}

