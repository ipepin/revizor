import {
  AlignmentType,
  BorderStyle,
  Document,
  Header,
  ImageRun,
  PageNumber,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TabStopType,
  TextRun,
  WidthType,
} from "docx";

const EMU_PER_PIXEL = 9525;
const MAX_IMAGE_WIDTH_PX = 750;
const MAX_IMAGE_HEIGHT_PX = 520;
const COLOR_TEXT = "0F172A";
const COLOR_MUTED = "475569";
const COLOR_BORDER = "E2E8F0";
const COLOR_HEADER = "F8FAFC";
const COLOR_STRIPE = "F1F5F9";
const CELL_PADDING = { top: 120, bottom: 120, left: 120, right: 120 };
const SMALL_PADDING = { top: 80, bottom: 80, left: 90, right: 90 };
const EARTH_PADDING = { top: 60, bottom: 60, left: 80, right: 80 };

export async function buildLpsWordBlob(form: any, sketchBytes?: Uint8Array, sketchSize?: { width: number; height: number }) {
  const safe = form || {};
  const lps = safe.lps || {};

  const measuringInstruments: any[] = Array.isArray(safe.measuringInstruments) ? safe.measuringInstruments : [];
  const earth: any[] = Array.isArray(lps.earthResistance) ? lps.earthResistance : [];
  const continuity: any[] = Array.isArray(lps.continuity) ? lps.continuity : [];
  const spd: any[] = Array.isArray(lps.spdTests) ? lps.spdTests : [];
  const visual: any[] = Array.isArray(lps.visualChecks) ? lps.visualChecks : [];

  const scopeChecks: string[] = Array.isArray(lps.scopeChecks) ? lps.scopeChecks : [];
  const scopeLabels: Record<string, string> = {
    vnejsi: "Vnější ochrana před bleskem",
    vnitrni: "Vnitřní ochrana před bleskem",
    uzemneni: "Uzemnění",
    pospojovani: "Ekvipotenciální pospojování",
    spd: "SPD / přepěťová ochrana",
  };

  const children: Paragraph[] | (Paragraph | Table)[] = [
    headerBlock(safe, lps),
    spacer(60),
    sectionHeading("Identifikace objektu"),
    ...twoColumnRows(
      [
        ["Revidovaný objekt", dash(safe.objekt)],
        ["Adresa objektu", dash(safe.adresa)],
        ["Objednatel revize", dash(safe.objednatel)],
        ["Majitel / provozovatel", dash(lps.owner)],
        ["Projekt zpracoval", dash(lps.projectBy)],
        ["Číslo projektu", dash(lps.projectNo)],
      ],
      SMALL_PADDING
    ),
    spacer(60),
    sectionHeading("Identifikace revizního technika"),
    ...twoColumnRows(
      [
        ["Revizní technik", dash(safe.technicianName)],
        ["Firma", dash(safe.technicianCompanyName)],
        ["Ev. č. osvědčení", dash(safe.technicianCertificateNumber)],
        ["Ev. č. oprávnění", dash(safe.technicianAuthorizationNumber)],
        ["IČO / DIČ", `${dash(safe.technicianCompanyIco)} / ${dash(safe.technicianCompanyDic)}`],
        ["Kontakt", dash(safe.technicianPhone || safe.technicianEmail || safe.technicianCompanyAddress)],
        ["Adresa", dash(safe.technicianCompanyAddress)],
      ],
      SMALL_PADDING
    ),
    spacer(120),
    sectionHeading("Použité měřicí přístroje"),
    styledTable(
      ["Přístroj", "Výrobní číslo", "Kalibrační list"],
      measuringInstruments.map((inst) => [
        dash(inst?.name || inst?.measurement_text),
        dash(inst?.serial || inst?.measurement_text || inst?.serial_no || inst?.sn),
        dash(inst?.calibration_code || inst?.calibration_list || inst?.calibration),
      ]),
      "Nejsou uvedeny žádné přístroje.",
      true,
      SMALL_PADDING
    ),
    spacer(120),
    sectionHeading("Celkový posudek"),
    cardParagraph(safetyAssessment(safe), true),
    spacer(80),
    sectionHeading("Rozdělovník a podpisy"),
    cardParagraph(`Rozdělovník: ${dash(lps.distributionList || "Provozovatel 2x, Revizní technik 1x")}`, true),
    spacer(40),
    signatureBlock(safe, lps),
    spacer(120),
    sectionHeading("Normy, rozsah a základní údaje"),
    infoGrid([
      ["Primární norma", formatStandardName(lps.standard)],
      ["Třída LPS", dash(lps.class)],
      ["SPD ochrana", spdProtection(lps.spdProtectionUsed)],
      ["Typ střechy", dash(lps.roofTypeOther || lps.roofType)],
      ["Střešní krytina", dash(lps.roofCoverOther || lps.roofCover)],
      ["Počet svodů", dash(lps.downConductorsCountOther || lps.downConductorsCount)],
    ]),
    new Paragraph({
      style: "Muted",
      children: [
        new TextRun({ text: "Rozsah revize: ", bold: true }),
        new TextRun(scopeChecks.length ? scopeChecks.map((key) => scopeLabels[key] || key).join(" | ") : "Neuvedeno"),
      ],
      spacing: { before: 60, after: 160 },
    }),
    sectionHeading("Popis objektu a poznámky"),
    cardParagraph(lps.reportText || safe.extraNotes || "-"),
    spacer(120),
    sectionHeading("Měření zemních odporů"),
    styledTable(
      ["Zemnič", "Odpor [Ω]", "Poznámka"],
      earth.map((row, idx) => [dash(row?.label || `Zemnič ${idx + 1}`), row?.valueOhm ? `${row.valueOhm} Ω` : "-", dash(row?.note)]),
      "Záznam o měření není k dispozici.",
      true,
      EARTH_PADDING
    ),
  ];

  if (continuity.length) {
    children.push(spacer(120));
    children.push(sectionHeading("Kontinuita svodů"));
    children.push(
      styledTable(
        ["Svod", "Hodnota [mΩ]", "Poznámka"],
        continuity.map((row, idx) => [
          dash(row?.conductor || row?.label || `Svod ${idx + 1}`),
          row?.valueMilliOhm ? `${row.valueMilliOhm} mΩ` : dash(row?.value),
          dash(row?.note),
        ]),
        "Kontrola kontinuity nebyla zadána."
      )
    );
  }

  if (spd.length) {
    children.push(spacer(120));
    children.push(sectionHeading("SPD / přepěťová ochrana"));
    children.push(
      styledTable(
        ["Místo", "Typ", "Výsledek", "Poznámka"],
        spd.map((row, idx) => [dash(row?.location || `Stanoviště ${idx + 1}`), dash(row?.type), dash(row?.result), dash(row?.note)]),
        "Bez záznamu o SPD."
      )
    );
  }

  if (visual.length) {
    children.push(spacer(120));
    children.push(sectionHeading("Vizuální kontrola"));
    children.push(
      styledTable(
        ["Položka", "Stav", "Poznámka"],
        visual.map((row, idx) => [dash(row?.text || `Kontrola ${idx + 1}`), row?.ok ? "Vyhovuje" : "Nevyhovuje", dash(row?.note)]),
        "Nebyla zadána žádná kontrola."
      )
    );
  }

  children.push(spacer(140));
  children.push(sectionHeading("Nákres LPS"));
  children.push(
    sketchBytes
      ? new Paragraph({
          children: [new ImageRun({ data: sketchBytes, transformation: calculateTransformation(sketchSize) })],
          spacing: { after: 200 },
        })
      : cardParagraph("Skica LPS není k dispozici.")
  );

  children.push(spacer(120));
  children.push(sectionHeading("Zjištěné závady"));
  children.push(
    styledTable(
      ["Popis", "Norma / čl.", "Doporučené opatření"],
      [],
      "Data pro závady nejsou zatím v editoru k dispozici.",
      false,
      SMALL_PADDING
    )
  );

  children.push(spacer(120));
  children.push(sectionHeading("Závěr"));
  children.push(cardParagraph(dash(safe.conclusion?.text || lps.reportText)));

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22, color: COLOR_TEXT },
          paragraph: { spacing: { after: 120 } },
        },
      },
      paragraphStyles: [
        {
          id: "Title",
          basedOn: "Normal",
          quickFormat: true,
          run: { size: 40, bold: true, color: COLOR_TEXT },
          paragraph: { spacing: { after: 120 } },
        },
        {
          id: "Subtitle",
          basedOn: "Normal",
          quickFormat: true,
          run: { size: 20, color: COLOR_MUTED },
          paragraph: { spacing: { after: 80 } },
        },
        {
          id: "SectionHeading",
          basedOn: "Normal",
          quickFormat: true,
          run: { size: 28, bold: true, color: COLOR_TEXT },
          paragraph: { spacing: { before: 220, after: 120 } },
        },
        {
          id: "Muted",
          basedOn: "Normal",
          quickFormat: true,
          run: { color: COLOR_MUTED },
        },
        {
          id: "TableHeader",
          basedOn: "Normal",
          quickFormat: true,
          run: { size: 20, bold: true, color: COLOR_MUTED },
          paragraph: { spacing: { after: 0 } },
        },
      ],
    },
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `Evidenční číslo: ${dash(safe.evidencni || lps.projectNo)}`, bold: true }),
                  new TextRun({ text: "    Strana " }),
                  PageNumber.CURRENT,
                  new TextRun({ text: " / " }),
                  PageNumber.TOTAL_PAGES,
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

