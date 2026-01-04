import { BorderStyle, Document, ImageRun, Paragraph, Packer, Table, TableCell, TableRow, TextRun, WidthType } from "docx";

const EMU_PER_PIXEL = 9525;
const MAX_IMAGE_WIDTH_PX = 650;
const COLOR_TEXT = "0F172A";
const COLOR_MUTED = "475569";
const COLOR_BORDER = "E2E8F0";
const COLOR_HEADER = "F8FAFC";
const COLOR_STRIPE = "F1F5F9";
const CELL_PADDING = { top: 120, bottom: 120, left: 120, right: 120 };

export async function buildLpsWordBlob(form: any, sketchBytes?: Uint8Array, sketchSize?: { width: number; height: number }) {
  const safe = form || {};
  const lps = safe.lps || {};

  const measuringInstruments: any[] = Array.isArray(safe.measuringInstruments) ? safe.measuringInstruments : [];
  const earth: any[] = Array.isArray(lps.earthResistance) ? lps.earthResistance : [];
  const continuity: any[] = Array.isArray(lps.continuity) ? lps.continuity : [];
  const spd: any[] = Array.isArray(lps.spdTests) ? lps.spdTests : [];
  const visual: any[] = Array.isArray(lps.visualChecks) ? lps.visualChecks : [];
  const defects: any[] = Array.isArray(safe.defects) ? safe.defects : [];

  const scopeChecks: string[] = Array.isArray(lps.scopeChecks) ? lps.scopeChecks : [];
  const scopeLabels: Record<string, string> = {
    vnejsi: "Vnejsi ochrana pred bleskem",
    vnitrni: "Vnitrni ochrana pred bleskem",
    uzemneni: "Uzemneni",
    pospojovani: "Ekvipotencialni pospojovani",
    spd: "SPD / prepjetova ochrana",
  };

  const children: (Paragraph | Table)[] = [
    headerBlock(safe, lps),
    spacer(160),
    sectionHeading("Identifikace objektu"),
    infoGrid([
      ["Revidovany objekt", dash(safe.objekt)],
      ["Adresa objektu", dash(safe.adresa)],
      ["Objednatel revize", dash(safe.objednatel)],
      ["Majitel / provozovatel", dash(lps.owner)],
      ["Projekt zpracoval", dash(lps.projectBy)],
      ["Cislo projektu", dash(lps.projectNo)],
    ]),
    spacer(140),
    sectionHeading("Identifikace revizniho technika"),
    infoGrid([
      ["Revizni technik", dash(safe.technicianName)],
      ["Firma", dash(safe.technicianCompanyName)],
      ["Ev. c. osvedceni", dash(safe.technicianCertificateNumber)],
      ["Ev. c. opravneni", dash(safe.technicianAuthorizationNumber)],
      ["ICO / DIC", `${dash(safe.technicianCompanyIco)} / ${dash(safe.technicianCompanyDic)}`],
      ["Kontakt", dash(safe.technicianPhone || safe.technicianEmail || safe.technicianCompanyAddress)],
      ["Adresa", dash(safe.technicianCompanyAddress)],
    ]),
    spacer(140),
    sectionHeading("Pouzite merici pristroje"),
    styledTable(
      ["Pristroj", "Vyrobni cislo", "Kalibracni list"],
      measuringInstruments.map((inst) => [
        dash(inst?.name || inst?.measurement_text),
        dash(inst?.serial || inst?.measurement_text || inst?.serial_no || inst?.sn),
        dash(inst?.calibration_code || inst?.calibration_list || inst?.calibration),
      ]),
      "Nejsou uvedeny zadne pristroje."
    ),
    spacer(140),
    sectionHeading("Normy, rozsah a zakladni udaje"),
    infoGrid([
      ["Primarni norma", formatStandardName(lps.standard)],
      ["Trida LPS", dash(lps.class)],
      ["SPD ochrana", spdProtection(lps.spdProtectionUsed)],
      ["Typ strechy", dash(lps.roofTypeOther || lps.roofType)],
      ["Stresni krytina", dash(lps.roofCoverOther || lps.roofCover)],
      ["Pocet svodu", dash(lps.downConductorsCountOther || lps.downConductorsCount)],
    ]),
    new Paragraph({
      style: "Muted",
      children: [
        new TextRun({ text: "Rozsah revize: ", bold: true }),
        new TextRun(scopeChecks.length ? scopeChecks.map((key) => scopeLabels[key] || key).join(" | ") : "Neuvedeno"),
      ],
      spacing: { before: 60, after: 160 },
    }),
    sectionHeading("Popis objektu a poznamky"),
    cardParagraph(lps.reportText || safe.extraNotes || "-"),
    spacer(140),
    sectionHeading("Merani zemnich odporu"),
    styledTable(
      ["Zemnic", "Odpor [Ohm]", "Poznamka"],
      earth.map((row, idx) => [dash(row?.label || `Zemnic ${idx + 1}`), row?.valueOhm ? `${row.valueOhm} Ohm` : "-", dash(row?.note)]),
      "Zaznam o mereni neni k dispozici."
    ),
  ];

  if (continuity.length) {
    children.push(spacer(120));
    children.push(sectionHeading("Kontinuita svodu"));
    children.push(
      styledTable(
        ["Svod", "Hodnota [mOhm]", "Poznamka"],
        continuity.map((row, idx) => [
          dash(row?.conductor || row?.label || `Svod ${idx + 1}`),
          row?.valueMilliOhm ? `${row.valueMilliOhm} mOhm` : dash(row?.value),
          dash(row?.note),
        ]),
        "Kontrola kontinuity nebyla zadana."
      )
    );
  }

  if (spd.length) {
    children.push(spacer(120));
    children.push(sectionHeading("SPD / prepjetova ochrana"));
    children.push(
      styledTable(
        ["Misto", "Typ", "Vysledek", "Poznamka"],
        spd.map((row, idx) => [dash(row?.location || `Stanoviste ${idx + 1}`), dash(row?.type), dash(row?.result), dash(row?.note)]),
        "Bez zaznamu o SPD."
      )
    );
  }

  if (visual.length) {
    children.push(spacer(120));
    children.push(sectionHeading("Vizualni kontrola"));
    children.push(
      styledTable(
        ["Polozka", "Stav", "Poznamka"],
        visual.map((row, idx) => [dash(row?.text || `Kontrola ${idx + 1}`), row?.ok ? "Vyhovuje" : "Nevyhovuje", dash(row?.note)]),
        "Nebyla zadana zadna kontrola."
      )
    );
  }

  if (defects.length) {
    children.push(spacer(120));
    children.push(sectionHeading("Zjistene zavady"));
    children.push(
      styledTable(
        ["Popis", "Norma / cl.", "Doporucene opatreni"],
        defects.map((row) => [
          dash(row?.description),
          dash(row?.standard && row?.article ? `${row.standard} / ${row.article}` : row?.standard || row?.article),
          dash(row?.recommendation || row?.remedy),
        ]),
        "Nebyla zadana zadna zavada."
      )
    );
  }

  children.push(spacer(140));
  children.push(sectionHeading("Celkovy posudek"));
  children.push(cardParagraph(dash(safe.conclusion?.text || lps.reportText)));
  children.push(
    infoGrid([
      ["Doporuceny termin pristi revize", formatDate(safe.conclusion?.validUntil || lps.nextRevision)],
      ["Rozdelovnik", dash(lps.distributionList || "Provozovatel 2x, Revizni technik 1x")],
    ])
  );

  children.push(spacer(140));
  children.push(sectionHeading("Nakres LPS"));
  children.push(
    sketchBytes
      ? new Paragraph({
          children: [new ImageRun({ data: sketchBytes, transformation: calculateTransformation(sketchSize) })],
          spacing: { after: 200 },
        })
      : cardParagraph("Skica LPS neni k dispozici.")
  );

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
    sections: [{ properties: {}, children }],
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
              new Paragraph({ text: "Zprava o revizi LPS", style: "Title" }),
              new Paragraph({
                style: "Subtitle",
                children: [new TextRun({ text: `Typ revize: ${dash(safe.typRevize)}`, italics: true })],
              }),
            ],
          }),
          new TableCell({
            borders: noCellBorders(),
            children: [
              new Paragraph({ text: "Evidencni cislo", style: "Muted" }),
              new Paragraph({ children: [new TextRun({ text: dash(safe.evidencni || lps.projectNo), bold: true, size: 32 })] }),
              new Paragraph({ text: `Zahajeni: ${formatDate(safe.date_start)}`, style: "Muted" }),
              new Paragraph({ text: `Dokonceni: ${formatDate(safe.date_end)}`, style: "Muted" }),
              new Paragraph({ text: `Vyhotoveno: ${formatDate(safe.date_created)}`, style: "Muted" }),
            ],
          }),
        ],
      }),
    ],
  });
}

