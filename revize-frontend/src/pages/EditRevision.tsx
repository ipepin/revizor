// src/pages/EditRevision.tsx

import LpsIdentifikaceSection from "../sections/LpsIdentifikaceSection";
import LpsInspectionSection from "../sections/LpsInspectionSection";
import LpsMeasurementsSection from "../sections/LpsMeasurementsSection";
// src/pages/EditRevision.tsx
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { RevisionFormProvider, useRevisionForm } from "../context/RevisionFormContext";

import IdentifikaceSection from "../sections/IdentifikaceSection";
import ProhlidkaSection from "../sections/ProhlidkaSection";
import ZkouskySection from "../sections/ZkouskySection";
import MereniSection from "../sections/MereniSection";
import DefectsRecommendationsSection from "../sections/DefectsRecommendationsSection";
import ZaverSection from "../sections/ConclusionSection";

import { apiUrl } from "../api/base";
import { useAuth } from "../context/AuthContext";
import { authHeader } from "../api/auth";


type GuideStep = {
  section: "identifikace" | "prohlidka" | "zkousky" | "mereni" | "zavady" | "zaver";
  targetId: string;
  title: string;
  text: string;
  action: string;
  placement?: "below" | "right" | "left" | "top";
  offsetX?: number;
  offsetY?: number;
  minBoards?: number;
  minComponents?: number;
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
    const observer = new MutationObserver(() => update());
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      observer.disconnect();
    };
  }, [targetId, active]);

  return rect;
};

function GuideOverlay({
  active,
  targetId,
  title,
  text,
  action,
  placement = "below",
  currentStep,
  totalSteps,
  canNext,
  isLast,
  missing,
  offsetX = 0,
  offsetY = 0,
  onClose,
  onNext,
}: {
  active: boolean;
  targetId: string | null;
  title: string;
  text: string;
  action: string;
  placement?: "below" | "right" | "left" | "top";
  currentStep: number;
  totalSteps: number;
  canNext: boolean;
  isLast: boolean;
  missing?: string[];
  offsetX?: number;
  offsetY?: number;
  onClose: () => void;
  onNext: () => void;
}) {
  const rect = useGuideTarget(targetId, active);
  if (!active || !rect) return null;

  const bubbleWidth = 460;
  const margin = 16;
  const bubbleHeight = 260;
  const placeRight = placement === "right";
  const placeLeft = placement === "left";
  const placeTop = placement === "top";
  const highlightPad = targetId === "me-rozvadece" || targetId === "me-mistnosti" ? 18 : 6;
  const left = placeRight
    ? Math.min(rect.right + margin, window.innerWidth - bubbleWidth - margin)
    : placeLeft
    ? Math.max(margin, rect.left - bubbleWidth - margin)
    : Math.min(
        Math.max(margin, rect.left + rect.width / 2 - bubbleWidth / 2),
        window.innerWidth - bubbleWidth - margin
      );
  const top = placeTop
    ? Math.max(margin, rect.top - bubbleHeight - margin)
    : placeRight || placeLeft
    ? Math.min(Math.max(margin, rect.top), window.innerHeight - bubbleHeight - margin)
    : Math.min(
        Math.max(margin, rect.bottom + margin),
        window.innerHeight - bubbleHeight - margin
      );

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div className="absolute inset-0 pointer-events-none" />
      <div
        className="absolute rounded-lg border-2 border-blue-500 pointer-events-none"
        style={{
          top: Math.max(rect.top - highlightPad, 0),
          left: Math.max(rect.left - highlightPad, 0),
          width: rect.width + highlightPad * 2,
          height: rect.height + highlightPad * 2,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.25)",
        }}
      />
      <div
        className="absolute z-10 w-full max-w-xl rounded-lg border bg-white p-5 shadow-xl pointer-events-auto"
        style={{ top: top + offsetY, left: left + offsetX, width: bubbleWidth }}
      >
        <div className="text-xs uppercase tracking-wide text-slate-400">Krok {currentStep} z {totalSteps}</div>
        <div className="text-base font-semibold text-slate-800 mt-1">{title}</div>
        <div className="mt-1 text-base text-slate-600">{text}</div>
        <div className="mt-2 text-base text-blue-700 font-medium">{action}</div>
        {missing && missing.length > 0 && (
          <div className="mt-3 text-sm text-slate-600">
            Chyb? vyplnit: {missing.join(", ")}.
          </div>
        )}
        <div className="mt-3 flex justify-end gap-2">
          <button className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50" onClick={onClose}>
            {"Zav\u0159\u00edt"}
          </button>
          <button
            className={`rounded px-3 py-1.5 text-sm text-white ${canNext ? "bg-blue-600 hover:bg-blue-700" : "bg-blue-300 cursor-not-allowed"}`}
            onClick={onNext}
            disabled={!canNext}
          >
            {isLast ? "Dokon\u010dit" : "Pokra\u010dovat"}
          </button>
        </div>
      </div>
    </div>
  );
}

