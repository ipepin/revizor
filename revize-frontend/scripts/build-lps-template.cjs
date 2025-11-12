const fs = require("fs");
const path = require("path");
const {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} = require("docx");

const OUTPUT = path.resolve(__dirname, "../public/templates/lps_report.docx");

const labelCell = (text) =>
  new TableCell({
    width: { size: 35, type: WidthType.PERCENTAGE },
    borders: defaultBorders(),
    shading: { type: "clear", color: "auto", fill: "EEEEEE" },
    children: [
      new Paragraph({
        text,
        bold: true,
      }),
    ],
  });

const valueCell = (text) =>
  new TableCell({
    width: { size: 65, type: WidthType.PERCENTAGE },
    borders: defaultBorders(),
    children: [
      new Paragraph({
        text,
      }),
    ],
  });

const fullRow = (label, value) => new TableRow({ children: [labelCell(label), valueCell(value)] });

const smallTable = (headers, values) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map((h) =>
          new TableCell({
            borders: defaultBorders(),
            shading: { type: "clear", color: "auto", fill: "EEEEEE" },
            children: [new Paragraph({ text: h, bold: true })],
          })
        ),
      }),
      new TableRow({
        children: values.map((text) =>
          new TableCell({
            borders: defaultBorders(),
            children: [new Paragraph({ text })],
          })
        ),
      }),
    ],
  });

const heading = (text) =>
  new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 400, after: 200 },
  });

const cardTable = (rows) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) =>
      new TableRow({
        children: [
          new TableCell({
            borders: defaultBorders(),
            shading: { type: "clear", color: "auto", fill: "F4F4F4" },
            children: [new Paragraph({ text: label, bold: true })],
          }),
          new TableCell({
            borders: defaultBorders(),
            children: [new Paragraph({ text: value })],
          }),
        ],
      })
    ),
  });

const defaultBorders = () => ({
  top: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
  left: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
  right: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
});

const coverSection = [
  new Paragraph({
    text: "ZPRÁVA O REVIZI LPS",
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "[[REVISION_TYPE]]", italics: true })],
    spacing: { after: 400 },
  }),
  heading("Identifikace objektu"),
  cardTable([
    ["Objekt / Název", "[[OBJECT_NAME]]"],
    ["Adresa", "[[OBJECT_ADDRESS]]"],
    ["Objednatel", "[[CLIENT_NAME]]"],
    ["Typ objektu", "[[OBJECT_TYPE]]"],
    ["Třída LPS", "[[LPS_CLASS]]"],
    ["SPD ochrana", "[[SPD_PROTECTION_INFO]]"],
  ]),
  heading("Termíny revize"),
  cardTable([
    ["Datum zahájení revize", "[[DATE_START]]"],
    ["Datum ukončení revize", "[[DATE_END]]"],
    ["Datum vyhotovení zprávy", "[[DATE_CREATED]]"],
    ["Příští revize", "[[NEXT_REVISION]]"],
  ]),
  heading("Souhrn"),
  cardTable([
    ["Metoda měření", "[[MEASUREMENT_METHOD]]"],
    ["Rozsah provedených kontrol", "[[REVISION_SCOPE_TEXT]]"],
    ["Celkový posudek", "[[SAFETY_STATUS]]"],
    ["Závěr", "[[CONCLUSION_TEXT]]"],
  ]),
  heading("Použité přístroje"),
  new Paragraph({ text: "[[MEASURING_INSTRUMENTS]]" }),
  heading("Revizní technik"),
  cardTable([
    ["Jméno", "[[TECH_NAME]]"],
    ["Společnost", "[[TECH_COMPANY]]"],
    ["Kontakt", "[[TECH_PHONE]] / [[TECH_EMAIL]]"],
    ["Osvědčení / Oprávnění", "[[TECH_CERTIFICATE]] / [[TECH_AUTHORIZATION]]"],
  ]),
];

