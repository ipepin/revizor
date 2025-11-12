// src/pages/summary-export/lpsDocxTemplate.ts
import PizZip from "pizzip";
import { saveAs } from "file-saver";

const LPS_TEMPLATE_VERSION = "2025-11-11-01";
const DEFAULT_LPS_TEMPLATE_URL = `/templates/lps_report.docx?v=${LPS_TEMPLATE_VERSION}`;
const EMU_PER_PIXEL = 9525;
const MAX_IMAGE_WIDTH_EMU = 6.5 * 914400; // 6.5in

export type LpsGenArgs = {
  form: any;
  revId?: string | number;
  templateUrl?: string;
};

const dash = (value: any) => {
  const str = (value ?? "").toString().trim();
  return str.length ? str : "";
};

const formatDate = (value?: string) => {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (year && month && day) return day + "." + month + "." + year;
  return value;
};

const formatStandardName = (value?: string) => {
  const normalized = (value || "").toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("62305")) return "ČSN EN 62305-3 ed.2";
  if (normalized.includes("341390")) return "ČSN 34 1390";
  return value || "";
};

const joinNumbered = (items: string[]) =>
  items.length ? items.map((item, idx) => `${idx + 1}. ${item}`).join("\n") : "";

const joinPlain = (items: string[]) => (items.length ? items.join("\n") : "");

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/\r\n|\r|\n/g, "&#x0A;");

const TEMPLATE_KEYS = [
  "REVISION_TYPE",
  "EVIDENCE_NUMBER",
  "PROJECT_ID",
  "OBJECT_NAME",
  "OBJECT_ADDRESS",
  "CLIENT_NAME",
  "CLIENT_IC",
  "CLIENT_DIC",
  "CLIENT_ADDRESS",
  "ORDER_DESCRIPTION",
  "PRIMARY_STANDARD",
  "LPS_CLASS",
  "REVISION_SCOPE_TEXT",
  "SCOPE_ITEMS",
  "SCOPE_ITEM_TEXT",
  "OBJECT_DESCRIPTION",
  "OBJECT_TYPE",
  "AIR_TERMINATION_TYPE",
  "DOWN_CONDUCTORS_COUNT",
  "FLOORS_COUNT",
  "EARTHING_TYPE",
  "ROOF_TYPE",
  "ROOF_COVER",
  "GROUND_MATERIAL",
  "SOIL_TYPE",
  "WEATHER_CONDITIONS",
  "SPD_PROTECTION_INFO",
  "DATE_START",
  "DATE_END",
  "DATE_CREATED",
  "NEXT_REVISION",
  "TECH_NAME",
  "TECHNICIAN_NAME",
  "TECH_COMPANY",
  "TECH_ADDRESS",
  "TECH_ADDR",
  "TECH_PHONE",
  "TECH_EMAIL",
  "TECH_ICO",
  "TECH_DIC",
  "TECH_CERTIFICATE",
  "TECH_AUTHORIZATION",
  "TECH_CERT",
  "TECH_AUTH",
  "OPERATOR_NAME",
  "MEASURING_INSTRUMENTS",
  "INSTRUMENT_NAME",
  "INSTRUMENT_MEASUREMENT",
  "INSTRUMENT_CAL_LIST",
  "INSTRUMENT_VALIDITY",
  "INSTRUMENT_NOTE",
  "EARTH_MEASUREMENTS",
  "GROUND_LABEL",
  "GROUND_VALUE",
  "GROUND_INSTRUMENT",
  "GROUND_NOTE",
  "MEASUREMENT_METHOD",
  "VISUAL_CHECKS",
  "VISUAL_ITEM",
  "VISUAL_STATE",
  "VISUAL_NOTE",
  "DEFECTS",
  "DEFECT_DESCRIPTION",
  "DEFECT_STANDARD",
  "DEFECT_ARTICLE",
  "DEFECT_LOCATION",
  "DEFECT_PRIORITY",
  "DEFECT_DEADLINE",
  "DEFECT_INDEX",
  "DEFECT_RECOMMENDATION",
  "RECOMMENDED_ACTION",
  "REPAIR_LIST",
  "REPAIR_ITEM",
  "REPAIR_COST",
  "REPAIR_TERM",
  "REPAIR_PRIORITY",
  "IMAGE_BLOCK",
  "IMAGE_INDEX",
  "IMAGE_AUTHOR",
  "IMAGE_DATE",
  "IMAGE_NOTE",
  "LPS_SKETCH_IMAGE",
  "SKETCH_NOTE",
  "CONCLUSION_TEXT",
  "CONCLUSION_NOTE",
  "SAFETY_STATUS",
  "DISTRIBUTION_LIST",
  "SIGNATURE_CITY",
  "SIGNATURE_DATE",
  "STAMP_OPERATOR",
  "STAMP_TECHNICIAN",
];

