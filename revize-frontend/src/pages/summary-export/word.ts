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
  ImageRun,
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

import { normalizeComponents, buildBoardComponentSummary } from "../summary-utils/board";
import { dash, htmlToBulletText } from "../summary-utils/text";
import { defectFullText, defectNormSuffix } from "../summary-utils/defects";
import { buildRoomDeviceSummary, hasRoomNote, roomNoteText } from "../summary-utils/rooms";
import { dataUrlToBytes, getSketchSize } from "./lpsWordBuilder";

type GenArgs = {
  safeForm: any;
  technician: any;
  normsAll: string[];
  usedInstruments: Array<{ id: string; name: string; serial: string; calibration: string }>;
  revId?: string | undefined;
  schemaImages?: Record<string, string>;
};

/* ---------- LokĂˇlnĂ­ helpery ---------- */

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const PAGE_MARGIN_MM = 14;
const MAX_SCHEMA_WIDTH_PX = Math.round(((PAGE_WIDTH_MM - PAGE_MARGIN_MM * 2) / 25.4) * 96 * 0.95);
const MAX_SCHEMA_HEIGHT_PX = Math.round(((PAGE_HEIGHT_MM - PAGE_MARGIN_MM * 2) / 25.4) * 96 * 0.75);

function calculateSchemaTransform(size?: { width: number; height: number }) {
  if (!size) {
    return {
      width: MAX_SCHEMA_WIDTH_PX,
      height: Math.min(Math.round(MAX_SCHEMA_WIDTH_PX * 0.6), MAX_SCHEMA_HEIGHT_PX),
    };
  }
  const scale = Math.min(
    MAX_SCHEMA_WIDTH_PX / size.width,
    MAX_SCHEMA_HEIGHT_PX / size.height,
    1
  );
  return {
    width: Math.round(size.width * scale),
    height: Math.round(size.height * scale),
  };
}

const labelRun = (t: string) =>
  new TextRun({ text: `${t}: `, bold: true, size: SMALL, color: COL_MUTE, font: FONT });

const valueRun = (t?: string | null) =>
  new TextRun({ text: String(t ?? "â€”"), size: BODY, color: COL_TEXT, font: FONT });

const kvLine = (label: string, value?: string | null) =>
  new Paragraph({ children: [labelRun(label), valueRun(value)], spacing: { before: 0, after: 40 } });

type SafetyState = "able" | "not_able" | "";

function normalizeSafety(value: any): SafetyState {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return "";
  if (["able", "ok", "vyhovuje", "kladna", "kladná", "pozitivni", "pozitivní"].includes(text)) {
    return "able";
  }
  if (
    [
      "not",
      "not_able",
      "not-able",
      "negative",
      "negativni",
      "negativní",
      "nevyhovuje",
      "neschopna",
      "neschopná",
    ].includes(text)
  ) {
    return "not_able";
  }
  return "";
}

/** BezrĂˇmeÄŤkovĂ˝ 2-sloupcovĂ˝ grid z dvojic [label, value] â€” bez jakĂ˝chkoliv ÄŤar */
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
                    spacing: { after: 10 }, // menĹˇĂ­ vertikĂˇlnĂ­ mezera
                  }),
                  new Paragraph({
                    children: [new TextRun({ text: String(pair[1] ?? "â€”"), size: BODY, font: FONT })],
                    spacing: { before: 0, after: 30 },
                  }),
                ]
              : [new Paragraph({ children: [new TextRun({ text: "" })] })],
            width: { size: 50, type: WidthType.PERCENTAGE },
            margins: { top: 20, bottom: 10, left: 40, right: 40 }, // kompaktnÄ›jĹˇĂ­ odsazenĂ­
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

/** VĂ˝raznĂ˝ box s vĂ˝sledkem revize (zarovnanĂ˝ na stĹ™ed, vÄ›tĹˇĂ­ pĂ­smo, rĂˇmeÄŤek) */
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

/** 2-sloupcovĂ˝ blok ReviznĂ­ technik (bez rĂˇmeÄŤkĹŻ) */
function makeTechnicianTwoCols(tech: any): Table {
  const items: Array<[string, string | null | undefined]> = [
    ["JmĂ©no", tech?.jmeno],
    ["Firma", tech?.firma],
    ["Ev. ÄŤ. osvÄ›dÄŤenĂ­", tech?.cislo_osvedceni],
    ["Ev. ÄŤ. oprĂˇvnÄ›nĂ­", tech?.cislo_opravneni],
    ["IÄŚO", tech?.ico],
    ["DIÄŚ", tech?.dic],
    ["Adresa", tech?.adresa],
    ["Telefon", tech?.phone],
    ["E-mail", tech?.email],
  ];
  return keyValueTwoCols(items);
}

