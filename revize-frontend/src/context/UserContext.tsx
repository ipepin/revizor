// src/context/UserContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import { apiUrl } from "../api/base";

export type Profile = {
  id?: string | number;
  fullName: string;
  email?: string;
  isAdmin?: boolean;
  phone?: string;
  certificateNumber?: string;
  authorizationNumber?: string;
  activeCompanyId?: number | string | null;

  // OSVČ údaje (vrací je /api/users/me)
  ico?: string;
  dic?: string;
  address?: string;
};

export type Company = {
  id: string | number;
  name: string;
  ico?: string;
  dic?: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active?: boolean | null;
};

type UserCtx = {
  profile: Profile | null;
  company: Company | null;      // aktuálně aktivní subjekt (pro sidebar apod.)
  companies: Company[];
  loading: boolean;
  loadingCompanies: boolean;
  error: string | null;

  // akce
  refreshUser: () => Promise<void>;                         // ⬅️ refetch profilu + firem
  refreshCompanies: () => Promise<void>;
  setActiveCompany: (id: Company["id"] | "osvc" | null) => Promise<void>;
};

const Ctx = createContext<UserCtx>({
  profile: null,
  company: null,
  companies: [],
  loading: true,
  loadingCompanies: false,
  error: null,
  refreshUser: async () => {},
  refreshCompanies: async () => {},
  setActiveCompany: async () => {},
});

// ---- util ----
async function throwNice(resp: Response): Promise<never> {
  const ct = resp.headers.get("content-type") || "";
  const text = await resp.text();
  if (ct.includes("application/json")) {
    try {
      const j = JSON.parse(text);
      throw new Error(j?.detail || JSON.stringify(j));
    } catch {
      /* fallthrough */
    }
  }
  throw new Error(`HTTP ${resp.status}: ${text.slice(0, 400)}`);
}

function mapProfile(raw: any): Profile {
  return {
    id: raw?.id ?? raw?.user_id ?? raw?.userId,
    fullName: raw?.full_name ?? raw?.fullName ?? raw?.name ?? "",
    email: raw?.email ?? undefined,
    isAdmin: Boolean(raw?.is_admin ?? raw?.isAdmin ?? false),
    phone: raw?.phone ?? undefined,
    certificateNumber: raw?.certificate_number ?? raw?.certificateNumber ?? undefined,
    authorizationNumber: raw?.authorization_number ?? raw?.authorizationNumber ?? undefined,
    ico: raw?.ico ?? undefined,
    dic: raw?.dic ?? undefined,
    address: raw?.address ?? undefined,
    activeCompanyId: raw?.active_company_id ?? null,
  };
}

function mapCompany(raw: any): Company {
  return {
    id: raw?.id ?? raw?.company_id ?? raw?._id ?? "",
    name: raw?.name ?? raw?.companyName ?? "",
    ico: raw?.ico ?? raw?.icoNumber ?? undefined,
    dic: raw?.dic ?? raw?.taxId ?? undefined,
    address: raw?.address ?? undefined,
    phone: raw?.phone ?? undefined,
    email: raw?.email ?? undefined,
    is_active: raw?.is_active ?? raw?.active ?? null,
  };
}