async function fetchBinary(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status + " při načítání " + url);
  return await res.arrayBuffer();
}

function buildLpsData(form: any) {
  const safe = form || {};
  const lps = safe.lps || {};
  const instruments = Array.isArray(safe.measuringInstruments) ? safe.measuringInstruments : [];
  const earth = Array.isArray(lps.earthResistance) ? lps.earthResistance : [];
  const visual = Array.isArray(lps.visualChecks) ? lps.visualChecks : [];
  const defects = Array.isArray(safe.defects) ? safe.defects : [];
  const scope = Array.isArray(lps.scopeChecks) ? lps.scopeChecks : [];

  const scopeText = scope
    .map((key: string) => {
      switch (key) {
        case "vnejsi":
          return "Vnější ochrana před bleskem";
        case "vnitrni":
          return "Vnitřní ochrana před bleskem";
        case "uzemneni":
          return "Uzemnění";
        case "pospojovani":
          return "Ekvipotenciální pospojování";
        case "spd":
          return "SPD / přepěťová ochrana";
        default:
          return key;
      }
    })
    .filter(Boolean);

  const instrumentLines = instruments.map((inst: any, idx: number) => ({
    name: dash(inst?.name) || dash(inst?.measurement_text) || "Přístroj " + (idx + 1),
    serial: dash(inst?.serial || inst?.measurement_text),
    cal: dash(inst?.calibration_code),
    validity: dash(inst?.calibration_valid_until),
    note: dash(inst?.note),
  }));
  const instrumentRows = instrumentLines;

  const instrumentById = instruments.reduce((acc: Record<string, string>, inst: any) => {
    if (inst?.id != null) {
      acc[String(inst.id)] = dash(inst?.name) || dash(inst?.measurement_text) || "Přístroj";
    }
    return acc;
  }, {} as Record<string, string>);

  const earthLabels = earth.map((row: any, idx: number) => dash(row?.label) || "Zemnič " + (idx + 1));
  const earthValues = earth.map((row: any) => (row?.valueOhm ? row.valueOhm + " Ω" : ""));
  const earthInstruments = earth.map(
    (row: any) => dash(instrumentById[String(row?.instrumentId)]) || dash(row?.instrumentName)
  );
  const earthNotes = earth.map((row: any) => dash(row?.note));

  const visualItems = visual.map((row: any, idx: number) => dash(row?.text) || "Kontrola " + (idx + 1));
  const visualStates = visual.map((row: any) => (row?.ok ? "OK" : "NOK"));
  const visualNotes = visual.map((row: any) => dash(row?.note));

  const defectDescriptions = defects.map((row: any) => dash(row?.description));
  const defectStandards = defects.map((row: any) => dash(row?.standard || row?.article));
  const defectArticles = defects.map((row: any) => dash(row?.article));
  const defectLocations = defects.map((row: any) => dash(row?.location));
  const defectPriorities = defects.map((row: any) => dash(row?.priority));
  const defectDeadlines = defects.map((row: any) => dash(row?.deadline));
  const defectIndexes = defects.map((_, idx: number) => String(idx + 1));
  const defectRecommendations = defects.map((row: any) => dash(row?.recommendation || row?.remedy));

  const floorsValue =
    (lps?.floorsCountOther || "").toString().trim() ||
    (lps?.floorsCount != null && lps.floorsCount !== "" ? String(lps.floorsCount) : "");

  const spdInfo =
    lps.spdProtectionUsed === "yes"
      ? "Je použita"
      : lps.spdProtectionUsed === "no"
      ? "Není použita"
      : "Neuvedeno";

  const data: Record<string, string> = {
    REVISION_TYPE: dash(safe.typRevize),
    EVIDENCE_NUMBER: dash(safe.evidencni),
    PROJECT_ID: dash(safe.projectId || safe.project_id || lps.projectNo),
    OBJECT_NAME: dash(safe.objekt),
    OBJECT_ADDRESS: dash(safe.adresa),
    CLIENT_NAME: dash(safe.objednatel),
    CLIENT_IC: dash(safe.clientIco),
    CLIENT_DIC: dash(safe.clientDic),
    CLIENT_ADDRESS: dash(safe.clientAddress),
    ORDER_DESCRIPTION: dash(lps.orderDescription || "Revize LPS " + dash(safe.objekt)),
    PRIMARY_STANDARD: formatStandardName(lps.standard),
    LPS_CLASS: dash(lps.class),
    REVISION_SCOPE_TEXT: scopeText.join(", "),
    SCOPE_ITEMS: joinPlain(scopeText),
    SCOPE_ITEM_TEXT: scopeText.join(", "),
    OBJECT_DESCRIPTION: dash(lps.reportText),
    OBJECT_TYPE: dash(lps.objectTypeOther || lps.objectType),
    AIR_TERMINATION_TYPE: dash(lps.airTerminationType),
    DOWN_CONDUCTORS_COUNT: dash(lps.downConductorsCountOther || lps.downConductorsCount),
    FLOORS_COUNT: dash(floorsValue),
    EARTHING_TYPE: dash(lps.earthingType),
    GROUND_MATERIAL: dash(lps.conductorMaterial || lps.earthingType),
    ROOF_TYPE: dash(lps.roofTypeOther || lps.roofType),
    ROOF_COVER: dash(lps.roofCoverOther || lps.roofCover),
    SOIL_TYPE: dash(lps.soilType),
    WEATHER_CONDITIONS: dash(lps.weather || lps.weatherConditions),
    SPD_PROTECTION_INFO: spdInfo,
    DATE_START: formatDate(safe.date_start),
    DATE_END: formatDate(safe.date_end),
    DATE_CREATED: formatDate(safe.date_created),
    NEXT_REVISION: formatDate(safe.conclusion?.validUntil || lps.nextRevision),
    TECH_NAME: dash(safe.technicianName),
    TECHNICIAN_NAME: dash(safe.technicianName),
    TECH_COMPANY: dash(safe.technicianCompanyName),
    TECH_ADDRESS: dash(safe.technicianCompanyAddress),
    TECH_ADDR: dash(safe.technicianCompanyAddress),
    TECH_PHONE: dash(safe.technicianPhone || safe.technicianContact),
    TECH_EMAIL: dash(safe.technicianEmail),
    TECH_ICO: dash(safe.technicianCompanyIco),
    TECH_DIC: dash(safe.technicianCompanyDic),
    TECH_CERTIFICATE: dash(safe.technicianCertificateNumber),
    TECH_CERT: dash(safe.technicianCertificateNumber),
    TECH_AUTHORIZATION: dash(safe.technicianAuthorizationNumber),
    TECH_AUTH: dash(safe.technicianAuthorizationNumber),
    OPERATOR_NAME: dash(lps.owner),
    MEASURING_INSTRUMENTS: instrumentRows.length ? "Seznam použitých přístrojů:" : "",
    INSTRUMENT_NAME: joinNumbered(instrumentLines.map((row) => row.name)),
    INSTRUMENT_MEASUREMENT: joinNumbered(instrumentLines.map((row) => row.serial)),
    INSTRUMENT_CAL_LIST: joinNumbered(instrumentLines.map((row) => row.cal)),
    INSTRUMENT_VALIDITY: joinNumbered(instrumentLines.map((row) => row.validity)),
    INSTRUMENT_NOTE: joinNumbered(instrumentLines.map((row) => row.note)),
    EARTH_MEASUREMENTS: earth.length ? "Měření zemních odporů bylo provedeno." : "Měření zemních odporů nebylo zadáno.",
    GROUND_LABEL: joinNumbered(earthLabels),
    GROUND_VALUE: joinNumbered(earthValues),
    GROUND_INSTRUMENT: joinNumbered(earthInstruments),
    GROUND_NOTE: joinNumbered(earthNotes),
    MEASUREMENT_METHOD: dash(lps.measurementMethod),
    VISUAL_CHECKS: visual.length ? "Byla provedena vizuální kontrola." : "Bez záznamu.",
    VISUAL_ITEM: joinNumbered(visualItems),
    VISUAL_STATE: joinNumbered(visualStates),
    VISUAL_NOTE: joinNumbered(visualNotes),
    DEFECTS: defects.length ? "Zjištěné závady viz níže." : "Bez zjištěných závad.",
    DEFECT_DESCRIPTION: joinNumbered(defectDescriptions),
    DEFECT_STANDARD: joinNumbered(defectStandards),
    DEFECT_ARTICLE: joinNumbered(defectArticles),
    DEFECT_LOCATION: joinNumbered(defectLocations),
    DEFECT_PRIORITY: joinNumbered(defectPriorities),
    DEFECT_DEADLINE: joinNumbered(defectDeadlines),
    DEFECT_INDEX: joinNumbered(defectIndexes),
    DEFECT_RECOMMENDATION: joinNumbered(defectRecommendations),
    RECOMMENDED_ACTION: joinNumbered(defectRecommendations),
    REPAIR_LIST: "",
    IMAGE_BLOCK: "",
    LPS_SKETCH_IMAGE: dash(lps.sketchPng),
    SKETCH_NOTE: dash(lps.sketchNote),
    CONCLUSION_TEXT: dash(safe.conclusion?.text),
    CONCLUSION_NOTE: dash(safe.conclusion?.note || lps.conclusionNote),
    SAFETY_STATUS:
      safe.conclusion?.safety === "able"
        ? "Zařízení je schopné bezpečného provozu"
        : safe.conclusion?.safety === "not_able"
        ? "Zařízení není schopné bezpečného provozu"
        : dash(safe.conclusion?.safety),
    DISTRIBUTION_LIST: dash(lps.distributionList),
    SIGNATURE_CITY: dash(lps.signatureCity || safe.signatureCity),
    SIGNATURE_DATE: formatDate(safe.date_created),
    STAMP_OPERATOR: "",
    STAMP_TECHNICIAN: "",
  };

  TEMPLATE_KEYS.forEach((key) => {
    if (!(key in data)) {
      data[key] = "";
    }
  });

  return data;
}

