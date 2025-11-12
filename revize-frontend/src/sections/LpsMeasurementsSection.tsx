import React, { useContext, useMemo } from "react";
import { RevisionFormContext, RevisionForm } from "../context/RevisionFormContext";

type Earth = { label: string; valueOhm: number | string; instrumentId?: string; note?: string };
type Spd   = { location: string; type: string; result: string; instrumentId?: string; note?: string };

type UserInstrument = {
  id: string; name: string; measurement_text: string; calibration_code: string;
  serial?: string | null; calibration_valid_until?: string | null; note?: string | null;
};

export default function LpsMeasurementsSection() {
  const { form, setForm } = useContext(RevisionFormContext);

  const earth: Earth[] = ((form as any)?.lps?.earthResistance as Earth[]) || [];
  const spd: Spd[]     = ((form as any)?.lps?.spdTests as Spd[]) || [];
  const instruments: UserInstrument[] = ((form as any).measuringInstruments as any[]) || [];

  const hasSPD = Array.isArray((form as any)?.lps?.scopeChecks) && (form as any).lps.scopeChecks.includes("spd");

  const instOptions = useMemo(
    () => instruments.map(i => ({ value: i.id, label: `${i.name} (${i.calibration_code})` })),
    [instruments]
  );

  const setEarth = (next: Earth[]) => setForm(prev => ({ ...(prev as any), lps: { ...(prev as any).lps, earthResistance: next } }) as any as RevisionForm);
  const setSpd   = (next: Spd[])   => setForm(prev => ({ ...(prev as any), lps: { ...(prev as any).lps, spdTests: next } }) as any as RevisionForm);

  const addEarth = () => {
    const idx = earth.length + 1;
    setEarth([ ...earth, { label: `ZemniÄŤ ÄŤ. ${idx}`, valueOhm: "" } ]);
  };
  const addSpd  = () => setSpd([ ...spd, { location: "", type: "", result: "" } ]);

  const setEarthField = (i: number, field: keyof Earth, value: any) => setEarth(earth.map((r,idx) => idx===i ? { ...r, [field]: value } : r));
  const setSpdField   = (i: number, field: keyof Spd,   value: any) => setSpd(spd.map((r,idx) => idx===i ? { ...r, [field]: value } : r));
  const delEarth = (i: number) => setEarth(earth.filter((_,idx)=>idx!==i));
  const delSpd   = (i: number) => setSpd(spd.filter((_,idx)=>idx!==i));

  return (
    <div className="space-y-6 text-sm text-gray-800">
      <h2 className="text-xl font-semibold text-blue-800">LPS â€“ MÄ›Ĺ™enĂ­</h2>

      <section>
        <h3 className="font-semibold mb-2">ZemnĂ­ odpor (jednotlivĂ© zemniÄŤe)</h3>
        <div className="bg-white rounded shadow border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">ZemniÄŤ</th>
                <th className="p-2 text-left">Rz (Î©)</th>
                <th className="p-2 text-left">PĹ™Ă­stroj</th>
                <th className="p-2 text-left">Pozn.</th>
                <th className="p-2 text-left">Akce</th>
              </tr>
            </thead>
            <tbody>
              {earth.length === 0 && (
                <tr><td colSpan={5} className="p-3 text-center text-gray-500">Ĺ˝ĂˇdnĂ© zĂˇznamy</td></tr>
              )}
              {earth.map((row, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2"><input className="w-full p-2 border rounded" value={row.label} onChange={e=>setEarthField(idx,'label',e.target.value)} /></td>
                  <td className="p-2"><input className="w-32 p-2 border rounded" value={row.valueOhm} onChange={e=>setEarthField(idx,'valueOhm',e.target.value)} placeholder="napĹ™. 10" /></td>
                  <td className="p-2">
                    <select className="p-2 border rounded" value={row.instrumentId || ""} onChange={e=>setEarthField(idx,'instrumentId',e.target.value)}>
                      <option value="">- vyberte -</option>
                      {instOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                  <td className="p-2"><input className="w-full p-2 border rounded" value={row.note || ''} onChange={e=>setEarthField(idx,'note',e.target.value)} /></td>
                  <td className="p-2"><button className="px-2 py-1 bg-red-600 text-white rounded" onClick={()=>delEarth(idx)}>Smazat</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="mt-2 px-3 py-2 bg-blue-600 text-white rounded" onClick={addEarth}>+ PĹ™idat zemniÄŤ</button>
      </section>

      {hasSPD && (
        <section>
          <h3 className="font-semibold mb-2">SPD / PĹ™epÄ›ĹĄovĂˇ ochrana â€“ mÄ›Ĺ™enĂ­</h3>
          <div className="bg-white rounded shadow border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">MĂ­sto</th>
                  <th className="p-2 text-left">Typ (T1/T2/T3)</th>
                  <th className="p-2 text-left">VĂ˝sledek</th>
                  <th className="p-2 text-left">PĹ™Ă­stroj</th>
                  <th className="p-2 text-left">Pozn.</th>
                  <th className="p-2 text-left">Akce</th>
                </tr>
              </thead>
              <tbody>
                {spd.length === 0 && (
                  <tr><td colSpan={6} className="p-3 text-center text-gray-500">Ĺ˝ĂˇdnĂ© zĂˇznamy</td></tr>
                )}
                {spd.map((row, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2"><input className="w-full p-2 border rounded" value={row.location} onChange={e=>setSpdField(idx,'location',e.target.value)} placeholder="rozvadÄ›ÄŤ, pĹ™Ă­vod apod." /></td>
                    <td className="p-2">
                      <select className="p-2 border rounded" value={row.type} onChange={e=>setSpdField(idx,'type',e.target.value)}>
                        <option value="">- vyberte -</option>
                        <option value="T1">T1</option>
                        <option value="T2">T2</option>
                        <option value="T3">T3</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <select className="p-2 border rounded" value={row.result} onChange={e=>setSpdField(idx,'result',e.target.value)}>
                        <option value="">- vyberte -</option>
                        <option value="OK">OK</option>
                        <option value="NOK">NOK</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <select className="p-2 border rounded" value={row.instrumentId || ""} onChange={e=>setSpdField(idx,'instrumentId',e.target.value)}>
                        <option value="">- vyberte -</option>
                        {instOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="p-2"><input className="w-full p-2 border rounded" value={row.note || ''} onChange={e=>setSpdField(idx,'note',e.target.value)} /></td>
                    <td className="p-2"><button className="px-2 py-1 bg-red-600 text-white rounded" onClick={()=>delSpd(idx)}>Smazat</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="mt-2 px-3 py-2 bg-blue-600 text-white rounded" onClick={addSpd}>+ PĹ™idat zĂˇznam SPD</button>
        </section>
      )}
    </div>
  );
}
