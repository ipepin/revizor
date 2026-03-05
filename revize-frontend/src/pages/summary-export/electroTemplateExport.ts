import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { saveAs } from "file-saver";

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
  revId?: string | undefined;
  templateUrl?: string;
};

const DEFAULT_TEMPLATE_URL = "/templates/elektro_rz_template.docx";

const dash = (value: any) => {
  const text = String(value ?? "").trim();
  return text || "";
};

const joinList = (items: any[] | undefined) =>
  (Array.isArray(items) ? items : [])
    .map((item) => dash(item))
    .filter(Boolean)
    .join(", ");

const formatSafety = (value: string) => {
  if (value === "able") return "Elektrická instalace je z hlediska bezpečnosti schopna provozu";
  if (value === "not_able") return "Elektrická instalace není z hlediska bezpečnosti schopna provozu";
  return dash(value);
};

const formatComponentLevel = (level: any) => {
  const n = Number(level ?? 0);
  return Number.isFinite(n) ? String(Math.max(0, n)) : "0";
};

async function fetchBinary(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Šablonu se nepodařilo načíst (${res.status}). Ověřte soubor ${url}.`);
  }
  return await res.arrayBuffer();
}

function buildTemplateData({ safeForm, technician, normsAll, usedInstruments, revId }: TemplateArgs) {
  const mericiPristroje = (usedInstruments || []).map((item) => ({
    nazev: dash(item.name),
    mereni: dash(item.measurement_text),
    kalibrace: dash(item.calibration),
    serial: dash(item.serial),
    platnost_kalibrace: dash(item.calibration_valid_until),
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

  const rozvadece = (safeForm?.boards || []).map((board: any) => ({
    nazev: dash(board?.name),
    vyrobce: dash(board?.vyrobce),
    typ: dash(board?.typ),
    vyrobni_cislo: dash(board?.vyrobniCislo),
    napeti: dash(board?.napeti),
    proud: dash(board?.proud),
    ip: dash(board?.ip),
    odpor: dash(board?.odpor),
    umisteni: dash(board?.umisteni),
    komponenty: (Array.isArray(board?.komponenty) ? board.komponenty : []).map((component: any) => ({
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
      poznamka: dash(component?.poznamka ?? component?.pozn ?? component?.note),
    })),
  }));

  const mistnosti = (safeForm?.rooms || []).map((room: any) => ({
    nazev: dash(room?.name),
    poznamka: dash(room?.details),
    prvky: (Array.isArray(room?.devices) ? room.devices : []).map((device: any) => ({
      typ: dash(device?.typ),
      pocet: dash(device?.pocet),
      dimenze: dash(device?.dimenze),
      riso: dash(device?.riso),
      ochrana: dash(device?.ochrana),
      podrobnosti: dash(device?.podrobnosti || device?.note),
    })),
  }));

  const zavady = (safeForm?.defects || []).map((defect: any) => ({
    popis: dash(defect?.description),
    norma: dash(defect?.standard),
    clanek: dash(defect?.article),
  }));

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

    zaver_text: dash(safeForm?.conclusion?.text),
    zaver_bezpecnost: formatSafety(safeForm?.conclusion?.safety),
    pristi_revize: dash(safeForm?.conclusion?.validUntil),
  };
}

export async function renderAndDownloadElectroTemplateDocx(args: TemplateArgs) {
  const buf = await fetchBinary(args.templateUrl || DEFAULT_TEMPLATE_URL);

  let zip: PizZip;
  try {
    zip = new PizZip(buf);
  } catch (error) {
    console.error("[electroTemplateExport] PizZip error:", error);
    throw new Error("Soubor šablony není validní .docx. Otevřete ho ve Wordu a uložte znovu.");
  }

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
  });

  try {
    doc.render(buildTemplateData(args));
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