function normalizeOsvcFromProfile(c: Company, prof: Profile | null): Company {
  if (!prof) return c;
  const isOSVC = (c.name || "").toUpperCase() === "OSVČ";
  if (!isOSVC) return c;

  return {
    ...c,
    dic: prof.dic && (!c.dic || !/^CZ/i.test(String(c.dic))) ? prof.dic : c.dic,
    ico: c.ico || prof.ico,
    address: c.address || prof.address,
    email: c.email || prof.email,
    phone: c.phone || prof.phone,
  };
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingCompanies, setLoadingCompanies] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // hlídáme, abychom nespustili dvojité loady firem při rychlém sledu
  const loadingAllRef = useRef<boolean>(false);;;

  // ---- fetch profil ----
  const fetchProfile = useCallback(async (): Promise<Profile | null> => {
    if (!token) return null;
    const resp = await fetch(apiUrl("users/me"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) await throwNice(resp);
    const raw = await resp.json();
    return mapProfile(raw);
  }, [token]);

  // ---- fetch firmy ----
  const fetchCompanies = useCallback(async (): Promise<Company[]> => {
    if (!token) return [];
    const resp = await fetch(apiUrl("users/companies"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) await throwNice(resp);
    const payload = await resp.json();
    const list: any[] = Array.isArray(payload) ? payload : payload?.items ?? [];
    return list.map(mapCompany);
  }, [token]);

  // ---- veřejná akce: refreshUser (profil + firmy + výběr aktivní) ----
  const refreshUser = useCallback(async () => {
    if (!token) {
      setProfile(null);
      setCompanies([]);
      setCompany(null);
      setLoading(false);
      setLoadingCompanies(false);
      setError(null);
      return;
    }

    if (loadingAllRef.current) return;
    loadingAllRef.current = true;
    setLoading(true);
    setLoadingCompanies(true);
    setError(null);

    try {
      const [prof, comps] = await Promise.all([fetchProfile(), fetchCompanies()]);
      const mapped = comps.map((c) => normalizeOsvcFromProfile(c, prof));

      // Nastav profil a firmy
      setProfile(prof);
      setCompanies(mapped);

      // Vyber aktivní firmu (nebo OSVČ)
      const activeId = prof?.activeCompanyId;
      let active: Company | null = null;
      if (activeId != null) {
        active = mapped.find((c) => String(c.id) === String(activeId)) || null;
      }
      if (!active) {
        active = mapped.find((c) => (c.name || "").toUpperCase() === "OSVČ") || null;
      }
      setCompany(active);
      setError(null);
    } catch (e: any) {
      setProfile(null);
      setCompanies([]);
      setCompany(null);
      setError(e?.message || "Načtení profilu/firm selhalo");
    } finally {
      setLoading(false);
      setLoadingCompanies(false);
      loadingAllRef.current = false;
    }
  }, [token, fetchProfile, fetchCompanies]);

  // ---- veřejná akce: jen firmy ----
  const refreshCompanies = useCallback(async () => {
    if (!token) {
      setCompanies([]);
      setCompany(null);
      return;
    }
    setLoadingCompanies(true);
    try {
      const prof = profile ?? (await fetchProfile());
      const comps = await fetchCompanies();
      const mapped = comps.map((c) => normalizeOsvcFromProfile(c, prof || null));
      setCompanies(mapped);

      // výběr aktivní firmy podle profilu
      const activeId = prof?.activeCompanyId;
      let active: Company | null = null;
      if (activeId != null) {
        active = mapped.find((c) => String(c.id) === String(activeId)) || null;
      }
      if (!active) {
        active = mapped.find((c) => (c.name || "").toUpperCase() === "OSVČ") || null;
      }
      setCompany(active);
    } catch (e: any) {
      setError(e?.message || "Načtení firem selhalo");
      setCompanies([]);
      setCompany(null);
    } finally {
      setLoadingCompanies(false);
    }
  }, [token, profile, fetchProfile, fetchCompanies]);

  // ---- veřejná akce: nastavit aktivní firmu (persist do BE) ----
  const setActiveCompany = useCallback(
    async (id: Company["id"] | "osvc" | null) => {
      if (!token) return;

      // přepočti "osvc" na skutečné ID (pokud je v seznamu)
      let targetId: number | string | null = null;
      if (id === "osvc") {
        const osvc = companies.find((c) => (c.name || "").toUpperCase() === "OSVČ");
        targetId = osvc ? osvc.id : null;
      } else {
        targetId = id;
      }

      // optimistic UI: nastav company hned
      const optimistic =
        targetId != null
          ? companies.find((c) => String(c.id) === String(targetId)) || null
          : null;

      setCompany(optimistic);
      setProfile((p) => (p ? { ...p, activeCompanyId: targetId } : p));

      // ulož na server (PATCH /users/me)
      const resp = await fetch(apiUrl("users/me"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active_company_id: targetId }),
      });
      if (!resp.ok) await throwNice(resp);

      // po úspěchu jistota: refetch profilu i firem
      await refreshUser();
    },
    [token, companies, refreshUser]
  );

  // ---- init load na mountu / při změně tokenu ----
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // volitelně: refetch při návratu okna do focusu
  useEffect(() => {
    const onFocus = () => {
      // drobný throttling
      if (document.visibilityState === "visible") {
        refreshUser();
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshUser]);

  const value: UserCtx = useMemo(
    () => ({
      profile,
      company,
      companies,
      loading,
      loadingCompanies,
      error,
      refreshUser,
      refreshCompanies,
      setActiveCompany,
    }),
    [
      profile,
      company,
      companies,
      loading,
      loadingCompanies,
      error,
      refreshUser,
      refreshCompanies,
      setActiveCompany,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUser() {
  return useContext(Ctx);
}
