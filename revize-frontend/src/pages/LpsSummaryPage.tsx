import React, { useMemo } from "react";
import { dash } from "./summary-utils/text";

type TechnicianInfo = {
  jmeno: string;
  firma: string;
  cislo_osvedceni: string;
  cislo_opravneni: string;
  ico: string;
  dic: string;
  adresa: string;
  phone?: string;
  email?: string;
};

type Props = {
  safeForm: any;
  technician: TechnicianInfo;
  isPrintView: boolean;
};

const pageBaseStyle: React.CSSProperties = {
  width: "210mm",
  minHeight: "297mm",
  padding: "18mm",
  background: "#fff",
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-semibold text-slate-800 mb-3 tracking-wide">{children}</h2>
);

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col">
    <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
    <span className="text-sm font-medium text-slate-900">{value || "-"}</span>
  </div>
);

const Table = ({
  headers,
  rows,
}: {
  headers: string[];
  rows: Array<React.ReactNode[]>;
}) => (
  <div className="overflow-hidden rounded-2xl border border-slate-200">
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-slate-600">
        <tr>
          {headers.map((h) => (
            <th key={h} className="px-3 py-2 text-left font-semibold uppercase tracking-wide text-xs">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={headers.length} className="px-3 py-4 text-center text-slate-400 text-sm">
              Žádné záznamy
            </td>
          </tr>
        ) : (
          rows.map((row, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 align-top text-slate-800">
                  {cell}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
);

export default function LpsSummaryPage({ safeForm, technician, isPrintView }: Props) {
  const lps = safeForm?.lps || {};
  const measurements: any[] = Array.isArray(lps?.earthResistance) ? lps.earthResistance : [];
  const visualChecks: any[] = Array.isArray(lps?.visualChecks) ? lps.visualChecks : [];
  const spdTests: any[] = Array.isArray(lps?.spdTests) ? lps.spdTests : [];
  const measuringInstruments: any[] = Array.isArray(safeForm?.measuringInstruments)
    ? safeForm.measuringInstruments
    : [];

  const instrumentMap = useMemo(() => {
    const map: Record<string, any> = {};
    measuringInstruments.forEach((inst) => {
      if (!inst?.id) return;
      map[String(inst.id)] = inst;
    });
    return map;
  }, [measuringInstruments]);

  const findInstrument = (id?: string) => {
    if (!id) return "-";
    const inst = instrumentMap[String(id)];
    if (!inst) return "-";
    return `${inst.name}${inst.calibration_code ? ` (${inst.calibration_code})` : ""}`;
  };

  const scopeList: string[] = Array.isArray(lps?.scopeChecks) ? lps.scopeChecks : [];
  const defects: any[] = Array.isArray(safeForm?.defects) ? safeForm.defects : [];
  const stringOrDash = (value: any) => (value && String(value).trim().length > 0 ? value : "–");

  const pageStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    ...pageBaseStyle,
    boxShadow: isPrintView ? "none" : "0 30px 80px rgba(15,23,42,0.15)",
    borderRadius: isPrintView ? 0 : 24,
    marginBottom: isPrintView ? "12mm" : "2.5rem",
    pageBreakAfter: "always",
    ...extra,
  });

  const conclusionText = dash(safeForm?.conclusion?.text) || dash(lps?.reportText);

  return (
    <div className="flex justify-center bg-slate-100/60 py-8 print:bg-white print:py-0">
      <div className="flex flex-col items-center gap-8">
        <article id="lps_info" style={pageStyle()}>
          <header className="flex items-start justify-between border-b border-slate-200 pb-4 mb-6">
            <div>
              <p className="uppercase text-xs tracking-[0.2em] text-slate-500">Souhrnná zpráva LPS</p>
              <h1 className="text-2xl font-semibold text-slate-900 mt-1">{safeForm?.objekt || "Projekt bez názvu"}</h1>
              <p className="text-sm text-slate-500">{safeForm?.adresa || "-"}</p>
            </div>
            <div className="text-right text-sm text-slate-600">
              <div>
                <span className="font-semibold text-slate-900">Evidence:</span> {stringOrDash(safeForm?.evidencni)}
              </div>
              <div>
                <span className="font-semibold text-slate-900">Datum:</span>{" "}
                {dash(safeForm?.date_end || safeForm?.date_created)}
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-200">
              <SectionTitle>Identifikace objektu</SectionTitle>
              <InfoRow label="Objekt" value={stringOrDash(safeForm?.objekt)} />
              <InfoRow label="Adresa" value={stringOrDash(safeForm?.adresa)} />
              <InfoRow label="Objednatel" value={stringOrDash(safeForm?.objednatel)} />
              <InfoRow label="Typ revize" value={stringOrDash(safeForm?.typRevize || "LPS")} />
              <InfoRow label="Norma" value={stringOrDash(lps?.standard || safeForm?.norms?.join(", "))} />
              <InfoRow label="Třída LPS" value={stringOrDash(lps?.class)} />
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-200">
              <SectionTitle>Revizní technik</SectionTitle>
              <InfoRow label="Jméno" value={technician.jmeno} />
              <InfoRow label="Subjekt" value={technician.firma} />
              <InfoRow label="Číslo osvědčení" value={technician.cislo_osvedceni} />
              <InfoRow label="Číslo oprávnění" value={technician.cislo_opravneni} />
              <InfoRow label="IČO / DIČ" value={`${technician.ico} / ${technician.dic}`} />
              <InfoRow label="Adresa" value={technician.adresa} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <SectionTitle>Rozsah revize</SectionTitle>
              {scopeList.length === 0 ? (
                <p className="text-sm text-slate-500">Nejsou vybrány žádné kontrolované části.</p>
              ) : (
                <ul className="text-sm text-slate-800 list-disc pl-4 space-y-1">
                  {scopeList.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
              <SectionTitle>Základní parametry LPS</SectionTitle>
              <dl className="grid grid-cols-1 gap-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Typ objektu</dt>
                  <dd className="font-medium text-slate-900">{stringOrDash(lps?.objectType || lps?.objectTypeOther)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Počet podlaží</dt>
                  <dd className="font-medium text-slate-900">
                    {stringOrDash(lps?.floorsCountOther || lps?.floorsCount)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Jímací soustava</dt>
                  <dd className="font-medium text-slate-900">{stringOrDash(lps?.airTerminationType)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Počet svodů</dt>
                  <dd className="font-medium text-slate-900">
                    {stringOrDash(lps?.downConductorsCountOther || lps?.downConductorsCount)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Zemnění</dt>
                  <dd className="font-medium text-slate-900">{stringOrDash(lps?.earthingType)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Krytina / střecha</dt>
                  <dd className="font-medium text-slate-900">
                    {stringOrDash(lps?.roofTypeOther || lps?.roofType)} / {stringOrDash(lps?.roofCoverOther || lps?.roofCover)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">SPD ochrana</dt>
                  <dd className="font-medium text-slate-900">{stringOrDash(lps?.spdProtectionUsed)}</dd>
                </div>
              </dl>
            </div>
          </div>

          {lps?.reportText && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4">
              <SectionTitle>Popis objektu a poznámky</SectionTitle>
              <p className="text-sm leading-relaxed whitespace-pre-line text-slate-800">{lps.reportText}</p>
            </div>
          )}
        </article>

        <article id="lps_measure" style={pageStyle({ pageBreakAfter: "auto" })}>
          <div className="grid gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <SectionTitle>Vizuální kontrola</SectionTitle>
              <Table
                headers={["Položka", "Stav", "Poznámka"]}
                rows={visualChecks.map((row) => [
                  row.text || "-",
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      row.ok ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {row.ok ? "Vyhovuje" : "Nevyhovuje"}
                  </span>,
                  row.note || "–",
                ])}
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
              <SectionTitle>Měření zemních odporů</SectionTitle>
              <Table
                headers={["Zemnič", "Rz [Ω]", "Přístroj", "Poznámka"]}
                rows={measurements.map((row) => [
                  row.label || "-",
                  row.valueOhm || "–",
                  findInstrument(row.instrumentId),
                  row.note || "–",
                ])}
              />
            </div>

            {spdTests.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
                <SectionTitle>SPD / Přepěťová ochrana</SectionTitle>
                <Table
                  headers={["Místo", "Typ", "Výsledek", "Přístroj", "Poznámka"]}
                  rows={spdTests.map((row) => [
                    row.location || "-",
                    row.type || "-",
                    row.result || "-",
                    findInstrument(row.instrumentId),
                    row.note || "–",
                  ])}
                />
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <SectionTitle>Použité měřicí přístroje</SectionTitle>
              <Table
                headers={["Název", "Měření", "Kal. list", "Platnost", "Poznámka"]}
                rows={measuringInstruments.map((inst) => [
                  inst.name || "-",
                  inst.measurement_text || "-",
                  inst.calibration_code || "-",
                  inst.calibration_valid_until || "-",
                  inst.note || "–",
                ])}
              />
            </div>

            {defects.length > 0 && (
              <div className="bg-white rounded-2xl border border-amber-200 p-4 space-y-2">
                <SectionTitle>Zjištěné závady</SectionTitle>
                <ul className="list-disc pl-4 text-sm text-slate-800 space-y-1">
                  {defects.map((def, idx) => (
                    <li key={idx}>
                      <span className="font-medium">{def.description || "-"}</span>
                      {def.standard && (
                        <span className="text-slate-500 text-xs ml-2">
                          ({def.standard} {def.article || ""})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <SectionTitle>Celkový závěr</SectionTitle>
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                  {conclusionText || "Závěr nebyl vyplněn."}
                </p>
                <div className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">Bezpečnost zařízení: </span>
                  {safeForm?.conclusion?.safety === "not_able"
                    ? "Nevyhovuje"
                    : safeForm?.conclusion?.safety === "able"
                    ? "Vyhovuje"
                    : "Neuvedeno"}
                </div>
                {safeForm?.conclusion?.validUntil && (
                  <div className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">Doporučený termín příští revize: </span>
                    {safeForm.conclusion.validUntil}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col">
                <SectionTitle>Skica LPS</SectionTitle>
                {lps?.sketchPng ? (
                  <img
                    src={lps.sketchPng}
                    alt="Skica LPS"
                    className="rounded-xl border border-slate-200 w-full object-contain max-h-[210mm]"
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                    Skica zatím nebyla vytvořena.
                  </div>
                )}
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
