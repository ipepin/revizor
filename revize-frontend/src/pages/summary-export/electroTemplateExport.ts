import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import ImageModuleCtor from "open-docxtemplater-image-module";
import { saveAs } from "file-saver";
import { htmlToBulletText } from "../summary-utils/text";
import { defectFullText, defectNormSuffix } from "../summary-utils/defects";
import { buildRoomDeviceSummary } from "../summary-utils/rooms";
import {
  prepareDefectTemplateImages,
  type DefectPhotoMeta,
  type DocxTemplateImageValue,
} from "./docxtemplaterImages";

type TemplateArgs = {
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
  usedInstruments: Array<{
    id: string;
    name: string;
    serial: string;
    calibration: string;
    measurement_text?: string;
    calibration_valid_until?: string;
    note?: string;
  }>;
  defectPhotos?: DefectPhotoMeta[];
  revId?: string | undefined;
  templateUrl?: string;
};

const DEFAULT_TEMPLATE_URL = "/templates/elektro_rz_template_compact_conditional_images_boxed.docx";
const ImageModule = (ImageModuleCtor as any).default ?? (ImageModuleCtor as any);

function patchLegacyImageModuleCompatibility() {
  const proto = ImageModule?.prototype as any;
  if (!proto || proto.__revizeCompatPatched || typeof proto.render !== "function") {
    return;
  }

  const originalRender = proto.render;
  proto.render = function patchedRender(part: any, options: any) {
    const scopeManager = options?.scopeManager;
    if (!scopeManager || typeof scopeManager.getValue !== "function") {
      return originalRender.call(this, part, options);
    }

    const originalGetValue = scopeManager.getValue.bind(scopeManager);
    scopeManager.getValue = (tag: string, meta?: any) => originalGetValue(tag, meta ?? { part });
    try {
      return originalRender.call(this, part, options);
    } finally {
      scopeManager.getValue = originalGetValue;
    }
  };
  proto.__revizeCompatPatched = true;
}
const OTHER_MANUFACTURER_NAME = "Ostatní";

const dash = (value: any) => {
  const text = String(value ?? "").trim();
  return text || "";
};

type SafetyState = "able" | "not_able" | "";

const normalizeSafety = (value: any): SafetyState => {
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
};

const joinList = (items: any[] | undefined) =>
  (Array.isArray(items) ? items : [])
    .map((item) => dash(item))
    .filter(Boolean)
    .join(", ");

const formatSafety = (value: any) => {
  const state = normalizeSafety(value);
  if (state === "able") return "Elektrická instalace vyhovuje požadavkům příslušných norem a je schopna bezpečného provozu.";
  if (state === "not_able") return "Elektrická instalace nevyhovuje požadavkům příslušných norem a není schopna bezpečného provozu.";
  return dash(value);
};

const formatComponentLevel = (level: any) => {
  const n = Number(level ?? 0);
  return Number.isFinite(n) ? String(Math.max(0, n)) : "0";
};

const labeled = (label: string, value: any, unit = "") => {
  const text = dash(value);
  return text ? `${label}: ${text}${unit ? ` ${unit}` : ""}` : "";
};

const joinLines = (...lines: Array<string | undefined>) =>
  lines
    .map((line) => String(line || "").trim())
    .filter(Boolean)
    .join("\n");