function spacer(after: number) {
  return new Paragraph({ text: "", spacing: { after } });
}

function sectionHeading(text: string) {
  return new Paragraph({ text, style: "SectionHeading" });
}

function headerBlock(safe: any, lps: any) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noTableBorders(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noCellBorders(),
            children: [
              new Paragraph({ text: "Zpráva o revizi LPS", style: "Title", alignment: AlignmentType.CENTER }),
              new Paragraph({
                style: "Subtitle",
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `Typ revize: ${dash(safe.typRevize)}`, italics: true })],
              }),
              new Paragraph({
                style: "Muted",
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `Zahájení: ${formatDate(safe.date_start)}` }),
                  new TextRun({ text: "   " }),
                  new TextRun({ text: `Dokončení: ${formatDate(safe.date_end)}` }),
                  new TextRun({ text: "   " }),
                  new TextRun({ text: `Vyhotoveno: ${formatDate(safe.date_created)}` }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function infoGrid(rows: Array<[string, string]>, padding = CELL_PADDING) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_HEADER },
            borders: noCellBorders(),
            margins: padding,
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, color: COLOR_MUTED })] })],
          }),
          new TableCell({
            width: { size: 65, type: WidthType.PERCENTAGE },
            borders: noCellBorders(),
            margins: padding,
            children: [new Paragraph({ text: valueOrDash(value) })],
          }),
        ],
      })
    ),
  });
}

