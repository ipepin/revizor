import React, { useContext, useEffect, useMemo } from "react";
import { RevisionFormContext, RevisionForm } from "../context/RevisionFormContext";

type Earth = { label: string; valueOhm: number | string; instrumentId?: string; note?: string };
type Spd = { location: string; type: string; result: string; instrumentId?: string; note?: string };

type UserInstrument = {
  id: string;
  name: string;
  measurement_text: string;
  calibration_code: string;
  serial?: string | null;
  calibration_valid_until?: string | null;
  note?: string | null;
};

export default function LpsMeasurementsSection() {
  const { form, setForm } = useContext(RevisionFormContext);

  const earth: Earth[] = ((form as any)?.lps?.earthResistance as Earth[]) || [];
  const spd: Spd[] = ((form as any)?.lps?.spdTests as Spd[]) || [];
  const instruments: UserInstrument[] = ((form as any).measuringInstruments as any[]) || [];

  const hasSPD = Array.isArray((form as any)?.lps?.scopeChecks) && (form as any).lps.scopeChecks.includes("spd");
  const spdUsed = ((form as any)?.lps?.spdProtectionUsed || "") !== "no";
  const showSpdSection = hasSPD && spdUsed;

  const instOptions = useMemo(
    () => instruments.map((i) => ({ value: i.id, label: `${i.name} (${i.calibration_code})` })),
    [instruments]
  );

  const setEarth = (next: Earth[]) =>
    setForm((prev) => ({ ...(prev as any), lps: { ...(prev as any).lps, earthResistance: next } }) as any as RevisionForm);
  const setSpd = (next: Spd[]) =>
    setForm((prev) => ({ ...(prev as any), lps: { ...(prev as any).lps, spdTests: next } }) as any as RevisionForm);

  const setEarthField = (i: number, field: keyof Earth, value: any) =>
    setEarth(earth.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  const setSpdField = (i: number, field: keyof Spd, value: any) =>
    setSpd(spd.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  const delEarth = (i: number) => setEarth(earth.filter((_, idx) => idx !== i));
  const delSpd = (i: number) => setSpd(spd.filter((_, idx) => idx !== i));

  // Počet zemničů synchronizujeme podle počtu svodů v identifikaci
  const downCountRaw = (form as any)?.lps?.downConductorsCountOther || (form as any)?.lps?.downConductorsCount;
  const desiredEarthCount = (() => {
    const n = parseInt(String(downCountRaw || "").trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  })();

  useEffect(() => {
    if (!desiredEarthCount) return;
    setForm((prev: any) => {
      const cur: Earth[] = Array.isArray(prev?.lps?.earthResistance) ? prev.lps.earthResistance : [];
      let next = cur.slice(0, desiredEarthCount);
      while (next.length < desiredEarthCount) {
        next.push({ label: `Zemnič č. ${next.length + 1}`, valueOhm: "" });
      }
      const same = next.length === cur.length && next.every((r, i) => cur[i] === r);
      if (same) return prev;
      return { ...prev, lps: { ...(prev?.lps || {}), earthResistance: next } } as RevisionForm;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desiredEarthCount]);

  // Pokud SPD není použita, automaticky vyprázdníme záznamy
  useEffect(() => {
    if (!spdUsed && spd.length > 0) {
      setSpd([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spdUsed]);

  return (
    <div className="space-y-6 text-sm text-gray-800">
      <h2 className="text-xl font-semibold text-blue-800">LPS – Měření</h2>

      <section>
        <h3 className="font-semibold mb-2">Zemní odpor (jednotlivé zemniče)</h3>
        <div className="bg-white rounded shadow border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Zemnič</th>
                <th className="p-2 text-left">Rz (Ω)</th>
                <th className="p-2 text-left">Pozn.</th>
              </tr>
            </thead>
            <tbody>
              {earth.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-3 text-center text-gray-500">
                    Žádné záznamy
                  </td>
                </tr>
              )}
              {earth.map((row, idx) => (
                <tr key={idx} className="border-t">
                  <td className="p-2">
                    <input className="w-full p-2 border rounded" value={row.label} onChange={(e) => setEarthField(idx, "label", e.target.value)} />
                  </td>
                  <td className="p-2">
                    <input
                      className="w-32 p-2 border rounded"
                      value={row.valueOhm}
                      onChange={(e) => setEarthField(idx, "valueOhm", e.target.value)}
                      placeholder="např. 10"
                    />
                  </td>
                  <td className="p-2">
                    <input className="w-full p-2 border rounded" value={row.note || ""} onChange={(e) => setEarthField(idx, "note", e.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showSpdSection ? (
        <section>
          <h3 className="font-semibold mb-2">SPD / přepěťová ochrana – měření</h3>
          <div className="bg-white rounded shadow border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Místo</th>
                  <th className="p-2 text-left">Typ (T1/T2/T3)</th>
                  <th className="p-2 text-left">Výsledek</th>
                  <th className="p-2 text-left">Pozn.</th>
                </tr>
              </thead>
              <tbody>
                {spd.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-gray-500">
                      Žádné záznamy
                    </td>
                  </tr>
                )}
                {spd.map((row, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-2">
                      <input
                        className="w-full p-2 border rounded"
                        value={row.location}
                        onChange={(e) => setSpdField(idx, "location", e.target.value)}
                        placeholder="rozvaděč, přívod apod."
                      />
                    </td>
                    <td className="p-2">
                      <select className="p-2 border rounded" value={row.type} onChange={(e) => setSpdField(idx, "type", e.target.value)}>
                        <option value="">- vyberte -</option>
                        <option value="T1">T1</option>
                        <option value="T2">T2</option>
                        <option value="T3">T3</option>
                        <option value="T1+T2">T1+T2</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <select className="p-2 border rounded" value={row.result} onChange={(e) => setSpdField(idx, "result", e.target.value)}>
                        <option value="">- vyberte -</option>
                        <option value="OK">OK</option>
                        <option value="NOK">NOK</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <input className="w-full p-2 border rounded" value={row.note || ""} onChange={(e) => setSpdField(idx, "note", e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        hasSPD && (
          <section>
            <h3 className="font-semibold mb-2">SPD / přepěťová ochrana – měření</h3>
            <div className="p-3 bg-white rounded border text-sm text-gray-600">SPD není použita.</div>
          </section>
        )
      )}
    </div>
  );
}