export async function renderAndDownloadLpsDocx(args: LpsGenArgs) {
  const buffer = await fetchBinary(args.templateUrl || DEFAULT_LPS_TEMPLATE_URL);
  let zip: PizZip;
  try {
    zip = new PizZip(buffer);
  } catch {
    throw new Error("Neplatná LPS šablona (docx).");
  }

  const data = buildLpsData(args.form || {});
  const sketchImageData = data.LPS_SKETCH_IMAGE;
  delete data.LPS_SKETCH_IMAGE;
  const sketchDimensions = sketchImageData ? await measureImageDimensions(sketchImageData) : undefined;
  const xmlFiles = Object.keys(zip.files).filter((path) => {
    const normalized = path.replace(/\\/g, "/");
    return normalized.startsWith("word/") && normalized.endsWith(".xml");
  });

  xmlFiles.forEach((filePath) => {
    const file = zip.file(filePath);
    if (!file) return;
    let xml = file.asText();
    let touched = false;

    Object.entries(data).forEach(([key, rawValue]) => {
      const placeholder = `[[${key}]]`;
      if (!xml.includes(placeholder)) return;
      const safeValue = escapeXml(String(rawValue ?? ""));
      xml = xml.split(placeholder).join(safeValue);
      touched = true;
    });

    if (touched) {
      zip.file(filePath, xml);
    }
  });

  let sketchInserted = false;
  if (sketchImageData) {
    sketchInserted = embedSketchImage(zip, sketchImageData, sketchDimensions);
  }
  if (!sketchInserted) {
    removeSketchPlaceholder(zip);
  }

  const out = zip.generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const fileId = String(args?.form?.evidencni || args?.revId || "lps");
  saveAs(out, "lps_revizni_zprava_" + fileId + ".docx");
}

