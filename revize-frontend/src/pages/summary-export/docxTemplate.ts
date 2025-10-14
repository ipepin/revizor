// src/pages/summary-export/docxTemplate.ts
import { saveAs } from "file-saver";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { Document as DocxDoc, Packer, Paragraph, HeadingLevel, TextRun } from "docx";

import { dash } from "../summary-utils/text";
import { normalizeComponents, depthPrefix, buildComponentLine } from "../summary-utils/board";

/* ============================
   Typy
============================ */

type GenArgs = {
  safeForm: any;
  technician: any;
  normsAll: string[];
  usedInstruments: Array<{ id: string; name: string; serial: string; calibration: string }>;
  revId?: string | undefined;
};

type TemplateData = ReturnType<typeof buildTemplateData>;

/* ============================
   Veřejná API
============================ */

/**
 * 1) Načti DOCX šablonu z URL a naplň ji daty.
 */
export async function generateRzFromTemplateUrl(
  templateUrl: string,
  args: GenArgs,
  outFileName?: string
) {
  const ab = await fetchArrayBuffer(templateUrl);
  await generateRzFromTemplateArrayBuffer(ab, args, outFileName);
}

/**
 * 2) Máš ArrayBuffer šablony (např. z File inputu)? Použij tohle.
 */
export async function generateRzFromTemplateArrayBuffer(
  templateArrayBuffer: ArrayBuffer,
  { safeForm, technician, normsAll, usedInstruments, revId }: GenArgs,
  outFileName?: string
) {
  const data = buildTemplateData({ safeForm, technician, normsAll, usedInstruments, revId });
  const blob = renderDocx(templateArrayBuffer, data);
  const fileId = String(safeForm?.evidencni || revId || "vystup");
  saveAs(blob, outFileName || `revizni_zprava_${fileId}.docx`);
}

/**
 * 3) Vytvoř „startovací“ šablonu s placeholdery (pro rychlý test).
 *    -> soubor si pak můžeš otevřít ve Wordu a dál upravovat vzhled.
 */
