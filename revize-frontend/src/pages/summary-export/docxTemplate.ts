// src/pages/summary-export/docxTemplate.ts
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

export type GenArgs = {
  safeForm: any;
  technician: {
    jmeno: string;
    firma: string;
    cislo_osvedceni: string;
    cislo_opravneni: string;
    ico: string;
    dic: string;
    adresa: string;
    phone: string;
    email: string;
  };
  normsAll: string[];
  usedInstruments: Array<{ id: string; name: string; serial: string; calibration: string }>;
  revId?: string | undefined;
  templateUrl?: string; // volitelnÄ› pĹ™epsĂˇnĂ­ cesty k ĹˇablonÄ›
};

const DEFAULT_TEMPLATE_URL = "/templates/rz-modern.docx";

// ---------- util ----------
const dash = (v: any) => {
  const s = (v ?? "").toString().trim();
  return s ? s : "-";
};
const nbsp = "\u00A0";
const repeat = (s: string, n: number) => Array(Math.max(0, n)).fill(s).join("");

// JednoduchĂ˝ parser pro [[TAG]]
function angularParser(tag: string) {
  const expr = tag.trim();
  return {
    get: (scope: Record<string, any>) => {
      if (expr in scope) return scope[expr];
      const parts = expr.split(".");
      let cur: any = scope;
      for (const p of parts) {
        if (cur && typeof cur === "object" && p in cur) cur = cur[p];
        else return "";
      }
      return cur;
    },
  } as any;
}

// ---------- data builder ----------
function buildData({ safeForm, technician, normsAll, usedInstruments, revId }: GenArgs) {
  const EVIDENCNI = dash(safeForm?.evidencni || revId);
  const TYP_REVIZE = dash(safeForm?.typRevize);
  const NORMY = normsAll?.length ? normsAll.join(", ") : "-";

  const TECH_JMENO = dash(technician?.jmeno);
  const TECH_FIRMA = dash(technician?.firma);
  const TECH_OSV = dash(technician?.cislo_osvedceni);
  const TECH_OPR = dash(technician?.cislo_opravneni);
  const TECH_ICO = dash(technician?.ico);
  const TECH_DIC = dash(technician?.dic);
  const TECH_ADRESA = dash(technician?.adresa);
  const TECH_TEL = dash(technician?.phone);
  const TECH_EMAIL = dash(technician?.email);

  const OBJ_ADRESA = dash(safeForm?.adresa);
  const OBJ_PREDMET = dash(safeForm?.objekt);
  const OBJ_OBJEDNATEL = dash(safeForm?.objednatel);

  let VYSLEDEK_TEXT = "ChybĂ­ informace";
  const s = safeForm?.conclusion?.safety;
  if (s === "able") VYSLEDEK_TEXT = "ElektrickĂˇ instalace je z hlediska bezpeÄŤnosti schopna provozu";
  if (s === "not_able") VYSLEDEK_TEXT = "ElektrickĂˇ instalace nenĂ­ z hlediska bezpeÄŤnosti schopna provozu";
  const DALSIREVIZE = dash(safeForm?.conclusion?.validUntil);

  const PROHLIDKA = (safeForm?.performedTasks || []).map((t: any) => ({ TEXT: dash(t) }));

  const ZKOUSKY = Object.entries(safeForm?.tests || {}).map(([name, val]: [string, any]) => {
    let note = "";
    if (val == null) note = "";
    else if (typeof val === "string") note = val;
    else if (typeof val === "object") note = (val as any).note ?? (val as any).result?.note ?? (val as any).result ?? "";
    else note = String(val);
    return { NAME: dash(name), NOTE: dash(note) };
  });

  const INSTRUMENTS = (usedInstruments || []).map((i) => ({ NAME: dash(i.name), SERIAL: dash(i.serial), CAL: dash(i.calibration) }));

  // BOARDS â€“ odrĂˇĹľkovĂ˝ â€žstromâ€ś bez tabulek (tab stopa pro zarovnĂˇnĂ­)
  const BOARDS = (safeForm?.boards || []).map((b: any, idx: number) => {
    const TITLE = dash(b?.name || `#${idx + 1}`);
    const meta: string[] = [];
    if (b?.vyrobce) meta.push(`VĂ˝robce: ${dash(b.vyrobce)}`);
    if (b?.typ) meta.push(`Typ: ${dash(b.typ)}`);
    if (b?.umisteni) meta.push(`UmĂ­stÄ›nĂ­: ${dash(b.umisteni)}`);
    if (b?.vyrobniCislo) meta.push(`S/N: ${dash(b.vyrobniCislo)}`);
    if (b?.napeti) meta.push(`NapÄ›tĂ­: ${dash(b.napeti)}`);
    if (b?.odpor) meta.push(`Odpor: ${dash(b.odpor)}`);
    if (b?.ip) meta.push(`IP: ${dash(b.ip)}`);
    const DESC = meta.join("  |  ") || "-";

    const flat: any[] = Array.isArray(b?.komponenty) ? b.komponenty : [];
    const COMPONENTS = (flat.length ? flat : [{ _level: 0, nazev: "-" }]).map((c: any) => {
      const lvl = Math.max(0, Number(c?._level ?? 0));
      const prefix = repeat(nbsp + nbsp, lvl) + (lvl > 0 ? "â€˘ " : "â€“ ");
      const name = dash(c?.nazev || c?.name);
      const desc = dash(c?.popis || c?.description || "");

      const typ = c?.typ || c?.type || c?.druh;
      const poles = c?.poles || c?.poly || c?.pocet_polu || c?.pocetPolu;
      const dim = c?.dimenze || c?.dim || c?.prurez;
      const riso = c?.riso ?? c?.Riso ?? c?.izolace ?? c?.insulation;
      const zs = c?.ochrana ?? c?.zs ?? c?.Zs ?? c?.loop_impedance;
      const tMs = c?.vybavovaciCasMs ?? c?.vybavovaci_cas_ms ?? c?.rcd_time ?? c?.trip_time ?? c?.vybavovaciCas ?? c?.cas_vybaveni;
      const iDelta = c?.vybavovaciProudmA ?? c?.vybavovaci_proud_ma ?? c?.rcd_trip_current ?? c?.trip_current ?? c?.i_fi ?? c?.ifi;
      const pozn = c?.poznamka ?? c?.pozn ?? c?.note;

      const parts: string[] = [];
      if (desc && desc !== "-") parts.push(desc);
      if (typ) parts.push(`typ: ${typ}`);
      if (poles) parts.push(`pĂłly: ${poles}`);
      if (dim) parts.push(`dim.: ${dim}`);
      if (riso || riso === 0) parts.push(`Riso: ${riso} MÎ©`);
      if (zs || zs === 0) parts.push(`Zs: ${zs} Î©`);
      if (tMs || tMs === 0) parts.push(`t: ${tMs} ms`);
      if (iDelta || iDelta === 0) parts.push(`IÎ”: ${iDelta} mA`);
      if (pozn) parts.push(`Pozn.: ${pozn}`);

      const LINE_LEFT = `${prefix}${name}`;
      const LINE_RIGHT = parts.join("   Â·   ") || " ";
      return { LINE_LEFT, LINE_RIGHT };
    });

    return { TITLE, DESC, COMPONENTS };
  });

  const ROOMS = (safeForm?.rooms || []).map((r: any) => ({
    NAME: dash(r?.name),
    NOTE: dash(r?.details),
    DEVICES: (Array.isArray(r?.devices) ? r.devices : []).map((d: any) => ({
      TYP: dash(d?.typ),
      POCET: dash(d?.pocet),
      DIM: dash(d?.dimenze),
      RISO: dash(d?.riso),
      OCHR: dash(d?.ochrana),
      POZN: dash(d?.podrobnosti || d?.note),
    })),
  }));

  const ZAVADY = (safeForm?.defects || []).map((d: any) => ({
    POPIS: dash(d?.description),
    CSN: dash(d?.standard),
    CLANEK: dash(d?.article),
  }));

  // DlouhĂ˝ zĂˇvÄ›r
  const ZAVER_TEXT = String(safeForm?.conclusion?.text || "");

  return {
    EVIDENCNI,
    TYP_REVIZE,
    NORMY,

    TECH_JMENO,
    TECH_FIRMA,
    TECH_OSV,
    TECH_OPR,
    TECH_ICO,
    TECH_DIC,
    TECH_ADRESA,
    TECH_TEL,
    TECH_EMAIL,

    OBJ_ADRESA,
    OBJ_PREDMET,
    OBJ_OBJEDNATEL,

    VYSLEDEK_TEXT,
    DALSIREVIZE,

    PROHLIDKA,
    ZKOUSKY,
    INSTRUMENTS,
    BOARDS,
    ROOMS,
    ZAVADY,

    ZAVER_TEXT,
  };
}