function embedSketchImage(zip: PizZip, dataUrl?: string, dimensions?: { width: number; height: number }) {
  if (!dataUrl || typeof dataUrl !== "string") return false;
  const matches = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
  if (!matches) return false;

  const extension = matches[1].toLowerCase() === "jpeg" ? "jpg" : matches[1].toLowerCase();
  const base64Data = matches[2];

  const relsPath = "word/_rels/document.xml.rels";
  const docPath = "word/document.xml";
  const relsFile = zip.file(relsPath);
  const docFile = zip.file(docPath);
  if (!relsFile || !docFile) return false;

  const mediaPath = `word/media/lps_sketch.${extension}`;
  zip.file(mediaPath, base64Data, { base64: true });
  ensureContentTypeForImage(zip, extension);

  let relsXml = relsFile.asText();
  const relIds = Array.from(relsXml.matchAll(/Id="rId(\d+)"/g)).map((m) => Number(m[1]));
  const nextRelIdNumber = relIds.length ? Math.max(...relIds) + 1 : 100;
  const relId = `rId${nextRelIdNumber}`;
  const relXml = `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/lps_sketch.${extension}"/>`;
  relsXml = relsXml.replace("</Relationships>", `${relXml}</Relationships>`);
  zip.file(relsPath, relsXml);

  let docXml = docFile.asText();
  if (!docXml.includes("[[LPS_SKETCH_IMAGE]]")) return false;
  const docPrIds = Array.from(docXml.matchAll(/wp:docPr[^>]+id="(\d+)"/g)).map((m) => Number(m[1]));
  const nextDocPrId = docPrIds.length ? Math.max(...docPrIds) + 1 : 1;
  const drawingXml = buildDrawingXml(relId, nextDocPrId, dimensions);
  const paragraphRegex = /<w:p[^>]*>[\s\S]*?\[\[LPS_SKETCH_IMAGE\]\][\s\S]*?<\/w:p>/;
  const runRegex = /<w:r[^>]*>[\s\S]*?<w:t[^>]*>\[\[LPS_SKETCH_IMAGE\]\]<\/w:t>[\s\S]*?<\/w:r>/;
  if (paragraphRegex.test(docXml)) {
    docXml = docXml.replace(paragraphRegex, `<w:p>${drawingXml}</w:p>`);
  } else if (runRegex.test(docXml)) {
    docXml = docXml.replace(runRegex, drawingXml);
  } else {
    docXml = docXml.replace("[[LPS_SKETCH_IMAGE]]", `<w:p>${drawingXml}</w:p>`);
  }
  zip.file(docPath, docXml);
  return true;
}

