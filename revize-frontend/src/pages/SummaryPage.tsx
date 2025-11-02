// src/pages/SummaryPage.tsx
import React, { useMemo, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useRevisionForm } from "../context/RevisionFormContext";
import { useUser } from "../context/UserContext";
import { generateSummaryDocx } from "./summary-export/word";
import { renderAndDownloadRzDocxFromTemplate } from "./summary-export/docxTemplate";

import {
  HeaderBlock,
  TechnicianCard,
  H1, Th, Td, KV, Rich,
} from "./summary/components";

import { dash, listOrDash } from "./summary-utils/text";

// đź”§ utilitky pro rozvadÄ›ÄŤe (nutnĂ© pro vykreslenĂ­ komponent)
import { normalizeComponents, depthPrefix, buildComponentLine } from "./summary-utils/board";

/* =============================== */
/* ======== Summary Page ========= */
/* =============================== */

export default function SummaryPage() {
  const { revId } = useParams();
  const { form: ctxForm } = useRevisionForm();
  const pageRef = useRef<HTMLDivElement | null>(null);
  const { profile, company } = useUser();

  // Print-view flag
  const sp = new URLSearchParams(window.location.search);
  const isPrintView = sp.get("print") === "1";

  // Auto-print
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("print") === "1" && sp.get("auto") === "1") {
      (async () => {
        await new Promise((r) => requestAnimationFrame(() => r(null)));
        try {
          if ((document as any).fonts?.ready) await (document as any).fonts.ready;
        } catch {}
        setTimeout(() => window.print(), 150);
      })();
      const onAfterPrint = () => {
        if (sp.get("close") === "1") window.close();
      };
      window.addEventListener("afterprint", onAfterPrint);
      return () => window.removeEventListener("afterprint", onAfterPrint);
    }
  }, []);

  // VektorovĂ˝ reĹľim pro tisk
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("print") === "1" && sp.get("vector") === "1") {
      document.documentElement.classList.add("print-vector");
      return () => document.documentElement.classList.remove("print-vector");
    }
  }, []);

  // Null-safe formulĂˇĹ™
  const safeForm: any = useMemo(
    () => ({
      evidencni: "",
      objekt: "",
      adresa: "",
      objednatel: "",
      montFirma: "",
      montFirmaAuthorization: "",
      typRevize: "",
      sit: "",
      voltage: "",
      date_start: "",
      date_end: "",
      date_created: "",
      documentation: "",
      environment: "",
      extraNotes: "",
      protection_basic: [] as string[],
      protection_fault: [] as string[],
      protection_additional: [] as string[],
      norms: [] as string[],
      customNorm1: "",
      customNorm2: "",
      customNorm3: "",
      boards: [] as any[],
      rooms: [] as any[],
      defects: [] as any[],
      performedTasks: [] as string[],
      inspectionTemplate: "",
      inspectionDescription: "",
      tests: {} as Record<string, any>,
      measuringInstruments: [] as any[],
      instruments: [] as any[],
      conclusion: {
        text: "",
        safety: "" as "" | "able" | "not_able" | string,
        validUntil: "",
      },
      ...(ctxForm || {}),
    }),
    [ctxForm]
  );

  // ReviznĂ­ technik
  const technician = useMemo(() => {
    const p: any = profile || {};
    const c: any = company || {};
    return {
      jmeno: p.fullName || p.name || "ChybĂ­ informace",
      firma: c.name || c.companyName || "ChybĂ­ informace",
      cislo_osvedceni: p.certificateNumber || p.certificate_number || "ChybĂ­ informace",
      cislo_opravneni: p.authorizationNumber || p.authorization_number || "ChybĂ­ informace",
      ico: c.ico || c.icoNumber || "ChybĂ­ informace",
      dic: c.dic || c.taxId || "ChybĂ­ informace",
      adresa: c.address || p.address || "ChybĂ­ informace",
      phone: p.phone || c.phone || "ChybĂ­ informace",
      email: p.email || c.email || "ChybĂ­ informace",
    };
  }, [profile, company]);

  // Normy = normy + vlastnĂ­ texty
  const normsAll = useMemo(() => {
    const extra = [safeForm.customNorm1, safeForm.customNorm2, safeForm.customNorm3].filter(
      (x: any) => x && String(x).trim().length > 0
    );
    return [...(safeForm.norms || []), ...extra];
  }, [safeForm.norms, safeForm.customNorm1, safeForm.customNorm2, safeForm.customNorm3]);

  // ZkouĹˇky
  const testsRows = useMemo(() => {
    const obj = (safeForm.tests || {}) as Record<string, any>;
    return Object.entries(obj).map(([name, val]) => {
      let note = "";
      if (val == null) note = "";
      else if (typeof val === "string") note = val;
      else if (typeof val === "object")
        note = (val as any).note ?? (val as any).result?.note ?? (val as any).result ?? "";
      else note = String(val);
      return { name, note: String(note || "") };
    });
  }, [safeForm.tests]);

  const safetyLabel = useMemo(() => {
    const s = safeForm.conclusion?.safety;
    if (!s) return "ChybĂ­ informace";
    if (s === "able") return "ElektrickĂˇ instalace je z hlediska bezpeÄŤnosti schopna provozu";
    if (s === "not_able") return "ElektrickĂˇ instalace nenĂ­ z hlediska bezpeÄŤnosti schopna provozu";
    return String(s);
  }, [safeForm.conclusion?.safety]);

  // PĹ™Ă­stroje (checked)
  const usedInstruments = useMemo(() => {
    const arr: any[] =
      Array.isArray(safeForm.measuringInstruments) && safeForm.measuringInstruments.length
        ? safeForm.measuringInstruments
        : Array.isArray(safeForm.instruments)
        ? safeForm.instruments
        : [];

    const hasChecked = arr.some((i) => typeof i?.checked === "boolean");
    const selected = hasChecked ? arr.filter((i) => i?.checked) : arr;

    return selected.map((i) => ({
      id: String(i?.id ?? i?._id ?? i?.uuid ?? Math.random()),
      name: dash(i?.name),
      serial: dash(i?.serial || i?.serial_no || i?.sn),
      calibration: dash(i?.calibration_list || i?.calibration || i?.calibration_code),
      measurement_text: dash(i?.measurement_text || i?.measurement || i?.rozsah),
      calibration_valid_until: dash(i?.calibration_valid_until),
      note: dash(i?.note),
    }));
  }, [safeForm.measuringInstruments, safeForm.instruments]);

  // Export PDF (vektorovĂ˝ tisk)
  const handleGeneratePDF = () => {
    const fileId = String(safeForm.evidencni || revId || "vystup");
    const url = new URL(window.location.href);
    url.searchParams.set("print", "1");
    url.searchParams.set("auto", "1");
    url.searchParams.set("close", "1");
    url.searchParams.set("vector", "1");
    url.searchParams.set("fname", `revizni_zprava_${fileId}.pdf`);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  };

  // Export DOCX (pĹŻvodnĂ­ generĂˇtor)
  const handleGenerateWord = async () => {
    try {
      await generateSummaryDocx({ safeForm, technician, normsAll, usedInstruments, revId });
    } catch (e: any) {
      alert(`NepodaĹ™ilo se vygenerovat DOCX: ${e?.message || e}`);
    }
  };

  // NOVĂ‰: vyplnÄ›nĂ­ Word Ĺ ABLONY placeholdery
  const handleGenerateFromTemplate = async () => {
    await renderAndDownloadRzDocxFromTemplate({
      safeForm,
      technician,
      normsAll,
      usedInstruments,
      revId,
      templateUrl: "/templates/rz_template.docx", // umĂ­sti do /public/templates
    });
  };

  return (
    <div className={isPrintView ? "min-h-screen bg-white text-slate-900" : "min-h-screen bg-white text-slate-900"}>
      <div className="flex" id="app-chrome">
        {!isPrintView && (
          <div className="print:hidden">
            <Sidebar mode="summary" />
          </div>
        )}
        <main className={isPrintView ? "flex-1" : "flex-1 p-6 md:p-10"}>
          {!isPrintView && (
            <div className="flex justify-end gap-3 mb-4 print:hidden">
              <button onClick={handleGenerateFromTemplate} className="px-4 py-2 rounded bg-indigo-700 text-white">
                â€¦do Ĺˇablony
              </button>
              <button onClick={handleGenerateWord} className="px-4 py-2 rounded bg-indigo-600 text-white">
                Generovat Word
              </button>
              <button onClick={handleGeneratePDF} className="px-4 py-2 rounded bg-emerald-600 text-white">
                Generovat PDF
              </button>
            </div>
          )}

          <style>{`
            @font-face{ font-family:'Carlito'; src:url('/fonts/Carlito-Regular.woff2') format('woff2'); font-weight:400; font-style:normal; font-display:swap; }
            @font-face{ font-family:'Carlito'; src:url('/fonts/Carlito-Bold.woff2') format('woff2'); font-weight:700; font-style:normal; font-display:swap; }
            @font-face{ font-family:'Carlito'; src:url('/fonts/Carlito-Italic.woff2') format('woff2'); font-weight:400; font-style:italic; font-display:swap; }
            @font-face{ font-family:'Carlito'; src:url('/fonts/Carlito-BoldItalic.woff2') format('woff2'); font-weight:700; font-style:italic; font-display:swap; }
            body { font-family: Carlito, Calibri, Arial, sans-serif; background:#fff; }

            .a4 {
              width: 210mm;
              min-height: 297mm;
              margin: 12mm auto;
              background: #fff;
              color:#0f172a;
              padding: 12mm 14mm 20mm;
              box-shadow: 0 4px 18px rgba(0,0,0,.12);
              border-radius: 2px;
            }
            .a4 + .a4 { page-break-before: always; }
            .print-only { display: none; }

            @media print {
              .break-before-page { break-before: page; }
            }

            @page { size: A4; margin: 0; }
            @media print {
              html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; }
              .print\\:hidden { display:none !important; }
              .a4 {
                margin: 0 !important;
                box-shadow: none !important;
                border: 0 !important;
                page-break-after: always;
              }
              .print-only { display:block !important; }

              .print-vector .a4, .print-vector .a4 * {
                -webkit-transform:none !important; transform:none !important;
                filter:none !important; -webkit-filter:none !important;
                text-shadow:none !important; box-shadow:none !important;
                backdrop-filter:none !important; opacity:1 !important;
              }
            }
          `}</style>

          {/* ===== OBAL PRO PDF/PRINT ===== */}
          <div id="report-content" ref={pageRef}>
            {/* ===== A4 #1 ===== */}
            <section className="a4">
              <HeaderBlock
                evidencni={safeForm.evidencni}
                revId={revId}
                typRevize={safeForm.typRevize}
                normsAll={normsAll}
              />

              <TechnicianCard tech={technician} />

              <hr className="my-5 border-slate-200" />

              {/* RevidovanĂ˝ objekt (struÄŤnÄ›) */}
              <section className="mt-3" style={{ breakInside: "avoid" }}>
                <h2 className="font-semibold text-lg mb-2">RevidovanĂ˝ objekt</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <KV label="Adresa stavby" value={safeForm.adresa} />
                  <KV label="PĹ™edmÄ›t revize" value={safeForm.objekt} />
                  <KV label="Objednatel revize" value={safeForm.objednatel} />
                </div>
              </section>

              {/* Přístroje */}
              <section className="mt-4" style={{ breakInside: "avoid" }}>
                <h2 className="font-semibold text-lg mb-2">PouĹľitĂ© mÄ›Ĺ™icĂ­ pĹ™Ă­stroje</h2>
                <table className="w-full text-sm border">
                  <thead>
                    <tr className="text-left">
                      <Th>PĹ™Ă­stroj</Th>
                      <Th>Výrobní číslo</Th>
                      <Th>Kalibrační list</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const arr =
                        (safeForm.measuringInstruments && safeForm.measuringInstruments.length
                          ? safeForm.measuringInstruments
                          : safeForm.instruments) || [];
                      const hasChecked = arr.some((i: any) => typeof i?.checked === "boolean");
                      const selected = hasChecked ? arr.filter((i: any) => i?.checked) : arr;
                      return selected.length ? (
                        selected.map((inst: any, i: number) => (
                          <tr key={i}>
                            <Td>{dash(inst?.name)}</Td>
                            <Td>{dash(inst?.serial || inst?.serial_no || inst?.sn)}</Td>
                            <Td>{dash(inst?.calibration_list || inst?.calibration || inst?.calibration_code)}</Td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <Td>â€”</Td>
                          <Td>â€”</Td>
                          <Td>â€”</Td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </section>

              {/* Měřicí přístroje (rozšířený výpis) */}
              <section className="mt-4" style={{ breakInside: "avoid" }}>
                <h2 className="font-semibold text-lg mb-2">Měřicí přístroje (použité)</h2>
                <div className="w-[80%] mx-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <Th>Přístroj</Th>
                        <Th>Co měří</Th>
                        <Th>Kal. list</Th>
                        <Th>Sériové číslo</Th>
                        <Th>Platnost</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {usedInstruments.length ? (
                        usedInstruments.map((i: any, idx: number) => (
                          <tr key={i.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                            <Td>{i.name}</Td>
                            <Td>{i.measurement_text}</Td>
                            <Td>{i.calibration}</Td>
                            <Td>{i.serial}</Td>
                            <Td>{i.calibration_valid_until}</Td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <Td colSpan={5}>—</Td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
              {/* TermĂ­n dalĹˇĂ­ revize */}
              <section className="mt-4" style={{ breakInside: "avoid" }}>
                <div className="text-sm text-center">
                  <p>DoporuÄŤenĂ˝ termĂ­n pĹ™Ă­ĹˇtĂ­ revize dle ÄŚSN&nbsp;332000-6 ed.2 ÄŤl.&nbsp;6.5.2:</p>
                  <p><strong>{dash(safeForm.conclusion?.validUntil)}</strong></p>
                </div>
              </section>

              {/* Přístroje */}
              <section className="mt-3" style={{ breakInside: "avoid" }}>
                <h2 className="font-semibold text-lg mb-2">CelkovĂ˝ posudek</h2>
                <div className="border-2 border-slate-700 rounded-md p-3 mt-1 mb-4" style={{ breakInside: "avoid" }}>
                  <div className="whitespace-pre-line text-base font-semibold text-center">
                    {safetyLabel}
                  </div>
                </div>
              </section>

              {/* RozdÄ›lovnĂ­k + podpisy */}
              <section className="mt-4" style={{ breakInside: "avoid" }}>
                <h2 className="font-semibold text-sm mb-2">RozdÄ›lovnĂ­k</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 text-sm gap-2">
                  <div>Provozovatel â€“ 1Ă—</div>
                  <div>ReviznĂ­ technik â€“ 1Ă—</div>
                </div>
                <div className="text-sm mt-2">
                  <div>....................................................</div>
                  <div>....................................................</div>
                </div>

                <div className="mt-5 text-sm">
                  <div className="mb-2">V ........................................ dne ........................................</div>
                  <div className="grid grid-cols-2 gap-6 items-end">
                    <div>
                      <div className="border-t border-slate-300 pt-1">Podpis provozovatele</div>
                    </div>
                    <div className="text-right">
                      <div className="border-t border-slate-300 pt-1 inline-block">Podpis reviznĂ­ho technika</div>
                    </div>
                  </div>
                </div>
              </section>
            </section>

            {/* ===== A4 #2 â€“ IDENTIFIKACE + PROHLĂŤDKA ===== */}
            <section className="a4">
              <H1>1. Identifikace</H1>

              <section className="mb-4">
                <h2 className="font-semibold mb-2">MontĂˇĹľnĂ­ firma</h2>
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  <KV label="Firma" value={safeForm.montFirma} />
                  <KV label="OprĂˇvnÄ›nĂ­ firmy" value={safeForm.montFirmaAuthorization} />
                </div>
              </section>

              <section className="mb-4">
                <h2 className="font-semibold mb-2">OchrannĂˇ opatĹ™enĂ­</h2>
                <div className="space-y-1 text-sm">
                  <KV label="ZĂˇkladnĂ­ ochrana" value={listOrDash(safeForm.protection_basic)} />
                  <KV label="Ochrana pĹ™i poruĹˇe" value={listOrDash(safeForm.protection_fault)} />
                  <KV label="DoplĹkovĂˇ ochrana" value={listOrDash(safeForm.protection_additional)} />
                </div>
              </section>

              <section className="mb-4">
                <h2 className="font-semibold mb-2">Popis a rozsah revidovanĂ©ho objektu</h2>
                <Rich value={safeForm.inspectionDescription} />
              </section>

              <section className="mb-4 text-sm space-y-1">
                <KV label="JmenovitĂ© napÄ›tĂ­" value={safeForm.voltage} />
                <KV label="Druh sĂ­tÄ›" value={safeForm.sit} />
                <KV label="PĹ™edloĹľenĂˇ dokumentace" value={safeForm.documentation} />
              </section>

              <section className="mb-4">
                <h2 className="font-semibold mb-2">VnÄ›jĹˇĂ­ vlivy</h2>
                <div className="text-sm whitespace-pre-line">{dash(safeForm.environment)}</div>
              </section>

              <section>
                <h2 className="font-semibold mb-2">PĹ™Ă­lohy</h2>
                <div className="text-sm whitespace-pre-line">{dash(safeForm.extraNotes)}</div>
              </section>

              <hr className="my-6 border-slate-200" />

              <H1>2. ProhlĂ­dka</H1>
              <section className="mb-2">
                <div className="font-medium mb-1">Soupis provedenĂ˝ch ĂşkonĹŻ dle ÄŚSN 33 2000-6 ÄŤl. 6.4.2.3</div>
                {safeForm.performedTasks?.length ? (
                  <ul className="list-disc ml-6 text-sm">
                    {safeForm.performedTasks.map((t: string, i: number) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm italic text-slate-400">â€”</div>
                )}
              </section>
            </section>

            {/* ===== A4 #3 â€“ ZKOUĹ ENĂŤ + MÄšĹENĂŤ (rozvadÄ›ÄŤe) ===== */}
            <section className="a4">
              <H1>3. ZkouĹˇenĂ­</H1>
              <section className="mb-6">
                <div className="w-[80%] mx-auto" style={{ breakInside: "avoid" }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <Th>NĂˇzev zkouĹˇky</Th>
                        <Th>PoznĂˇmka / vĂ˝sledek</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {testsRows.length ? (
                        testsRows.map((t, i) => (
                          <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                            <Td>{t.name}</Td>
                            <Td>{t.note}</Td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <Td>â€”</Td>
                          <Td></Td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <H1>4. MÄ›Ĺ™enĂ­ â€“ rozvadÄ›ÄŤe</H1>
              {safeForm.boards?.length ? (
                <div className="space-y-6">
                  {safeForm.boards.map((board: any, bIdx: number) => {
                    const flat = normalizeComponents(board?.komponenty || []);
                    return (
                      <div key={bIdx} className="mt-6">
                        <div className="font-semibold">RozvadÄ›ÄŤ: {dash(board?.name) || `#${bIdx + 1}`}</div>
                        <div className="text-sm text-slate-600">
                          VĂ˝robce: {dash(board?.vyrobce)} | Typ: {dash(board?.typ)} | UmĂ­stÄ›nĂ­: {dash(board?.umisteni)} | S/N:{" "}
                          {dash(board?.vyrobniCislo)} | NapÄ›tĂ­: {dash(board?.napeti)} | Odpor: {dash(board?.odpor)} | IP:{" "}
                          {dash(board?.ip)}
                        </div>

                        {/* ĹĂˇdky komponent */}
                        <div className="mt-2 border border-slate-200 rounded divide-y" data-paginate="board-box">
                          {(flat.length ? flat : [{ _level: 0, nazev: "â€”" }]).map((c: any, i: number) => {
                            const prefix = depthPrefix(c._level);
                            const name = dash(c?.nazev || c?.name);
                            const desc = dash(c?.popis || c?.description || "");
                            const line = buildComponentLine(c); // typ, pĂłly, dim., Riso, Zs, t, IÎ”, pozn.

                            return (
                              <div
                                key={i}
                                className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                                style={{ breakInside: "avoid", paddingLeft: 12 + (c._level || 0) * 18 }}
                              >
                                <div className="py-2 px-3">
                                  <div className="font-medium">
                                    <span className="font-mono text-slate-500 whitespace-pre mr-1">{prefix}</span>
                                    {name}
                                  </div>
                                  <div className="text-xs text-slate-600 mt-0.5">
                                    {desc !== "ChybĂ­ informace" && <span className="mr-2">{desc}</span>}
                                    {line}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="italic text-slate-400">â€”</div>
              )}
            </section>

            {/* ===== A4 #4 â€“ MĂ­stnosti + ZĂˇvady + ZĂˇvÄ›r ===== */}
            <section className="a4">
              <H1>4. MÄ›Ĺ™enĂ­ â€“ mĂ­stnosti</H1>
              {safeForm.rooms?.length ? (
                <div className="space-y-6">
                  {safeForm.rooms.map((room: any, rIdx: number) => (
                    <div key={rIdx} className="mt-6">
                      <div className="font-semibold">MĂ­stnost: {dash(room?.name) || `#${rIdx + 1}`}</div>
                      <div className="text-sm text-slate-600">PoznĂˇmka: {dash(room?.details)}</div>
                      <table className="w-full text-sm border mt-2" style={{ breakInside: "avoid" }}>
                        <thead>
                          <tr className="text-left">
                            <Th>Typ</Th>
                            <Th>PoÄŤet</Th>
                            <Th>Dimenze</Th>
                            <Th>Riso [MÎ©]</Th>
                            <Th>Ochrana [Î©]</Th>
                            <Th>PoznĂˇmka</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {room.devices?.length ? (
                            room.devices.map((dev: any, i: number) => (
                              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                                <Td>{dash(dev?.typ)}</Td>
                                <Td>{dash(dev?.pocet)}</Td>
                                <Td>{dash(dev?.dimenze)}</Td>
                                <Td>{dash(dev?.riso)}</Td>
                                <Td>{dash(dev?.ochrana)}</Td>
                                <Td>{dash(dev?.podrobnosti || dev?.note)}</Td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <Td colSpan={6}>â€”</Td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="italic text-slate-400">â€”</div>
              )}

              {/* silnÄ›jĹˇĂ­ oddÄ›lenĂ­ a "pevnĂ˝" zlom pĹ™ed zĂˇvadami i v tisku */}
              <hr className="my-10 border-slate-200" />
              <section className="break-before-page">
                <H1>5. ZĂˇvady</H1>
                {safeForm.defects?.length ? (
                  <table className="w-full text-sm" style={{ breakInside: "avoid" }}>
                    <thead>
                      <tr className="text-left">
                        <Th>Popis zĂˇvady</Th>
                        <Th>ÄŚSN</Th>
                        <Th>ÄŚlĂˇnek</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {safeForm.defects.map((d: any, i: number) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          <Td>{dash(d?.description)}</Td>
                          <Td>{dash(d?.standard)}</Td>
                          <Td>{dash(d?.article)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="italic text-slate-400">â€”</div>
                )}
              </section>

              <hr className="my-6 border-slate-200" />

              <H1>6. ZĂˇvÄ›r</H1>
              <section style={{ breakInside: "avoid" }}>
                <div className="space-y-4 text-sm">
                  <div className="whitespace-pre-line">{dash(safeForm.conclusion?.text)}</div>
                  <div className="border-2 border-slate-700 rounded-md p-3">
                    <div className="text-xl font-extrabold tracking-wide text-center">
                      {safetyLabel}
                    </div>
                  </div>
                  <div>
                    DalĹˇĂ­ revize: <strong>{dash(safeForm.conclusion?.validUntil)}</strong>
                  </div>
                </div>
              </section>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