// ---------- naÄŤtenĂ­ Ĺˇablony ----------
async function fetchBinary(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} pĹ™i naÄŤĂ­tĂˇnĂ­ ${url}`);
  return await res.arrayBuffer();
}

// ---------- render + download ----------
export async function renderAndDownloadRzDocxFromTemplate(args: GenArgs) {
  const buf = await fetchBinary(args.templateUrl || DEFAULT_TEMPLATE_URL);

  let zip: PizZip;
  try {
    zip = new PizZip(buf);
  } catch (e) {
    console.error("[docxTemplate] PizZip error:", e);
    throw new Error("Soubor Ĺˇablony nenĂ­ validnĂ­ .docx (zip). OtevĹ™ete ho ve Wordu a uloĹľte znovu.");
  }

  const doc = new Docxtemplater(zip, {
    parser: angularParser as any,
    linebreaks: true,
    delimiters: { start: "[[", end: "]]" },
  });

  const data = buildData(args);

  try {
    doc.render(data);
  } catch (e: any) {
    console.error("[docxTemplate] Render error:", e);
    const multi = e?.properties?.errors?.map((er: any) => {
      const file = er?.properties?.file ? ` (${er.properties.file})` : "";
      const tag = er?.properties?.xtag ? ` [${er.properties.xtag}]` : "";
      return `- ${er?.properties?.explanation || er?.message || "Chyba"}${tag}${file}`;
    }) || [];
    const msg = multi.length > 0 ? `Ĺ ablonu se nepodaĹ™ilo vyplnit:\n${multi.join("\n")}` : (e?.message || "NeznĂˇmĂˇ chyba pĹ™i renderu Ĺˇablony");
    throw new Error(msg);
  }

  const out = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const fileId = String(args?.safeForm?.evidencni || args?.revId || "vystup");
  saveAs(out, `revizni_zprava_${fileId}.docx`);
}
