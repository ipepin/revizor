// Legacy export name kept for compatibility with SummaryPage
import { saveAs } from "file-saver";
import { buildLpsWordBlob, dataUrlToBytes, getSketchSize } from "./lpsWordBuilder";

export type LpsGenArgs = {
  form: any;
  revId?: string | number;
};

export async function renderAndDownloadLpsDocx(args: LpsGenArgs) {
  const safeForm = args.form || {};
  const sketchDataUrl = safeForm?.lps?.sketchPng || safeForm?.sketchPng;
  const sketchBytes = dataUrlToBytes(sketchDataUrl);
  const sketchSize = await getSketchSize(sketchDataUrl);

  const blob = await buildLpsWordBlob(safeForm, sketchBytes, sketchSize);
  const fileId = String(safeForm?.evidencni || args.revId || "lps");
  saveAs(blob, `lps_revizni_zprava_${fileId}.docx`);
}

function buildDataMap(safe: any, lps: any) {
  const measuringInstruments: any[] = Array.isArray(safe.measuringInstruments) ? safe.measuringInstruments : [];
  const earth: any[] = Array.isArray(lps.earthResistance) ? lps.earthResistance : [];
  const continuity: any[] = Array.isArray(lps.continuity) ? lps.continuity : [];
  const spd: any[] = Array.isArray(lps.spdTests) ? lps.spdTests : [];
  const visual: any[] = Array.isArray(lps.visualChecks) ? lps.visualChecks : [];
  const defects: any[] = Array.isArray(safe.defects) ? safe.defects : [];

  const numberList = (items: string[]) => (items.length ? items.map((item, idx) => `${idx + 1}. ${item}`).join("  ") : "-");
  const instrumentNames = numberList(measuringInstruments.map((inst) => dash(inst?.name || inst?.measurement_text)));
  const instrumentSerials = numberList(measuringInstruments.map((inst) => dash(inst?.serial || inst?.measurement_text)));
  const instrumentCal = numberList(measuringInstruments.map((inst) => dash(inst?.calibration_code)));
  const instrumentNotes = numberList(measuringInstruments.map((inst) => dash(inst?.note)));

  const earthLabels = numberList(earth.map((row) => dash(row?.label)));
  const earthValues = numberList(earth.map((row) => (row?.valueOhm ? `${row.valueOhm} Ω` : "-")));
  const earthInstrument = numberList(
    earth.map((row) => dash(row?.instrumentName || measuringInstruments.find((inst) => String(inst?.id) === String(row?.instrumentId))?.name))
  );
  const earthNotes = numberList(earth.map((row) => dash(row?.note)));

  const continuityLabels = numberList(continuity.map((row) => dash(row?.label)));
  const continuityValues = numberList(continuity.map((row) => dash(row?.value)));
  const continuityNotes = numberList(continuity.map((row) => dash(row?.note)));

  const spdLocations = numberList(spd.map((row) => dash(row?.location)));
  const spdTypes = numberList(spd.map((row) => dash(row?.type)));
  const spdResults = numberList(spd.map((row) => dash(row?.result)));
  const spdNotes = numberList(spd.map((row) => dash(row?.note)));

  const visualItems = numberList(visual.map((row) => dash(row?.text)));
  const visualStates = numberList(visual.map((row) => (row?.ok ? "Vyhovuje" : "Nevyhovuje")));
  const visualNotes = numberList(visual.map((row) => dash(row?.note)));

  const defectDescriptions = numberList(defects.map((row) => dash(row?.description)));
  const defectStandards = numberList(
    defects.map((row) => dash(row?.standard && row?.article ? `${row.standard} / ${row.article}` : row?.standard || row?.article))
  );
  const defectRecommendations = numberList(defects.map((row) => dash(row?.recommendation || row?.remedy)));

  const scopeChecks: string[] = Array.isArray(lps.scopeChecks) ? lps.scopeChecks : [];
  const scopeLabels: Record<string, string> = {
    vnejsi: "Vnější ochrana před bleskem",
    vnitrni: "Vnitřní ochrana před bleskem",
    uzemneni: "Uzemnění",
    pospojovani: "Ekvipotenciální pospojování",
    spd: "SPD / přepěťová ochrana",
  };
  const scopeText = scopeChecks.map((key) => scopeLabels[key] || key).filter(Boolean).join(", ");

  return {
    REVISION_TYPE: dash(safe.typRevize),
    EVIDENCE_NUMBER: dash(safe.evidencni),
    PROJECT_ID: dash(lps.projectNo || safe.projectId),
    OBJECT_NAME: dash(safe.objekt),
    OBJECT_ADDRESS: dash(safe.adresa),
    OBJECT_DESCRIPTION: dash(lps.reportText || safe.extraNotes),
    CLIENT_NAME: dash(safe.objednatel),
    CLIENT_ADDRESS: dash(safe.clientAddress),
    CLIENT_IC: dash(safe.clientIco),
    CLIENT_DIC: dash(safe.clientDic),
    OBJECT_TYPE: dash(lps.objectTypeOther || lps.objectType),
    ORDER_DESCRIPTION: dash(lps.orderDescription || safe.orderDescription),
    OPERATOR_NAME: dash(lps.owner),
    PROJECT_BY: dash(lps.projectBy),
    PROJECT_NO: dash(lps.projectNo),
    TECH_NAME: dash(safe.technicianName),
    TECH_COMPANY: dash(safe.technicianCompanyName),
    TECH_ICO: dash(safe.technicianCompanyIco),
    TECH_DIC: dash(safe.technicianCompanyDic),
    TECH_PHONE: dash(safe.technicianPhone),
    TECH_EMAIL: dash(safe.technicianEmail),
    TECH_ADDRESS: dash(safe.technicianCompanyAddress),
    TECH_CERTIFICATE: dash(safe.technicianCertificateNumber),
    TECH_AUTHORIZATION: dash(safe.technicianAuthorizationNumber),
    DATE_START: formatDate(safe.date_start),
    DATE_END: formatDate(safe.date_end),
    DATE_CREATED: formatDate(safe.date_created),
    NEXT_REVISION: formatDate(safe.conclusion?.validUntil || lps.nextRevision),
    PRIMARY_STANDARD: formatStandardName(lps.standard),
    LPS_CLASS: dash(lps.class),
    SPD_PROTECTION_INFO: spdProtection(lps.spdProtectionUsed),
    REVISION_SCOPE_TEXT: dash(scopeText),
    MEASUREMENT_METHOD: dash(lps.measurementMethod),
    SAFETY_STATUS:
      safe.conclusion?.safety === "able"
        ? "Zařízení je schopno bezpečného provozu"
        : safe.conclusion?.safety === "not_able"
        ? "Zařízení není schopno bezpečného provozu"
        : dash(safe.conclusion?.safety),
    CONCLUSION_TEXT: dash(safe.conclusion?.text),
    CONCLUSION_NOTE: dash(safe.conclusion?.note || lps.conclusionNote),
    SKETCH_NOTE: dash(lps.sketchNote),
    DOWN_CONDUCTORS_COUNT: dash(lps.downConductorsCountOther || lps.downConductorsCount),
    EARTHING_TYPE: dash(lps.earthingType),
    GROUND_MATERIAL: dash(lps.conductorMaterial || lps.earthingType),
    ROOF_TYPE: dash(lps.roofTypeOther || lps.roofType),
    ROOF_COVER: dash(lps.roofCoverOther || lps.roofCover),
    SOIL_TYPE: dash(lps.soilType),
    WEATHER_CONDITIONS: dash(lps.weather || lps.weatherConditions),
    MEASURING_INSTRUMENTS: measuringInstruments.length ? "Seznam použitých přístrojů:" : "Bez záznamu.",
    INSTRUMENT_NAME: instrumentNames,
    INSTRUMENT_MEASUREMENT: instrumentSerials,
    INSTRUMENT_CAL_LIST: instrumentCal,
    INSTRUMENT_NOTE: instrumentNotes,
    EARTH_MEASUREMENTS: earth.length ? "Měření zemních odporů bylo provedeno." : "Měření zemních odporů nebylo zadáno.",
    GROUND_LABEL: earthLabels,
    GROUND_VALUE: earthValues,
    GROUND_INSTRUMENT: earthInstrument,
    GROUND_NOTE: earthNotes,
    CONTINUITY_LABEL: continuityLabels,
    CONTINUITY_VALUE: continuityValues,
    CONTINUITY_NOTE: continuityNotes,
    SPD_LOCATION: spdLocations,
    SPD_TYPE: spdTypes,
    SPD_RESULT: spdResults,
    SPD_NOTE: spdNotes,
    VISUAL_CHECKS: visual.length ? "Byla provedena vizuální kontrola." : "Bez záznamu.",
    VISUAL_ITEM: visualItems,
    VISUAL_STATE: visualStates,
    VISUAL_NOTE: visualNotes,
    DEFECTS: defects.length ? "Byly zjištěny závady." : "Bez závad.",
    DEFECT_DESCRIPTION: defectDescriptions,
    DEFECT_STANDARD: defectStandards,
    DEFECT_RECOMMENDATION: defectRecommendations,
    DISTRIBUTION_LIST: dash(lps.distributionList),
    SIGNATURE_CITY: dash(lps.signatureCity || safe.signatureCity),
    SIGNATURE_DATE: formatDate(safe.date_created),
  };
}