const isStepCompleteDom = (step: GuideStep) => {
  if (step.targetId !== "id-basic" && step.targetId !== "id-type-network") return false;
  const container = document.querySelector(`[data-guide-id="${step.targetId}"]`) as HTMLElement | null;
  if (!container) return false;
  const fields = Array.from(container.querySelectorAll("input, select, textarea")).filter((el) => {
    const input = el as HTMLInputElement;
    if (input.type === "hidden") return false;
    if (input.readOnly || input.disabled) return false;
    return true;
  });
  if (!fields.length) return false;
  return fields.every((el) => (el as HTMLInputElement).value?.trim().length > 0);
};

const countComponents = (boards: any[]) =>
  boards.reduce((sum, b) => sum + ((b?.komponenty || b?.components || []).length || 0), 0);

const isStepComplete = (step: GuideStep, form: any) => {
  const hasText = (v: any) => typeof v === "string" && v.trim().length > 0;
  const hasAny = (v: any) => Array.isArray(v) && v.length > 0;

  switch (step.targetId) {
    case "id-basic":
      return hasText(form.objekt) && hasText(form.adresa) && hasText(form.objednatel);
    case "id-type-network":
      return hasText(form.typRevize) && hasText(form.sit) && hasText(form.voltage);
    case "id-instruments":
      return hasAny(form.measuringInstruments);
    case "id-montaz":
      return hasText(form.montFirma) && hasText(form.montFirmaAuthorization);
    case "id-dates":
      return hasText(form.date_start) && hasText(form.date_end) && hasText(form.date_created);
    case "id-company":
      return hasText(form.technicianCompanyName) || hasText(form.technicianCompanyIco) || hasText(form.technicianCompanyAddress);
    case "id-norms":
      return hasAny(form.norms) || hasText(form.customNorm1) || hasText(form.customNorm2) || hasText(form.customNorm3);
    case "id-protection":
      return hasAny(form.protection_basic) || hasAny(form.protection_fault) || hasAny(form.protection_additional);
    case "id-docs":
      return hasText(form.documentation) || hasText(form.environment) || hasText(form.extraNotes);
    case "pr-tasks":
      return hasAny(form.performedTasks);
    case "pr-description":
      return hasText(form.inspectionDescription);
    case "zk-tests":
      return Object.values(form.tests || {}).some((t: any) => t?.checked);
    case "me-rozvadece": {
      const boards = Array.isArray(form.boards) ? form.boards : [];
      if (step.minBoards != null && boards.length < step.minBoards) return false;
      if (step.minComponents != null && countComponents(boards) < step.minComponents) return false;
      return hasAny(boards);
    }
    case "me-mistnosti":
      return hasAny(form.rooms);
    case "def-text":
      return hasAny(form.defects);
    case "def-catalog":
      return hasAny(form.defects);
    case "zv-snippets":
      return hasText(form.conclusion?.text || "");
    case "zv-text":
      return hasText(form.conclusion?.text || "");
    case "zv-safety":
      return hasText(form.conclusion?.safety || "");
    case "zv-validity":
      return hasText(form.conclusion?.validUntil || "");
    default:
      return false;
  }
};

const getStepMissing = (step: GuideStep, form: any): string[] => {
  const missing: string[] = [];
  const hasText = (v: any) => typeof v === "string" && v.trim().length > 0;
  switch (step.targetId) {
    case "id-basic":
      if (!hasText(form.objekt)) missing.push("Revidovaný objekt");
      if (!hasText(form.adresa)) missing.push("Adresa");
      if (!hasText(form.objednatel)) missing.push("Objednatel");
      return missing;
    case "id-type-network":
      if (!hasText(form.typRevize)) missing.push("Typ revize");
      if (!hasText(form.sit)) missing.push("Druh sítě");
      if (!hasText(form.voltage)) missing.push("Jmenovité napětí");
      return missing;
    default:
      return missing;
  }
};

