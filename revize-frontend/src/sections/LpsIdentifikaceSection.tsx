import React, { useContext, useEffect, useMemo, useState } from "react";
import { RevisionFormContext, RevisionForm } from "../context/RevisionFormContext";
import { useAuth } from "../context/AuthContext";
import { authHeader } from "../api/auth";
import { apiUrl } from "../api/base";

type UserInstrument = {
  id: string;
  name: string;
  measurement_text: string;
  calibration_code: string;
  serial?: string | null;
  calibration_valid_until?: string | null; // YYYY-MM-DD
  note?: string | null;
};


export default function LpsIdentifikaceSection() {
  const { form, setForm } = useContext(RevisionFormContext);
  const { token } = useAuth();

  const [instCatalog, setInstCatalog] = useState<UserInstrument[]>([]);
  const [instLoading, setInstLoading] = useState<boolean>(false);
  const [instError, setInstError] = useState<string | null>(null);

  const selectedList: UserInstrument[] = ((form as any).measuringInstruments as UserInstrument[]) || [];
  const selectedIds = useMemo(() => new Set(selectedList.map((i) => i.id)), [selectedList]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!token) return;
      setInstLoading(true);
      setInstError(null);
      try {
        const res = await fetch(apiUrl("/users/instruments"), { headers: { ...authHeader(token) } });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as UserInstrument[];
        if (!alive) return;
        setInstCatalog(Array.isArray(data) ? data : []);
        setForm((prev) => {
          const current: UserInstrument[] = ((prev as any).measuringInstruments as UserInstrument[]) || [];
          const refreshed = current.map((sel) => data.find((d) => d.id === sel.id) || sel);
          return { ...(prev as any), measuringInstruments: refreshed } as any as RevisionForm;
        });
      } catch (e: any) {
        if (!alive) return;
        setInstError(e?.message || "Nepodařilo se načíst měřicí přístroje.");
      } finally {
        if (alive) setInstLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [token, setForm]);

  const toggleInstrument = (inst: UserInstrument, checked: boolean) => {
    setForm((prev) => {
      const current: UserInstrument[] = ((prev as any).measuringInstruments as UserInstrument[]) || [];
      const exists = current.some((i) => i.id === inst.id);
      let next = current;
      if (checked && !exists) next = [...current, inst];
      if (!checked && exists) next = current.filter((i) => i.id !== inst.id);
      return { ...(prev as any), measuringInstruments: next } as any as RevisionForm;
    });
  };

  
  return (
    <div className="space-y-5 text-sm text-gray-800">      <section>
        <h3 className="text-lg font-semibold mb-2">Měřicí přístroje</h3>
        <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 w-10 text-center"></th>
                <th className="p-2 text-left">Název</th>
                <th className="p-2 text-left">Co měří</th>
                <th className="p-2 text-left">Kal. list</th>
                <th className="p-2 text-left">S/N</th>
                <th className="p-2 text-left">Platnost do</th>
                <th className="p-2 text-left">Pozn.</th>
              </tr>
            </thead>
            <tbody>
              {instLoading && (
                <tr><td colSpan={7} className="p-3 text-center text-gray-500">Načítám…</td></tr>
              )}
              {!instLoading && instError && (
                <tr><td colSpan={7} className="p-3 text-center text-red-600">Chyba: {String(instError)}</td></tr>
              )}
              {!instLoading && !instError && instCatalog.length === 0 && (
                <tr><td colSpan={7} className="p-3 text-center text-gray-500">V katalogu zatím nejsou žádné přístroje.</td></tr>
              )}
              {!instLoading && !instError && instCatalog.map((it) => {
                const checked = selectedIds.has(it.id);
                return (
                  <tr key={it.id} className="border-t hover:bg-gray-50/60">
                    <td className="p-2 text-center align-middle">
                      <input type="checkbox" className="w-4 h-4" checked={checked} onChange={(e) => toggleInstrument(it, e.target.checked)} />
                    </td>
                    <td className="p-2">{it.name}</td>
                    <td className="p-2">{it.measurement_text}</td>
                    <td className="p-2">{it.calibration_code}</td>
                    <td className="p-2">{it.serial || ""}</td>
                    <td className="p-2">{it.calibration_valid_until || ""}</td>
                    <td className="p-2">{it.note || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}