function styledTable(headers: string[], rows: string[][], emptyText: string, withBorders = false, padding = CELL_PADDING) {
  const headerRow = new TableRow({
    children: headers.map((header) =>
      new TableCell({
        shading: { fill: COLOR_HEADER },
        borders: withBorders ? tableBorders() : noCellBorders(),
        margins: padding,
        children: [new Paragraph({ text: header, style: "TableHeader" })],
      })
    ),
  });

  const bodyRows =
    rows.length === 0
      ? [
          new TableRow({
            children: [
              new TableCell({
                columnSpan: headers.length,
                borders: withBorders ? tableBorders() : noCellBorders(),
                margins: padding,
                children: [new Paragraph({ text: emptyText, style: "Muted" })],
              }),
            ],
          }),
        ]
      : rows.map((row, idx) =>
          new TableRow({
            children: row.map((cell) =>
              new TableCell({
                shading: idx % 2 === 1 ? { fill: COLOR_STRIPE } : undefined,
                borders: withBorders ? tableBorders() : noCellBorders(),
                margins: padding,
                children: [new Paragraph({ text: valueOrDash(cell) })],
              })
            ),
          })
        );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  });
}

function cardParagraph(text: string, withBorder = false) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: withBorder ? tableBorders() : noCellBorders(),
            margins: { top: 180, bottom: 180, left: 180, right: 180 },
            shading: { fill: "FFFFFF" },
            children: [new Paragraph({ text: dash(text) })],
          }),
        ],
      }),
    ],
  });
}

function tableBorders() {
  return {
    top: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
    left: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
    right: { style: BorderStyle.SINGLE, size: 4, color: COLOR_BORDER },
  };
}

function noCellBorders() {
  return {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
  };
}

function noTableBorders() {
  return {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
    insideHorizontal: { style: BorderStyle.NONE },
    insideVertical: { style: BorderStyle.NONE },
  };
}

function dash(value: any) {
  if (value === 0) return "0";
  if (!value) return "-";
  const str = String(value).trim();
  return str.length > 0 ? str : "-";
}

function valueOrDash(value: any) {
  if (value === 0) return "0";
  if (!value) return "-";
  const str = String(value).trim();
  return str.length > 0 ? str : "-";
}

