// src/pages/LpsEditPage.tsx
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { RevisionFormProvider, useRevisionForm } from "../context/RevisionFormContext";
import { useUser } from "../context/UserContext";

import LpsIdentifikaceSection from "../sections/LpsIdentifikaceSection";
import LpsInspectionSection from "../sections/LpsInspectionSection";
import LpsMeasurementsSection from "../sections/LpsMeasurementsSection";
import DefectsRecommendationsSection from "../sections/DefectsRecommendationsSection";
import LpsConclusionSection from "../sections/LpsConclusionSection";
import LpsSketchCanvas from "../components/LpsSketchCanvas";

type GuideStep = {
  key: string;
  tab: "lps_info" | "lps_measure";
  targetId: string;
  title: string;
  text: string;
};

const useGuideTarget = (targetId: string | null, active: boolean) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (!active || !targetId) {
      setRect(null);
      return;
    }

    const update = () => {
      const el = document.querySelector(`[data-guide-id="${targetId}"]`) as HTMLElement | null;
      if (!el) {
        setRect(null);
        return;
      }
      setRect(el.getBoundingClientRect());
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [targetId, active]);

  return rect;
};

function GuideOverlay({
  active,
  targetId,
  title,
  text,
  isLast,
  onNext,
  onClose,
}: {
  active: boolean;
  targetId: string | null;
  title: string;
  text: string;
  isLast: boolean;
  onNext: () => void;
  onClose: () => void;
}) {
  const rect = useGuideTarget(targetId, active);
  if (!active || !rect) return null;

  const bubbleWidth = 360;
  const margin = 12;
  const rightSpace = window.innerWidth - rect.right;
  const leftSpace = rect.left;
  const placeRight = rightSpace > bubbleWidth + margin || leftSpace < bubbleWidth + margin;
  const left = placeRight
    ? Math.min(rect.right + margin, window.innerWidth - bubbleWidth - margin)
    : Math.max(margin, rect.left - bubbleWidth - margin);
  const top = Math.min(Math.max(margin, rect.top), window.innerHeight - 220);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/25" onClick={onClose} />
      <div
        className="absolute rounded-lg border-2 border-blue-500 pointer-events-none"
        style={{
          top: Math.max(rect.top - 6, 0),
          left: Math.max(rect.left - 6, 0),
          width: rect.width + 12,
          height: rect.height + 12,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.25)",
        }}
      />
      <div
        className="absolute z-10 w-full max-w-sm rounded-lg border bg-white p-4 shadow-xl"
        style={{ top, left, width: bubbleWidth }}
      >
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="mt-1 text-sm text-slate-600">{text}</div>
        <div className="mt-3 flex justify-end gap-2">
          <button className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50" onClick={onClose}>
            {"Zavřít"}
          </button>
          <button className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700" onClick={onNext}>
            {isLast ? "Dokončit" : "Pokračovat"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: React.PropsWithChildren<{ label: string }>) {
  return (
    <label className="block">
      <div className="text-sm text-slate-600 mb-1">{label}</div>
      {children}
    </label>
  );
}