/** 2-sloupcovĂ˝ blok RevidovanĂ˝ objekt (bez rĂˇmeÄŤkĹŻ/podbarvenĂ­) */
function makeObjectTwoCols(safeForm: any): Table {
  const items: Array<[string, string | null | undefined]> = [
    ["Adresa stavby", dash(safeForm.adresa)],
    ["PĹ™edmÄ›t revize", dash(safeForm.objekt)],
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
  schemaImages,
}: GenArgs) {
  const safetyState = normalizeSafety(safeForm.conclusion?.safety);
  const inspectionLines = (() => {
    const text = htmlToBulletText(safeForm.inspectionDescription || "");
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line, idx, arr) => line || (idx > 0 && arr[idx - 1]));
    return lines.length ? lines : ["â€”"];
  })();
  // ---------- Head / titul ----------
  const headTitle: Paragraph[] = [
    P("Revizn\u00ed zpr\u00e1va o elektrick\u00e9 instalaci", { center: true, bold: true, size: 32, after: 120 }),
    P(dash(safeForm.typRevize), { bold: true, center: true, after: 30 }),
    P(normsAll.length ? `V souladu s ${normsAll.join(", ")}` : `V souladu s Chyb\u00ed informace`, {
      center: true,
      color: COL_MUTE,
    }),
  ];

  // ---------- ReviznĂ­ technik (2 sloupce, bez rĂˇmeÄŤkĹŻ) ----------
  const techBlock = makeTechnicianTwoCols(technician);

  // ---------- RevidovanĂ˝ objekt (2 sloupce, bez rĂˇmeÄŤkĹŻ/podbarvenĂ­) ----------
  const objektBlock = makeObjectTwoCols(safeForm);

  // ---------- PĹ™Ă­stroje ----------
  const instrumentsRows = (usedInstruments?.length
    ? usedInstruments.map((i) => [i.name, i.serial, i.calibration, i.measurement_text || "â€”"])
    : [["â€”", "â€”", "â€”", "â€”"]]) as (string | number)[][];
  const instruments = tableBordered(["Přístroj", "Výrobní číslo", "Kalibrační list", "Měření"], instrumentsRows, [40, 20, 20, 20]);

  // ---------- VĂ˝sledek (rĂˇmeÄŤek + vÄ›tĹˇĂ­ text, vystĹ™edÄ›nĂ˝) ----------
  const safetyLabel = (() => {
    const s = safetyState;
    if (!s) return "ChybĂ­ informace";
    if (s === "able") return "Elektrická instalace vyhovuje požadavkům příslušných norem a je schopna bezpečného provozu.";
    if (s === "not_able") return "Elektrická instalace nevyhovuje požadavkům příslušných norem a není schopna bezpečného provozu.";
    return String(s);
  })();
  const result = resultBox(safetyLabel);
  const nextRevisionLabel =
    safetyState === "not_able"
      ? "Po odstranění závad"
      : dash(safeForm.conclusion?.validUntil);

  const term = [
    P("DoporuÄŤenĂ˝ termĂ­n pĹ™Ă­ĹˇtĂ­ revize dle ÄŚSN 332000-6 ed.2 ÄŤl. 6.5.2:", { color: COL_MUTE, center: true }),
    P(nextRevisionLabel, { bold: true, center: true }),
  ];

  // ---------- 1. Identifikace (pevnĂ˝ zlom) ----------
  const ident: (Paragraph | Table)[] = [
    new Paragraph({ pageBreakBefore: true }),
    H("1. Identifikace", 26),
    H("MontĂˇĹľnĂ­ firma", 22),
    keyValueTwoCols([
      ["Firma", dash(safeForm.montFirma)],
      ["OprĂˇvnÄ›nĂ­ firmy", dash(safeForm.montFirmaAuthorization)],
    ]),
    H("OchrannĂˇ opatĹ™enĂ­", 22),
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
                kvLine("ZĂˇkladnĂ­ ochrana", (safeForm.protection_basic || []).join(", ") || "â€”"),
                kvLine("Ochrana pĹ™i poruĹˇe", (safeForm.protection_fault || []).join(", ") || "â€”"),
                kvLine("DoplĹkovĂˇ ochrana", (safeForm.protection_additional || []).join(", ") || "â€”"),
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
    P("Popis a rozsah revidovanĂ©ho objektu", { bold: true }),
    ...inspectionLines.map((line) => P(line || " ")),
    P(`JmenovitĂ© napÄ›tĂ­: ${dash(safeForm.voltage)}`),
    P(`Druh sĂ­tÄ›: ${dash(safeForm.sit)}`),
    P(`PĹ™edloĹľenĂˇ dokumentace: ${dash(safeForm.documentation)}`),
    P("VnÄ›jĹˇĂ­ vlivy", { bold: true }),
    P(dash(safeForm.environment)),
    P("PĹ™Ă­lohy", { bold: true }),
    P(dash(safeForm.extraNotes)),
  ];

  // ---------- 2. ProhlĂ­dka ----------
  const prohlidka: Paragraph[] = [
    P("2. ProhlĂ­dka", { bold: true, size: 26, center: true }),
    P("Soupis provedenĂ˝ch ĂşkonĹŻ dle ÄŚSN 33 2000-6 ÄŤl. 6.4.2.3", { color: COL_MUTE, center: true }),
    ...(safeForm.performedTasks?.length
      ? safeForm.performedTasks.map((t: string) => P(`â€˘ ${t}`, { after: 30, center: true }))
      : [P("â€”", { center: true })]),
  ];

  // ---------- 3. ZkouĹˇenĂ­ ----------
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
    P("3. ZkouĹˇenĂ­", { bold: true, size: 26, center: true }),
    tableBorderedNarrow(
      ["NĂˇzev zkouĹˇky", "PoznĂˇmka / vĂ˝sledek"],
      testsLocal.length ? testsLocal.map((r) => [r.name, r.note]) : [["â€”", ""]],
      [40, 60]
    ),
  ];