function formatDate(value?: string) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  if (year && month && day) return `${day}.${month}.${year}`;
  return value;
}

function formatStandardName(value?: string) {
  const normalized = (value || "").toLowerCase();
  if (!normalized) return "-";
  if (normalized.includes("62305")) return "ČSN EN 62305-3 ed.2";
  if (normalized.includes("341390")) return "ČSN 34 1390";
  return value;
}

function spdProtection(value?: string) {
  if (value === "yes") return "Je použita";
  if (value === "no") return "Není použita";
  return dash(value);
}

export function dataUrlToBytes(dataUrl?: string): Uint8Array | undefined {
  if (!dataUrl) return undefined;
  const match = dataUrl.match(/^data:image\/[a-zA-Z0-9+]+;base64,(.+)$/);
  if (!match) return undefined;
  const base64 = match[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function getSketchSize(dataUrl?: string) {
  if (!dataUrl || typeof Image === "undefined") return Promise.resolve(undefined);
  return new Promise<{ width: number; height: number } | undefined>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = img.naturalHeight / img.naturalWidth || 0.7;
      const widthPx = Math.min(img.naturalWidth, MAX_IMAGE_WIDTH_PX);
      const heightPx = Math.min(widthPx * ratio, MAX_IMAGE_HEIGHT_PX);
      resolve({ width: widthPx, height: heightPx });
    };
    img.onerror = () => resolve(undefined);
    img.src = dataUrl;
  });
}

function calculateTransformation(size?: { width: number; height: number }) {
  if (!size) return { width: MAX_IMAGE_WIDTH_PX, height: Math.min(MAX_IMAGE_WIDTH_PX * 0.6, MAX_IMAGE_HEIGHT_PX) };
  const width = Math.min(size.width, MAX_IMAGE_WIDTH_PX);
  const height = Math.min(size.height, MAX_IMAGE_HEIGHT_PX);
  return { width, height };
}

function safetyAssessment(safe: any) {
  const safety = safe?.conclusion?.safety;
  if (safety === "able") return "Elektrická instalace je z hlediska bezpečnosti schopna provozu";
  if (safety === "not_able") return "Elektrická instalace není z hlediska bezpečnosti schopna provozu";
  return dash(safety || safe?.conclusion?.safetyText);
}

function twoColumnRows(rows: Array<[string, string]>, padding = CELL_PADDING) {
  const tabStops = [
    { type: TabStopType.LEFT, position: 4500 },
    { type: TabStopType.LEFT, position: 9000 },
  ];
  const paragraphs: Paragraph[] = [];
  for (let i = 0; i < rows.length; i += 2) {
    const pair = rows.slice(i, i + 2);
    const children: TextRun[] = [];
    if (pair[0]) {
      children.push(new TextRun({ text: `${pair[0][0]}: `, bold: true, color: COLOR_MUTED }));
      children.push(new TextRun({ text: valueOrDash(pair[0][1]) }));
    }
    if (pair[1]) {
      children.push(new TextRun({ text: "\t" }));
      children.push(new TextRun({ text: `${pair[1][0]}: `, bold: true, color: COLOR_MUTED }));
      children.push(new TextRun({ text: valueOrDash(pair[1][1]) }));
    }
    paragraphs.push(
      new Paragraph({
        tabStops,
        children,
        spacing: { after: 60 },
        leftTabStop: 4500,
        margins: padding,
      })
    );
  }
  return paragraphs;
}

function signatureBlock(safe: any, lps: any) {
  const city = dash(lps.signatureCity || safe.signatureCity);
  const date = formatDate(safe.date_created);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noTableBorders(),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noCellBorders(),
            children: [
              new Paragraph({ text: `V ${city} dne ${date}`, spacing: { after: 80 } }),
              new Paragraph({ text: "Podpis provozovatele:", spacing: { after: 20 } }),
              new Paragraph({ text: "______________________________", spacing: { after: 60 } }),
            ],
          }),
          new TableCell({
            borders: noCellBorders(),
            children: [
              new Paragraph({ text: "", spacing: { after: 80 } }),
              new Paragraph({ text: "Podpis revizního technika:", spacing: { after: 20 } }),
              new Paragraph({ text: "______________________________", spacing: { after: 60 } }),
              new Paragraph({ text: "Razítko:", spacing: { after: 20 } }),
              new Paragraph({ text: "○", spacing: { after: 60 }, alignment: AlignmentType.CENTER }),
            ],
          }),
        ],
      }),
    ],
  });
}
