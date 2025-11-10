// src/pages/summary-export/lpsDocxTemplate.ts
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

const DEFAULT_LPS_TEMPLATE_URL = "/templates/lps_template.docx";

export type LpsGenArgs = {
  form: any;
  revId?: string | number;
  templateUrl?: string;
};

const dash = (v: any) => {
  const s = (v ?? "").toString().trim();
  return s ? s : "-";
};

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

async function fetchBinary(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} při načítání ${url}`);
  return await res.arrayBuffer();
}

function buildLpsData(form: any) {
  const lps = (form?.lps || {}) as any;
  const INST = (Array.isArray(form?.measuringInstruments) ? form.measuringInstruments : []).map((i: any) => ({
    NAME: dash(i?.name), SERIAL: dash(i?.serial), CAL: dash(i?.calibration_code)
  }));
  const EARTH = (Array.isArray(lps?.earthResistance) ? lps.earthResistance : []).map((r: any) => ({ LABEL: dash(r?.label), VALUE: dash(r?.valueOhm), NOTE: dash(r?.note) }));
  const CONT = (Array.isArray(lps?.continuity) ? lps.continuity : []).map((r: any) => ({ PATH: dash(r?.conductor), VALUE: dash(r?.valueMilliOhm), NOTE: dash(r?.note) }));

  return {
    EVIDENCNI: dash(form?.evidencni),
    NORM: dash(lps?.standard),
    DATE_START: dash(form?.date_start),
    DATE_END: dash(form?.date_end),
    DATE_CREATED: dash(form?.date_created),

    TECH_NAME: dash(form?.technicianName),
    TECH_CERT: dash(form?.technicianCertificateNumber),
    TECH_AUTH: dash(form?.technicianAuthorizationNumber),
    TECH_COMPANY: dash(form?.technicianCompanyName),
    TECH_ICO: dash(form?.technicianCompanyIco),
    TECH_DIC: dash(form?.technicianCompanyDic),
    TECH_ADDR: dash(form?.technicianCompanyAddress),

    OBJ_ADDRESS: dash(form?.adresa),
    OBJ_SUBJECT: dash(form?.objekt),
    CLIENT: dash(form?.objednatel),

    REPORT_TEXT: dash(lps?.reportText),
    CONCLUSION: dash(form?.conclusion?.text),
    NEXT_DUE: dash(form?.conclusion?.validUntil),

    INSTRUMENTS: INST,
    EARTH,
    CONT,
  };
}

export async function renderAndDownloadLpsDocx(args: LpsGenArgs) {
  const buf = await fetchBinary(args.templateUrl || DEFAULT_LPS_TEMPLATE_URL);
  let zip: PizZip;
  try { zip = new PizZip(buf); } catch (e) { throw new Error("Neplatná LPS šablona (docx)."); }

  const doc = new Docxtemplater(zip, { parser: angularParser as any, linebreaks: true, delimiters: { start: "[[", end: "]]" } });

  const data = buildLpsData(args.form || {});
  try { doc.render(data); } catch (e: any) { throw new Error(e?.message || "Render šablony selhal"); }

  const out = doc.getZip().generate({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  const fileId = String(args?.form?.evidencni || args?.revId || "lps");
  saveAs(out, `lps_revizni_zprava_${fileId}.docx`);
}