// ---------- 4-A MÄ›Ĺ™enĂ­ rozvadÄ›ÄŤĹŻ ----------
  const boardsBlocks: (Paragraph | Table)[] = [];
  if (!(safeForm.boards || []).length) {
    boardsBlocks.push(H("4-A MÄ›Ĺ™enĂ­ rozvadÄ›ÄŤĹŻ", 26));
  } else {
    boardsBlocks.push(H("4-A MÄ›Ĺ™enĂ­ rozvadÄ›ÄŤĹŻ", 26));
    for (const [idx, b] of (safeForm.boards || []).entries()) {
      boardsBlocks.push(P("", { after: 300 }));
      boardsBlocks.push(P(`RozvadÄ›ÄŤ: ${dash(b?.name) || `#${idx + 1}`}`, { bold: true, size: XS, after: 20 }));
      const details = `VĂ˝robce: ${dash(b?.vyrobce)} | Typ: ${dash(b?.typ)} | UmĂ­stÄ›nĂ­: ${dash(b?.umisteni)} | S/N: ${dash(b?.vyrobniCislo)} | NapÄ›tĂ­: ${dash(b?.napeti)} | Odpor: ${dash(b?.odpor)} | IP: ${dash(b?.ip)}`;
      boardsBlocks.push(P(details, { color: COL_MUTE, size: XS, after: 60 }));
      const boardNotes = htmlToBulletText(b?.poznamkyHtml || b?.poznamky || "");
      if (boardNotes.trim()) {
        boardsBlocks.push(P("Poznámky:", { bold: true, size: XS, after: 20 }));
        boardNotes
          .split(/\r?\n/)
          .map((line) => line.trimEnd())
          .filter((line, index, arr) => line.length > 0 || (index > 0 && arr[index - 1].length > 0))
          .forEach((line) => {
            boardsBlocks.push(P(line || " ", { size: XS, color: COL_TEXT, after: line ? 20 : 10 }));
          });
        boardsBlocks.push(P("", { after: 40 }));
      }

      const flat = normalizeComponents(b?.komponenty || []);
      const rows = (flat.length ? flat : [{ _level: 0, nazev: "—" }]).map((c: any) => {
        const item = buildBoardComponentSummary(c);
        const prvek = `${"  ".repeat(Math.max(0, Number(c?._level || 0)))}${[item.prvek, item.prvekSubtext].filter(Boolean).join("\n")}`;
        return [prvek, item.parametry, item.mereni, item.poznamka];
      });

      boardsBlocks.push(tableBordered(["Prvek", "Parametry", "Měření", "Pozn."], rows, [38, 22, 24, 16]));
      boardsBlocks.push(P("", { after: 60 }));
      boardsBlocks.push(P("", { after: 60 }));

      const schemaTitle = `SchĂ©ma rozvadÄ›ÄŤe: ${dash(b?.name) || `#${idx + 1}`}`;
      boardsBlocks.push(P(schemaTitle, { bold: true, size: XS, after: 40 }));

      const schemaDataUrl = schemaImages?.[String(b?.id)];
      const schemaBytes = dataUrlToBytes(schemaDataUrl);
      if (schemaBytes) {
        const schemaSize = await getSketchSize(schemaDataUrl);
        boardsBlocks.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new ImageRun({ data: schemaBytes, transformation: calculateSchemaTransform(schemaSize) })],
            spacing: { before: 120, after: 200 },
          })
        );
      }

      if (idx < (safeForm.boards || []).length - 1) {
        boardsBlocks.push(
          new Paragraph({
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: "e2e8f0" },
            },
            spacing: { before: 120, after: 120 },
          })
        );
      }
    }
  }

  // ---------- 4. Měření – prostory ----------
  const roomsBlocks: (Paragraph | Table)[] = [];
  if ((safeForm.rooms || []).length) {
    roomsBlocks.push(H("4-B MÄ›Ĺ™enĂ­ v prostorech", 26));
    (safeForm.rooms || []).forEach((r: any, idx: number) => {
      roomsBlocks.push(P("", { after: 300 }));
      roomsBlocks.push(P(`Prostor: ${dash(r?.name) || `#${idx + 1}`}`, { bold: true, after: 10 }));
      if (hasRoomNote(r)) {
        roomsBlocks.push(P(`Poznámka: ${roomNoteText(r, "")}`, { color: COL_MUTE, after: 20 }));
      }
      const rows = (r?.devices || []).length
        ? r.devices.map((d: any) => {
            const item = buildRoomDeviceSummary(d);
            return [[item.prvek, item.prvekSubtext].filter(Boolean).join("\n"), item.parametry, item.mereni, item.poznamka];
          })
        : [["—", "—", "—", "—"]];
      roomsBlocks.push(
        tableBordered(["Prvek", "Parametry", "Měření", "Pozn."], rows, [38, 22, 24, 16])
      );
    });
  } else {
    roomsBlocks.push(H("4-B MÄ›Ĺ™enĂ­ v prostorech", 26), P("???"));
  }

  // ---------- 5. Závady ----------
  const defectsTextRaw = String(safeForm?.defectsRichText || "").trim();
  const defectsBlock = [
    new Paragraph({ pageBreakBefore: true }),
    P("", { after: 300 }),
    H("5. Závady", 26),
    ...(defectsTextRaw
      ? htmlToBulletText(defectsTextRaw)
          .split(/\r?\n/)
          .map((line) => line.trimEnd())
          .filter((line, idx, arr) => line || (idx > 0 && arr[idx - 1]))
          .map((line) => P(line || " "))
      : (safeForm.defects || []).length
      ? (safeForm.defects || []).map((d: any, i: number) => {
          const description = dash(d?.description);
          const suffix = defectNormSuffix(d);
          return new Paragraph({
            children: [
              new TextRun({ text: `${i + 1}. `, size: BODY, font: FONT, color: COL_TEXT }),
              new TextRun({ text: description, size: BODY, font: FONT, color: COL_TEXT }),
              ...(suffix
                ? [new TextRun({ text: ` ${suffix}`, size: BODY, font: FONT, color: COL_TEXT, bold: true })]
                : []),
            ],
            spacing: { after: 60 },
          });
        })
      : [P("—")]),
  ];

  // ---------- 6. ZĂˇvÄ›r ----------
  const safetySummaryLabel = (() => {
    const s = safetyState;
    if (s === "able") return "Revize vyhovuje";
    if (s === "not_able") return "Revize nevyhovuje";
    return "ChybĂ­ informace";
  })();

  const safetyBox = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: "444444" },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "444444" },
      left: { style: BorderStyle.SINGLE, size: 2, color: "444444" },
      right: { style: BorderStyle.SINGLE, size: 2, color: "444444" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { top: 120, bottom: 120, left: 120, right: 120 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: safetySummaryLabel, bold: true, size: 28, font: FONT })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const zav = [
    P("", { after: 300 }),
    P("6. ZĂˇvÄ›r", { bold: true, size: 26 }),
    P(dash(safeForm.conclusion?.text)),
    safetyBox,
    P(`Další revize: ${nextRevisionLabel}`),
  ];

  // ---------- Dokument ----------
  const evid = dash(safeForm.evidencni || revId);
  const uuid = dash(safeForm.uuid);
  const header = makeHeader(evid, uuid);

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
          H("ReviznĂ­ technik", 22),
          techBlock,                 // 2 sloupce, bez rĂˇmeÄŤkĹŻ
          H("RevidovanĂ˝ objekt", 22),
          objektBlock,               // 2 sloupce, bez rĂˇmeÄŤkĹŻ/podbarvenĂ­
          H("VĂ˝sledek revize", 22),
          result,                    // rĂˇmeÄŤek + vÄ›tĹˇĂ­ text + centrovĂˇno
          ...term,
          H("PouĹľitĂ© mÄ›Ĺ™icĂ­ pĹ™Ă­stroje", 22),
          instruments,
          H("RozdÄ›lovnĂ­k", 22),
          P("Provozovatel â€“ 1Ă—"),
          P("ReviznĂ­ technik â€“ 1Ă—"),
          P("...................................................."),
          P("...................................................."),
          P("V ........................................ dne ........................................"),
          P("Podpis provozovatele: ______________________________"),
          P("Podpis reviznĂ­ho technika: _________________________"),
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