function dash(value: any): string {
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

async function fetchBinary(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} při načítání ${url}`);
  return await res.arrayBuffer();
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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

  let docXml = docFile.asText();
  if (!docXml.includes("[[LPS_SKETCH_IMAGE]]")) return false;

  const docPrIds = Array.from(docXml.matchAll(/wp:docPr[^>]+id="(\d+)"/g)).map((m) => Number(m[1]));
  const nextDocPrId = docPrIds.length ? Math.max(...docPrIds) + 1 : 1;

  const relsXml = relsFile.asText();
  const relIds = Array.from(relsXml.matchAll(/Id="rId(\d+)"/g)).map((m) => Number(m[1]));
  const nextRelId = relIds.length ? Math.max(...relIds) + 1 : 1;
  const relId = `rId${nextRelId}`;
  const relXml = `<Relationship Id="${relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/lps_sketch.${extension}"/>`;
  const updatedRels = relsXml.replace("</Relationships>", `${relXml}</Relationships>`);
  zip.file(relsPath, updatedRels);

  const drawingXml = buildDrawingXml(relId, nextDocPrId, dimensions);
  const paragraphRegex = /<w:p[^>]*>[\s\S]*?\[\[LPS_SKETCH_IMAGE\]\][\s\S]*?<\/w:p>/;
  if (paragraphRegex.test(docXml)) {
    docXml = docXml.replace(paragraphRegex, `<w:p>${drawingXml}</w:p>`);
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
  docXml = docXml.replace(paragraphRegex, "");
  docXml = docXml.replace("[[LPS_SKETCH_IMAGE]]", "");
  zip.file(docPath, docXml);
}

function buildDrawingXml(relId: string, docPrId: number, dimensions?: { width: number; height: number }) {
  const size = calculateImageDimensions(dimensions);
  return `<w:r><w:rPr/><w:drawing xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
    <wp:inline distT="0" distB="0" distL="0" distR="0">
      <wp:extent cx="${size.width}" cy="${size.height}"/>
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
                <a:ext cx="${size.width}" cy="${size.height}"/>
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
  };
  const contentType = map[extension] || `image/${extension}`;
  let xml = file.asText();
  if (xml.includes(`Extension="${extension}"`)) return;
  xml = xml.replace("</Types>", `<Default Extension="${extension}" ContentType="${contentType}"/></Types>`);
  zip.file(contentTypesPath, xml);
}

async function measureImageDimensions(dataUrl?: string) {
  if (!dataUrl || typeof Image === "undefined") return undefined;
  return new Promise<{ width: number; height: number } | undefined>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = img.naturalHeight / img.naturalWidth || 0.7;
      let width = Math.min(img.naturalWidth * EMU_PER_PIXEL, MAX_IMAGE_WIDTH_EMU);
      let height = width * ratio;
      resolve({ width, height });
    };
    img.onerror = () => resolve(undefined);
    img.src = dataUrl;
  });
}

function calculateImageDimensions(dimensions?: { width: number; height: number }) {
  if (!dimensions) return { width: 4572000, height: 3200400 };
  let width = dimensions.width;
  let height = dimensions.height;
  if (width > MAX_IMAGE_WIDTH_EMU) {
    const ratio = height / width;
    width = MAX_IMAGE_WIDTH_EMU;
    height = width * ratio;
  }
  return { width, height };
}