export async function downloadStarterTemplate(placeholdersTitle = "RZ Šablona – placeholdery") {
  const doc = new DocxDoc({
    sections: [
      {
        children: [
          new Paragraph({ text: placeholdersTitle, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: "Evidenční číslo: {{EVIDENCNI}}" }),
          new Paragraph({ text: "Typ revize: {{TYP_REVIZE}}" }),
          new Paragraph({ text: "Normy: {{NORMY_TEXT}}" }),

          new Paragraph({ text: "" }),
          new Paragraph({ text: "Revizní technik", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: "Jméno: {{TECH.JMENO}}" }),
          new Paragraph({ text: "Firma: {{TECH.FIRMA}}" }),
          new Paragraph({ text: "Osvědčení: {{TECH.OSVEDCENI}}" }),
          new Paragraph({ text: "Oprávnění: {{TECH.OPRAVNENI}}" }),
          new Paragraph({ text: "IČO: {{TECH.ICO}}" }),
          new Paragraph({ text: "DIČ: {{TECH.DIC}}" }),
          new Paragraph({ text: "Adresa: {{TECH.ADRESA}}" }),
          new Paragraph({ text: "Telefon: {{TECH.PHONE}}" }),
          new Paragraph({ text: "E-mail: {{TECH.EMAIL}}" }),

          new Paragraph({ text: "" }),
          new Paragraph({ text: "Revidovaný objekt", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: "Adresa: {{OBJEKT.ADRESA}}" }),
          new Paragraph({ text: "Předmět: {{OBJEKT.PREDMET}}" }),
          new Paragraph({ text: "Objednatel: {{OBJEKT.OBJEDNATEL}}" }),

          new Paragraph({ text: "" }),
          new Paragraph({ text: "Výsledek revize", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({
            children: [new TextRun({ text: "{{VYSLEDEK}}", bold: true })],
          }),
          new Paragraph({ text: "Další revize: {{DALSÍ_REVIZE}}" }),

          new Paragraph({ text: "" }),
          new Paragraph({ text: "Přístroje", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: "Jméno | S/N | Kalibrační list" }),
          new Paragraph({ text: "{{#INSTRUMENTS}}" }),
          new Paragraph({ text: "{{name}} | {{serial}} | {{calibration}}" }),
          new Paragraph({ text: "{{/INSTRUMENTS}}" }),
          new Paragraph({ text: "{{^INSTRUMENTS}}—{{/INSTRUMENTS}}" }),

          new Paragraph({ text: "" }),
          new Paragraph({ text: "Zkoušky", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: "{{#TESTS}}" }),
          new Paragraph({ text: "{{name}} — {{note}}" }),
          new Paragraph({ text: "{{/TESTS}}" }),
          new Paragraph({ text: "{{^TESTS}}—{{/TESTS}}" }),

          new Paragraph({ text: "" }),
          new Paragraph({ text: "Rozvaděče", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: "{{#BOARDS}}" }),
          new Paragraph({ text: "Rozvaděč: {{name}}" }),
          new Paragraph({ text: "{{details}}" }),
          new Paragraph({ text: "Komponenty:" }),
          new Paragraph({ text: "{{#COMPONENTS}}" }),
          new Paragraph({ text: "{{prefix}}{{name}} – {{line}}" }),
          new Paragraph({ text: "{{/COMPONENTS}}" }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "{{/BOARDS}}" }),
          new Paragraph({ text: "{{^BOARDS}}—{{/BOARDS}}" }),

          new Paragraph({ text: "" }),
          new Paragraph({ text: "Místnosti", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: "{{#ROOMS}}" }),
          new Paragraph({ text: "Místnost: {{name}}" }),
          new Paragraph({ text: "{{details}}" }),
          new Paragraph({ text: "Zařízení:" }),
          new Paragraph({ text: "{{#DEVICES}}" }),
          new Paragraph({ text: "{{typ}} | {{pocet}} | {{dimenze}} | {{riso}} | {{ochrana}} | {{poznamka}}" }),
          new Paragraph({ text: "{{/DEVICES}}" }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "{{/ROOMS}}" }),
          new Paragraph({ text: "{{^ROOMS}}—{{/ROOMS}}" }),

          new Paragraph({ text: "" }),
          new Paragraph({ text: "Závady", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: "{{#DEFECTS}}" }),
          new Paragraph({ text: "{{description}}  (ČSN: {{standard}}, čl.: {{article}})" }),
          new Paragraph({ text: "{{/DEFECTS}}" }),
          new Paragraph({ text: "{{^DEFECTS}}—{{/DEFECTS}}" }),

          new Paragraph({ text: "" }),
          new Paragraph({ text: "Popis a rozsah revidovaného objektu", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: "{{POPIS_OBJEKTU}}" }),

          new Paragraph({ text: "" }),
          new Paragraph({ text: "Jmenovité napětí: {{NAPETI}}" }),
          new Paragraph({ text: "Druh sítě: {{DRUH_SITE}}" }),
          new Paragraph({ text: "Předložená dokumentace: {{DOKUMENTACE}}" }),

          new Paragraph({ text: "" }),
          new Paragraph({ text: "Vnější vlivy", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: "{{VNESI_VLIVY}}" }),

          new Paragraph({ text: "" }),
          new Paragraph({ text: "Přílohy", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: "{{PRILOHY}}" }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "rz_starter_sablona.docx");
}

/* ============================
   Sestavení dat pro šablonu
============================ */

function buildTemplateData({ safeForm, technician, normsAll, usedInstruments, revId }: GenArgs) {
  const evid = dash(safeForm?.evidencni || revId);
  const typRevize = dash(safeForm?.typRevize);
  const normyText = (normsAll || []).length ? normsAll.join(", ") : "Chybí informace";

  // Výsledek (label)
  const safety = String(safeForm?.conclusion?.safety || "");
  const vysledek =
    !safety
      ? "Chybí informace"
      : safety === "able"
      ? "Elektrická instalace je z hlediska bezpečnosti schopna provozu"
      : safety === "not_able"
      ? "Elektrická instalace není z hlediska bezpečnosti schopna provozu"
      : String(safety);

  // Přístroje
  const instr = (usedInstruments || []).map((i) => ({
    id: i.id,
    name: dash(i.name),
    serial: dash(i.serial),
    calibration: dash(i.calibration),
  }));

  // Zkoušky
  const tests = Object.entries((safeForm?.tests || {}) as Record<string, any>).map(([name, val]) => {
    let note = "";
    if (val == null) note = "";
    else if (typeof val === "string") note = val;
    else if (typeof val === "object") note = val.note ?? val.result?.note ?? val.result ?? "";
    else note = String(val);
    return { name, note: dash(note) };
  });

  // Rozvaděče + komponenty
  const boards = (safeForm?.boards || []).map((b: any, idx: number) => {
    const name = dash(b?.name) || `#${idx + 1}`;
    const details =
      `Výrobce: ${dash(b?.vyrobce)} | Typ: ${dash(b?.typ)} | Umístění: ${dash(b?.umisteni)} | ` +
      `S/N: ${dash(b?.vyrobniCislo)} | Napětí: ${dash(b?.napeti)} | Odpor: ${dash(b?.odpor)} | IP: ${dash(b?.ip)}`;

    const flat = normalizeComponents(b?.komponenty || []);
    const components = (flat.length ? flat : [{ _level: 0, nazev: "—" }]).map((c: any) => ({
      prefix: depthPrefix(c._level),
      name: dash(c?.nazev || c?.name) || "—",
      line: buildComponentLine(c),
    }));

    return { name, details, components };
  });

  // Místnosti + zařízení
  const rooms = (safeForm?.rooms || []).map((r: any) => ({
    name: dash(r?.name),
    details: dash(r?.details),
    devices: ((r?.devices || []) as any[]).map((d) => ({
      typ: dash(d?.typ),
      pocet: dash(d?.pocet),
      dimenze: dash(d?.dimenze),
      riso: dash(d?.riso),
      ochrana: dash(d?.ochrana),
      poznamka: dash(d?.podrobnosti || d?.note),
    })),
  }));

  // Závady
  const defects = (safeForm?.defects || []).map((d: any) => ({
    description: dash(d?.description),
    standard: dash(d?.standard),
    article: dash(d?.article),
  }));

  return {
    // Hlavička
    EVIDENCNI: evid,
    TYP_REVIZE: typRevize,
    NORMY_TEXT: normyText,

    // Techník
    TECH: {
      JMENO: dash(technician?.jmeno),
      FIRMA: dash(technician?.firma),
      OSVEDCENI: dash(technician?.cislo_osvedceni),
      OPRAVNENI: dash(technician?.cislo_opravneni),
      ICO: dash(technician?.ico),
      DIC: dash(technician?.dic),
      ADRESA: dash(technician?.adresa),
      PHONE: dash(technician?.phone),
      EMAIL: dash(technician?.email),
    },

    // Objekt
    OBJEKT: {
      ADRESA: dash(safeForm?.adresa),
      PREDMET: dash(safeForm?.objekt),
      OBJEDNATEL: dash(safeForm?.objednatel),
    },

    // Výsledek + termín
    VYSLEDEK: vysledek,
    "DALSÍ_REVIZE": dash(safeForm?.conclusion?.validUntil),
    ZAVER_TEXT: dash(safeForm?.conclusion?.text),

    // Textové bloky
    POPIS_OBJEKTU: dash(safeForm?.inspectionDescription),
    NAPETI: dash(safeForm?.voltage),
    DRUH_SITE: dash(safeForm?.sit),
    DOKUMENTACE: dash(safeForm?.documentation),
    VNESI_VLIVY: dash(safeForm?.environment),
    PRILOHY: dash(safeForm?.extraNotes),

    // Seznamy
    INSTRUMENTS: instr,
    TESTS: tests,
    BOARDS: boards,
    ROOMS: rooms,
    DEFECTS: defects,
  };
}

/* ============================
   Docxtemplater render
============================ */

function renderDocx(templateArrayBuffer: ArrayBuffer, data: TemplateData): Blob {
  const zip = new PizZip(templateArrayBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "[[", end: "]]" }
  });

  // Volitelný „linter“ párování smyček (pomůže odhalit Multi error)
  lintTemplateTags(doc);

  try {
    doc.render(data as any);
  } catch (error: any) {
    // Detailní výpis všech chyb – pomůže najít přesné místo
    const errs = error?.properties?.errors || [];
    console.group("Docxtemplater errors");
    console.error(error);
    if (errs.length) {
      errs.forEach((e: any, idx: number) => {
        console.log(`#${idx + 1}`);
        console.log("message:", e?.properties?.explanation || e?.message || String(e));
        console.log("id:", e?.id);
        console.log("context tag:", e?.properties?.id);
        console.log("rootError:", e?.rootError);
      });
    }
    console.groupEnd();
    throw new Error("Docx render selhal – zkontroluj konzoli (Docxtemplater errors).");
  }

  return doc.getZip().generate({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  }) as Blob;
}

/* ============================
   Utility (fetch + linter)
============================ */

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Nelze načíst šablonu (${res.status} ${res.statusText})`);
  return await res.arrayBuffer();
}

/** Hrubá kontrola párování {{#...}} / {{/...}} a častých omylů */
function lintTemplateTags(doc: any) {
  const text: string | undefined = doc?.getFullText?.();
  if (!text) return;

  const stack: string[] = [];
  const re = /{{\s*(#|\/|\^)?\s*([A-Za-z0-9_.]+)\s*}}/g;
  let m: RegExpExecArray | null;
  const errors: string[] = [];

  while ((m = re.exec(text))) {
    const typ = m[1]; // '#', '/', '^' (inverzní sekce)
    const name = m[2];
    if (typ === "#") stack.push(name);
    else if (typ === "/") {
      const last = stack.pop();
      if (last !== name) errors.push(`Nesedí párování smyček: očekáván </${last}> ale našel jsem </${name}>.`);
    }
  }
  if (stack.length) {
    errors.push(`Chybí ukončení smyček: ${stack.map((s) => `</${s}>`).join(", ")}`);
  }
  if (errors.length) {
    console.warn("[TEMPLATE LINT]", errors);
  }
}

/* ============================
   NÁVOD NA PLACEHOLDERY V ŠABLONĚ (shrnutí)
   — vlož do .docx a drž se tohohle zápisu —
----------------------------------------------------------------
Jednoduché texty:
  {{EVIDENCNI}}
  {{TYP_REVIZE}}
  {{NORMY_TEXT}}
  {{VYSLEDEK}}
  {{DALSÍ_REVIZE}}
  {{ZAVER_TEXT}}
  {{POPIS_OBJEKTU}}
  {{NAPETI}}
  {{DRUH_SITE}}
  {{DOKUMENTACE}}
  {{VNESI_VLIVY}}
  {{PRILOHY}}

Technik:
  {{TECH.JMENO}}, {{TECH.FIRMA}}, {{TECH.OSVEDCENI}}, {{TECH.OPRAVNENI}},
  {{TECH.ICO}}, {{TECH.DIC}}, {{TECH.ADRESA}}, {{TECH.PHONE}}, {{TECH.EMAIL}}

Revidovaný objekt:
  {{OBJEKT.ADRESA}}, {{OBJEKT.PREDMET}}, {{OBJEKT.OBJEDNATEL}}

Seznamy (drž sekce v rámci JEDNÉ buňky/odstavce):
  INSTRUMENTS:
    {{#INSTRUMENTS}}
    {{name}} | {{serial}} | {{calibration}}
    {{/INSTRUMENTS}}
    {{^INSTRUMENTS}}—{{/INSTRUMENTS}}

  TESTS:
    {{#TESTS}}
    {{name}} — {{note}}
    {{/TESTS}}

  BOARDS + COMPONENTS:
    {{#BOARDS}}
    Rozvaděč: {{name}}
    {{details}}
    {{#COMPONENTS}}
    {{prefix}}{{name}} – {{line}}
    {{/COMPONENTS}}
    {{/BOARDS}}
    {{^BOARDS}}—{{/BOARDS}}

  ROOMS + DEVICES:
    {{#ROOMS}}
    Místnost: {{name}}
    {{details}}
    {{#DEVICES}}
    {{typ}} | {{pocet}} | {{dimenze}} | {{riso}} | {{ochrana}} | {{poznamka}}
    {{/DEVICES}}
    {{/ROOMS}}
    {{^ROOMS}}—{{/ROOMS}}

  DEFECTS:
    {{#DEFECTS}}
    {{description}}  (ČSN: {{standard}}, čl.: {{article}})
    {{/DEFECTS}}
    {{^DEFECTS}}—{{/DEFECTS}}
----------------------------------------------------------------
*/
