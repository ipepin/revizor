// src/pages/summary-export/word.ts
import { saveAs } from "file-saver";

import {
  Document,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  TextRun,
  AlignmentType,
} from "docx";

import {
  mm,
  COL_TEXT,
  COL_MUTE,
  BODY,
  SMALL,
  XS,
  FONT,
  tr,
  P,
  H,
  tableBordered,
  tableBorderedNarrow,
  makeHeader,
  makeFooter,
} from "../summary-utils/docx";

import { normalizeComponents, depthPrefix, pick, num } from "../summary-utils/board";
import { dash, stripHtml } from "../summary-utils/text";

type GenArgs = {
  safeForm: any;
  technician: any;
  normsAll: string[];
  usedInstruments: Array<{ id: string; name: string; serial: string; calibration: string }>;
  revId?: string | undefined;
};

/* ---------- Lokální helpery ---------- */

const labelRun = (t: string) =>
  new TextRun({ text: `${t}: `, bold: true, size: SMALL, color: COL_MUTE, font: FONT });

const valueRun = (t?: string | null) =>
  new TextRun({ text: String(t ?? "—"), size: BODY, color: COL_TEXT, font: FONT });

const kvLine = (label: string, value?: string | null) =>
  new Paragraph({ children: [labelRun(label), valueRun(value)], spacing: { before: 0, after: 40 } });

/** Bezrámečkový 2-sloupcový grid z dvojic [label, value] — bez jakýchkoliv čar */
function keyValueTwoCols(pairs: Array<[string, string | null | undefined]>): Table {
  const cellsPerRow = 2;
  const rows: TableRow[] = [];

  for (let i = 0; i < pairs.length; i += cellsPerRow) {
    const chunk = pairs.slice(i, i + cellsPerRow);

    rows.push(
      new TableRow({
        children: Array.from({ length: cellsPerRow }).map((_, idx) => {
          const pair = chunk[idx];

          return new TableCell({
            children: pair
              ? [
                  new Paragraph({
                    children: [new TextRun({ text: pair[0], size: SMALL, color: COL_MUTE, bold: true, font: FONT })],
                    spacing: { after: 10 }, // menší vertikální mezera
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: String(pair[1] ?? "—"), size: BODY, font: FONT })],
                    spacing: { before: 0, after: 30 },
                  }),
                ]
              : [new Paragraph({ children: [new TextRun({ text: "" })] })],
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { top: 20, bottom: 10, left: 40, right: 40 }, // kompaktnější odsazení
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
            },
          });
        }),
      })
    );
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideH: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideV: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
  });
}

/** Výrazný box s výsledkem revize (zarovnaný na střed, větší písmo, rámeček) */
function resultBox(text: string): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideH: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideV: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text, bold: true, size: 28, font: FONT })],
                spacing: { before: 60, after: 60 },
              }),
            ],
            margins: { top: 120, bottom: 120, left: 140, right: 140 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 24, color: "CBD5E1" },
              bottom: { style: BorderStyle.SINGLE, size: 24, color: "CBD5E1" },
              left: { style: BorderStyle.SINGLE, size: 24, color: "CBD5E1" },
              right: { style: BorderStyle.SINGLE, size: 24, color: "CBD5E1" },
            },
          }),
        ],
      }),
    ],
  });
}

/** 2-sloupcový blok Revizní technik (bez rámečků) */
function makeTechnicianTwoCols(tech: any): Table {
  const items: Array<[string, string | null | undefined]> = [
    ["Jméno", tech?.jmeno],
    ["Firma", tech?.firma],
    ["Ev. č. osvědčení", tech?.cislo_osvedceni],
    ["Ev. č. oprávnění", tech?.cislo_opravneni],
    ["IČO", tech?.ico],
    ["DIČ", tech?.dic],
    ["Adresa", tech?.adresa],
    ["Telefon", tech?.phone],
    ["E-mail", tech?.email],
  ];
  return keyValueTwoCols(items);
}

/** 2-sloupcový blok Revidovaný objekt (bez rámečků/podbarvení) */
function makeObjectTwoCols(safeForm: any): Table {
  const items: Array<[string, string | null | undefined]> = [
    ["Adresa stavby", dash(safeForm.adresa)],
    ["Předmět revize", dash(safeForm.objekt)],
    ["Objednatel revize", dash(safeForm.objednatel)],
  ];
  return keyValueTwoCols(items);
}