function removeSketchPlaceholder(zip: PizZip) {
  const docPath = "word/document.xml";
  const docFile = zip.file(docPath);
  if (!docFile) return;
  let docXml = docFile.asText();
  const paragraphRegex = /<w:p[^>]*>[\s\S]*?\[\[LPS_SKETCH_IMAGE\]\][\s\S]*?<\/w:p>/;
  const runRegex = /<w:r[^>]*>[\s\S]*?<w:t[^>]*>\[\[LPS_SKETCH_IMAGE\]\]<\/w:t>[\s\S]*?<\/w:r>/;
  if (paragraphRegex.test(docXml)) {
    docXml = docXml.replace(paragraphRegex, "");
  } else if (runRegex.test(docXml)) {
    docXml = docXml.replace(runRegex, "");
  } else {
    docXml = docXml.replace("[[LPS_SKETCH_IMAGE]]", "");
  }
  zip.file(docPath, docXml);
}

function buildDrawingXml(relId: string, docPrId: number, dimensions?: { width: number; height: number }) {
  const widthEmu = dimensions?.width ?? 4572000;
  const heightEmu = dimensions?.height ?? 3200400;
  return `<w:r><w:rPr/><w:drawing xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
    <wp:inline distT="0" distB="0" distL="0" distR="0">
      <wp:extent cx="${widthEmu}" cy="${heightEmu}"/>
      <wp:effectExtent l="0" t="0" r="0" b="0"/>
      <wp:docPr id="${docPrId}" name="LPS Sketch ${docPrId}"/>
      <wp:cNvGraphicFramePr>
        <a:graphicFrameLocks noChangeAspect="1"/>
      </wp:cNvGraphicFramePr>
      <a:graphic>
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
          <pic:pic>
            <pic:nvPicPr>
              <pic:cNvPr id="0" name="LPS Sketch ${docPrId}"/>
              <pic:cNvPicPr/>
            </pic:nvPicPr>
            <pic:blipFill>
              <a:blip r:embed="${relId}"/>
              <a:stretch>
                <a:fillRect/>
              </a:stretch>
            </pic:blipFill>
            <pic:spPr>
              <a:xfrm>
                <a:off x="0" y="0"/>
                <a:ext cx="${widthEmu}" cy="${heightEmu}"/>
              </a:xfrm>
              <a:prstGeom prst="rect">
                <a:avLst/>
              </a:prstGeom>
            </pic:spPr>
          </pic:pic>
        </a:graphicData>
      </a:graphic>
    </wp:inline>
  </w:drawing></w:r>`;
}

