// src/utils/docx.ts
// Reusable helpers pro generování DOCX (RZ + VV)

import {
  AlignmentType,
  BorderStyle,
  Footer,
  Header,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

/** mm → twentieths of a point (docx units) */
export const mm = (v: number) => Math.round((v / 25.4) * 1440);

// paleta a typografie – stejné barvy/font jako HTML/PDF
export const COL_TEXT = "0f172a";
export const COL_MUTE = "475569";
export const COL_BORDER = "e2e8f0";
export const COL_HEAD = "f8fafc";

export const FONT = "Carlito";
export const BODY = 22;  // ~11 pt
export const SMALL = 20; // ~10 pt
export const XS = 18;    // ~9 pt (měření)

/* ---------- Runs & Paragraphs ---------- */

export const tr = (
  text: string,
  o: { bold?: boolean; size?: number; color?: string } = {}
) =>
  new TextRun({
    text,
    bold: !!o.bold,
    size: o.size ?? BODY,
    color: o.color ?? COL_TEXT,
    font: FONT,
  });

export const P = (
  text: string,
  o: {
    bold?: boolean;
    center?: boolean;
    size?: number;
    color?: string;
    after?: number;
    before?: number;
  } = {}
) =>
  new Paragraph({
    alignment: o.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    children: [tr(text, o)],
    spacing: { before: o.before ?? 0, after: o.after ?? 60 },
  });

export const H = (text: string, size = 26) =>
  new Paragraph({
    spacing: { before: 120, after: 80 },
    children: [tr(text, { bold: true, size })],
  });

/** Prázdný odstavec, který dělá „mezeru“ o ~px (počítáno 1px ≈ 0.75pt) */
export const spacerPx = (px = 20) =>
  new Paragraph({
    spacing: { after: Math.round(px * 0.75 * 20) }, // pt → twips
    children: [new TextRun({ text: "" })],
  });

/** Pevný zlom stránky */
export const pageBreak = () => new Paragraph({ pageBreakBefore: true });

/* ---------- Tabulky – s hranami ---------- */

export const cell = (
  children: Paragraph[],
  pct: number,
  header = false,
  pad = 70
) =>
  new TableCell({
    children,
    width: { size: pct, type: WidthType.PERCENTAGE },
    margins: { top: 40, bottom: 40, left: pad, right: pad },
    shading: header ? { fill: COL_HEAD } : undefined,
  });

/** Full-width tabulka s hranami (default) */
export const tableBordered = (
  headers: string[],
  rows: (string | number)[][],
  widthsPct: number[]
) =>
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
          children: r.map((c, i) =>
            cell([P(String(c ?? ""), { after: 30 })], widthsPct[i], false, 60)
          ),
        })
      ),
    ],
  });

/** Užší (≈80 %) vystředěná tabulka s hranami */
export const tableBorderedNarrow = (
  headers: string[],
  rows: (string | number)[][],
  widthsPct: number[]
) =>
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
          children: r.map((c, i) =>
            cell([P(String(c ?? ""), { after: 30 })], widthsPct[i], false, 60)
          ),
        })
      ),
    ],
  });

/** Bezrámečková tabulka na layout (2–3 sloupce apod.) – ponechá jen zarovnání a odsazení */
export const tableBorderless = (rows: Paragraph[][], widthsPct: number[]) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    // bez jakýchkoli hran (tisk i náhled)
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideH: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideV: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: rows.map(
      (r) =>
        new TableRow({
          children: r.map(
            (p, i) =>
              new TableCell({
                children: [p],
                width: { size: widthsPct[i], type: WidthType.PERCENTAGE },
                margins: { top: 18, bottom: 18, left: 28, right: 28 }, // kompaktnější
              })
          ),
        })
    ),
  });

/** Syntaktický cukr: full-width tabulka s hranami + custom šířky */
export const tableFullWidth = (
  headers: string[],
  rows: (string | number)[][],
  widthsPct: number[]
) => tableBordered(headers, rows, widthsPct);

/* ---------- Nové helpery: „bez rámečku“ pro Revizního technika ---------- */

/** Vytvoří border-free (100% šířky) tabulku s vlastním paddingem – univerzální */
export const tableNoBorders = (rows: Paragraph[][], widthsPct: number[], pad = 28) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:    { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left:   { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right:  { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideH:{ style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideV:{ style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    rows: rows.map(
      (r) =>
        new TableRow({
          children: r.map(
            (p, i) =>
              new TableCell({
                children: [p],
                width: { size: widthsPct[i], type: WidthType.PERCENTAGE },
                margins: { top: 14, bottom: 14, left: pad, right: pad },
              })
          ),
        })
    ),
  });

/** Key–Value varianta bez hran – ideální pro „Revizní technik / Firma“ */
export const kvNoBorders = (
  pairs: Array<{ k: string; v: string }>,
  widthsPct: [number, number] = [28, 72],
  pad = 24
) => {
  const rows = pairs.map(({ k, v }) => [
    P(k, { size: SMALL, after: 0 }),
    P(v || "—", { after: 0 }),
  ]);
  return tableNoBorders(rows, widthsPct, pad);
};

/* ---------- Header & Footer ---------- */

/** Záhlaví s evidenčním číslem (vpravo) */
export const makeHeader = (evid: string) =>
  new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [tr(`Evidenční číslo: ${evid}`, { size: SMALL, color: COL_MUTE })],
        spacing: { after: 0 },
      }),
    ],
  });

/** Zápatí „Strana X“ (na střed) – kompatibilní s verzemi docx */
export const makeFooter = () =>
  new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [tr(PageNumber.CURRENT, { size: SMALL, color: COL_MUTE })],
      }),
    ],
  });

/* ---------- (Volitelné) mini-bloky pro rychlé použití ---------- */

/** Rychlý blok „Revizní technik“ bez rámečků */
export const makeTechnicianBlock = (tech: {
  name?: string;
  certificate_number?: string;
  authorization_number?: string;
  address?: string;
  phone?: string;
  email?: string;
}, company?: { name?: string; ico?: string; dic?: string }) =>
  kvNoBorders(
    [
      { k: "Jméno",            v: tech.name ?? "" },
      { k: "Firma",            v: company?.name ?? "" },
      { k: "Ev. č. osvědčení", v: tech.certificate_number ?? "" },
      { k: "IČO",              v: company?.ico ?? "" },
      { k: "Ev. č. oprávnění", v: tech.authorization_number ?? "" },
      { k: "DIČ",              v: company?.dic ?? "" },
      { k: "Adresa",           v: tech.address ?? "" },
      { k: "Telefon",          v: tech.phone ?? "" },
      { k: "E-mail",           v: tech.email ?? "" },
    ],
    [28, 72],
    20 // kompaktnější vnitřní odsazení
  );
