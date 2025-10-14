import React, { useEffect, useMemo, useState } from "react";
import { Info, Plus, Trash2, Printer, CheckCircle2, AlertTriangle } from "lucide-react";

/* ========= Typy ========= */
type Group = "A" | "B" | "C";

export type SpaceRecord = {
  id: string;
  name: string;
  note?: string;
  selections: Record<string, string | undefined>; // (AA|AB|…)->(AA1|AB5|…)
  measures?: string;
  intervals?: string;
};

export type CommitteeMember = { role: "Předseda" | "Člen"; name: string };

export type ProtocolData = {
  objectName: string;
  address?: string;
  preparedBy?: string;
  date?: string;
  committee: CommitteeMember[];
  spaces: SpaceRecord[];
};

/* ===== JSON v public/vv_data/vv_data.json (plochý slovník AA1:{...}) ===== */
type FlatClassEntry = {
  group: Group;
  name: string;        // název vlivu pro celou kategorii (např. "Teplota okolí")
  meaning: string;     // význam/rozsah dané třídy
  normal: boolean;
  requirements: string[];
};
type FlatJson = Record<string, FlatClassEntry>;

type CategoryClass = { code: string; meaning: string; normal: boolean; requirements: string[] };
type Category = { group: Group; code: string; name: string; classes: CategoryClass[] };

