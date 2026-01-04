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

const doc = new Document({
  creator: "Revize WEB",
  title: "Zpráva o revizi LPS",
  description: "Automaticky generovaná šablona pro výstup revize LPS",
  sections: [
    {
      properties: {},
      children: [
        new Paragraph({
          text: "ZPRÁVA O REVIZI LPS",
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 },
          children: [new TextRun({ text: "[[REVISION_TYPE]]", italics: true })],
        }),
        heading("Identifikace objektu"),
        cardTable([
          ["Objekt / název", "[[OBJECT_NAME]]"],
          ["Adresa", "[[OBJECT_ADDRESS]]"],
          ["Popis objektu", "[[OBJECT_DESCRIPTION]]"],
          ["Objednatel", "[[CLIENT_NAME]]"],
          ["Typ objektu", "[[OBJECT_TYPE]]"],
          ["Předmět revize", "[[ORDER_DESCRIPTION]]"],
        ]),
        heading("Termíny revize"),
        cardTable([
          ["Datum zahájení", "[[DATE_START]]"],
          ["Datum ukončení", "[[DATE_END]]"],
          ["Datum vyhotovení", "[[DATE_CREATED]]"],
          ["Doporučená příští revize", "[[NEXT_REVISION]]"],
        ]),
        heading("Souhrn"),
        cardTable([
          ["Třída LPS", "[[LPS_CLASS]]"],
          ["SPD ochrana", "[[SPD_PROTECTION_INFO]]"],
          ["Rozsah provedených kontrol", "[[REVISION_SCOPE_TEXT]]"],
          ["Metoda měření", "[[MEASUREMENT_METHOD]]"],
          ["Celkový posudek", "[[SAFETY_STATUS]]"],
          ["Závěr", "[[CONCLUSION_TEXT]]"],
        ]),
        heading("Identifikace objednatele"),
        cardTable([
          ["Objednatel", "[[CLIENT_NAME]]"],
          ["Adresa", "[[CLIENT_ADDRESS]]"],
          ["IČ / DIČ", "[[CLIENT_IC]] / [[CLIENT_DIC]]"],
          ["Zástupce / provozovatel", "[[OPERATOR_NAME]]"],
        ]),
        heading("Revizní technik"),
        cardTable([
          ["Jméno", "[[TECH_NAME]]"],
          ["Společnost", "[[TECH_COMPANY]]"],
          ["Kontakt", "[[TECH_PHONE]] / [[TECH_EMAIL]]"],
          ["IČ / DIČ", "[[TECH_ICO]] / [[TECH_DIC]]"],
          ["Adresa", "[[TECH_ADDRESS]]"],
          ["Osvědčení", "[[TECH_CERTIFICATE]]"],
          ["Oprávnění", "[[TECH_AUTHORIZATION]]"],
        ]),
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
        heading("Nákres LPS"),
        new Paragraph({ text: "[[LPS_SKETCH_IMAGE]]" }),
        heading("Distribuce a podpisy"),
        new Paragraph({ text: "Rozdělovník: [[DISTRIBUTION_LIST]]" }),
        new Paragraph({ text: "Místo: [[SIGNATURE_CITY]]" }),
        new Paragraph({ text: "Datum: [[SIGNATURE_DATE]]" }),
        new Paragraph({ text: "Podpis provozovatele: [[OPERATOR_NAME]]" }),
        new Paragraph({ text: "Podpis revizního technika: [[TECH_NAME]]" }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(OUTPUT, buffer);
  console.log("LPS template written to", OUTPUT);
});