async function measureImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") {
      resolve({ width: 4572000, height: 3200400 });
      return;
    }
    const img = new Image();
    img.onload = () => {
      const naturalWidth = img.naturalWidth || 1;
      const naturalHeight = img.naturalHeight || 1;
      const ratio = naturalHeight / naturalWidth;
      let widthEmu = Math.round(Math.min(naturalWidth * EMU_PER_PIXEL, MAX_IMAGE_WIDTH_EMU));
      let heightEmu = Math.round(widthEmu * ratio);
      resolve({
        width: Math.max(widthEmu, 914400),
        height: Math.max(heightEmu, 914400),
      });
    };
    img.onerror = () => resolve({ width: 4572000, height: 3200400 });
    img.src = dataUrl;
  });
}

function ensureContentTypeForImage(zip: PizZip, extension: string) {
  const contentTypesPath = "[Content_Types].xml";
  const file = zip.file(contentTypesPath);
  if (!file) return;
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    bmp: "image/bmp",
    svg: "image/svg+xml",
  };
  const contentType = map[extension] || `image/${extension}`;
  let xml = file.asText();
  if (xml.includes(`Extension="${extension}"`)) return;
  xml = xml.replace(
    "</Types>",
    `<Default Extension="${extension}" ContentType="${contentType}"/></Types>`
  );
  zip.file(contentTypesPath, xml);
}
