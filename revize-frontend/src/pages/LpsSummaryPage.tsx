import React, { useMemo } from "react";

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
  padding: "18mm 24mm 24mm",
  background: "#fff",
};

const scopeLabels: Record<string, string> = {
  vnejsi: "Vnější ochrana před bleskem",
  vnitrni: "Vnitřní ochrana před bleskem",
  uzemneni: "Uzemnění",
  pospojovani: "Ekvipotenciální pospojování",
  spd: "SPD / přepěťová ochrana",
};

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-semibold text-slate-800 mb-3 tracking-wide">{children}</h2>
);

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col">
    <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
    <span className="text-sm font-medium text-slate-900">{value || "—"}</span>
  </div>
);

const Table = ({
  headers,
  rows,
  emptyText,
}: {
  headers: string[];
  rows: Array<React.ReactNode[]>;
  emptyText: string;
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
              {emptyText}
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

const formatDate = (value?: string) => {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  if (y && m && d) return `${d}.${m}.${y}`;
  return value;
};

const formatStandardName = (code?: string) => {
  const normalized = (code || "").toLowerCase();
  if (!normalized) return "—";
  if (normalized.includes("62305")) return "ČSN EN 62305-3 ed.2";
  if (normalized.includes("341390")) return "ČSN 34 1390";
  return code || "—";
};

const valueOrDash = (value: any) => {
  if (value === 0) return "0";
  if (!value) return "—";
  const str = String(value).trim();
  return str.length > 0 ? str : "—";
};

export default function LpsSummaryPage({ safeForm, technician, isPrintView }: Props) {
  const lps = safeForm?.lps || {};
  const measuringInstruments: any[] = useMemo(
    () => (Array.isArray(safeForm?.measuringInstruments) ? safeForm.measuringInstruments : []),
    [safeForm?.measuringInstruments]
  );
  const scopeChecks: string[] = Array.isArray(lps?.scopeChecks) ? lps.scopeChecks : [];
  const earthMeasurements: any[] = Array.isArray(lps?.earthResistance) ? lps.earthResistance : [];
  const continuityChecks: any[] = Array.isArray(lps?.continuity) ? lps.continuity : [];
  const spdTests: any[] = Array.isArray(lps?.spdTests) ? lps.spdTests : [];
  const visualChecks: any[] = Array.isArray(lps?.visualChecks) ? lps.visualChecks : [];
  const defects: any[] = Array.isArray(safeForm?.defects) ? safeForm.defects : [];

  const instrumentMap = useMemo(() => {
    const map: Record<string, any> = {};
    measuringInstruments.forEach((inst) => {
      if (inst?.id != null) map[String(inst.id)] = inst;
    });
    return map;
  }, [measuringInstruments]);

  const findInstrument = (id?: string) => {
    if (!id) return "—";
    const inst = instrumentMap[String(id)];
    if (!inst) return "—";
    return inst.name || inst.measurement_text || "—";
  };

  const measuringRows = measuringInstruments.map((inst, idx) => [
    <span key={`inst-${idx}-name`} className="font-medium text-slate-900">{valueOrDash(inst.name)}</span>,
    <span key={`inst-${idx}-serial`}>{valueOrDash(inst.serial)}</span>,
    <span key={`inst-${idx}-cal`}>{valueOrDash(inst.calibration_code)}</span>,
  ]);

  const earthRows = earthMeasurements.map((row, idx) => [
    valueOrDash(row?.label || `Zemnič ${idx + 1}`),
    row?.valueOhm ? `${row.valueOhm} Ω` : "—",
    valueOrDash(row?.note),
  ]);

  const continuityRows = continuityChecks.map((row, idx) => [
    valueOrDash(row?.conductor || `Svod ${idx + 1}`),
    row?.valueMilliOhm ? `${row.valueMilliOhm} mΩ` : "—",
    valueOrDash(row?.note),
  ]);

  const spdRows = spdTests.map((row, idx) => [
    valueOrDash(row?.location || `Stanoviště ${idx + 1}`),
    valueOrDash(row?.type),
    valueOrDash(row?.result),
    valueOrDash(row?.note),
  ]);

  const visualRows = visualChecks.map((row, idx) => [
    valueOrDash(row?.text || `Kontrola ${idx + 1}`),
    row?.ok ? "OK" : "NOK",
    valueOrDash(row?.note),
  ]);

  const defectRows = defects.map((row, idx) => [
    <span key={`def-${idx}-text`} className="font-medium text-slate-900">{valueOrDash(row?.description)}</span>,
    valueOrDash(row?.standard || row?.article),
    valueOrDash(row?.recommendation || row?.remedy),
  ]);

  const scopeTextItems = scopeChecks.map((key) => scopeLabels[key] || key);
  const revisionType = valueOrDash(safeForm?.typRevize);
  const spdProtection = lps?.spdProtectionUsed === "yes" ? "Je použita" : lps?.spdProtectionUsed === "no" ? "Není použita" : "Neuvedeno";

  const pageStyle: React.CSSProperties = {
    ...pageBaseStyle,
    boxShadow: isPrintView ? "none" : "0 30px 80px rgba(15,23,42,0.18)",
    borderRadius: isPrintView ? 0 : 28,
    marginBottom: isPrintView ? "0" : "3rem",
    pageBreakAfter: "always",
  };

  const conclusionText = valueOrDash(safeForm?.conclusion?.text || lps?.reportTextConclusion || "");
  const nextRevision = valueOrDash(safeForm?.conclusion?.validUntil || lps?.nextRevision || "");

  return (
    <div className="flex justify-center bg-slate-100/60 py-8 print:bg-white print:py-0">
      <article style={pageStyle} className="text-slate-900">
        <header className="border-b border-slate-200 pb-4 mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="uppercase text-xs tracking-[0.35em] text-slate-500">Revizní zpráva</p>
            <h1 className="text-3xl md:text-4xl font-semibold text-slate-900">Zpráva o revizi LPS</h1>
            <div className="mt-2 text-sm text-slate-600">Typ revize: {revisionType}</div>
          </div>
          <div className="text-right">
            <span className="text-xs uppercase tracking-wide text-slate-500">Evidenční číslo</span>
            <div className="text-2xl font-bold text-slate-900">{valueOrDash(safeForm?.evidencni)}</div>
            <div className="mt-4 text-xs text-slate-600 space-y-1">
              <div>Datum zahájení: {formatDate(safeForm?.date_start)}</div>
              <div>Datum ukončení: {formatDate(safeForm?.date_end)}</div>
              <div>Datum vyhotovení: {formatDate(safeForm?.date_created)}</div>
            </div>
          </div>
        </header>

        <section className="mb-6">
          <SectionTitle>Identifikace objektu</SectionTitle>
          <div className="grid md:grid-cols-2 gap-4 text-sm mb-4">
            <InfoRow label="Revidovaný objekt" value={valueOrDash(safeForm?.objekt)} />
            <InfoRow label="Adresa objektu" value={valueOrDash(safeForm?.adresa)} />
            <InfoRow label="Objednatel revize" value={valueOrDash(safeForm?.objednatel)} />
            <InfoRow label="Majitel / provozovatel" value={valueOrDash(lps?.owner)} />
            <InfoRow label="Projekt zpracoval" value={valueOrDash(lps?.projectBy)} />
            <InfoRow label="Číslo projektu" value={valueOrDash(lps?.projectNo)} />
          </div>
          <SectionTitle>Identifikace revizního technika</SectionTitle>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <InfoRow label="Revizní technik" value={valueOrDash(technician.jmeno)} />
            <InfoRow label="Firma" value={valueOrDash(technician.firma)} />
            <InfoRow label="Ev. č. osvědčení" value={valueOrDash(technician.cislo_osvedceni)} />
            <InfoRow label="Ev. č. oprávnění" value={valueOrDash(technician.cislo_opravneni)} />
            <InfoRow label="IČ" value={valueOrDash(technician.ico)} />
            <InfoRow label="DIČ" value={valueOrDash(technician.dic)} />
            <InfoRow label="Kontakt" value={valueOrDash(technician.phone || technician.email || technician.adresa)} />
            <InfoRow label="Adresa" value={valueOrDash(technician.adresa)} />
          </div>
        </section>

        <section className="mb-6">
          <SectionTitle>Použité měřicí přístroje</SectionTitle>
          <Table
            headers={["Přístroj", "Výrobní číslo", "Kalibrační list"]}
            rows={measuringRows}
            emptyText="Nejsou uvedeny žádné přístroje."
          />
        </section>

        <section className="mb-6">
          <SectionTitle>Normy, rozsah a základní údaje</SectionTitle>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <InfoRow label="Primární norma" value={formatStandardName(lps?.standard)} />
            <InfoRow label="Třída LPS" value={valueOrDash(lps?.class)} />
            <InfoRow label="SPD ochrana" value={spdProtection} />
            <InfoRow label="Typ střechy" value={valueOrDash(lps?.roofTypeOther || lps?.roofType)} />
            <InfoRow label="Střešní krytina" value={valueOrDash(lps?.roofCoverOther || lps?.roofCover)} />
            <InfoRow label="Počet svodů" value={valueOrDash(lps?.downConductorsCountOther || lps?.downConductorsCount)} />
          </div>
          <div className="mt-4">
            <span className="text-xs uppercase tracking-wide text-slate-500">Rozsah revize</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {scopeTextItems.length === 0 ? (
                <span className="text-sm text-slate-500">Neuvedeno</span>
              ) : (
                scopeTextItems.map((text) => (
                  <span key={text} className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                    {text}
                  </span>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="mb-6">
          <SectionTitle>Popis objektu a poznámky</SectionTitle>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800 min-h-[80px]">
            {valueOrDash(lps?.reportText || safeForm?.extraNotes || "—")}
          </div>
        </section>

        <section className="mb-6">
          <SectionTitle>Měření zemních odporů</SectionTitle>
          <Table headers={["Zemnič", "Odpor [Ω]", "Poznámka"]} rows={earthRows} emptyText="Záznam o měření není k dispozici." />
        </section>

        {continuityRows.length > 0 && (
          <section className="mb-6">
            <SectionTitle>Kontinuita svodů</SectionTitle>
            <Table headers={["Svod", "Hodnota [mΩ]", "Poznámka"]} rows={continuityRows} emptyText="Kontinuita nebyla zadána." />
          </section>
        )}

        {spdRows.length > 0 && (
          <section className="mb-6">
            <SectionTitle>SPD / přepěťová ochrana</SectionTitle>
            <Table headers={["Místo", "Typ", "Výsledek", "Poznámka"]} rows={spdRows} emptyText="Bez záznamu o SPD." />
          </section>
        )}

        {visualRows.length > 0 && (
          <section className="mb-6">
            <SectionTitle>Vizuální kontrola</SectionTitle>
            <Table headers={["Položka", "Stav", "Poznámka"]} rows={visualRows} emptyText="Nebyla zadána žádná kontrola." />
          </section>
        )}

        {defectRows.length > 0 && (
          <section className="mb-6">
            <SectionTitle>Zjištěné závady</SectionTitle>
            <Table headers={["Popis", "Norma / čl.", "Doporučené opatření"]} rows={defectRows} emptyText="Nebyla zadána žádná závada." />
          </section>
        )}

        <section className="mb-6">
          <SectionTitle>Celkový posudek</SectionTitle>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-800 space-y-3">
            <p>{conclusionText}</p>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <InfoRow label="Doporučený termín příští revize" value={formatDate(nextRevision)} />
              <InfoRow label="Rozdělovník" value={valueOrDash(lps?.distributionList || "Provozovatel 2x, Revizní technik 1x")}/> 
            </div>
          </div>
        </section>

        <section className="mb-0">
          <SectionTitle>Nákres LPS</SectionTitle>
          {lps?.sketchPng ? (
            <img
              src={lps.sketchPng}
              alt="Skica LPS"
              className="w-full max-h-[220mm] object-contain rounded-2xl border border-slate-200 bg-white"
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-500 text-sm p-6 text-center">
              Skica LPS zatím není k dispozici.
            </div>
          )}
        </section>
      </article>
    </div>
  );
}