/* ========= Helpery ========= */
const uuid = () => (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
const DEFAULT_MEASURES_HINT =
  "Doplň konkrétní technická opatření (IP, materiály, ochrany, značení, revizní body).";

const groupTitle = (g: Group) =>
  g === "A" ? "A – Podmínky prostředí" : g === "B" ? "B – Využití a rizika" : "C – Stavební vlastnosti";

function emptyProtocol(): ProtocolData {
  return {
    objectName: "",
    address: "",
    preparedBy: "",
    date: new Date().toISOString().slice(0, 10),
    committee: [{ role: "Předseda", name: "" }],
    spaces: [{ id: uuid(), name: "Hlavní prostor", selections: {}, measures: "", intervals: "" }],
  };
}

/** Převede plochý JSON na kategorie (AA, AB… -> list tříd AA1….) */
function buildCategories(flat: FlatJson): Category[] {
  const map = new Map<string, Category>();
  Object.entries(flat).forEach(([classCode, entry]) => {
    // validní kód třídy: dvě písmena + 1+ alfanum znaků (např. BE2N1)
    if (!/^[A-Z]{2}[0-9A-Z]+$/.test(classCode)) return;

    const catCode = classCode.slice(0, 2); // "AA" | "BE" ...
    const cat = map.get(catCode) ?? {
      group: entry.group,
      code: catCode,
      name: entry.name,
      classes: [],
    };
    // jméno kategorie bereme z entry.name (u všech tříd stejné)
    cat.name = entry.name || cat.name;
    cat.classes.push({
      code: classCode,
      meaning: entry.meaning,
      normal: entry.normal,
      requirements: Array.isArray(entry.requirements) ? entry.requirements : [],
    });
    map.set(catCode, cat);
  });

  const orderGroup = (g: Group) => ({ A: 0, B: 1, C: 2 }[g]);
  const categories = Array.from(map.values()).sort(
    (a, b) => orderGroup(a.group) - orderGroup(b.group) || a.code.localeCompare(b.code)
  );
  categories.forEach((c) =>
    c.classes.sort((x, y) => {
      // seřadit přirozeně podle numerické části (BE2N1 → 2, N1 je dodatek – necháme za číslem)
      const nx = parseInt(x.code.slice(2), 10);
      const ny = parseInt(y.code.slice(2), 10);
      if (!Number.isNaN(nx) && !Number.isNaN(ny) && nx !== ny) return nx - ny;
      return x.code.localeCompare(y.code);
    })
  );
  return categories;
}

function useInfluences(jsonPath = "/vv_data/vv_data.json") {
  const [cats, setCats] = useState<Category[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${jsonPath}?v=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const j: unknown = await res.json();
        // očekáváme plochý slovník AA1:{...}
        if (!j || typeof j !== "object" || Array.isArray(j)) {
          throw new Error("Neplatná data: očekáván objekt AA1:{...} atd.");
        }
        const ok = Object.entries(j as any).every(([k, v]) => {
          return (
            typeof k === "string" &&
            /^[A-Z]{2}[0-9A-Z]+$/.test(k) &&
            v &&
            typeof (v as any).group === "string" &&
            typeof (v as any).name === "string" &&
            typeof (v as any).meaning === "string" &&
            typeof (v as any).normal === "boolean" &&
            Array.isArray((v as any).requirements)
          );
        });
        if (!ok) throw new Error("Neplatná data: chybí group/name/meaning/normal/requirements.");
        const built = buildCategories(j as FlatJson);
        if (alive) setCats(built);
      } catch (e: any) {
        if (alive) setErr(String(e?.message || e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [jsonPath]);

  return { cats, err };
}

/* ========= Komponenta ========= */
export default function VnejsiVlivyProtokol({
  value,
  onChange,
}: {
  value?: ProtocolData;
  onChange?: (data: ProtocolData) => void;
}) {
  const [data, setData] = useState<ProtocolData>(() => value ?? emptyProtocol());
  const { cats, err: loadErr } = useInfluences("/vv_data/vv_data.json");
  const [activeId, setActiveId] = useState<string>(data.spaces[0].id);

  useEffect(() => {
    if (value) setData(value);
  }, [value]);

  const active = useMemo(() => data.spaces.find((s) => s.id === activeId)!, [data.spaces, activeId]);

  const patch = (upd: Partial<ProtocolData>) => {
    const next = { ...data, ...upd } as ProtocolData;
    setData(next);
    onChange?.(next);
  };
  const updateSpace = (id: string, upd: Partial<SpaceRecord>) => {
    const next = { ...data, spaces: data.spaces.map((s) => (s.id === id ? { ...s, ...upd } : s)) } as ProtocolData;
    setData(next);
    onChange?.(next);
  };
  const addSpace = () => {
    const rec: SpaceRecord = { id: uuid(), name: `Prostor ${data.spaces.length + 1}`, selections: {}, measures: "", intervals: "" };
    const next = { ...data, spaces: [...data.spaces, rec] } as ProtocolData;
    setData(next); setActiveId(rec.id); onChange?.(next);
  };
  const removeSpace = (id: string) => {
    if (data.spaces.length === 1) return;
    const arr = data.spaces.filter((s) => s.id !== id);
    setData({ ...data, spaces: arr }); setActiveId(arr[0].id);
  };

  const exportPdf = () => {
    if (!cats) return;
    // validace – pro aktivní prostor musí být vybrána třída u všech kategorií
    const missing = cats.filter((c) => !active.selections[c.code]).map((c) => c.code);
    if (missing.length) { alert("Doplň výběr pro: " + missing.join(", ")); return; }
    window.print();
  };

  const selectedMeta = (cat: Category, sel?: string) => {
    if (!sel) return null;
    const c = cat.classes.find((x) => x.code === sel);
    return c ? { normal: c.normal, meaning: c.meaning, requirements: c.requirements } : null;
  };
  const normalsFor = (cat: Category) => cat.classes.filter(c => c.normal).map(c => c.code);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-800">
      {/* Toolbar */}
      <header className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-white/60 bg-white/80 border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          <div className="text-xl font-semibold">Protokol o určení vnějších vlivů</div>
          <div className="ml-auto flex gap-2">
            {/* Export JSON byl dříve – na přání už ne. Zůstává jen PDF/Print */}
            <button onClick={exportPdf} className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 border hover:shadow-sm">
              <Printer className="h-4 w-4" /> Export PDF
            </button>
          </div>
        </div>
      </header>

      {/* Print CSS – jedna A4 */}
      <style>{`
        @media print {
          @page { size: A4; margin: 16mm; }
          header, .no-print, .screen-only { display: none !important; }
          .print-sheet { display: block !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          table { border-collapse: collapse; }
          th, td { border: 1px solid #333; }
        }
      `}</style>

      {/* Chyba načtení JSON */}
      <div className="mx-auto max-w-6xl px-4 pt-4">
        {loadErr && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
            Nelze načíst <code>vv_data/vv_data.json</code>: {loadErr}.<br/>
            Editor je zablokován (možnosti se berou výhradně z JSON).
          </div>
        )}
      </div>

      {/* ===== FORM (jen pokud JSON načten) ===== */}
      {cats && (
        <div className="mx-auto max-w-6xl px-4 py-6 grid md:grid-cols-3 gap-4 screen-only">
          {/* Identifikace */}
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border p-4">
            <h2 className="font-semibold text-lg mb-3">Identifikace</h2>
            <div className="grid md:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm">Objekt / Název</span>
                <input className="border rounded-xl px-3 py-2" value={data.objectName} onChange={(e)=>patch({objectName:e.target.value})}/>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm">Adresa</span>
                <input className="border rounded-xl px-3 py-2" value={data.address||""} onChange={(e)=>patch({address:e.target.value})}/>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm">Zpracoval</span>
                <input className="border rounded-xl px-3 py-2" value={data.preparedBy||""} onChange={(e)=>patch({preparedBy:e.target.value})}/>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm">Datum</span>
                <input type="date" className="border rounded-xl px-3 py-2" value={data.date||""} onChange={(e)=>patch({date:e.target.value})}/>
              </label>
            </div>
          </div>

          {/* Komise */}
          <div className="bg-white rounded-2xl shadow-sm border p-4">
            <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">Komise <Info className="h-4 w-4 opacity-60"/></h2>
            <div className="space-y-2">
              {data.committee.map((m,i)=>(
                <div key={i} className="grid grid-cols-3 gap-2 items-center">
                  <select className="border rounded-xl px-2 py-2" value={m.role} onChange={(e)=>{
                    const next=[...data.committee]; next[i]={...m, role:e.target.value as CommitteeMember["role"]}; patch({committee:next});
                  }}>
                    <option value="Předseda">Předseda</option>
                    <option value="Člen">Člen</option>
                  </select>
                  <input className="border rounded-xl px-3 py-2 col-span-2" value={m.name} onChange={(e)=>{
                    const next=[...data.committee]; next[i]={...m, name:e.target.value}; patch({committee:next});
                  }} placeholder="Jméno a příjmení"/>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <button onClick={()=>patch({committee:[...data.committee,{role:"Člen",name:""}]})} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 border hover:shadow-sm"><Plus className="h-4 w-4"/>Přidat člena</button>
                {data.committee.length>1 && <button onClick={()=>patch({committee:data.committee.slice(0,-1)})} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 border hover:shadow-sm"><Trash2 className="h-4 w-4"/>Odebrat</button>}
              </div>
            </div>
          </div>

          {/* Prostory & editor */}
          <aside className="bg-white rounded-2xl shadow-sm border p-4 h-max md:sticky md:top-20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">Prostory</h2>
              <button onClick={addSpace} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 border hover:shadow-sm"><Plus className="h-4 w-4"/>Nový</button>
            </div>
            <div className="space-y-2">
              {data.spaces.map(s=>(
                <button key={s.id} onClick={()=>setActiveId(s.id)} className={`w-full text-left rounded-xl px-3 py-2 border hover:shadow-sm ${activeId===s.id ? "bg-slate-50 border-slate-300":""}`}>
                  <div className="font-medium">{s.name}</div>
                  {s.note && <div className="text-xs text-slate-500 line-clamp-2">{s.note}</div>}
                </button>
              ))}
            </div>
            {data.spaces.length>1 && (
              <button onClick={()=>removeSpace(activeId)} className="mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 border hover:shadow-sm"><Trash2 className="h-4 w-4"/>Smazat vybraný</button>
            )}
          </aside>

          <main className="md:col-span-2 bg-white rounded-2xl shadow-sm border p-4">
            <div className="grid md:grid-cols-2 gap-3 mb-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm">Název prostoru</span>
                <input className="border rounded-xl px-3 py-2" value={active.name} onChange={(e)=>updateSpace(active.id,{name:e.target.value})}/>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm">Poznámka</span>
                <input className="border rounded-xl px-3 py-2" value={active.note||""} onChange={(e)=>updateSpace(active.id,{note:e.target.value})}/>
              </label>
            </div>

            {/* Skupiny A/B/C */}
            {(["A","B","C"] as Group[]).map(grp=>(
              <section key={grp} className="mt-6">
                <h3 className="font-semibold mb-2 text-slate-700">{groupTitle(grp)}</h3>
                <div className="divide-y border rounded-xl">
                  {cats.filter(c=>c.group===grp).map(cat=>{
                    const sel = active.selections[cat.code];
                    const meta = selectedMeta(cat, sel||undefined);

                    return (
                      <div key={cat.code} className="p-3 grid md:grid-cols-[220px_1fr] gap-4">
                        <div className="font-medium flex items-center gap-2">
                          <span className="font-mono text-xs bg-slate-100 rounded px-1.5 py-0.5">{cat.code}</span>
                          <span className="text-slate-700">{cat.name}</span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {cat.classes.map(cls=>{
                              const checked = sel === cls.code;
                              const optionLabel = `${cls.code} — ${cat.name}${cls.meaning ? ` (${cls.meaning})` : ""}`;
                              return (
                                <label key={cls.code} className={`cursor-pointer inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm hover:shadow-sm ${checked ? "bg-blue-50 border-blue-300" : "bg-white"}`} title={cls.meaning}>
                                  <input
                                    type="radio"
                                    className="hidden"
                                    name={`sel-${active.id}-${cat.code}`}
                                    checked={checked}
                                    onChange={()=>updateSpace(active.id,{ selections:{ ...active.selections, [cat.code]: cls.code } })}
                                  />
                                  <span className="font-mono text-xs bg-slate-100 rounded px-1.5 py-0.5">{cls.code}</span>
                                  <span>{optionLabel}</span>
                                  <Info className="h-3.5 w-3.5 opacity-50" />
                                </label>
                              );
                            })}
                          </div>

                          {/* Panel s detaily */}
                          {sel && meta && (
                            <div className="rounded-xl border bg-slate-50 p-3 text-sm">
                              <div className="grid md:grid-cols-[160px_1fr] gap-2">
                                <div className="text-slate-600">Vybraná třída</div>
                                <div className="font-mono">{sel}</div>

                                <div className="text-slate-600">Normální vliv?</div>
                                <div>
                                  {meta.normal ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-4 w-4"/>Ano</span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-700"><AlertTriangle className="h-4 w-4"/>Ne</span>
                                  )}
                                </div>

                                <div className="text-slate-600">Význam</div>
                                <div>{meta.meaning || "—"}</div>

                                <div className="text-slate-600">Požadavky</div>
                                <div>
                                  {meta.requirements?.length ? (
                                    <ul className="list-disc ml-5 space-y-1">{meta.requirements.map((t,i)=><li key={i}>{t}</li>)}</ul>
                                  ) : "—"}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            {/* Opatření / intervaly */}
            <section className="mt-6 grid md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <div className="font-semibold flex items-center gap-2">Návrh technických opatření <Info className="h-4 w-4 opacity-60" /></div>
                <textarea className="border rounded-xl p-3 min-h-[120px]" value={active.measures} onChange={(e)=>updateSpace(active.id,{measures:e.target.value})} placeholder={DEFAULT_MEASURES_HINT}/>
              </label>
              <label className="flex flex-col gap-2">
                <div className="font-semibold flex items-center gap-2">Návrh termínů pravidelných revizí <Info className="h-4 w-4 opacity-60" /></div>
                <textarea className="border rounded-xl p-3 min-h-[120px]" value={active.intervals} onChange={(e)=>updateSpace(active.id,{intervals:e.target.value})} placeholder="Např. každé 3 roky (běžné prostory); častěji v agresivním prostředí – dle NV 190/2022 Sb. a norem."/>
              </label>
            </section>
          </main>
        </div>
      )}

      {/* ===== PRINT (A4 tabulka – dle vzoru) ===== */}
      {cats && (
        <div className="print-sheet hidden">
          <div style={{maxWidth:"175mm", margin:"0 auto", fontSize:"12px"}}>
            <div style={{textAlign:"center", fontWeight:700, fontSize:"16px", marginBottom:"2mm"}}>PROTOKOL o určení vnějších vlivů</div>
            <div style={{textAlign:"center", marginBottom:"4mm"}}>
              {data.objectName || "—"} · {data.address || "—"} · {data.date || "—"} · Zpracoval: {data.preparedBy || "—"}
            </div>

            <table style={{width:"100%", marginBottom:"4mm"}}>
              <thead>
                <tr>
                  <th style={{padding:"5px", textAlign:"left"}}>Název vnějšího vlivu</th>
                  <th style={{padding:"5px", textAlign:"left"}}>Označení a určení vnějšího vlivu</th>
                  <th style={{padding:"5px", textAlign:"left"}}>Vlivy považované za normální</th>
                </tr>
              </thead>
              <tbody>
                {cats.map(cat=>{
                  const activeSpace = data.spaces.find(s => s.id === activeId)!;
                  const sel = activeSpace.selections[cat.code] || "";
                  const normals = normalsFor(cat).join(", ");
                  return (
                    <tr key={cat.code}>
                      <td style={{padding:"4px"}}>{cat.name}</td>
                      <td style={{padding:"4px", fontFamily:"monospace"}}>{sel || "—"}</td>
                      <td style={{padding:"4px", fontFamily:"monospace"}}>{normals || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{display:"flex", gap:"10mm", marginTop:"8mm"}}>
              {data.committee.map((m,i)=>(
                <div key={i} style={{flex:1}}>
                  <div style={{borderTop:"1px solid #333", paddingTop:"3mm", textAlign:"center"}}>
                    {m.name || "__________"}<br/><span style={{fontSize:"10px"}}>{m.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
