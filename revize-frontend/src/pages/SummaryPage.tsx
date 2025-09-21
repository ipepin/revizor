// src/pages/SummaryPage.tsx
import React, { useMemo, useRef, useEffect } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useRevisionForm } from "../context/RevisionFormContext";
import { useUser } from "../context/UserContext";
import { saveAs } from "file-saver";

import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, PageOrientation,
  Header, Footer, PageNumber, // ⬅️ pro záhlaví/zápatí Wordu
} from "docx";

/* =============================== */
/* ======== Summary Page ========= */
/* =============================== */

export default function SummaryPage() {
  const { revId } = useParams();
  const { form: ctxForm } = useRevisionForm();
  const pageRef = useRef<HTMLDivElement | null>(null);
  const { profile, company } = useUser();

  // Print-view flag (když jsme v nové záložce s ?print=1)
  const sp = new URLSearchParams(window.location.search);
  const isPrintView = sp.get("print") === "1";

  // Auto-print v režimu ?print=1&auto=1
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

  // Vektorový režim (vypnutí transformací/efektů při tisku)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("print") === "1" && sp.get("vector") === "1") {
      document.documentElement.classList.add("print-vector");
      return () => document.documentElement.classList.remove("print-vector");
    }
  }, []);

  // Null-safe formulář
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

  // Revizní technik
  const technician = useMemo(() => {
    const p: any = profile || {};
    const c: any = company || {};
    return {
      jmeno: p.fullName || p.name || "Chybí informace",
      firma: c.name || c.companyName || "Chybí informace",
      cislo_osvedceni: p.certificateNumber || p.certificate_number || "Chybí informace",
      cislo_opravneni: p.authorizationNumber || p.authorization_number || "Chybí informace",
      ico: c.ico || c.icoNumber || "Chybí informace",
      dic: c.dic || c.taxId || "Chybí informace",
      adresa: c.address || p.address || "Chybí informace",
      phone: p.phone || c.phone || "Chybí informace",
      email: p.email || c.email || "Chybí informace",
    };
  }, [profile, company]);

  // Normy = normy + vlastní texty
  const normsAll = useMemo(() => {
    const extra = [safeForm.customNorm1, safeForm.customNorm2, safeForm.customNorm3].filter(
      (x: any) => x && String(x).trim().length > 0
    );
    return [...(safeForm.norms || []), ...extra];
  }, [safeForm.norms, safeForm.customNorm1, safeForm.customNorm2, safeForm.customNorm3]);

  // Zkoušky
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
    if (!s) return "Chybí informace";
    if (s === "able") return "Elektrická instalace je z hlediska bezpečnosti schopna provozu";
    if (s === "not_able") return "Elektrická instalace není z hlediska bezpečnosti schopna provozu";
    return String(s);
  }, [safeForm.conclusion?.safety]);

  // Přístroje (checked)
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

  /* ---------- Export PDF (vektorový tisk) ---------- */
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

  /* ---------- Export DOCX ---------- */
  const handleGenerateWord = async () => {
    try {
      const mm = (v: number) => Math.round((v / 25.4) * 1440);
      const COL_TEXT = "0f172a";
      const COL_MUTE = "475569";
      const COL_BORDER = "e2e8f0";
      const COL_HEAD = "f8fafc";
      const BODY = 22;  // 11 pt
      const SMALL = 20; // 10 pt
      const XS = 18;    // 9 pt (měření)
      const FONT = "Carlito";

      const tr = (text: string, o: { bold?: boolean; size?: number; color?: string } = {}) =>
        new TextRun({ text, bold: !!o.bold, size: o.size ?? BODY, color: o.color ?? COL_TEXT, font: FONT });

      const P = (
        text: string,
        o: { bold?: boolean; center?: boolean; size?: number; color?: string; after?: number; before?: number } = {}
      ) =>
        new Paragraph({
          alignment: o.center ? AlignmentType.CENTER : AlignmentType.LEFT,
          children: [tr(text, o)],
          spacing: { before: o.before ?? 0, after: o.after ?? 60 },
        });

      const H = (text: string, size = 26) =>
        new Paragraph({ spacing: { before: 120, after: 80 }, children: [tr(text, { bold: true, size })] });

      const cell = (children: Paragraph[], pct: number, header = false, pad = 70) =>
        new TableCell({
          children,
          width: { size: pct, type: WidthType.PERCENTAGE },
          margins: { top: 40, bottom: 40, left: pad, right: pad },
          shading: header ? { fill: COL_HEAD } : undefined,
        });

      const tableBordered = (headers: string[], rows: (string | number)[][], widthsPct: number[]) =>
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: COL_BORDER },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: COL_BORDER },
            left: { style: BorderStyle.SINGLE, size: 1, color: COL_BORDER },
            right: { style: BorderStyle.SINGLE, size: 1, color: COL_BORDER },
            insideH: { style: BorderStyle.SINGLE, size: 1, color: COL_BORDER },
            insideV: { style: BorderStyle.SINGLE, size: 1, color: COL_BORDER },
          },
          rows: [
            new TableRow({
              children: headers.map((h, i) =>
                cell([P(h, { bold: true, color: COL_MUTE, size: SMALL, after: 30 })], widthsPct[i], true, 60)
              ),
            }),
            ...rows.map((r) =>
              new TableRow({
                children: r.map((c, i) => cell([P(String(c ?? ""), { after: 30 })], widthsPct[i], false, 60)),
              })
            ),
          ],
        });

      // užší (≈80 %) a vystředěná tabulka
      const tableBorderedNarrow = (headers: string[], rows: (string | number)[][], widthsPct: number[]) =>
        new Table({
          width: { size: 80, type: WidthType.PERCENTAGE },
          alignment: AlignmentType.CENTER,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: COL_BORDER },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: COL_BORDER },
            left: { style: BorderStyle.SINGLE, size: 1, color: COL_BORDER },
            right: { style: BorderStyle.SINGLE, size: 1, color: COL_BORDER },
            insideH: { style: BorderStyle.SINGLE, size: 1, color: COL_BORDER },
            insideV: { style: BorderStyle.SINGLE, size: 1, color: COL_BORDER },
          },
          rows: [
            new TableRow({
              children: headers.map((h, i) =>
                cell([P(h, { bold: true, color: COL_MUTE, size: SMALL, after: 30 })], widthsPct[i], true, 60)
              ),
            }),
            ...rows.map((r) =>
              new TableRow({
                children: r.map((c, i) => cell([P(String(c ?? ""), { after: 30 })], widthsPct[i], false, 60)),
              })
            ),
          ],
        });

      const tableBorderless = (rows: Paragraph[][], widthsPct: number[]) =>
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: rows.map(
            (r) =>
              new TableRow({
                children: r.map(
                  (p, i) =>
                    new TableCell({
                      children: [p],
                      width: { size: widthsPct[i], type: WidthType.PERCENTAGE },
                      margins: { top: 40, bottom: 40, left: 60, right: 60 },
                    })
                ),
              })
          ),
        });

      const headTitle: Paragraph[] = [
        P(`Číslo revizní zprávy: ${dash(safeForm.evidencni || revId)}`, { color: COL_MUTE, after: 40 }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [tr("Zpráva o revizi elektrické instalace", { bold: true, size: 28 })],
        }),
        P(dash(safeForm.typRevize), { bold: true, center: true, after: 30 }),
        P(normsAll.length ? `V souladu s ${normsAll.join(", ")}` : `V souladu s Chybí informace`, {
          center: true,
          color: COL_MUTE,
        }),
      ];

      const tech = tableBorderless(
        [
          [P("Jméno", { color: COL_MUTE, size: SMALL }), P("Firma", { color: COL_MUTE, size: SMALL })],
          [P(technician.jmeno, { bold: true }), P(technician.firma, { bold: true })],
          [P("Ev. č. osvědčení", { color: COL_MUTE, size: SMALL }), P("IČO", { color: COL_MUTE, size: SMALL })],
          [P(technician.cislo_osvedceni, { bold: true }), P(technician.ico, { bold: true })],
          [P("Ev. č. oprávnění", { color: COL_MUTE, size: SMALL }), P("DIČ", { color: COL_MUTE, size: SMALL })],
          [P(technician.cislo_opravneni, { bold: true }), P(technician.dic, { bold: true })],
          [P("Adresa", { color: COL_MUTE, size: SMALL }), P("Telefon", { color: COL_MUTE, size: SMALL })],
          [P(technician.adresa, { bold: true }), P(technician.phone, { bold: true })],
          [P("E-mail", { color: COL_MUTE, size: SMALL }), P("")],
          [P(technician.email, { bold: true }), P("")],
        ],
        [50, 50]
      );

      const objekt = tableBorderless(
        [
          [P("Adresa stavby", { color: COL_MUTE, size: SMALL }), P("Předmět revize", { color: COL_MUTE, size: SMALL }), P("Objednatel revize", { color: COL_MUTE, size: SMALL })],
          [P(dash(safeForm.adresa), { bold: true }), P(dash(safeForm.objekt), { bold: true }), P(dash(safeForm.objednatel), { bold: true })],
        ],
        [33, 34, 33]
      );

      const instrumentsRows = usedInstruments.length
        ? usedInstruments.map((i) => [i.name, i.serial, i.calibration])
        : [["—", "—", "—"]];
      const instruments = tableBordered(["Přístroj", "Výrobní číslo", "Kalibrační list"], instrumentsRows, [50, 25, 25]);

      const term = [
        P("Doporučený termín příští revize dle ČSN 332000-6 ed.2 čl. 6.5.2:", { color: COL_MUTE, center: true }),
        P(dash(safeForm.conclusion?.validUntil), { bold: true, center: true }),
      ];
      const posudek = [H("Celkový posudek", 22), P(safetyLabel, { bold: true, center: true })];

      // ---------- 1. Identifikace (page break) ----------
      const ident: (Paragraph | Table)[] = [
        new Paragraph({ pageBreakBefore: true }),
        H("1. Identifikace", 26),
        H("Montážní firma", 22),
        tableBorderless(
          [[P(`Firma: ${dash(safeForm.montFirma)}`), P(`Oprávnění firmy: ${dash(safeForm.montFirmaAuthorization)}`)]],
          [50, 50]
        ),
        H("Ochranná opatření", 22),
        tableBorderless(
          [
            [P(`Základní ochrana: ${(safeForm.protection_basic || []).join(", ") || "—"}`)],
            [P(`Ochrana při poruše: ${(safeForm.protection_fault || []).join(", ") || "—"}`)],
            [P(`Doplňková ochrana: ${(safeForm.protection_additional || []).join(", ") || "—"}`)],
          ],
          [100]
        ),
        P("Popis a rozsah revidovaného objektu", { bold: true }),
        P(stripHtml(safeForm.inspectionDescription || "—")),
        P(`Jmenovité napětí: ${dash(safeForm.voltage)}`),
        P(`Druh sítě: ${dash(safeForm.sit)}`),
        P(`Předložená dokumentace: ${dash(safeForm.documentation)}`),
        P("Vnější vlivy", { bold: true }),
        P(dash(safeForm.environment)),
        P("Přílohy", { bold: true }),
        P(dash(safeForm.extraNotes)),
      ];

      // ---------- 2. Prohlídka ----------
      const prohlidka: Paragraph[] = [
        H("2. Prohlídka", 26),
        P("Soupis provedených úkonů dle ČSN 33 2000-6 čl. 6.4.2.3", { color: COL_MUTE }),
        ...(safeForm.performedTasks?.length ? safeForm.performedTasks.map((t: string) => P(`• ${t}`, { after: 30 })) : [P("—")]),
      ];

      // ---------- 3. Zkoušení ----------
      const testsLocal = (Object.entries(safeForm.tests || {}) as [string, any][])
        .map(([name, val]) => {
          let note = "";
          if (val == null) note = "";
          else if (typeof val === "string") note = val;
          else if (typeof val === "object") note = val.note ?? val.result?.note ?? val.result ?? "";
          else note = String(val);
          return { name, note: String(note || "") };
        });

      const tests = [
        H("3. Zkoušení", 26),
        tableBorderedNarrow(
          ["Název zkoušky", "Poznámka / výsledek"],
          testsLocal.length ? testsLocal.map((r) => [r.name, r.note]) : [["—", ""]],
          [40, 60]
        ),
      ];

      // ---------- 4. Měření – rozvaděče (nadpis jen jednou) ----------
      const boardsBlocks: (Paragraph | Table)[] = [];
      if (!(safeForm.boards || []).length) {
        boardsBlocks.push(H("4. Měření – rozvaděče", 26), P("—"));
      } else {
        boardsBlocks.push(H("4. Měření – rozvaděče", 26));
        (safeForm.boards || []).forEach((b: any, idx: number) => {
          // větší mezera před každým rozvaděčem
          boardsBlocks.push(P(`Rozvaděč: ${dash(b?.name) || `#${idx + 1}`}`, { bold: true, size: XS, before: 180, after: 20 }));
          const details = `Výrobce: ${dash(b?.vyrobce)} | Typ: ${dash(b?.typ)} | Umístění: ${dash(b?.umisteni)} | S/N: ${dash(b?.vyrobniCislo)} | Napětí: ${dash(b?.napeti)} | Odpor: ${dash(b?.odpor)} | IP: ${dash(b?.ip)}`;
          boardsBlocks.push(P(details, { color: COL_MUTE, size: XS, after: 30 }));

          const flat = normalizeComponents(b?.komponenty || []);
          const rows = (flat.length ? flat : [{ _level: 0, nazev: "—" }]).map((c: any) => {
            const prefix = depthPrefix(c._level);
            const name = dash(c?.nazev || c?.name) || "—";
            const desc = dash(c?.popis || c?.description || "");
            const typ = pick(c, ["typ", "type", "druh"]);
            const poles = pick(c, ["poles", "poly", "pocet_polu", "pocetPolu"]);
            const dim = pick(c, ["dimenze", "dim", "prurez"]);
            const riso = pick(c, ["riso", "Riso", "izolace", "insulation"]);
            const zs = pick(c, ["ochrana", "zs", "Zs", "loop_impedance"]);
            const tMs = pick(c, ["vybavovaciCasMs", "vybavovaci_cas_ms", "rcd_time", "trip_time", "vybavovaciCas", "cas_vybaveni"]);
            const iDelta = pick(c, ["vybavovaciProudmA", "vybavovaci_proud_ma", "rcd_trip_current", "trip_current", "i_fi", "ifi"]);
            const pozn = pick(c, ["poznamka", "pozn", "note"]);
            const parts: string[] = [];
            if (desc && desc !== "—") parts.push(desc);
            if (typ) parts.push(`typ: ${typ}`);
            if (poles) parts.push(`póly: ${poles}`);
            if (dim) parts.push(`dim.: ${dim}`);
            if (riso) parts.push(`Riso: ${num(riso)} MΩ`);
            if (zs) parts.push(`Zs: ${num(zs)} Ω`);
            if (tMs) parts.push(`t: ${num(tMs)} ms`);
            if (iDelta) parts.push(`IΔ: ${num(iDelta)} mA`);
            if (pozn) parts.push(`Pozn.: ${pozn}`);

            const title = new Paragraph({
              children: [new TextRun({ text: `${prefix}${name}`, bold: true, size: XS, font: "Carlito" })],
              spacing: { after: 20 },
            });
            const subtitle = new Paragraph({
              children: [new TextRun({ text: parts.filter(Boolean).join("   •   "), size: XS, color: COL_MUTE, font: "Carlito" })],
            });
            return [title, subtitle];
          });

          boardsBlocks.push(new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: COL_BORDER },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: COL_BORDER },
              left: { style: BorderStyle.SINGLE, size: 1, color: COL_BORDER },
              right: { style: BorderStyle.SINGLE, size: 1, color: COL_BORDER },
              insideH: { style: BorderStyle.SINGLE, size: 1, color: "e5e7eb" },
              insideV: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
            rows: rows.map((pair) =>
              new TableRow({
                children: [
                  new TableCell({
                    children: pair,
                    margins: { top: 40, bottom: 40, left: 70, right: 70 },
                  }),
                ],
              })
            ),
          }));
        });
      }

      // ---------- 4. Měření – místnosti ----------
      const roomsBlocks: (Paragraph | Table)[] = [];
      if ((safeForm.rooms || []).length) {
        roomsBlocks.push(H("4. Měření – místnosti", 26));
        (safeForm.rooms || []).forEach((r: any, idx: number) => {
          roomsBlocks.push(P(`Místnost: ${dash(r?.name) || `#${idx + 1}`}`, { bold: true, before: 180, after: 10 }));
          roomsBlocks.push(P(`Poznámka: ${dash(r?.details)}`, { color: COL_MUTE, after: 20 }));
          const rows = (r?.devices || []).length
            ? r.devices.map((d: any) => [dash(d?.typ), dash(d?.pocet), dash(d?.dimenze), dash(d?.riso), dash(d?.ochrana), dash(d?.podrobnosti || d?.note)])
            : [["—", "—", "—", "—", "—", "—"]];
          roomsBlocks.push(
            tableBordered(["Typ", "Počet", "Dimenze", "Riso [MΩ]", "Ochrana [Ω]", "Poznámka"], rows, [18, 10, 18, 14, 14, 26])
          );
        });
      } else {
        roomsBlocks.push(H("4. Měření – místnosti", 26), P("—"));
      }

      const defects = tableBorderless(
        [
          [P("Popis závady", { bold: true, color: COL_MUTE, size: SMALL }), P("ČSN", { bold: true, color: COL_MUTE, size: SMALL }), P("Článek", { bold: true, color: COL_MUTE, size: SMALL })],
          ...((safeForm.defects || []).length ? safeForm.defects.map((d: any) => [P(dash(d?.description)), P(dash(d?.standard)), P(dash(d?.article))]) : [[P("—"), P("—"), P("—")]]),
        ],
        [60, 20, 20]
      );

      const zav = [
        H("6. Závěr", 26),
        P(dash(safeForm.conclusion?.text)),
        P(safetyLabel, { bold: true }),
        P(`Další revize: ${dash(safeForm.conclusion?.validUntil)}`),
      ];

      // Header & Footer
      const evid = dash(safeForm.evidencni || revId);
      const header = new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [tr(`Evidenční číslo: ${evid}`, { size: SMALL, color: COL_MUTE })],
            spacing: { after: 0 },
          }),
        ],
      });

      const footer = new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [tr("Strana ", { size: SMALL, color: COL_MUTE }), PageNumber.CURRENT, tr(" / ", { size: SMALL, color: COL_MUTE }), PageNumber.TOTAL],
            spacing: { before: 0, after: 0 },
          }),
        ],
      });

      const doc = new Document({
        styles: {
          default: {
            document: { run: { font: FONT, size: BODY, color: COL_TEXT }, paragraph: { spacing: { after: 60 } } },
          },
        },
        sections: [
          {
            properties: {
              page: {
                size: { width: mm(210), height: mm(297), orientation: PageOrientation.PORTRAIT },
                margin: { top: mm(14), bottom: mm(14), left: mm(14), right: mm(14) },
              },
            },
            headers: { default: header },
            footers: { default: footer },
            children: [
              ...headTitle,
              H("Revizní technik", 22), tech,
              H("Revidovaný objekt", 22), objekt,
              H("Použité měřicí přístroje", 22), instruments,
              ...term, ...posudek,
              H("Rozdělovník", 22),
              P("Provozovatel – 1×"),
              P("Revizní technik – 1×"),
              P("...................................................."),
              P("...................................................."),
              P("V ........................................ dne ........................................"),
              P("Podpis provozovatele: ______________________________"),
              P("Podpis revizního technika: _________________________"),
              ...ident,
              ...prohlidka,
              ...tests,
              ...boardsBlocks,
              ...roomsBlocks,
              defects,
              ...zav,
            ],
          },
        ],
      });

      const blob = await Packer.toBlob(doc);
      const fileId = String(safeForm.evidencni || revId || "vystup");
      saveAs(blob, `revizni_zprava_${fileId}.docx`);
    } catch (e: any) {
      alert(`Nepodařilo se vygenerovat DOCX: ${e?.message || e}`);
    }
  };

  /* ====== RENDER ====== */
  return (
    <div className={isPrintView ? "min-h-screen bg-white text-slate-900" : "min-h-screen bg-white text-slate-900"}>
      <div className="flex" id="app-chrome">
        {!isPrintView && (
          <div className="print:hidden">
            <Sidebar mode="summary" />
          </div>
        )}
        <main className={isPrintView ? "flex-1" : "flex-1 p-6 md:p-10"}>
          {/* Toolbar */}
          {!isPrintView && (
            <div className="flex justify-end gap-3 mb-4 print:hidden">
              <button onClick={handleGenerateWord} className="px-4 py-2 rounded bg-indigo-600 text-white">
                Generovat Word
              </button>
              <button onClick={handleGeneratePDF} className="px-4 py-2 rounded bg-emerald-600 text-white">
                Generovat PDF
              </button>
            </div>
          )}

          {/* Styly pro screen i tisk */}
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
              padding: 12mm 14mm 20mm; /* trochu smrsknuto, aby 1. stránka vždy končila po podpisech */
              box-shadow: 0 4px 18px rgba(0,0,0,.12);
              border-radius: 2px;
            }
            .a4 + .a4 { page-break-before: always; }
            .print-only { display: none; }

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

              /* Vektorový tisk: vypnout efekty */
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
              {/* HLAVIČKA */}
              <header className="mb-4" style={{ breakInside: "avoid" }}>
                <div className="mt-1 text-sm text-left">
                  Číslo revizní zprávy: <strong>{dash(safeForm.evidencni || revId)}</strong>
                </div>
                <div className="w-full text-center mt-1">
                  <h1 className="text-2xl font-bold tracking-wide">Zpráva o revizi elektrické instalace</h1>
                  <div className="text-base font-semibold mt-1">{dash(safeForm.typRevize)}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {normsAll.length ? <>V souladu s {normsAll.join(", ")}</> : <>V souladu s Chybí informace</>}
                  </div>
                </div>
                <hr className="mt-3 border-slate-200" />
              </header>

              {/* REVIZNÍ TECHNIK */}
              <section style={{ breakInside: "avoid" }}>
                <h2 className="font-semibold text-lg mb-2">Revizní technik</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <KV label="Jméno" value={technician.jmeno} />
                  <KV label="Firma" value={technician.firma} />
                  <KV label="Ev. č. osvědčení" value={technician.cislo_osvedceni} />
                  <KV label="IČO" value={technician.ico} />
                  <KV label="Ev. č. oprávnění" value={technician.cislo_opravneni} />
                  <KV label="DIČ" value={technician.dic} />
                  <KV label="Adresa" value={technician.adresa} />
                  <KV label="Telefon" value={technician.phone} />
                  <KV label="E-mail" value={technician.email} />
                </div>
              </section>

              <hr className="my-5 border-slate-200" />

              {/* REVIDOVANÝ OBJEKT */}
              <section className="mt-3" style={{ breakInside: "avoid" }}>
                <h2 className="font-semibold text-lg mb-2">Revidovaný objekt</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <KV label="Adresa stavby" value={safeForm.adresa} />
                  <KV label="Předmět revize" value={safeForm.objekt} />
                  <KV label="Objednatel revize" value={safeForm.objednatel} />
                </div>
              </section>

              {/* PŘÍSTROJE */}
              <section className="mt-4" style={{ breakInside: "avoid" }}>
                <h2 className="font-semibold text-lg mb-2">Použité měřicí přístroje</h2>
                <table className="w-full text-sm border">
                  <thead>
                    <tr className="text-left">
                      <Th>Přístroj</Th>
                      <Th>Výrobní číslo</Th>
                      <Th>Kalibrační list</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {usedInstruments.length ? (
                      usedInstruments.map((inst) => (
                        <tr key={inst.id}>
                          <Td>{inst.name}</Td>
                          <Td>{inst.serial}</Td>
                          <Td>{inst.calibration}</Td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <Td>—</Td>
                        <Td>—</Td>
                        <Td>—</Td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </section>

              {/* DOPORUČENÝ TERMÍN */}
              <section className="mt-4" style={{ breakInside: "avoid" }}>
                <div className="text-sm text-center">
                  <p>Doporučený termín příští revize dle ČSN&nbsp;332000-6 ed.2 čl.&nbsp;6.5.2:</p>
                  <p><strong>{dash(safeForm.conclusion?.validUntil)}</strong></p>
                </div>
              </section>

              {/* CELKOVÝ POSUDEK */}
              <section className="mt-3" style={{ breakInside: "avoid" }}>
                <h2 className="font-semibold text-lg mb-2">Celkový posudek</h2>
                <div className="border-2 border-slate-700 rounded-md p-3 mt-1 mb-4" style={{ breakInside: "avoid" }}>
                  <div className="whitespace-pre-line text-base font-semibold text-center">{safetyLabel}</div>
                </div>
              </section>

              {/* ROZDĚLOVNÍK + PODPISY */}
              <section className="mt-4" style={{ breakInside: "avoid" }}>
                <h2 className="font-semibold text-sm mb-2">Rozdělovník</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 text-sm gap-2">
                  <div>Provozovatel – 1×</div>
                  <div>Revizní technik – 1×</div>
                </div>
                {/* další účastníci – tečkované řádky */}
                <div className="text-sm mt-2">
                  <div>....................................................</div>
                  <div>....................................................</div>
                </div>

                <div className="mt-5 text-sm">
                  <div className="mb-2">V ........................................ dne ........................................</div>
                  <div className="grid grid-cols-2 gap-6 items-end">
                    <div>
                      {/* zrušen „Otisk razítka“ */}
                      <div className="border-t border-slate-300 pt-1">Podpis provozovatele</div>
                    </div>
                    <div className="text-right">
                      <div className="border-t border-slate-300 pt-1 inline-block">Podpis revizního technika</div>
                    </div>
                  </div>
                </div>
              </section>
            </section>

            {/* ===== A4 #2 – IDENTIFIKACE + PROHLÍDKA ===== */}
            <section className="a4">
              <H1>1. Identifikace</H1>

              {/* Montážní firma + oprávnění */}
              <section className="mb-4">
                <h2 className="font-semibold mb-2">Montážní firma</h2>
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  <KV label="Firma" value={safeForm.montFirma} />
                  <KV label="Oprávnění firmy" value={safeForm.montFirmaAuthorization} />
                </div>
              </section>

              {/* Ochranná opatření */}
              <section className="mb-4">
                <h2 className="font-semibold mb-2">Ochranná opatření</h2>
                <div className="space-y-1 text-sm">
                  <KV label="Základní ochrana" value={listOrDash(safeForm.protection_basic)} />
                  <KV label="Ochrana při poruše" value={listOrDash(safeForm.protection_fault)} />
                  <KV label="Doplňková ochrana" value={listOrDash(safeForm.protection_additional)} />
                </div>
              </section>

              {/* Popis + parametry sítě */}
              <section className="mb-4">
                <h2 className="font-semibold mb-2">Popis a rozsah revidovaného objektu</h2>
                <Rich value={safeForm.inspectionDescription} />
              </section>

              {/* Tři položky pod sebe (ne tabulka) */}
              <section className="mb-4 text-sm space-y-1">
                <KV label="Jmenovité napětí" value={safeForm.voltage} />
                <KV label="Druh sítě" value={safeForm.sit} />
                <KV label="Předložená dokumentace" value={safeForm.documentation} />
              </section>

              <section className="mb-4">
                <h2 className="font-semibold mb-2">Vnější vlivy</h2>
                <div className="text-sm whitespace-pre-line">{dash(safeForm.environment)}</div>
              </section>

              <section>
                <h2 className="font-semibold mb-2">Přílohy</h2>
                <div className="text-sm whitespace-pre-line">{dash(safeForm.extraNotes)}</div>
              </section>

              <hr className="my-6 border-slate-200" />

              <H1>2. Prohlídka</H1>
              <section className="mb-2">
                <div className="font-medium mb-1">Soupis provedených úkonů dle ČSN 33 2000-6 čl. 6.4.2.3</div>
                {safeForm.performedTasks?.length ? (
                  <ul className="list-disc ml-6 text-sm">
                    {safeForm.performedTasks.map((t: string, i: number) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm italic text-slate-400">—</div>
                )}
              </section>
            </section>

            {/* ===== A4 #3 – ZKOUŠENÍ + MĚŘENÍ (rozvaděče) ===== */}
            <section className="a4">
              <H1>3. Zkoušení</H1>
              <section className="mb-6">
                {/* užší tabulka, vystředěná */}
                <div className="w-[80%] mx-auto" style={{ breakInside: "avoid" }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <Th>Název zkoušky</Th>
                        <Th>Poznámka / výsledek</Th>
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
                          <Td>—</Td>
                          <Td></Td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <H1>4. Měření – rozvaděče</H1>
              {safeForm.boards?.length ? (
                <div className="space-y-6">
                  {safeForm.boards.map((board: any, bIdx: number) => {
                    const flat = normalizeComponents(board?.komponenty || []);
                    return (
                      <div key={bIdx} className="mt-6">
                        <div className="font-semibold">Rozvaděč: {dash(board?.name) || `#${bIdx + 1}`}</div>
                        <div className="text-sm text-slate-600">
                          Výrobce: {dash(board?.vyrobce)} | Typ: {dash(board?.typ)} | Umístění: {dash(board?.umisteni)} | S/N:{" "}
                          {dash(board?.vyrobniCislo)} | Napětí: {dash(board?.napeti)} | Odpor: {dash(board?.odpor)} | IP:{" "}
                          {dash(board?.ip)}
                        </div>

                        {/* BOX bez mřížek – řádky komponent */}
                        <div className="mt-2 border border-slate-200 rounded divide-y" data-paginate="board-box">
                          {flat.map((c: any, i: number) => {
                            const prefix = depthPrefix(c._level);
                            const name = dash(c?.nazev || c?.name);
                            const desc = dash(c?.popis || c?.description || "");
                            const line = buildComponentLine(c);
                            return (
                              <div
                                key={i}
                                className={i % 2 === 0 ? "bg-white" : "bg-slate-50/60"}
                                style={{ breakInside: "avoid", paddingLeft: 12 + c._level * 18 }}
                              >
                                <div className="py-2 px-3">
                                  <div className="font-medium">
                                    <span className="font-mono text-slate-500 whitespace-pre mr-1">{prefix}</span>
                                    {name}
                                  </div>
                                  <div className="text-xs text-slate-600 mt-0.5">
                                    {desc !== "Chybí informace" && <span className="mr-2">{desc}</span>}
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
                <div className="italic text-slate-400">—</div>
              )}
            </section>

            {/* ===== A4 #4 – MĚŘENÍ (místnosti) + ZÁVADY + ZÁVĚR ===== */}
            <section className="a4">
              <H1>4. Měření – místnosti</H1>
              {safeForm.rooms?.length ? (
                <div className="space-y-6">
                  {safeForm.rooms.map((room: any, rIdx: number) => (
                    <div key={rIdx} className="mt-6">
                      <div className="font-semibold">Místnost: {dash(room?.name) || `#${rIdx + 1}`}</div>
                      <div className="text-sm text-slate-600">Poznámka: {dash(room?.details)}</div>
                      <table className="w-full text-sm border mt-2" style={{ breakInside: "avoid" }}>
                        <thead>
                          <tr className="text-left">
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
                              <Td colSpan={6}>—</Td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="italic text-slate-400">—</div>
              )}

              <hr className="my-6 border-slate-200" />

              <H1>5. Zjištěné závady</H1>
              {safeForm.defects?.length ? (
                <table className="w-full text-sm" style={{ breakInside: "avoid" }}>
                  <thead>
                    <tr className="text-left">
                      <Th>Popis závady</Th>
                      <Th>ČSN</Th>
                      <Th>Článek</Th>
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
                <div className="italic text-slate-400">—</div>
              )}

              <hr className="my-6 border-slate-200" />

              <H1>6. Závěr</H1>
              <section style={{ breakInside: "avoid" }}>
                <div className="space-y-4 text-sm">
                  <div className="whitespace-pre-line">{dash(safeForm.conclusion?.text)}</div>
                  <div className="border-2 border-slate-700 rounded-md p-3">
                    <div className="text-xl font-extrabold tracking-wide">{safetyLabel}</div>
                  </div>
                  <div>
                    Další revize: <strong>{dash(safeForm.conclusion?.validUntil)}</strong>
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

/* ============ Pomocné komponenty / funkce ============ */

function H1({ children }: React.PropsWithChildren) {
  return <h2 className="text-xl font-bold mb-2">{children}</h2>;
}
function Th({ children }: React.PropsWithChildren) {
  return <th className="py-2 px-3">{children}</th>;
}
function Td({ children, colSpan }: React.PropsWithChildren & { colSpan?: number }) {
  return (
    <td className="py-1.5 px-3 align-top" colSpan={colSpan}>
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
function Rich({ value }: { value?: string }) {
  if (!value || !String(value).trim().length) return <div className="italic text-slate-400">—</div>;
  return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: value }} />;
}
function listOrDash(arr?: string[]) {
  if (!arr || arr.length === 0) return "—";
  return arr.join(", ");
}
function dash(v?: any) {
  const s = v == null ? "" : String(v);
  return s.trim().length ? s : "—";
}
function stripHtml(html: string) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

/* ======= Strom rozvaděče -> ploché pole s úrovní ======= */
function normalizeComponents(raw: any[]): any[] {
  const items = Array.isArray(raw) ? raw : [];

  if (items.some((k) => Array.isArray(k?.children) && k.children.length)) {
    const out: any[] = [];
    const walk = (arr: any[], level: number) => {
      arr.forEach((n) => {
        out.push({ ...n, _level: level });
        if (Array.isArray(n.children) && n.children.length) walk(n.children, level + 1);
      });
    };
    walk(items, 0);
    return out;
  }

  const pidOf = (x: any) => x?.parentId ?? x?.parent_id ?? x?.parent ?? null;
  const idOf = (x: any) => String(x?.id ?? x?.komponentaId ?? x?._id ?? "");
  if (items.some((k) => pidOf(k) != null)) {
    const children = new Map<string, any[]>();
    const ROOT = "__root__";
    for (const it of items) {
      const key = pidOf(it) == null ? ROOT : String(pidOf(it));
      (children.get(key) || children.set(key, []).get(key)!).push(it);
    }
    const sortByOrder = (arr: any[]) =>
      arr.sort((a, b) => (a.order ?? a.poradi ?? a.index ?? 0) - (b.order ?? b.poradi ?? b.index ?? 0));

    const out: any[] = [];
    const dfs = (arr: any[], level: number) => {
      sortByOrder(arr).forEach((n) => {
        out.push({ ...n, _level: level });
        const kids = children.get(idOf(n)) || [];
        if (kids.length) dfs(kids, level + 1);
      });
    };
    dfs(children.get(ROOT) || [], 0);
    return out;
  }

  return items.map((k) => ({ ...k, _level: Number(k.uroven ?? k.level ?? k.depth ?? 0) || 0 }));
}

function depthPrefix(level: number) {
  if (level <= 0) return "";
  if (level === 1) return "└─ ";
  return "│ ".repeat(level - 1) + "└─ ";
}

// chytré načítání hodnot (vč. vnořených struktur/aliasů)
function pick(c: any, keys: string[]) {
  for (const k of keys) {
    const v =
      c?.[k] ??
      c?.result?.[k] ??
      c?.result?.value?.[k] ??
      c?.zkouska?.[k] ??
      c?.mereni?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}
function seg(label: string, val: any, unit = "", transform?: (x: any) => string): string {
  if (val === "" || val === undefined || val === null) return "";
  const text = transform ? transform(val) : String(val);
  return `${label}: ${unit ? `${text} ${unit}` : text}`;
}
const num = (x: any) => {
  const s = String(x).replace(",", ".").trim();
  const n = Number(s);
  return Number.isFinite(n) ? String(n) : String(x);
};

function buildComponentLine(c: any): string {
  const parts: string[] = [];
  parts.push(seg("typ", pick(c, ["typ", "type", "druh"])));
  parts.push(seg("póly", pick(c, ["poles", "poly", "pocet_polu", "pocetPolu"])));
  parts.push(seg("dim.", pick(c, ["dimenze", "dim", "prurez"])));
  parts.push(seg("Riso", pick(c, ["riso", "Riso", "izolace", "insulation"]), "MΩ", num));
  parts.push(seg("Zs", pick(c, ["zs", "Zs", "ochrana", "smycka", "loop_impedance"]), "Ω", num));
  parts.push(seg("t", pick(c, ["vybavovaciCasMs", "vybavovaci_cas_ms", "rcd_time", "trip_time", "vybavovaciCas", "cas_vybaveni"]), "ms", num));
  parts.push(seg("IΔ", pick(c, ["vybavovaciProudmA", "vybavovaci_proud_ma", "rcd_trip_current", "trip_current", "i_fi", "ifi"]), "mA", num));
  parts.push(seg("Uᵢ", pick(c, ["ui", "u_i", "ut", "u_touch", "dotykove_napeti"]), "V", num));
  parts.push(seg("Pozn.", pick(c, ["poznamka", "pozn", "note", "poznámka"])));
  return parts.filter(Boolean).join("   •   ");
}