function mapBoardComponent(component: any) {
  const manufacturerText = dash(component?.popis || component?.description);
  const manufacturerDisplay = manufacturerText === OTHER_MANUFACTURER_NAME ? "" : manufacturerText;

  return {
    popis_typ_text: joinLines(
      [manufacturerDisplay, dash(component?.typ || component?.type || component?.druh)]
        .filter(Boolean)
        .join(" ")
    ),
    uroven: formatComponentLevel(component?._level ?? component?.level ?? component?.depth),
    nazev: dash(component?.nazev || component?.name),
    popis: dash(component?.popis || component?.description),
    typ: dash(component?.typ || component?.type || component?.druh),
    poly: dash(component?.poles || component?.poly || component?.pocet_polu || component?.pocetPolu),
    dimenze: dash(component?.dimenze || component?.dim || component?.prurez),
    riso: dash(component?.riso ?? component?.Riso ?? component?.izolace ?? component?.insulation),
    zs: dash(component?.ochrana ?? component?.zs ?? component?.Zs ?? component?.loop_impedance),
    cas_ms: dash(
      component?.vybavovaciCasMs ??
        component?.vybavovaci_cas_ms ??
        component?.rcd_time ??
        component?.trip_time ??
        component?.vybavovaciCas ??
        component?.cas_vybaveni
    ),
    idelta_ma: dash(
      component?.vybavovaciProudmA ??
        component?.vybavovaci_proud_ma ??
        component?.rcd_trip_current ??
        component?.trip_current ??
        component?.i_fi ??
        component?.ifi
    ),
    parametry_text: joinLines(
      labeled("Póly", component?.poles || component?.poly || component?.pocet_polu || component?.pocetPolu),
      labeled("Dim.", component?.dimenze || component?.dim || component?.prurez)
    ),
    mereni_text: joinLines(
      labeled("Riso", component?.riso ?? component?.Riso ?? component?.izolace ?? component?.insulation, "MΩ"),
      labeled("Zs", component?.ochrana ?? component?.zs ?? component?.Zs ?? component?.loop_impedance, "Ω"),
      [labeled(
        "t",
        component?.vybavovaciCasMs ??
          component?.vybavovaci_cas_ms ??
          component?.rcd_time ??
          component?.trip_time ??
          component?.vybavovaciCas ??
          component?.cas_vybaveni,
        "ms"
      ), labeled(
        "IΔ",
        component?.vybavovaciProudmA ??
          component?.vybavovaci_proud_ma ??
          component?.rcd_trip_current ??
          component?.trip_current ??
          component?.i_fi ??
          component?.ifi,
        "mA"
      )]
        .filter(Boolean)
        .join(" | ")
    ),
    poznamka: dash(component?.poznamka ?? component?.pozn ?? component?.note),
  };
}

function buildBoardRows(board: any) {
  const components = Array.isArray(board?.komponenty) ? board.komponenty : [];
  const configuredRows = Array.isArray(board?.rows) ? board.rows : [];
  const rowIdsFromComponents = Array.from(
    new Set(
      components
        .map((component: any) => Number(component?.rowId ?? 1))
        .filter((rowId: number) => Number.isFinite(rowId))
    )
  );

  const rows =
    configuredRows.length > 0
      ? configuredRows
      : (rowIdsFromComponents.length ? rowIdsFromComponents : [1]).map((rowId, index) => ({
          id: rowId,
          name: `Řada ${index + 1}`,
        }));

  return rows.map((row: any, index: number) => {
    const rowId = Number(row?.id ?? index + 1);
    const label = dash(row?.name) || `Řada ${index + 1}`;
    const rowComponents = components
      .filter((component: any) => Number(component?.rowId ?? 1) === rowId)
      .sort((a: any, b: any) => (Number(a?.order ?? 0) || 0) - (Number(b?.order ?? 0) || 0))
      .map(mapBoardComponent);

    return {
      id: String(rowId),
      nazev: label,
      komponenty: rowComponents,
    };
  });
}

function buildFlatBoardComponentsWithRows(board: any) {
  return buildBoardRows(board).flatMap((row) => {
    const heading = {
      popis_typ_text: "",
      uroven: "0",
      nazev: row.nazev,
      popis: "",
      typ: "",
      poly: "",
      dimenze: "",
      riso: "",
      zs: "",
      cas_ms: "",
      idelta_ma: "",
      parametry_text: "",
      mereni_text: "",
      poznamka: "",
    };

    return [heading, ...row.komponenty];
  });
}

function pairItems<T>(items: T[]) {
  const rows: Array<[T | null, T | null]> = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push([items[i] ?? null, items[i + 1] ?? null]);
  }
  return rows;
}