function GuideLayer({
  guideOn,
  guideIndex,
  guideSteps,
  activeSection,
  setActiveSection,
  onNext,
  onClose,
}: {
  guideOn: boolean;
  guideIndex: number;
  guideSteps: GuideStep[];
  activeSection: string;
  setActiveSection: (section: string) => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const { form } = useRevisionForm();
  const missing = getStepMissing(guideSteps[guideIndex], form);
  const step = guideSteps[guideIndex];
  const isBasicStep = step?.targetId === "id-basic" || step?.targetId === "id-type-network";
  const canNext = Boolean(
    step && (isStepComplete(step, form) || isStepCompleteDom(step) || (isBasicStep && missing.length === 0))
  );

  useEffect(() => {
    if (!guideOn) return;
    const step = guideSteps[guideIndex];
    if (!step) return;
    if (activeSection !== step.section) {
      setActiveSection(step.section);
    }
  }, [guideOn, guideIndex, guideSteps, activeSection, setActiveSection]);

  useEffect(() => {
    if (!guideOn) return;
    const step = guideSteps[guideIndex];
    if (!step) return;
    let tries = 0;
    const tryScroll = () => {
      const el = document.querySelector(`[data-guide-id="${step.targetId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      tries += 1;
      if (tries < 10) {
        setTimeout(tryScroll, 50);
      }
    };
    tryScroll();
  }, [guideOn, guideIndex, guideSteps]);

  return (
    <GuideOverlay
      active={guideOn}
      targetId={guideSteps[guideIndex]?.targetId ?? null}
      title={guideSteps[guideIndex]?.title || ""}
      text={guideSteps[guideIndex]?.text || ""}
      action={guideSteps[guideIndex]?.action || ""}
      placement={guideSteps[guideIndex]?.placement}
      offsetX={guideSteps[guideIndex]?.offsetX}
      offsetY={guideSteps[guideIndex]?.offsetY}
      currentStep={guideIndex + 1}
      totalSteps={guideSteps.length}
      canNext={canNext}
      isLast={guideIndex >= guideSteps.length - 1}
      missing={missing}
      onClose={onClose}
      onNext={onNext}
    />
  );
}

export default function EditRevision() {
  const { revId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { token, userEmail } = useAuth();
  const [revType, setRevType] = useState<string>('');
  const isTraining = new URLSearchParams(location.search).get("training") === "1";
  const trainingKey = userEmail ? `revize_training_${userEmail}` : "revize_training";

  const [activeSection, setActiveSection] = useState("identifikace");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [guideOn, setGuideOn] = useState(
    new URLSearchParams(location.search).get("guide") === "1"
  );
  const [guideIndex, setGuideIndex] = useState(0);
  const [showLpsPrompt, setShowLpsPrompt] = useState(false);

  useEffect(() => {
    const enabled = new URLSearchParams(location.search).get("guide") === "1";
    setGuideOn(enabled);
    const startSection = new URLSearchParams(location.search).get("guideStart");
    if (enabled && startSection) {
      const idx = guideSteps.findIndex((s) => s.section === startSection);
      setGuideIndex(idx >= 0 ? idx : 0);
    } else {
      setGuideIndex(0);
    }
  }, [location.search]);

    const isLps = (revType || '').toUpperCase() === 'LPS';
  const sectionMap: Record<string, React.ReactNode> = isLps ? {
    identifikace: <LpsIdentifikaceSection />,
    prohlidka: <LpsInspectionSection />,
    zkousky: <div className="p-2 text-sm text-gray-600">Zkoušky nejsou pro LPS použity.</div>,
    mereni: <LpsMeasurementsSection />,
    zavady: <DefectsRecommendationsSection />,
    zaver: <ZaverSection />,
  } : {
    identifikace: <IdentifikaceSection />,
    prohlidka: <ProhlidkaSection />,
    zkousky: <ZkouskySection />,
    mereni: <MereniSection />,
    zavady: <DefectsRecommendationsSection />,
    zaver: <ZaverSection />,
  };

  const guideSteps: GuideStep[] = useMemo(() => {
    if (isLps) return [];
    return [
      {
        section: "identifikace",
        targetId: "id-basic",
        title: "Základní identifikace objektu",
        text: "Sem patří hlavní identifikační údaje revize. Evidenční číslo se generuje automaticky. Bez nich nejde protokol dokončit.",
        action: "Teď vyplň revidovaný objekt, adresu a objednatele.",
      },
      {
        section: "identifikace",
        targetId: "id-type-network",
        title: "Typ revize a napájecí síť",
        text: "Upřesni, o jaký typ revize jde a jaká je síť a jmenovité napětí.",
        action: "Teď vyber typ revize, druh sítě a napětí.",
      },
      {
        section: "identifikace",
        targetId: "id-instruments",
        title: "Měřicí přístroje",
        text: "Zde vybíráš přístroje použité při revizi. Pokud nějaký chybí, přidej ho do knihovny v Nastavení → Měřicí přístroje.",
        action: "Teď zaškrtni použité přístroje.",
      },
      {
        section: "identifikace",
        targetId: "id-montaz",
        title: "Montážní firma",
        text: "Uveď montážní firmu a její oprávnění. Tyto údaje se objeví v protokolu.",
        action: "Teď vyplň montážní firmu a oprávnění.",
      },
      {
        section: "identifikace",
        targetId: "id-dates",
        title: "Data revize",
        text: "Zadej datum zahájení, ukončení a vypracování revize.",
        action: "Teď vyplň všechna data revize.",
      },
      {
        section: "identifikace",
        targetId: "id-company",
        title: "Subjekt technika",
        text: "V aplikaci lze přidat více subjektů, které provádí revizi. Buďto může RT být OSVČ (své IČO, oprávnění apod.) nebo může být pod firmou (IČO firmy). Pokud RT dělá revize jako OSVČ i pod firmou, lze si uložit oboje jako subjekty, které následně mezi sebou přepínat v nastavení. Aktivní subjekt je zobrazen pod avatarem uživatele na levé horní straně. Kliknutím na tlačítko „Načíst aktivní subjekt“ se do revize propíše subjekt zobrazený pod avatarem.",
        action: "Teď klikni na Načíst aktivní subjekt a zkontroluj IČO/DIČ/adresu.",
      },
      {
        section: "identifikace",
        targetId: "id-norms",
        title: "Normy a zákony",
        text: "Vyber platné normy pro tuto revizi. Můžeš přidat i vlastní normy ručně.",
        action: "Teď vyber normy nebo přidej vlastní.",
      },
      {
        section: "identifikace",
        targetId: "id-protection",
        title: "Ochranná opatření",
        text: "Zaškrtni odpovídající opatření (základní, při poruše, doplňková).",
        action: "Teď vyber použitá ochranná opatření.",
      },
      {
        section: "identifikace",
        targetId: "id-docs",
        title: "Podklady k revizi",
        text: "Zapiš projektovou dokumentaci, VV a další podklady. Pomůže to při obhajobě revize.",
        action: "Teď doplň použitou dokumentaci a poznámky.",
      },
      {
        section: "prohlidka",
        targetId: "pr-tasks",
        title: "Provedené úkony",
        text: "Zaškrtni, které kontrolní úkony byly při prohlídce provedeny. Úkony vyplývají z normy ČSN 33 2000-6 – Revize.",
        action: "Teď označ provedené úkony.",
      },
      {
        section: "prohlidka",
        targetId: "pr-description",
        title: "Popis revidovaného objektu",
        text: "Můžeš vybrat vzorový text a upravit ho podle reality.",
        action: "Teď vyber šablonu nebo doplň vlastní popis.",
      },
      {
        section: "zkousky",
        targetId: "zk-tests",
        title: "Zkoušky",
        text: "Zaškrtni provedené zkoušky a přidej poznámky k výsledkům.",
        action: "Teď projdi zkoušky a doplň poznámky.",
      },
      {
        section: "mereni",
        targetId: "me-rozvadece",
        title: "Měření v rozvaděčích",
        placement: "left",
        offsetY: 120,
        minBoards: 1,
        text: "Zde vytváříš rozvaděče a jejich strukturu. Nejdřív přidej nadřazený rozvaděč (hlavní), do něj pak vkládej podřízené prvky (řady, pole, lišty) a až do nich jednotlivé komponenty. Strukturu můžeš přesouvat a kopírovat, takže si ušetříš práci u podobných rozvaděčů. Schéma se vytváří z této hierarchie – nadřazený prvek určuje, co je „nad“ a „pod“ v nákresu. Knihovna komponent slouží jako katalog – přidej si tam své běžné prvky a pak je vkládej jedním klikem.",
        action: "Krok 1: Přidej hlavní rozvaděč. Krok 2: Vyplň jeho parametry – název, typ, 1f/3f. Krok 3: Ulož rozvaděč. Krok 4: Přidej do rozvaděče řadu modulů.",
      },
      {
        section: "mereni",
        targetId: "me-rozvadece",
        title: "Přidávání prvků do rozvaděče",
        placement: "left",
        offsetY: 120,
        minComponents: 3,
        text: "Prvky do první úrovně (přívod) přidáš tlačítkem „Přidat prvek“ v horní části formuláře rozvaděče. Do dalších úrovní přidáváš prvky vždy kliknutím na tlačítko u předřadného prvku. Změnu typu prvku můžeš kdykoli provést v jeho editaci pomocí výběrového pole.",
        action: "Teď přidej prvek do první úrovně přes tlačítko „Přidat prvek“ v horní části formuláře a pak přidej podřízený prvek přes tlačítko + u předřadného prvku. Zkus si například přidat do rozvaděče hlavní vypínač, za něj přidat proudový chránič a za něj jistič. Jistič můžeš několikrát nakopírovat. Popis obvodu lze změnit dvojklikem na něj nebo přes „tužku“.",
      },
      {
        section: "mereni",
        targetId: "me-mistnosti",
        title: "Měření v místnostech",
        placement: "top",
        offsetY: -180,
        text: "Tady přidáváš místnosti a k nim okruhy. Každá místnost je „obal“, do kterého patří jednotlivé okruhy a jejich měření. Nejprve založ místnost, pak do ní přidej okruhy a vyplň hodnoty. Pokud máš více stejných místností, můžeš je kopírovat a jen upravit názvy a hodnoty.",
        action: "Krok 1: Přidej první místnost. Krok 2: Přidej do ní okruh a vyplň měření. Krok 3: Zkus místnost zkopírovat a upravit.",
      },
      {
        section: "zavady",
        targetId: "def-text",
        title: "Závady a doporučení",
        text: "Zapiš závady ručně, každou na nový řádek.",
        action: "Teď zapiš zjištěné závady.",
      },
      {
        section: "zavady",
        targetId: "def-catalog",
        title: "Katalog závad",
        text: "Můžeš přidat závady z katalogu nebo otevřít editor katalogu.",
        action: "Teď otevři katalog a vyber závadu, nebo přidej novou.",
      },
      {
        section: "zaver",
        targetId: "zv-snippets",
        title: "Rychlé věty",
        text: "Kliknutím vložíš připravené odstavce do závěru. Správu najdeš v Nastavení → Katalog rychlých vět.",
        action: "Teď klikni na rychlou větu, která se má vložit.",
      },
      {
        section: "zaver",
        targetId: "zv-text",
        title: "Text závěru",
        text: "Finální text můžeš upravit ručně podle potřeby.",
        action: "Teď uprav text závěru.",
      },
      {
        section: "zaver",
        targetId: "zv-safety",
        title: "Posouzení bezpečnosti",
        text: "Zvol, zda instalace vyhovuje nebo nevyhovuje.",
        action: "Teď vyber hodnocení bezpečnosti.",
      },
      {
        section: "zaver",
        targetId: "zv-validity",
        title: "Platnost revize",
        text: "Doporuč termín další revize.",
        action: "Teď nastav datum platnosti revize.",
      },
    ];
  }, [isLps]);

  const finishGuide = () => {
    setGuideOn(false);
    try {
      if (revId) sessionStorage.setItem("revize_last_rev_id", String(revId));
    } catch {}
    setShowLpsPrompt(true);
  };

  const closeGuide = () => {
    const ok = window.confirm("Opravdu chcete ukon\u010dit pr\u016fvodce?");
    if (!ok) return;
    setGuideOn(false);
    try {
      if (revId) sessionStorage.setItem("revize_last_rev_id", String(revId));
    } catch {}
    navigate("/?guideSummary=1", { replace: true });
  };
  const handleLpsPrompt = (goLps: boolean) => {
    setShowLpsPrompt(false);
    if (goLps) {
      try {
        const stored = localStorage.getItem(trainingKey);
        if (stored && isTraining) {
          const parsed = JSON.parse(stored);
          const lpsId = parsed?.lpsRevId;
          if (typeof lpsId === "number" && lpsId > 0) {
            navigate(`/revize-lps/${lpsId}?guide=1&training=1`);
            return;
          }
        }
      } catch {}
    }
    navigate("/?guideSummary=1", { replace: true });
  };


  const handleNext = () => {
    const isLast = guideIndex >= guideSteps.length - 1;
    if (isLast) {
      finishGuide();
      return;
    }
    setGuideIndex((i) => Math.min(i + 1, guideSteps.length - 1));
  };

  if (!revId) return <div className="p-6">âťŚ Chybí ID revize v URL.</div>;

  // Načtení detailu revize (kvůli ověření existence a případnému prefetchi))
  useEffect(() => {
    if (isTraining) {
      setLoading(false);
      setErr(null);
      return;
    }
    const ctrl = new AbortController();
    (async () => {
      if (!token) return;
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(apiUrl(`/revisions/${revId}`), {
          method: "GET",
          headers: { ...authHeader(token) },
          signal: ctrl.signal,
        });
        if (!res.ok) {
          setErr(`${res.status} ${res.statusText}`);
          return;
        }
        // data aktuĂˇlnÄ› nikde nepotĹ™ebujeme â€“ jen â€žspotĹ™ebujemeâ€ś stream
        const _data = await res.json(); setRevType(String(_data?.type || ''));
      } catch (e: any) {
        if (e?.name !== "AbortError") setErr("Network error");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [revId, token, refreshKey, isTraining]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 to-blue-50">
        <div className="loading loading-spinner loading-lg text-blue-700" />
      </div>
    );
  }

  if (err) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 to-blue-50">
        <div className="bg-white p-6 rounded shadow text-center">
          <p className="text-red-600 font-semibold mb-2">Nepodařilo se načíst revizi</p>
          <p className="text-sm opacity-80 mb-4">{err}</p>
          <button
            className="btn btn-primary"
            onClick={() => setRefreshKey((n) => n + 1)}
          >
            Zkusit znovu
          </button>
        </div>
      </div>
    );
  }

  return (
    <RevisionFormProvider revId={parseInt(revId, 10)} training={isTraining}>
      <div className="flex min-h-screen bg-gradient-to-br from-gray-100 to-blue-50">
        <Sidebar
          mode="edit"
          active={activeSection}
          onSelect={(key) => setActiveSection(key)}
        />

        <main className="compact-main flex-1 overflow-auto p-4 md:p-6">
          <div className="compact-card space-y-4">
            <div>{sectionMap[activeSection]}</div>
          </div>
        </main>
      </div>
      {showLpsPrompt && (
        <div className="fixed inset-0 bg-black/40 z-50 grid place-items-center" onClick={() => handleLpsPrompt(false)}>
          <div className="bg-white p-6 rounded shadow w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Chce\u0161 pokra\u010dovat s uk\u00e1zkou revize LPS?</h3>
            <p className="text-sm text-slate-600 mb-4">Pokud d\u00e1\u0161 Ano, otev\u0159u pr\u016fvodce pro LPS.</p>
            <div className="flex justify-end gap-2">
              <button className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50" onClick={() => handleLpsPrompt(false)}>Ne, pokra\u010dovat na dashboard</button>
              <button className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700" onClick={() => handleLpsPrompt(true)}>Ano, pokra\u010dovat</button>
            </div>
          </div>
        </div>
      )}
      <GuideLayer
        guideOn={guideOn}
        guideIndex={guideIndex}
        guideSteps={guideSteps}
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        onNext={handleNext}
        onClose={closeGuide}
      />
    </RevisionFormProvider>
  );
}