function LpsFormContent() {
  const { form, setForm } = useRevisionForm();
  const { profile, company, refreshCompanies, loadingCompanies } = useUser();
  const companyRef = useRef(company);
  const profileRef = useRef(profile);

  useEffect(() => {
    companyRef.current = company;
  }, [company]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Handlers to update top-level and LPS sub-structure
  const onTop = (k: string) => (e: any) => setForm((p: any) => ({ ...(p || {}), [k]: e.target.value }));
  const onLps = (k: string) => (e: any) => setForm((p: any) => ({ ...(p || {}), lps: { ...(((p || {}) as any).lps || {}), [k]: e.target.value } }));

  const toggleScope = (key: string) => {
    setForm((p: any) => {
      const cur: string[] = Array.isArray((p?.lps as any)?.scopeChecks) ? (p.lps as any).scopeChecks : [];
      const set = new Set<string>(cur);
      if (set.has(key)) set.delete(key); else set.add(key);
      return { ...p, lps: { ...((p || {}).lps || {}), scopeChecks: Array.from(set) } } as any;
    });
  };

  const applyActiveCompany = async () => {
    try {
      await (refreshCompanies?.() as any);
    } catch {
      /* ignore */
    }

    await new Promise((resolve) => setTimeout(resolve, 0));

    const activeCompany = companyRef.current;
    const currentProfile = profileRef.current;
    const isCompanySubject =
      !!activeCompany && (activeCompany.name || "").toUpperCase() !== "OSVČ";
    const subjectCompany = isCompanySubject ? activeCompany : null;

    const fallbackName =
      subjectCompany?.name ||
      currentProfile?.fullName ||
      currentProfile?.name ||
      activeCompany?.name ||
      "";

    setForm((prev: any) => ({
      ...(prev || {}),
      technicianSubjectType: subjectCompany ? "company" : "osvc",
      technicianCompanyId: subjectCompany?.id ?? null,
      technicianCompanyName: fallbackName,
      technicianCompanyIco: subjectCompany?.ico || currentProfile?.ico || "",
      technicianCompanyDic: subjectCompany?.dic || currentProfile?.dic || "",
      technicianCompanyAddress:
        subjectCompany?.address || currentProfile?.address || "",
      technicianName:
        currentProfile?.fullName ||
        currentProfile?.name ||
        prev?.technicianName ||
        "",
      technicianCertificateNumber:
        currentProfile?.certificateNumber ||
        prev?.technicianCertificateNumber ||
        "",
      technicianAuthorizationNumber:
        currentProfile?.authorizationNumber ||
        prev?.technicianAuthorizationNumber ||
        "",
    }));
  };

  // Auto-load active subject on first open if missing
  useEffect(() => {
    const f: any = form || {};
    if (!(f.technicianCompanyName || f.technicianCompanyIco || f.technicianName)) {
      applyActiveCompany();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const evidencni = (form as any)?.evidencni || "";

  // Auto-text helpers: preserve manual text, replace only known auto sentences
  const sentencePrefixes = [
    'Jedná se o ',
    'Jímací soustava je ',
    'Zemnič je připojen',
    'Střecha objektu je ',
    'Svody ',
    'Třída LPS ',
    'Ochrana SPD '
  ];
  const escapeReg = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripAutoSentences = (all: string) => {
    let out = (all || "");
    for (const pref of sentencePrefixes) {
      const re = new RegExp(`(?:^|[\r\n])${escapeReg(pref)}[^.]*\\.\\s*`, "g");
      out = out.replace(re, "");
    }
    return out.trim();
  };
  const buildAutoText = (lps: any) => {
    const parts: string[] = [];
    // Objekt + podlaží
    const objType = (() => { const t = (lps?.objectType || '').toString(); if (t === 'jiný') { const o = (lps?.objectTypeOther || '').toString().trim(); return o || undefined; } return t || undefined; })();
    const floors = (() => { const o = (lps?.floorsCountOther || '').toString().trim(); if (o) return o; if (lps?.floorsCount != null && lps.floorsCount !== '') return String(lps.floorsCount); return undefined; })();
    if (objType || floors) { const a = objType ? objType + ' ' : ''; const b = floors ? `${floors} ` : ''; parts.push(`Jedná se o ${a}objekt o ${b}nadzemních podlažích.`); }

    // Jímací soustava + zemnič
    if (lps?.airTerminationType) { let s = `Jímací soustava je ${lps.airTerminationType}`; if (lps?.earthingType) s += ` a je připojena k zemniči ${lps.earthingType}`; s += '.'; parts.push(s); }

    // Připojení svodů + vodič
    const dcc = (() => { const o = (lps?.downConductorsCountOther || '').toString().trim(); if (o) return o; if (lps?.downConductorsCount != null && lps.downConductorsCount !== '') return String(lps.downConductorsCount); return undefined; })();
    const conductor = (() => { const t = (lps?.conductorMaterial || '').toString(); if (t === 'jiný') { const o = (lps?.conductorMaterialOther || '').toString().trim(); return o || undefined; } return t || undefined; })();
    if (dcc || conductor) { const kTxt = dcc ? ` k ${dcc} svodům` : ''; const vodTxt = conductor ? ` pomocí vodiče ${conductor}` : ''; parts.push(`Zemnič je připojen${kTxt}${vodTxt}.`); }

    // Střecha + krytina (správný pád) + podpora “jiná krytina”
    if (lps?.roofType || lps?.roofCover) {
      const roof = (() => {
        const t = (lps?.roofType || '').toString();
        if (t === 'jiná') {
          const o = (lps?.roofTypeOther || '').toString().trim();
          return o || 'jiná';
        }
        return t || '';
      })();
      const coverInstr = (() => {
        const c = (lps?.roofCover || '').toString();
        if (c === 'jiná') {
          const o = (lps?.roofCoverOther || '').toString().trim();
          return o || 'jinou';
        }
        switch (c) {
          case 'asfaltová': return 'asfaltovou';
          case 'plechová': return 'plechovou';
          case 'betonová/pálená': return 'betonovou/pálenou';
          default: return c;
        }
      })();
      const cover = lps?.roofCover ? ` a je pokryta ${coverInstr} krytinou` : '';
      parts.push(`Střecha objektu je ${roof}${cover}.`);
    }

    // Ochrana svodů
    if (lps?.downConductorsProtection) {
      const prot = lps.downConductorsProtection;
      if (prot === 'nechráněny') parts.push('Svody nejsou chráněny.');
      else if (prot === 'pasivně') parts.push('Svody jsou chráněny pasivně.');
      else if (prot === 'úhelníkem') parts.push('Svody jsou chráněny úhelníkem.');
      else if (prot === 'trubkou') parts.push('Svody jsou chráněny trubkou.');
      else parts.push(`Svody jsou ${prot}.`);
    }

    // Třída LPS
    if (lps?.class) { if (lps.class === 'není určeno') parts.push('Třída LPS není určena.'); else parts.push(`Třída LPS je stanovena ${lps.class}.`); }

    // SPD
    if (((lps as any)?.spdProtectionUsed || '').toString()) {
      parts.push(((lps as any).spdProtectionUsed === 'yes') ? 'Ochrana SPD je použita.' : 'Ochrana SPD není použita.');
    }
    return parts.join(' ');
  };

  // Merge: zachovej manuál + přidej auto (při změně čipů)
  useEffect(() => {
    const lps: any = (form as any)?.lps || {};
    const auto = buildAutoText(lps);
    const prev = (lps.reportText || '').toString();
    const manual = stripAutoSentences(prev);
    const next = [manual, auto].filter(Boolean).join('\n\n');
    if (next !== prev) {
      setForm((p: any) => ({ ...(p||{}), lps: { ...(((p||{}) as any).lps||{}), reportText: next } }));
    }
  }, [
    (form as any)?.lps?.objectType,
    (form as any)?.lps?.objectTypeOther,
    (form as any)?.lps?.floorsCount,
    (form as any)?.lps?.floorsCountOther,
    (form as any)?.lps?.airTerminationType,
    (form as any)?.lps?.downConductorsCount,
    (form as any)?.lps?.downConductorsCountOther,
    (form as any)?.lps?.conductorMaterial,
    (form as any)?.lps?.conductorMaterialOther,
    (form as any)?.lps?.earthingType,
    (form as any)?.lps?.roofType,
    (form as any)?.lps?.roofTypeOther,
    (form as any)?.lps?.roofCover,
    (form as any)?.lps?.roofCoverOther,
    (form as any)?.lps?.downConductorsProtection,
    (form as any)?.lps?.class,
    (form as any)?.lps?.spdProtectionUsed,
  ]);

  return (
    <div className="space-y-6 text-sm">
      {/* Základní údaje */}
      <section className="bg-white rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-3">LPS – Základní údaje</h2>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="Evidenční číslo">
            <input value={evidencni} readOnly className="w-full p-2 border rounded bg-gray-100" />
          </Field>
          <Field label="Norma">
            <select
              className="w-full p-2 border rounded"
              value={(form as any)?.lps?.standard || ""}
              onChange={(e) => setForm((p: any) => ({ ...(p || {}), lps: { ...(((p || {}) as any).lps || {}), standard: e.target.value } }))}
            >
              <option value="">- vyberte -</option>
              <option value="CSN_EN_62305">ČSN EN 62305 (1–4)</option>
              <option value="CSN_34_1390">ČSN 34 1390</option>
            </select>
          </Field>
          <Field label="Zahájení revize">
            <input type="date" className="w-full p-2 border rounded" value={(form as any).date_start || ""} onChange={onTop("date_start")} />
          </Field>
          <Field label="Ukončení revize">
            <input type="date" className="w-full p-2 border rounded" value={(form as any).date_end || ""} onChange={onTop("date_end")} />
          </Field>
          <Field label="Vypracování revize">
            <input type="date" className="w-full p-2 border rounded" value={(form as any).date_created || ""} onChange={onTop("date_created")} />
          </Field>
          <Field label="Typ revize">
            <select className="w-full p-2 border rounded" value={(form as any).typRevize || ""} onChange={onTop("typRevize")}>
              <option value="">- vyberte -</option>
              <option>VÝCHOZÍ</option>
              <option>PRAVIDELNÁ</option>
              <option>MIMOŘÁDNÁ</option>
            </select>
          </Field>
        </div>

        {/* Měřicí přístroje (přesunuto sem) */}
        <div className="mt-4">
          <LpsIdentifikaceSection />
        </div>
      </section>

      {/* Rozsah revize */}
      <section className="bg-white rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Rozsah revize</h2>
        <div className="grid md:grid-cols-2 gap-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={Array.isArray((form as any)?.lps?.scopeChecks) && (form as any).lps.scopeChecks.includes("vnejsi")} onChange={() => toggleScope("vnejsi")} /> Vnější ochrana před bleskem</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={Array.isArray((form as any)?.lps?.scopeChecks) && (form as any).lps.scopeChecks.includes("vnitrni")} onChange={() => toggleScope("vnitrni")} /> Vnitřní ochrana před bleskem</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={Array.isArray((form as any)?.lps?.scopeChecks) && (form as any).lps.scopeChecks.includes("uzemneni")} onChange={() => toggleScope("uzemneni")} /> Uzemnění</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={Array.isArray((form as any)?.lps?.scopeChecks) && (form as any).lps.scopeChecks.includes("pospojovani")} onChange={() => toggleScope("pospojovani")} /> Ekvipotenciální pospojování</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={Array.isArray((form as any)?.lps?.scopeChecks) && (form as any).lps.scopeChecks.includes("spd")} onChange={() => toggleScope("spd")} /> SPD / přepěťová ochrana</label>
        </div>
      </section>

      {/* Identifikace objektu a subjektů */}
      <section className="bg-white rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Identifikace objektu a subjektů</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Revidovaný objekt">
            <input className="w-full p-2 border rounded" value={(form as any).objekt || ""} onChange={onTop("objekt")} />
          </Field>
          <Field label="Umístění / adresa objektu">
            <input className="w-full p-2 border rounded" value={(form as any).adresa || ""} onChange={onTop("adresa")} />
          </Field>
          <Field label="Majitel / provozovatel objektu">
            <input className="w-full p-2 border rounded" value={(form as any)?.lps?.owner || ""} onChange={onLps("owner")} />
          </Field>
          <Field label="Objednatel revize">
            <input className="w-full p-2 border rounded" value={(form as any).objednatel || ""} onChange={onTop("objednatel")} />
          </Field>
          <Field label="Projekt zpracoval (firma / IČ)">
            <input className="w-full p-2 border rounded" value={(form as any)?.lps?.projectBy || ""} onChange={onLps("projectBy")} placeholder="PROJEKTOL s.r.o., IČ …" />
          </Field>
          <Field label="Projekt č.">
            <input className="w-full p-2 border rounded" value={(form as any)?.lps?.projectNo || ""} onChange={onLps("projectNo")} />
          </Field>
          <Field label="Montáž LPS provedla (firma)">
            <input className="w-full p-2 border rounded" value={(form as any)?.lps?.assemblyBy || ""} onChange={onLps("assemblyBy")} />
          </Field>
          <Field label="Číslo oprávnění montážní firmy">
            <input className="w-full p-2 border rounded" value={(form as any)?.lps?.assemblyPermit || ""} onChange={onLps("assemblyPermit")} />
          </Field>
        </div>
      </section>

      {/* Identifikace revizního technika */}
      <section className="bg-white rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Identifikace revizního technika</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Jméno revizního technika">
            <input className="w-full p-2 border rounded" value={(form as any).technicianName || ""} onChange={onTop("technicianName")} />
          </Field>
          <Field label="Ev. č. osvědčení">
            <input className="w-full p-2 border rounded" value={(form as any).technicianCertificateNumber || ""} onChange={onTop("technicianCertificateNumber")} />
          </Field>
          <Field label="Ev. č. oprávnění">
            <input className="w-full p-2 border rounded" value={(form as any).technicianAuthorizationNumber || ""} onChange={onTop("technicianAuthorizationNumber")} />
          </Field>
          <Field label="Firma">
            <input className="w-full p-2 border rounded" value={(form as any).technicianCompanyName || ""} onChange={onTop("technicianCompanyName")} />
          </Field>
          <Field label="IČ">
            <input className="w-full p-2 border rounded" value={(form as any).technicianCompanyIco || ""} onChange={onTop("technicianCompanyIco")} />
          </Field>
          <Field label="DIČ">
            <input className="w-full p-2 border rounded" value={(form as any).technicianCompanyDic || ""} onChange={onTop("technicianCompanyDic")} />
          </Field>
          <Field label="Adresa (firma)">
            <input className="w-full p-2 border rounded" value={(form as any).technicianCompanyAddress || ""} onChange={onTop("technicianCompanyAddress")} />
          </Field>
        </div>
        <div className="mt-3">
          <button className="px-3 py-2 bg-indigo-600 text-white rounded" onClick={(e)=>{ e.preventDefault(); applyActiveCompany(); }}>
            {loadingCompanies ? "Načítám…" : "Načíst aktivní subjekt"}
          </button>
        </div>
      </section>

      {/* Popis objektu – čipy + editor */}
      <section className="bg-white rounded shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Popis objektu</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <div className="text-sm font-medium mb-1">Typ objektu</div>
            {["zděný", "dřevěný", "jiný"].map((opt) => (
              <button
                key={opt}
                type="button"
                className={`${(((form as any)?.lps?.objectType || "") === opt) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"} mr-2 mb-2 border rounded-full px-3 py-1 text-xs`}
                onClick={() => setForm((p: any) => ({ ...p, lps: { ...((p || {}).lps || {}), objectType: opt } }))}
              >{opt}</button>
            ))}
            {((form as any)?.lps?.objectType || "") === 'jiný' && (
              <input className="mt-2 w-full p-2 border rounded" placeholder="dopište" value={(form as any)?.lps?.objectTypeOther || ''} onChange={onLps('objectTypeOther')} />
            )}
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Počet nadzemních podlaží</div>
            {[1,2,3,4].map((n) => (
              <button
                key={n}
                type="button"
                className={`${(((form as any)?.lps?.floorsCount === n && !((form as any)?.lps?.floorsCountOther || ""))) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"} mr-2 mb-2 border rounded-full px-3 py-1 text-xs`}
                onClick={() => setForm((p: any) => ({ ...p, lps: { ...((p || {}).lps || {}), floorsCount: n, floorsCountOther: '' } }))}
              >{n}</button>
            ))}
            <span className="inline-flex items-center gap-2 align-middle ml-1">
              {(() => {
                const otherVal = (((form as any)?.lps?.floorsCountOther || "") as string).toString();
                const active = otherVal.trim().length > 0 || ![1,2,3,4].includes(((form as any)?.lps?.floorsCount as number) || 0);
                return (
                  <>
                    <button
                      type="button"
                      className={`${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"} mr-2 mb-2 border rounded-full px-3 py-1 text-xs`}
                      onClick={() => setForm((p: any) => ({ ...p, lps: { ...((p || {}).lps || {}), floorsCount: '', floorsCountOther: otherVal || '' } }))}
                    >
                      Jiný
                    </button>
                    <input type="number" min={0} className="w-20 p-1 border rounded" value={otherVal} onChange={(e)=> setForm((p: any) => ({ ...p, lps: { ...((p || {}).lps || {}), floorsCount: '', floorsCountOther: e.target.value } }))} placeholder="číslo" />
                  </>
                );
              })()}
            </span>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Jímací soustava</div>
            {["hřebenová", "tyčová", "závěsná", "mřížová"].map((opt) => (
              <button
                key={opt}
                type="button"
                className={`${(((form as any)?.lps?.airTerminationType || "") === opt) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"} mr-2 mb-2 border rounded-full px-3 py-1 text-xs`}
                onClick={() => setForm((p: any) => ({ ...p, lps: { ...((p || {}).lps || {}), airTerminationType: opt } }))}
              >{opt}</button>
            ))}
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Zemnič</div>
            {["typ A", "typ B"].map((opt) => (
              <button
                key={opt}
                type="button"
                className={`${(((form as any)?.lps?.earthingType || "") === opt) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"} mr-2 mb-2 border rounded-full px-3 py-1 text-xs`}
                onClick={() => setForm((p: any) => ({ ...p, lps: { ...((p || {}).lps || {}), earthingType: opt } }))}
              >{opt}</button>
            ))}
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Počet svodů</div>
            {[2,3,4,6,8].map((n) => (
              <button
                key={n}
                type="button"
                className={`${(((form as any)?.lps?.downConductorsCount === n && !((form as any)?.lps?.downConductorsCountOther || ""))) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"} mr-2 mb-2 border rounded-full px-3 py-1 text-xs`}
                onClick={() => setForm((p: any) => ({ ...p, lps: { ...((p || {}).lps || {}), downConductorsCount: n, downConductorsCountOther: '' } }))}
              >{n}</button>
            ))}
            <span className="inline-flex items-center gap-2 align-middle ml-1">
              {(() => {
                const otherVal = (((form as any)?.lps?.downConductorsCountOther || "") as string).toString();
                const active = otherVal.trim().length > 0 || ![2,3,4,6,8].includes(((form as any)?.lps?.downConductorsCount as number) || 0);
                return (
                  <>
                    <button
                      type="button"
                      className={`${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"} mr-2 mb-2 border rounded-full px-3 py-1 text-xs`}
                      onClick={() => setForm((p: any) => ({ ...p, lps: { ...((p || {}).lps || {}), downConductorsCount: '', downConductorsCountOther: otherVal || '' } }))}
                    >Jiný</button>
                    <input type="number" min={0} className="w-20 p-1 border rounded" value={otherVal} onChange={(e)=> setForm((p: any) => ({ ...p, lps: { ...((p || {}).lps || {}), downConductorsCount: '', downConductorsCountOther: e.target.value } }))} placeholder="číslo" />
                  </>
                );
              })()}
            </span>
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Materiál vodiče</div>
            {["FeZn 10mm", "AlMgSi 8mm", "jiný"].map((opt) => (
              <button
                key={opt}
                type="button"
                className={`${(((form as any)?.lps?.conductorMaterial || "") === opt) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"} mr-2 mb-2 border rounded-full px-3 py-1 text-xs`}
                onClick={() => setForm((p: any) => ({ ...p, lps: { ...((p || {}).lps || {}), conductorMaterial: opt } }))}
              >{opt}</button>
            ))}
            {((form as any)?.lps?.conductorMaterial || "") === 'jiný' && (
              <input className="mt-2 w-full p-2 border rounded" placeholder="dopište" value={(form as any)?.lps?.conductorMaterialOther || ''} onChange={onLps('conductorMaterialOther')} />
            )}
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Střecha</div>
            {["sedlová", "valbová", "pultová", "jiná"].map((opt) => (
              <button
                key={opt}
                type="button"
                className={`${(((form as any)?.lps?.roofType || "") === opt) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"} mr-2 mb-2 border rounded-full px-3 py-1 text-xs`}
                onClick={() => setForm((p: any) => ({ ...p, lps: { ...((p || {}).lps || {}), roofType: opt } }))}
              >{opt}</button>
            ))}
            {((form as any)?.lps?.roofType || "") === 'jiná' && (
              <input className="mt-2 w-full p-2 border rounded" placeholder="dopište typ střechy (např. mansardová)"
                value={(form as any)?.lps?.roofTypeOther || ''}
                onChange={onLps('roofTypeOther')}
              />
            )}
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Krytina</div>
            {["asfaltová", "plechová", "betonová/pálená", "jiná"].map((opt) => (
              <button
                key={opt}
                type="button"
                className={`${(((form as any)?.lps?.roofCover || "") === opt) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"} mr-2 mb-2 border rounded-full px-3 py-1 text-xs`}
                onClick={() => setForm((p: any) => ({ ...p, lps: { ...((p || {}).lps || {}), roofCover: opt } }))}
              >{opt}</button>
            ))}
            {((form as any)?.lps?.roofCover || "") === 'jiná' && (
              <input className="mt-2 w-full p-2 border rounded" placeholder="dopište (akuzativ, např. hliníkovou)" value={(form as any)?.lps?.roofCoverOther || ''} onChange={onLps('roofCoverOther')} />
            )}
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Ochrana svodů</div>
            {["pasivně", "úhelníkem", "trubkou", "nechráněny"].map((opt) => (
              <button
                key={opt}
                type="button"
                className={`${(((form as any)?.lps?.downConductorsProtection || "") === opt) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"} mr-2 mb-2 border rounded-full px-3 py-1 text-xs`}
                onClick={() => setForm((p: any) => ({ ...p, lps: { ...((p || {}).lps || {}), downConductorsProtection: opt } }))}
              >{opt}</button>
            ))}
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Ochrana SPD</div>
            {["je použita", "není použita"].map((opt) => {
              const val = opt === "je použita" ? 'yes' : 'no';
              const active = ((form as any)?.lps?.spdProtectionUsed || "") === val;
              return (
                <button
                  key={opt}
                  type="button"
                  className={`${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"} mr-2 mb-2 border rounded-full px-3 py-1 text-xs`}
                  onClick={() => setForm((p: any) => ({ ...p, lps: { ...((p || {}).lps || {}), spdProtectionUsed: val } }))}
                >{opt}</button>
              );
            })}
          </div>
          <div>
            <div className="text-sm font-medium mb-1">Třída LPS</div>
            {["I", "II", "III", "IV", "není určeno"].map((opt) => (
              <button
                key={opt}
                type="button"
                className={`${(((form as any)?.lps?.class || "") === opt) ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"} mr-2 mb-2 border rounded-full px-3 py-1 text-xs`}
                onClick={() => setForm((p: any) => ({ ...p, lps: { ...((p || {}).lps || {}), class: opt } }))}
              >{opt}</button>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <textarea rows={8} className="w-full p-2 border rounded" value={(form as any)?.lps?.reportText || ""} onChange={onLps("reportText")} placeholder="Popis revidovaného objektu a soustavy LPS…" />
        </div>
      </section>

    </div>
  );
}

export default function LpsEditPage() {
  const { revId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = React.useState<'lps_info'|'lps_measure'>('lps_info');
  const isTraining = new URLSearchParams(location.search).get("training") === "1";
  const [guideOn, setGuideOn] = useState(
    new URLSearchParams(location.search).get("guide") === "1"
  );
  const [guideIndex, setGuideIndex] = useState(0);

  const guideSteps: GuideStep[] = [
    {
      key: "lps_info",
      tab: "lps_info",
      targetId: "lps-info",
      title: "Identifikace objektu a prohlídka",
      text: "Vyplň identifikaci objektu, technika a základní parametry LPS.",
    },
    {
      key: "inspection",
      tab: "lps_measure",
      targetId: "lps-inspection",
      title: "Prohlídka LPS",
      text: "Zapiš vizuální kontrolu jímačů, svodů, spojů a upevnění.",
    },
    {
      key: "measurements",
      tab: "lps_measure",
      targetId: "lps-measurements",
      title: "Měření",
      text: "Doplň odpor zemniče, spojitost a naměřené hodnoty.",
    },
    {
      key: "defects",
      tab: "lps_measure",
      targetId: "lps-defects",
      title: "Závady a doporučení",
      text: "Seznam závad a návrh opatření.",
    },
    {
      key: "conclusion",
      tab: "lps_measure",
      targetId: "lps-conclusion",
      title: "Závěr",
      text: "Celkové zhodnocení a platnost revize.",
    },
    {
      key: "sketch",
      tab: "lps_measure",
      targetId: "lps-sketch",
      title: "Náčrt LPS",
      text: "Nakresli schéma nebo situaci objektu.",
    },
  ];

  useEffect(() => {
    const enabled = new URLSearchParams(location.search).get("guide") === "1";
    setGuideOn(enabled);
    setGuideIndex(0);
  }, [location.search]);

  useEffect(() => {
    if (!guideOn) return;
    const step = guideSteps[guideIndex];
    if (!step) return;
    if (tab !== step.tab) {
      setTab(step.tab);
    }
  }, [guideOn, guideIndex, tab]);

  useEffect(() => {
    if (!guideOn) return;
    const step = guideSteps[guideIndex];
    if (!step) return;
    const el = document.querySelector(`[data-guide-id="${step.targetId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [guideOn, guideIndex, guideSteps]);

  const closeGuide = () => {
    const ok = window.confirm("Opravdu chcete ukončit průvodce?");
    if (!ok) return;
    setGuideOn(false);
    navigate("/", { replace: true });
  };

  const handleNext = () => {
    const isLast = guideIndex >= guideSteps.length - 1;
    if (isLast) {
      closeGuide();
      return;
    }
    setGuideIndex((i) => Math.min(i + 1, guideSteps.length - 1));
  };

  return (
    <>
      <RevisionFormProvider revId={parseInt((revId as string) || "0", 10)} training={isTraining}>
        <div className="flex min-h-screen bg-gradient-to-br from-gray-100 to-blue-50">
          <Sidebar mode="summary" active={tab} onSelect={(k) => setTab(k as any)} />
          <main className="compact-main flex-1 overflow-auto p-4 md:p-6">
            <div className="compact-card space-y-4">
              {tab === "lps_info" ? (
                <div data-guide-id="lps-info">
                  <LpsFormContent />
                </div>
              ) : (
                <>
                  <div data-guide-id="lps-inspection">
                    <LpsInspectionSection />
                  </div>
                  <div data-guide-id="lps-measurements">
                    <LpsMeasurementsSection />
                  </div>
                  <div data-guide-id="lps-defects">
                    <DefectsRecommendationsSection />
                  </div>
                  <div data-guide-id="lps-conclusion">
                    <LpsConclusionSection />
                  </div>
                  <section className="bg-white rounded shadow p-4" data-guide-id="lps-sketch">
                    <h2 className="text-lg font-semibold mb-3">Nacrt LPS</h2>
                    <p className="text-sm text-gray-600 mb-2">Nakreslete schema LPS / situaci. Kresleni probiha na mrizce, vhodne i pro tablet.</p>
                    <LpsSketchCanvas />
                  </section>
                </>
              )}
            </div>
          </main>
        </div>
      </RevisionFormProvider>
      <GuideOverlay
        active={guideOn}
        targetId={guideSteps[guideIndex]?.targetId || null}
        title={guideSteps[guideIndex]?.title || ""}
        text={guideSteps[guideIndex]?.text || ""}
        isLast={guideIndex >= guideSteps.length - 1}
        onNext={handleNext}
        onClose={closeGuide}
      />
    </>
  );
}