const detailSection = [
  heading("Základní údaje"),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      fullRow("Evidenční číslo", "[[EVIDENCE_NUMBER]]"),
      fullRow("Projekt", "[[PROJECT_ID]]"),
      fullRow("Třída LPS", "[[LPS_CLASS]]"),
      fullRow("Datum zahájení revize", "[[DATE_START]]"),
      fullRow("Datum ukončení revize", "[[DATE_END]]"),
      fullRow("Datum vyhotovení zprávy", "[[DATE_CREATED]]"),
      fullRow("Doporučený termín příští revize", "[[NEXT_REVISION]]"),
    ],
  }),
  heading("Objekt a prostředí"),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      fullRow("Objekt / Název", "[[OBJECT_NAME]]"),
      fullRow("Adresa objektu", "[[OBJECT_ADDRESS]]"),
      fullRow("Objednatel", "[[CLIENT_NAME]]"),
      fullRow("IČ", "[[CLIENT_IC]]"),
      fullRow("DIČ", "[[CLIENT_DIC]]"),
      fullRow("Adresa objednatele", "[[CLIENT_ADDRESS]]"),
      fullRow("Typ objektu", "[[OBJECT_TYPE]]"),
      fullRow("Popis objektu", "[[OBJECT_DESCRIPTION]]"),
      fullRow("Předmět revize", "[[ORDER_DESCRIPTION]]"),
      fullRow("Letecká ochrana / jímací soustava", "[[AIR_TERMINATION_TYPE]]"),
      fullRow("Počet svodů", "[[DOWN_CONDUCTORS_COUNT]]"),
      fullRow("Uzemnění", "[[EARTHING_TYPE]]"),
      fullRow("Materiál zemniče", "[[GROUND_MATERIAL]]"),
      fullRow("Střešní konstrukce", "[[ROOF_TYPE]]"),
      fullRow("Krytina", "[[ROOF_COVER]]"),
      fullRow("Charakter půdy", "[[SOIL_TYPE]]"),
      fullRow("Počasí během revize", "[[WEATHER_CONDITIONS]]"),
      fullRow("Provozovatel / zástupce", "[[OPERATOR_NAME]]"),
    ],
  }),
  heading("Revizní technik"),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      fullRow("Jméno", "[[TECH_NAME]]"),
      fullRow("Společnost", "[[TECH_COMPANY]]"),
      fullRow("IČ", "[[TECH_ICO]]"),
      fullRow("DIČ", "[[TECH_DIC]]"),
      fullRow("Adresa", "[[TECH_ADDRESS]]"),
      fullRow("Telefon", "[[TECH_PHONE]]"),
      fullRow("E-mail", "[[TECH_EMAIL]]"),
      fullRow("Osvědčení", "[[TECH_CERTIFICATE]]"),
      fullRow("Oprávnění", "[[TECH_AUTHORIZATION]]"),
    ],
  }),
  heading("Souhrn a závěr"),
  new Paragraph({ text: "SPD ochrana: [[SPD_PROTECTION_INFO]]" }),
  new Paragraph({ text: "Rozsah provedených kontrol: [[REVISION_SCOPE_TEXT]]" }),
  new Paragraph({ text: "Metoda měření: [[MEASUREMENT_METHOD]]" }),
  new Paragraph({ text: "Celkový posudek: [[SAFETY_STATUS]]" }),
  new Paragraph({ text: "Závěr: [[CONCLUSION_TEXT]]" }),
  new Paragraph({ text: "Doplňující poznámka: [[CONCLUSION_NOTE]]" }),
  new Paragraph({ text: "Poznámka ke skice / nákresu: [[SKETCH_NOTE]]" }),
  heading("Nákres LPS"),
  new Paragraph({ text: "[[LPS_SKETCH_IMAGE]]" }),
  heading("Použité přístroje"),
  new Paragraph({ text: "[[MEASURING_INSTRUMENTS]]" }),
  smallTable(
    ["Přístroj", "Sériové číslo", "Kalibrační list", "Poznámka"],
    ["[[INSTRUMENT_NAME]]", "[[INSTRUMENT_MEASUREMENT]]", "[[INSTRUMENT_CAL_LIST]]", "[[INSTRUMENT_NOTE]]"]
  ),
  heading("Měření zemních odporů"),
  new Paragraph({ text: "[[EARTH_MEASUREMENTS]]" }),
  smallTable(
    ["Zemnič", "Hodnota", "Přístroj", "Poznámka"],
    ["[[GROUND_LABEL]]", "[[GROUND_VALUE]]", "[[GROUND_INSTRUMENT]]", "[[GROUND_NOTE]]"]
  ),
  heading("Vizuální kontroly"),
  new Paragraph({ text: "[[VISUAL_CHECKS]]" }),
  smallTable(["Položka", "Stav", "Poznámka"], ["[[VISUAL_ITEM]]", "[[VISUAL_STATE]]", "[[VISUAL_NOTE]]"]),
  heading("Zjištěné závady a doporučení"),
  new Paragraph({ text: "[[DEFECTS]]" }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          labelCell("Popis"),
          labelCell("Norma"),
          labelCell("Článek"),
          labelCell("Místo"),
          labelCell("Priorita"),
          labelCell("Termín"),
          labelCell("Doporučení"),
        ],
      }),
      new TableRow({
        children: [
          valueCell("[[DEFECT_DESCRIPTION]]"),
          valueCell("[[DEFECT_STANDARD]]"),
          valueCell("[[DEFECT_ARTICLE]]"),
          valueCell("[[DEFECT_LOCATION]]"),
          valueCell("[[DEFECT_PRIORITY]]"),
          valueCell("[[DEFECT_DEADLINE]]"),
          valueCell("[[DEFECT_RECOMMENDATION]]"),
        ],
      }),
    ],
  }),
  heading("Distribuce a podpisy"),
  new Paragraph({ text: "Rozdělovník: [[DISTRIBUTION_LIST]]" }),
  new Paragraph({ text: "Místo: [[SIGNATURE_CITY]]" }),
  new Paragraph({ text: "Datum: [[SIGNATURE_DATE]]" }),
  new Paragraph({ text: "Podpis provozovatele: [[OPERATOR_NAME]]" }),
  new Paragraph({ text: "Podpis revizního technika: [[TECH_NAME]]" }),
];

const doc = new Document({
  creator: "Revize WEB",
  title: "Zpráva o revizi LPS",
  description: "Automaticky generovaná šablona pro výstup revize LPS",
  sections: [
    {
      properties: {},
      children: coverSection,
    },
    {
      properties: {},
      children: [new Paragraph({ children: [], pageBreakBefore: true }), ...detailSection],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(OUTPUT, buffer);
  console.log("LPS template written to", OUTPUT);
});
