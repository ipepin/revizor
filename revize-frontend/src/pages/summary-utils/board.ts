// src/pages/summary-utils/board.ts

/** Zploští strom komponent na ploché pole s úrovní (_level) */
export function normalizeComponents(raw: any[]): any[] {
  const items = Array.isArray(raw) ? raw : [];

  if (items.some((k) => Array.isArray(k?.children) && k.children.length)) {
    const out: any[] = [];
    const walk = (arr: any[], level: number) => {
      arr.forEach((n) => {
        out.push({ ...n, _level: level });
        if (Array.isArray(n.children) && n.children.length) walk(n.children, level + 1);
      });
    };
    walk(items, 0);
    return out;
  }

  const pidOf = (x: any) => x?.parentId ?? x?.parent_id ?? x?.parent ?? null;
  const idOf = (x: any) => String(x?.id ?? x?.komponentaId ?? x?._id ?? "");
  if (items.some((k) => pidOf(k) != null)) {
    const children = new Map<string, any[]>();
    const ROOT = "__root__";
    for (const it of items) {
      const key = pidOf(it) == null ? ROOT : String(pidOf(it));
      (children.get(key) || children.set(key, []).get(key)!).push(it);
    }
    const sortByOrder = (arr: any[]) =>
      arr.sort((a, b) => (a.order ?? a.poradi ?? a.index ?? 0) - (b.order ?? b.poradi ?? b.index ?? 0));

    const out: any[] = [];
    const dfs = (arr: any[], level: number) => {
      sortByOrder(arr).forEach((n) => {
        out.push({ ...n, _level: level });
        const kids = children.get(idOf(n)) || [];
        if (kids.length) dfs(kids, level + 1);
      });
    };
    dfs(children.get(ROOT) || [], 0);
    return out;
  }

  return items.map((k) => ({ ...k, _level: Number(k.uroven ?? k.level ?? k.depth ?? 0) || 0 }));
}

/** Vykreslí textový prefix podle úrovně ve stromu */
export function depthPrefix(level: number) {
  if (level <= 0) return "";
  if (level === 1) return "└─ ";
  return "│ ".repeat(level - 1) + "└─ ";
}

/** Bezpečný výběr hodnoty z různých potenciálních míst v objektu měření */
export function pick(c: any, keys: string[]) {
  for (const k of keys) {
    const v =
      c?.[k] ??
      c?.result?.[k] ??
      c?.result?.value?.[k] ??
      c?.zkouska?.[k] ??
      c?.mereni?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return "";
}

/** Formátovací pomocník pro segment textu (label: value [unit]) */
export function seg(label: string, val: any, unit = "", transform?: (x: any) => string): string {
  if (val === "" || val === undefined || val === null) return "";
  const text = transform ? transform(val) : String(val);
  return `${label}: ${unit ? `${text} ${unit}` : text}`;
}

/** Normalizace čísel (např. "16,5" → "16.5") */
export const num = (x: any) => {
  const s = String(x).replace(",", ".").trim();
  const n = Number(s);
  return Number.isFinite(n) ? String(n) : String(x);
};

/** Sestaví zobrazený název komponenty: Název + Výborce + Typ */
export function buildComponentTitle(c: any): string {
  const name = pick(c, ["nazev", "name"]);
  const manufacturer = pick(c, ["vyrobce", "manufacturer", "maker", "popis", "description"]);
  const typ = pick(c, ["typ", "type", "model"]);
  return [name, manufacturer, typ].filter((v) => String(v || "").trim()).join(" ");
}


/** Poskládá “inline” řádek parametrů komponenty (typ • póly • dim. • Riso • Zs • t • IΔ • Uᵢ • Pozn.) */
export function buildComponentLine(c: any): string {
  const parts: string[] = [];
  parts.push(seg("typ",  pick(c, ["typ", "type", "druh"])));
  parts.push(seg("póly", pick(c, ["poles", "poly", "pocet_polu", "pocetPolu"])));
  parts.push(seg("dim.", pick(c, ["dimenze", "dim", "prurez"])));
  parts.push(seg("Riso", pick(c, ["riso", "Riso", "izolace", "insulation"]), "MΩ", num));
  parts.push(seg("Zs",   pick(c, ["zs", "Zs", "ochrana", "smycka", "loop_impedance"]), "Ω", num));
  parts.push(seg("t",    pick(c, ["t","time","trip_time","rcd_time","vybavovaci_cas","vybavovaciCas","cas_vybaveni","cas"]), "ms", num));
  parts.push(seg("IΔ",   pick(c, ["ifi","i_fi","iDelta","i_delta","i_delta_n","idn","IΔn","IΔ","rcd_trip_current","vybavovaci_proud","vybavovaciProud","trip_current"]), "mA", num));
  parts.push(seg("Uᵢ",   pick(c, ["ui","u_i","ut","u_touch","dotykove_napeti"]), "V", num));
  parts.push(seg("Název obvodu", pick(c, ["poznamka","pozn","note","poznámka"])));
  return parts.filter(Boolean).join("   •   ");
}
