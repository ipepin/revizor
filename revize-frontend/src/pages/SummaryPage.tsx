import React, { useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useRevisionForm } from "../context/RevisionFormContext";
import { useUser } from "../context/UserContext";
import html2pdf from "html2pdf.js";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";

export default function SummaryPage() {
  const { revId } = useParams();
  const { form } = useRevisionForm();
  const pageRef = useRef<HTMLDivElement | null>(null);
  const userCtx: any = useUser() as any;
  const { profile, company, loading } = useUser();


  // --- Revizní technik z UserContextu s fallbackem na form.technician ---
  const technician = useMemo(() => {
    const ftech = (form as any)?.technician || {};
    return {
      
      jmeno: profile?.fullName || (profile as any)?.name || ftech?.jmeno || "Chybí informace",
      firma: company?.name || ftech?.firma || "Chybí informace",
      cislo_osvedceni:
        (profile as any)?.certificateNumber || (profile as any)?.osvedceni || ftech?.cislo_osvedceni || "Chybí informace",
      cislo_opravneni:
        (profile as any)?.authorizationNumber || (profile as any)?.opravneni || ftech?.cislo_opravneni || "Chybí informace",
      ico: (company as any)?.ico || (company as any)?.icoNumber || ftech?.ico || "Chybí informace",
      dic: (company as any)?.dic || (company as any)?.taxId || ftech?.dic || "Chybí informace",
      adresa: (company as any)?.address || ftech?.adresa || "Chybí informace",
      phone: (profile as any)?.phone || (company as any)?.phone || ftech?.phone || "Chybí informace",
      email: (profile as any)?.email || (company as any)?.email || ftech?.email || "Chybí informace",
    };
  }, [profile, company, form]);

  // --- Odvozeniny ---
  const normsAll = useMemo(() => {
    const extra = [form.customNorm1, form.customNorm2, form.customNorm3].filter((x) => x && x.trim().length > 0);
    return [...(form.norms || []), ...extra];
  }, [form.norms, form.customNorm1, form.customNorm2, form.customNorm3]);

  const testsAsArray = useMemo(() => {
    const obj = (form.tests || {}) as Record<string, any>;
    return Object.entries(obj).map(([name, val]) => {
      if (val == null) return { name, note: "Chybí informace" };
      if (typeof val === "string") return { name, note: val };
      if (typeof val === "object") {
        const note = val.note ?? val.result?.note ?? val.result ?? "Chybí informace";
        return { name, note: String(note) };
      }
      return { name, note: String(val) };
    });
  }, [form.tests]);

  const safetyLabel = useMemo(() => {
    if (!form.conclusion?.safety) return "Chybí informace";
    if (form.conclusion.safety === "able") return "Elektrická instalace je z hlediska bezpečnosti schopna provozu";
    if (form.conclusion.safety === "not_able") return "Elektrická instalace není z hlediska bezpečnosti schopna provozu";
    return String(form.conclusion.safety);
  }, [form.conclusion?.safety]);

  // --- Export PDF: vyšší kvalita + záhlaví s číslem + číslování stran ---
  const handleGeneratePDF = async () => {
    if (!pageRef.current) return;
    const fileId = form.evidencni || revId || "vystup";

    const worker: any = html2pdf();
    await worker
      .set({
        margin: [12, 12, 22, 12], // top, left, bottom, right (mm)
        filename: `revizni_zprava_${fileId}.pdf`,
        image: { type: "jpeg", quality: 0.99 },
        html2canvas: { scale: 3, dpi: 300, letterRendering: true, useCORS: true, logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      })
      .from(pageRef.current)
      .toPdf()
      .get("pdf")
      .then((pdf: any) => {
        const total = pdf.internal.getNumberOfPages();
        const { width, height } = pdf.internal.pageSize;
        const headerText = `Revizní zpráva: ${fileId}`;
        for (let i = 1; i <= total; i++) {
          pdf.setPage(i);
          // záhlaví: číslo zprávy vpravo nahoře
          pdf.setFontSize(9);
          pdf.setTextColor(90);
          pdf.text(headerText, width - 12, 8, { align: "right" });
          // zápatí: číslování stran uprostřed
          pdf.setFontSize(9);
          pdf.setTextColor(90);
          pdf.text(`Strana ${i} z ${total}`, width / 2, height - 6, { align: "center" });
        }
      })
      .save();
  };

  // --- Export DOCX (šablona v /public/templates/revize_sablona.docx) ---
  const handleGenerateWord = async () => {
    try {
      const resp = await fetch("/templates/revize_sablona.docx");
      if (!resp.ok) throw new Error("Šablona DOCX nebyla nalezena");
      const ab = await resp.arrayBuffer();
      const zip = new PizZip(ab);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => "Chybí informace",
      });

      const data = mapFormToTemplate(form, revId || "", normsAll, testsAsArray, safetyLabel, technician);
      doc.setData(data);
      doc.render();

      const out = doc.getZip().generate({ type: "blob" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(out);
      link.download = `revizni_zprava_${data?.objednatel?.evidencni_cislo || revId || "vystup"}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e: any) {
      alert(`Nepodařilo se vygenerovat DOCX: ${e?.message || e}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex">
        <Sidebar mode="summary" />
        <main className="flex-1 p-6 md:p-10">
          {/* Ovládací lišta */}
          <div className="flex justify-end gap-3 mb-4 print:hidden">
            <Link to={`/revize/${revId || ""}`} className="px-4 py-2 rounded bg-slate-800 text-white hover:bg-slate-900">← Zpět</Link>
            <button onClick={handleGenerateWord} className="px-4 py-2 rounded bg-indigo-600 text-white">Generovat Word</button>
            <button onClick={handleGeneratePDF} className="px-4 py-2 rounded bg-emerald-600 text-white">Generovat PDF</button>
          </div>

          {/* A4 stránka (užší pro reálné okraje) */}
          <div id="report-content" ref={pageRef} className="mx-auto bg-white shadow w-[190mm] min-h-[297mm] p-10">
            {/* HLAVIČKA */}
            <header className="mb-6" style={{ breakInside: 'avoid' }}>
          <div className="mt-2 text-sm text-left">Číslo revizní zprávy: <strong>{dash(form.evidencni || revId)}</strong></div>
          <br></br>
          <div className="w-full text-center">
            <h1 className="text-2xl font-bold tracking-wide">Zpráva o revizi elektrické instalace</h1>
            <div className="text-base font-semibold mt-1">{dash(form.typRevize)}</div>
            <div className="mt-1 text-xs text-slate-500">
              {normsAll.length ? (
                <span>
                  V souladu s {normsAll.map((n, i) => (
                    <span key={i}>{n}{i < normsAll.length - 1 ? ", " : ""}</span>
                  ))}
                </span>
              ) : (
                <span>V souladu s Chybí informace</span>
              )}
            </div>
          </div>
          
          <hr className="mt-3 border-slate-200" />
        </header>

          
            {/* ZÁKLADNÍ ÚDAJE */}
              

            {/* REVIZNÍ TECHNIK – načteno z UserContextu */}
            <section style={{ breakInside: 'avoid' }}>
              <h2 className="font-semibold text-lg mb-2">Revizní technik</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <KV label="Jméno" value={technician.jmeno} />
                <KV label="Firma" value={technician.firma} />
                <KV label="Ev. č. osvědčení" value={technician.cislo_osvedceni} />
                <KV label="IČO" value={technician.ico} />
                <KV label="Ev. č. oprávnění" value={technician.cislo_opravneni} />
                <KV label="DIČ" value={technician.dic} />
                <KV label="Adresa" value={technician.adresa} />

              </div>
            </section>

            <hr className="my-6 border-slate-200" />
            
            <section className="mt-4" style={{ breakInside: 'avoid' }}>
                <h2 className="font-semibold text-lg mb-2">Revidovaný objekt</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <KV label="Adresa stavby" value={form.adresa} />
                  <KV label="Předmět revize" value={form.objekt} />
                  <KV label="Objednatel revize" value={form.objednatel} />
                </div>
              </section>

              {/* POUŽITÉ MĚŘICÍ PŘÍSTROJE – připravená tabulka (vyplníme později) */}
              <section className="mt-4" style={{ breakInside: 'avoid' }}>
                <h2 className="font-semibold text-lg mb-2">Použité měřicí přístroje</h2>
                <table className="w-full text-sm border border-slate-200">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <Th>Přístroj</Th>
                      <Th>Výrobní číslo</Th>
                      <Th>Kalibrační list</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <Td>—</Td>
                      <Td>—</Td>
                      <Td>—</Td>
                    </tr>
                  </tbody>
                </table>
              </section>

              {/* DOPORUČENÝ TERMÍN PŘÍŠTÍ REVIZE */}
              <section className="mt-4" style={{ breakInside: 'avoid' }}>
                <div className="text-sm text-center">
                  <p>Doporučený termín příští revize dle ČSN&nbsp;332000-6 ed.2 čl.&nbsp;6.5.2:</p>
                  <p><strong>{dash(form.conclusion?.validUntil)}</strong></p>
                </div>
              </section>

              {/* CELKOVÝ POSUDEK */}
              <section className="mt-4" style={{ breakInside: 'avoid' }}>
                <h2 className="font-semibold text-lg mb-2">Celkový posudek</h2>
                <div className="border-2 border-slate-700 rounded-md p-4 mt-4 mb-6" style={{ breakInside: 'avoid' }}>
                <div className="text-xl font-extrabold tracking-wide text-center">{safetyLabel}</div>
                </div>
              </section>

              {/* ROZDĚLOVNÍK + PODPISOVÁ DOLOŽKA */}
              <section className="mt-6" style={{ breakInside: 'avoid' }}>
                <h2 className="font-semibold text-sm mb-2">Rozdělovník</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 text-sm gap-2">
                  <div>Provozovatel – 1×</div>
                  <div>Revizní technik – 1×</div>
                </div>

                <div className="mt-6 text-sm">
                  <div className="mb-2">V ........................................ dne ........................................</div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="h-14" />
                      <div className="border-t border-slate-300 pt-1">Podpis provozovatele</div>
                    </div>
                    <div className="text-right">
                      <div className="h-14" />
                      <div className="border-t border-slate-300 pt-1 inline-block">Podpis revizního technika</div>
                    </div>
                  </div>
                  
                </div>
              </section>

            {/* PROHLÍDKA */}
            <section style={{ breakInside: 'avoid' }}>
              <h2 className="font-semibold text-lg mb-2">Prohlídka</h2>
              <div className="text-sm">
                <SubH3>Soupis provedených úkonů dle ČSN 33 2000-6 čl. 6.4.2.3</SubH3>
                {form.performedTasks?.length ? (
                  <ul className="list-disc ml-6">
                    {form.performedTasks.map((t: string, i: number) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="italic text-slate-400">Chybí informace</div>
                )}
                <SubH3 className="mt-3">Popis revidovaného objektu</SubH3>
                <Rich value={form.inspectionDescription} />
              </div>
            </section>

            <hr className="my-6 border-slate-200" />

            {/* ZKOUŠENÍ */}
            <section style={{ breakInside: 'avoid' }}>
              <h2 className="font-semibold text-lg mb-2">Zkoušení (ČSN 33 2000-6 ed.2 čl. 6.4.3)</h2>
              {testsAsArray.length ? (
                <table className="w-full text-sm border border-slate-200" style={{ breakInside: 'avoid' }}>
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <Th>Název zkoušky</Th>
                      <Th>Poznámka / výsledek</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {testsAsArray.map((t, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"} style={{ breakInside: 'avoid' }}>
                        <Td>{t.name}</Td>
                        <Td>{t.note || "Chybí informace"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="italic text-slate-400">Chybí informace</div>
              )}
            </section>

            {/* --- ZÁPATÍ PRVNÍ STRÁNKY: Rozdělovník + podpisy + menší razítko --- */}
            <section style={{ breakInside: 'avoid' }}>
              <h2 className="font-semibold text-lg my-4">Rozdělovník</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 text-sm gap-2">
                <div>Provozovatel – 1×</div>
                <div>Revizní technik – 1×</div>
              </div>
              <footer className="mt-8 flex items-end justify-between text-sm">
                
                <div className="text-right">
                  <div className="w-56 border-t border-slate-300 pt-1">Podpis provozovatele</div>
                  <div className="w-56 border-t border-slate-300 pt-1 mt-6">Podpis revizního technika</div>
                </div>
              </footer>
            </section>
            
            {/* ======= NOVÁ STRÁNKA ======= */}
            <div style={{ pageBreakBefore: 'always' }} />

            {/* OCHRANNÁ OPATŘENÍ – na 2. stránce, 3 řádky */}
            <section style={{ breakInside: 'avoid' }}>
              <h2 className="font-semibold text-lg mb-2">Ochranná opatření</h2>
              <div className="space-y-3 text-sm">
                <KV label="Základní ochrana" value={listOrDash(form.protection_basic)} />
                <KV label="Ochrana při poruše" value={listOrDash(form.protection_fault)} />
                <KV label="Doplňková ochrana" value={listOrDash(form.protection_additional)} />
              </div>
            </section>

            <hr className="my-6 border-slate-200" />

            {/* MĚŘICÍ PŘÍSTROJE */}
            <section style={{ breakInside: 'avoid' }}>
              <h2 className="font-semibold text-lg mb-2">Měřicí přístroje</h2>
              {(((form as any)?.instruments as any[]) || []).length ? (
                <table className="w-full text-sm border border-slate-200" style={{ breakInside: 'avoid' }}>
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <Th>Název přístroje</Th>
                      <Th>Měření</Th>
                      <Th>Kalibrační list</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(((form as any)?.instruments as any[]) || []).map((inst: any, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"} style={{ breakInside: 'avoid' }}>
                        <Td>{dash(inst?.name)}</Td>
                        <Td>{dash(inst?.measurement)}</Td>
                        <Td>{dash(inst?.calibration_list || inst?.calibration)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="italic text-slate-400">Chybí informace</div>
              )}
              {(((form as any)?.instruments as any[]) || []).length > 0 && (
                <div className="text-xs text-slate-500 mt-2">Uvedené měřicí přístroje mají platnou kalibraci.</div>
              )}
            </section>

            <hr className="my-6 border-slate-200" />

            {/* MĚŘENÍ – ROZVADĚČE */}
            <section style={{ breakInside: 'avoid' }}>
              <h2 className="font-semibold text-lg mb-2">Měření – Rozvaděče</h2>
              {form.boards?.length ? (
                <div className="space-y-6">
                  {form.boards.map((board: any, bIdx: number) => (
                    <div key={bIdx}>
                      <div className="font-semibold">Rozvaděč: {dash(board.name) || `#${bIdx + 1}`}</div>
                      <div className="text-sm">Výrobce: {dash(board.vyrobce)} | Typ: {dash(board.typ)} | Umístění: {dash(board.umisteni)} | S/N: {dash(board.vyrobniCislo)} | Napětí: {dash(board.napeti)} | Odpor: {dash(board.odpor)} | IP: {dash(board.ip)}</div>
                      <table className="w-full text-sm border border-slate-200 mt-2" style={{ breakInside: 'avoid' }}>
                        <thead>
                          <tr className="bg-slate-50 text-left">
                            <Th>Komponenta</Th>
                            <Th>Popis</Th>
                            <Th>Dimenze</Th>
                            <Th>Riso [MΩ]</Th>
                            <Th>Ochrana [Ω]</Th>
                            <Th>Póly</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {board.komponenty?.length ? (
                            board.komponenty.map((c: any, i: number) => (
                              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"} style={{ breakInside: 'avoid' }}>
                                <Td>{dash(c?.nazev)}</Td>
                                <Td>{dash(c?.popis)}</Td>
                                <Td>{dash(c?.dimenze)}</Td>
                                <Td>{dash(c?.riso)}</Td>
                                <Td>{dash(c?.ochrana)}</Td>
                                <Td>{dash(c?.poles)}</Td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <Td colSpan={6}>Chybí informace</Td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="italic text-slate-400">Chybí informace</div>
              )}
            </section>

            <hr className="my-6 border-slate-200" />

            {/* MÍSTNOSTI */}
            <section style={{ breakInside: 'avoid' }}>
              <h2 className="font-semibold text-lg mb-2">Místnosti</h2>
              {form.rooms?.length ? (
                <div className="space-y-6">
                  {form.rooms.map((room: any, rIdx: number) => (
                    <div key={rIdx}>
                      <div className="font-semibold">Místnost: {dash(room.name) || `#${rIdx + 1}`}</div>
                      <div className="text-sm">Poznámka: {dash(room.details)}</div>
                      <table className="w-full text-sm border border-slate-200 mt-2" style={{ breakInside: 'avoid' }}>
                        <thead>
                          <tr className="bg-slate-50 text-left">
                            <Th>Typ</Th>
                            <Th>Počet</Th>
                            <Th>Dimenze</Th>
                            <Th>Riso [MΩ]</Th>
                            <Th>Ochrana [Ω]</Th>
                            <Th>Poznámka</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {room.devices?.length ? (
                            room.devices.map((dev: any, i: number) => (
                              <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"} style={{ breakInside: 'avoid' }}>
                                <Td>{dash(dev.typ)}</Td>
                                <Td>{dash(dev.pocet)}</Td>
                                <Td>{dash(dev.dimenze)}</Td>
                                <Td>{dash(dev.riso)}</Td>
                                <Td>{dash(dev.ochrana)}</Td>
                                <Td>{dash(dev.podrobnosti || dev.note)}</Td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <Td colSpan={6}>Chybí informace</Td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="italic text-slate-400">Chybí informace</div>
              )}
            </section>

            <hr className="my-6 border-slate-200" />

            {/* ZJIŠTĚNÉ ZÁVADY */}
            <section style={{ breakInside: 'avoid' }}>
              <h2 className="font-semibold text-lg mb-2">Zjištěné závady</h2>
              {form.defects?.length ? (
                <table className="w-full text-sm border border-slate-200" style={{ breakInside: 'avoid' }}>
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <Th>Popis závady</Th>
                      <Th>ČSN</Th>
                      <Th>Článek</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.defects.map((d: any, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"} style={{ breakInside: 'avoid' }}>
                        <Td>{dash(d.description)}</Td>
                        <Td>{dash(d.standard)}</Td>
                        <Td>{dash(d.article)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="italic text-slate-400">Chybí informace</div>
              )}
            </section>

            <hr className="my-6 border-slate-200" />

            {/* ZÁVĚR */}
            <section style={{ breakInside: 'avoid' }}>
              <h2 className="font-semibold text-lg mb-2">Závěr</h2>

              <div className="space-y-4 text-sm">
                {/* Celkový posudek – pouze text, bez nadpisu */}
                <div className="whitespace-pre-line">{dash(form.conclusion?.text)}</div>

                {/* Bezpečnost – velké písmo v rámečku, bez nadpisu */}
                <div className="border-2 border-slate-700 rounded-md p-3">
                  <div className="text-xl font-extrabold tracking-wide">{safetyLabel}</div>
                </div>

                {/* Datum příští revize – bez nadpisu, v řádku */}
                <div>Další revize: <strong>{dash(form.conclusion?.validUntil)}</strong></div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

// --- Pomocné komponenty / funkce ---
function Th({ children }: React.PropsWithChildren) {
  return <th className="py-2 px-3 border-b border-slate-200">{children}</th>;
}
function Td({ children, colSpan }: React.PropsWithChildren & { colSpan?: number }) {
  return (
    <td className="py-1.5 px-3 align-top border-b border-slate-100" colSpan={colSpan}>
      {children}
    </td>
  );
}
function KV({ label, value }: { label: string; value?: any }) {
  return (
    <div>
      <div className="text-[13px] text-slate-500">{label}</div>
      <div className="font-medium">{dash(value)}</div>
    </div>
  );
}
function SubH3({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <h3 className={`font-medium ${className}`}>{children}</h3>;
}
function Rich({ value }: { value?: string }) {
  if (!value || !String(value).trim().length) return <div className="italic text-slate-400">Chybí informace</div>;
  return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: value }} />;
}
function listOrDash(arr?: string[]) {
  if (!arr || arr.length === 0) return "Chybí informace";
  return arr.join(", ");
}
function dash(v?: any) {
  return v && String(v).trim().length ? String(v) : "Chybí informace";
}

// --- Mapování dat -> šablona DOCX ---
function mapFormToTemplate(
  form: any,
  revId: string,
  normsAll: string[],
  testsAsArray: { name: string; note: string }[],
  safetyLabel: string,
  technician: any
) {
  const rozvadece = (form.boards || []).map((b: any) => ({
    name: dash(b?.name),
    manufacturer: dash(b?.vyrobce),
    type: dash(b?.typ),
    location: dash(b?.umisteni),
    serial: dash(b?.vyrobniCislo),
    voltage: dash(b?.napeti),
    current: dash((b as any)?.current),
    resistance: dash(b?.odpor),
    ip: dash(b?.ip),
    components: (b?.komponenty || []).map((c: any) => ({
      name: dash(c?.nazev),
      description: dash(c?.popis),
      dimension: dash(c?.dimenze),
      riso: dash(c?.riso),
      protection: dash(c?.ochrana),
      note: dash((c as any)?.note),
    })),
  }));

  const mistnosti = (form.rooms || []).map((r: any) => ({
    name: dash(r?.name),
    note: dash(r?.details),
    devices: (r?.devices || []).map((d: any) => ({
      type: dash(d?.typ),
      dimension: dash(d?.dimenze),
      riso: dash(d?.riso),
      protection: dash(d?.ochrana),
      note: dash(d?.podrobnosti || d?.note),
    })),
  }));

  const zkousky = testsAsArray.length ? testsAsArray.map((t) => `${t.name}: ${t.note}`) : ["Chybí informace"];
  const zavady = (form.defects || [])
    .map((d: any, idx: number) => `${idx + 1}. ${dash(d?.description)} (ČSN: ${dash(d?.standard)}, čl.: ${dash(d?.article)})`)
    .join("\n");

  return {
    objednatel: {
      evidencni_cislo: dash(form.evidencni || revId),
      typ_revize: dash(form.typRevize),
      datum_zahajeni: dash(form.date_start),
      datum_ukonceni: dash(form.date_end),
      datum_zpravy: dash(form.date_created),
      adresa: dash(form.adresa),
      revidovany_objekt: dash(form.objekt),
      jmeno: dash(form.objednatel),
    },
    revizni_technik: technician,
    normy: normsAll.length ? normsAll : ["Chybí informace"],
    instruments: (((form as any)?.instruments as any[]) || []).map((i) => ({
      name: dash(i?.name),
      measurement: dash(i?.measurement),
      calibration_list: dash(i?.calibration_list || i?.calibration),
    })),
    popis_objektu: {
      popis: dash(form.inspectionDescription),
      napetova_soustava: dash(form.sit),
      jmenovite_napeti: dash(form.voltage),
      prilohy: dash(form.extraNotes),
      dokumentace: dash(form.documentation),
      vnejsi_vlivy: dash(form.environment),
    },
    ochrany: {
      zakladni: (form.protection_basic || []).length ? form.protection_basic : ["Chybí informace"],
      pri_poruse: (form.protection_fault || []).length ? form.protection_fault : ["Chybí informace"],
      doplňkové: (form.protection_additional || []).length ? form.protection_additional : ["Chybí informace"],
    },
    ukony: (form.performedTasks || []).length ? (form.performedTasks as string[]).join("\n") : "Chybí informace",
    technicky_popis: dash(form.inspectionDescription),
    zkousky: zkousky,
    rozvadece,
    mistnosti,
    zavady: zavady || "Chybí informace",
    zaver: {
      text: dash(form.conclusion?.text),
      bezpecnost: safetyLabel,
      pristi_revize: dash(form.conclusion?.validUntil),
    },
  };
}
