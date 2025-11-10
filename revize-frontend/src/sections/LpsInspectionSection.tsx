import React, { useContext } from "react";
import { RevisionFormContext, RevisionForm } from "../context/RevisionFormContext";

type Check = { text: string; ok: boolean; note?: string };

export default function LpsInspectionSection() {
  const { form, setForm } = useContext(RevisionFormContext);
  const checks: Check[] = ((form as any)?.lps?.visualChecks as Check[]) || [];

  const update = (next: Check[]) => setForm(prev => ({ ...(prev as any), lps: { ...(prev as any).lps, visualChecks: next } }) as any as RevisionForm);

  const addRow = () => update([ ...checks, { text: "", ok: false } ]);
  const removeRow = (idx: number) => update(checks.filter((_, i) => i !== idx));
  const setField = (idx: number, field: keyof Check, value: any) => {
    const next = checks.map((r, i) => i === idx ? { ...r, [field]: value } : r);
    update(next);
  };

  return (
    <div className="space-y-4 text-sm text-gray-800">
      <h2 className="text-xl font-semibold text-blue-800">LPS – Vizuální kontrola</h2>
      <div className="bg-white rounded shadow border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Položka</th>
              <th className="p-2 text-left">OK</th>
              <th className="p-2 text-left">Poznámka</th>
              <th className="p-2 text-left">Akce</th>
            </tr>
          </thead>
          <tbody>
            {checks.length === 0 && (
              <tr><td colSpan={4} className="p-3 text-center text-gray-500">Žádné položky</td></tr>
            )}
            {checks.map((row, idx) => (
              <tr key={idx} className="border-t">
                <td className="p-2">
                  <input className="w-full p-2 border rounded" value={row.text} onChange={e => setField(idx, 'text', e.target.value)} placeholder="Např. svorky dotaženy, značení svodů…" />
                </td>
                <td className="p-2">
                  <input type="checkbox" checked={!!row.ok} onChange={e => setField(idx, 'ok', e.target.checked)} />
                </td>
                <td className="p-2">
                  <input className="w-full p-2 border rounded" value={row.note || ''} onChange={e => setField(idx, 'note', e.target.value)} placeholder="volitelné" />
                </td>
                <td className="p-2">
                  <button className="px-2 py-1 bg-red-600 text-white rounded" onClick={() => removeRow(idx)}>Smazat</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={addRow}>+ Přidat položku</button>
    </div>
  );
}