function infoGrid(rows: Array<[string, string]>) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            shading: { fill: COLOR_HEADER },
            borders: tableBorders(),
            margins: CELL_PADDING,
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, color: COLOR_MUTED })] })],
          }),
          new TableCell({
            width: { size: 65, type: WidthType.PERCENTAGE },
            borders: tableBorders(),
            margins: CELL_PADDING,
            children: [new Paragraph({ text: valueOrDash(value) })],
          }),
        ],
      })
    ),
  });
}

function styledTable(headers: string[], rows: string[][], emptyText: string) {
  const headerRow = new TableRow({
    children: headers.map((header) =>
      new TableCell({
        shading: { fill: COLOR_HEADER },
        borders: tableBorders(),
        margins: CELL_PADDING,
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
                borders: tableBorders(),
                margins: CELL_PADDING,
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
                borders: tableBorders(),
                margins: CELL_PADDING,
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

function cardParagraph(text: string) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: tableBorders(),
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
  if (normalized.includes("62305")) return "CSN EN 62305-3 ed.2";
  if (normalized.includes("341390")) return "CSN 34 1390";
  return value;
}

function spdProtection(value?: string) {
  if (value === "yes") return "Je pouzita";
  if (value === "no") return "Neni pouzita";
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
      const heightPx = widthPx * ratio;
      resolve({ width: widthPx, height: heightPx });
    };
    img.onerror = () => resolve(undefined);
    img.src = dataUrl;
  });
}

function calculateTransformation(size?: { width: number; height: number }) {
  if (!size) return { width: MAX_IMAGE_WIDTH_PX, height: MAX_IMAGE_WIDTH_PX * 0.6 };
  return { width: size.width, height: size.height };
}