async function fetchBinary(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Šablonu se nepodařilo načíst (${res.status}). Ověřte soubor ${url}.`);
  }
  return await res.arrayBuffer();
}

function buildTemplateData(
  { safeForm, technician, normsAll, usedInstruments, defectPhotos = [], revId }: TemplateArgs,
  defectTemplateImages: Map<number, DocxTemplateImageValue>
) {
  const safetyState = normalizeSafety(safeForm?.conclusion?.safety);
  const safetyText = formatSafety(safetyState);
  const nextRevision =
    safetyState === "not_able" ? "Po odstranění závad" : dash(safeForm?.conclusion?.validUntil);

  const mericiPristroje = (usedInstruments || []).map((item) => ({
    nazev: dash(item.name),
    mereni: dash(item.measurement_text),
    kalibrace: dash(item.calibration),
    serial: dash(item.serial),
    poznamka: dash(item.note),
  }));

  const ukonyProhlidky = (safeForm?.performedTasks || []).map((text: any) => ({
    text: dash(text),
  }));

  const zkousky = Object.entries(safeForm?.tests || {}).map(([name, value]: [string, any]) => {
    let note = "";
    if (value == null) note = "";
    else if (typeof value === "string") note = value;
    else if (typeof value === "object") note = value.note ?? value.result?.note ?? value.result ?? "";
    else note = String(value);

    return {
      nazev: dash(name),
      poznamka: dash(note),
    };
  });

  const rozvadece = (safeForm?.boards || []).map((board: any) => {
    const rady = buildBoardRows(board);

    return {
      nazev: dash(board?.name),
      vyrobce: dash(board?.vyrobce),
      typ: dash(board?.typ),
      vyrobni_cislo: dash(board?.vyrobniCislo),
      napeti: dash(board?.napeti),
      proud: dash(board?.proud),
      ip: dash(board?.ip),
      odpor: dash(board?.odpor),
      umisteni: dash(board?.umisteni),
      poznamky_html: String(board?.poznamkyHtml || board?.poznamky || "").trim(),
      poznamky_text: dash(htmlToBulletText(board?.poznamkyHtml || board?.poznamky || "")),
      rady,
      komponenty: buildFlatBoardComponentsWithRows(board),
    };
  });

  const mistnosti = (safeForm?.rooms || []).map((room: any) => ({
    nazev: dash(room?.name),
    poznamka: dash(room?.details),
    prvky: (Array.isArray(room?.devices) ? room.devices : []).map((device: any) => {
      const item = buildRoomDeviceSummary(device, "");
      return ({
      typ: dash(device?.typ),
      pocet: dash(device?.pocet),
      dimenze: dash(device?.dimenze),
      riso: dash(device?.riso),
      ochrana: dash(device?.ochrana),
      podrobnosti: dash(device?.podrobnosti || device?.note),
      prvek_text: item.prvek,
      prvek_subtext: item.prvekSubtext,
      parametry_text: item.parametry,
      mereni_text: item.mereni,
      poznamka: item.poznamka,
    })}),
  }));

  const zavady = (safeForm?.defects || []).map((defect: any, index: number) => {
    const assignedPhotos = defectPhotos.filter((photo) => photo?.defect_uid && photo.defect_uid === defect?.uid);
    const preparedPhotos = assignedPhotos
      .map((photo) => {
        const image = defectTemplateImages.get(photo.id);
        if (!image) return null;
        return {
          image,
          popis: dash(photo?.caption),
        };
      })
      .filter(Boolean) as Array<{ image: DocxTemplateImageValue; popis: string }>;

    return {
      poradi: String(index + 1),
      popis_text: dash(defect?.description),
      popis_suffix: dash(defectNormSuffix(defect)),
      popis: dash(defectFullText(defect)),
      popis_plny: dash(defectFullText(defect)),
      norma: dash(defect?.standard),
      clanek: dash(defect?.article),
      fotky_pocet: String(assignedPhotos.length || 0),
      fotky_popisky: assignedPhotos.map((photo, photoIndex) => ({
        poradi: String(photoIndex + 1),
        popis: dash(photo?.caption),
        soubor: dash(photo?.original_name),
      })),
      fotky: preparedPhotos,
      fotky_radky: pairItems(preparedPhotos).map(([leva, prava]) => ({
        leva_image: leva?.image ?? null,
        leva_popis: leva?.popis ?? "",
        prava_image: prava?.image ?? null,
        prava_popis: prava?.popis ?? "",
      })),
      fotky_text: assignedPhotos
        .map((photo, photoIndex) => {
          const caption = dash(photo?.caption);
          return caption ? `${photoIndex + 1}. ${caption}` : "";
        })
        .filter(Boolean)
        .join("\n"),
    };
  });
  const zavadyTextRaw =
    String(safeForm?.defectsRichText || "").trim() ||
    (safeForm?.defects || [])
      .map((defect: any, index: number) => {
        return `${index + 1}. ${defectFullText(defect)}`;
      })
      .join("\n");
  const zavadyText = dash(htmlToBulletText(zavadyTextRaw));

  const popisObjektu = dash(htmlToBulletText(safeForm?.inspectionDescription));

  return {
    evidencni: dash(safeForm?.evidencni || revId),
    uuid: dash(safeForm?.uuid),
    typ_revize: dash(safeForm?.typRevize),
    datum_zahajeni: dash(safeForm?.date_start),
    datum_ukonceni: dash(safeForm?.date_end),
    datum_vyhotoveni: dash(safeForm?.date_created),

    objekt: dash(safeForm?.objekt),
    adresa: dash(safeForm?.adresa),
    objednatel: dash(safeForm?.objednatel),

    technik_jmeno: dash(technician?.jmeno),
    technik_osvedceni: dash(technician?.cislo_osvedceni),
    technik_opravneni: dash(technician?.cislo_opravneni),
    technik_firma: dash(technician?.firma),
    technik_ico: dash(technician?.ico),
    technik_dic: dash(technician?.dic),
    technik_adresa: dash(technician?.adresa),

    montazni_firma: dash(safeForm?.montFirma),
    montazni_opravneni: dash(safeForm?.montFirmaAuthorization),

    sit: dash(safeForm?.sit),
    napeti: dash(safeForm?.voltage),
    dokumentace: dash(safeForm?.documentation),
    prostredi: dash(safeForm?.environment),
    extra_poznamky: dash(safeForm?.extraNotes),
    popis_objektu: popisObjektu,
    popis_revidovaneho_objektu: popisObjektu,
    inspection_description: popisObjektu,

    ochrana_zakladni: joinList(safeForm?.protection_basic),
    ochrana_pri_poruse: joinList(safeForm?.protection_fault),
    ochrana_doplnkova: joinList(safeForm?.protection_additional),

    normy_text: normsAll?.length ? normsAll.join(", ") : "",

    merici_pristroje: mericiPristroje,
    ukony_prohlidky: ukonyProhlidky,
    zkousky,
    rozvadece,
    mistnosti,
    zavady,
    zavady_text: zavadyText,
    ident: {
      popis_objektu: popisObjektu,
    },

    zaver_text: dash(safeForm?.conclusion?.text),
    zaver_stav: safetyState,
    zaver_je_kladny: safetyState === "able",
    zaver_je_negativni: safetyState === "not_able",
    zaver_bezpecnost: safetyText,
    zaver_bezpecnost_normalni_rows: safetyState === "able" ? [{ text: safetyText }] : [],
    zaver_bezpecnost_cervena_rows: safetyState === "not_able" ? [{ text: safetyText }] : [],
    zaver_bezpecnost_kladna_rows: safetyState === "able" ? [{ text: safetyText }] : [],
    zaver_bezpecnost_negativni_rows: safetyState === "not_able" ? [{ text: safetyText }] : [],
    pristi_revize: nextRevision,
    dalsi_revize: nextRevision,
  };
}

export async function renderAndDownloadElectroTemplateDocx(args: TemplateArgs) {
  const buf = await fetchBinary(args.templateUrl || DEFAULT_TEMPLATE_URL);
  const defectTemplateImages = await prepareDefectTemplateImages(args.revId, args.defectPhotos || []);
  patchLegacyImageModuleCompatibility();

  let zip: PizZip;
  try {
    zip = new PizZip(buf);
  } catch (error) {
    console.error("[electroTemplateExport] PizZip error:", error);
    throw new Error("Soubor šablony není validní .docx. Otevřete ho ve Wordu a uložte znovu.");
  }

  const imageModule = new ImageModule({
    centered: false,
    fileType: "docx",
    getImage(tagValue: DocxTemplateImageValue | null) {
      return tagValue?.data ?? null;
    },
    getSize(_img: Uint8Array | ArrayBuffer | null, tagValue: DocxTemplateImageValue | null) {
      return [tagValue?.width || 1, tagValue?.height || 1];
    },
  });

  const doc = new Docxtemplater(zip, {
    modules: [imageModule],
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
  });

  try {
    doc.render(buildTemplateData(args, defectTemplateImages));
  } catch (error: any) {
    console.error("[electroTemplateExport] Render error:", error);
    const errors =
      error?.properties?.errors?.map((item: any) => {
        const explanation = item?.properties?.explanation || item?.message || "Chyba při renderu";
        const tag = item?.properties?.xtag ? ` [${item.properties.xtag}]` : "";
        return `- ${explanation}${tag}`;
      }) || [];
    throw new Error(errors.length ? errors.join("\n") : error?.message || "Šablonu se nepodařilo vyplnit.");
  }

  const out = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const fileId = String(args.safeForm?.evidencni || args.revId || "sablona");
  saveAs(out, `revizni_zprava_sablona_${fileId}.docx`);
}