export async function generateSummaryDocx({
  safeForm,
  technician,
  normsAll,
  usedInstruments,
  revId,
}: GenArgs) {
  // ---------- Head / titul ----------
  const headTitle: Paragraph[] = [
    P(`Číslo revizní zprávy: ${dash(safeForm.evidencni || revId)}`, { color: COL_MUTE, after: 40 }),
    P("Zpráva o elektrické instalaci", { center: true, bold: true, size: 32, after: 120 }),
    P(dash(safeForm.typRevize), { bold: true, center: true, after: 30 }),
    P(normsAll.length ? `V souladu s ${normsAll.join(", ")}` : `V souladu s Chybí informace`, {
      center: true,
      color: COL_MUTE,
    }),
  ];

  // ---------- Revizní technik (2 sloupce, bez rámečků) ----------
  const techBlock = makeTechnicianTwoCols(technician);

  // ---------- Revidovaný objekt (2 sloupce, bez rámečků/podbarvení) ----------
  const objektBlock = makeObjectTwoCols(safeForm);

  // ---------- Přístroje ----------
  const instrumentsRows = (usedInstruments?.length
    ? usedInstruments.map((i) => [i.name, i.serial, i.calibration])
    : [["—", "—", "—"]]) as (string | number)[][];
  const instruments = tableBordered(["Přístroj", "Výrobní číslo", "Kalibrační list"], instrumentsRows, [50, 25, 25]);

  // ---------- Výsledek (rámeček + větší text, vystředěný) ----------
  const safetyLabel = (() => {
    const s = safeForm.conclusion?.safety;
    if (!s) return "Chybí informace";
    if (s === "able") return "Elektrická instalace je z hlediska bezpečnosti schopna provozu";
    if (s === "not_able") return "Elektrická instalace není z hlediska bezpečnosti schopna provozu";
    return String(s);
  })();
  const result = resultBox(safetyLabel);

  const term = [
    P("Doporučený termín příští revize dle ČSN 332000-6 ed.2 čl. 6.5.2:", { color: COL_MUTE, center: true }),
    P(dash(safeForm.conclusion?.validUntil), { bold: true, center: true }),
  ];

  // ---------- 1. Identifikace (pevný zlom) ----------
  const ident: (Paragraph | Table)[] = [
    new Paragraph({ pageBreakBefore: true }),
    H("1. Identifikace", 26),
    H("Montážní firma", 22),
    keyValueTwoCols([
      ["Firma", dash(safeForm.montFirma)],
      ["Oprávnění firmy", dash(safeForm.montFirmaAuthorization)],
    ]),
    H("Ochranná opatření", 22),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        insideH: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        insideV: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                kvLine("Základní ochrana", (safeForm.protection_basic || []).join(", ") || "—"),
                kvLine("Ochrana při poruše", (safeForm.protection_fault || []).join(", ") || "—"),
                kvLine("Doplňková ochrana", (safeForm.protection_additional || []).join(", ") || "—"),
              ],
              width: { size: 100, type: WidthType.PERCENTAGE },
              margins: { top: 20, bottom: 10, left: 40, right: 40 },
              borders: {
                top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
                right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
              },
            }),
          ],
        }),
      ],
    }),
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
    ...(safeForm.performedTasks?.length
      ? safeForm.performedTasks.map((t: string) => P(`• ${t}`, { after: 30 }))
      : [P("—")]),
  ];

  // ---------- 3. Zkoušení ----------
  const testsLocal =
    (Object.entries(safeForm.tests || {}) as [string, any][])
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

  // ---------- 4. Měření – rozvaděče ----------
  const boardsBlocks: (Paragraph | Table)[] = [];
  if (!(safeForm.boards || []).length) {
    boardsBlocks.push(H("4. Měření – rozvaděče", 26), P("—"));
  } else {
    boardsBlocks.push(H("4. Měření – rozvaděče", 26));
    (safeForm.boards || []).forEach((b: any, idx: number) => {
      boardsBlocks.push(P("", { after: 300 }));
      boardsBlocks.push(P(`Rozvaděč: ${dash(b?.name) || `#${idx + 1}`}`, { bold: true, size: XS, after: 20 }));
      const details = `Výrobce: ${dash(b?.vyrobce)} | Typ: ${dash(b?.typ)} | Umístění: ${dash(b?.umisteni)} | S/N: ${dash(b?.vyrobniCislo)} | Napětí: ${dash(b?.napeti)} | Odpor: ${dash(b?.odpor)} | IP: ${dash(b?.ip)}`;
      boardsBlocks.push(P(details, { color: COL_MUTE, size: XS, after: 60 }));

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
          children: [tr(`${prefix}${name}`, { bold: true, size: XS })],
          spacing: { after: 20 },
        });
        const subtitle = new Paragraph({
          children: [tr(parts.filter(Boolean).join("   •   "), { size: XS, color: COL_MUTE })],
        });
        return [title, subtitle];
      });

      boardsBlocks.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
            insideH: { style: BorderStyle.SINGLE, size: 1, color: "e5e7eb" },
            insideV: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
          },
          rows: rows.map(
            (pair) =>
              new TableRow({
                children: [
                  new TableCell({
                    children: pair,
                    margins: { top: 40, bottom: 40, left: 70, right: 70 },
                  }),
                ],
              })
          ),
        })
      );
    });
  }

  // ---------- 4. Měření – místnosti ----------
  const roomsBlocks: (Paragraph | Table)[] = [];
  if ((safeForm.rooms || []).length) {
    roomsBlocks.push(H("4. Měření – místnosti", 26));
    (safeForm.rooms || []).forEach((r: any, idx: number) => {
      roomsBlocks.push(P("", { after: 300 }));
      roomsBlocks.push(P(`Místnost: ${dash(r?.name) || `#${idx + 1}`}`, { bold: true, after: 10 }));
      roomsBlocks.push(P(`Poznámka: ${dash(r?.details)}`, { color: COL_MUTE, after: 20 }));
      const rows = (r?.devices || []).length
        ? r.devices.map((d: any) => [
            dash(d?.typ),
            dash(d?.pocet),
            dash(d?.dimenze),
            dash(d?.riso),
            dash(d?.ochrana),
            dash(d?.podrobnosti || d?.note),
          ])
        : [["—", "—", "—", "—", "—", "—"]];
      roomsBlocks.push(
        tableBordered(["Typ", "Počet", "Dimenze", "Riso [MΩ]", "Ochrana [Ω]", "Poznámka"], rows, [18, 10, 18, 14, 14, 26])
      );
    });
  } else {
    roomsBlocks.push(H("4. Měření – místnosti", 26), P("—"));
  }

  // ---------- 5. Závady ----------
  const defectsRows =
    (safeForm.defects || []).length
      ? safeForm.defects.map((d: any) => [dash(d?.description), dash(d?.standard), dash(d?.article)])
      : [["—", "—", "—"]];

  const defectsBlock = [
    new Paragraph({ pageBreakBefore: true }),
    P("", { after: 300 }),
    H("5. Závady", 26),
    tableBordered(["Popis závady", "ČSN", "Článek"], defectsRows as (string | number)[][], [60, 20, 20]),
  ];

  // ---------- 6. Závěr ----------
  const zav = [
    P("", { after: 300 }),
    H("6. Závěr", 26),
    P(dash(safeForm.conclusion?.text)),
    P(`Další revize: ${dash(safeForm.conclusion?.validUntil)}`),
  ];

  // ---------- Dokument ----------
  const evid = dash(safeForm.evidencni || revId);
  const header = makeHeader(evid);

  const doc = new Document({
    features: { updateFields: true },
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
            pageNumbers: { start: 1 },
          },
        },
        headers: { default: header },
        footers: { default: makeFooter() },
        children: [
          ...headTitle,
          H("Revizní technik", 22),
          techBlock,                 // 2 sloupce, bez rámečků
          H("Revidovaný objekt", 22),
          objektBlock,               // 2 sloupce, bez rámečků/podbarvení
          H("Výsledek revize", 22),
          result,                    // rámeček + větší text + centrováno
          ...term,
          H("Použité měřicí přístroje", 22),
          instruments,
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
          ...defectsBlock,
          ...zav,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileId = String(safeForm.evidencni || revId || "vystup");
  saveAs(blob, `revizni_zprava_${fileId}.docx`);
}
