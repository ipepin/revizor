// src/context/UserContext.tsx
import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

type Profile = {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  certificateNumber?: string;
  authorizationNumber?: string;
};

type Company = {
  name: string;
  ico?: string;
  dic?: string;
  address?: string;
  phone?: string;
  email?: string;
};

type UserCtx = {
  profile: Profile | null;
  company: Company | null;
  loading: boolean;
  error: string | null;
};

const Ctx = createContext<UserCtx>({ profile: null, company: null, loading: true, error: null });

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<UserCtx>({ profile: null, company: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 👉 uprav cestu/přihlašování podle tvého backendu
        const resp = await fetch("/api/users/get-me", { credentials: "include" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const raw = await resp.json();

        // Příklad tvaru odpovědi (přizpůsob mapování):
        // {
        //   "id": "u1",
        //   "full_name": "Jan Novák",
        //   "email": "jan@firma.cz",
        //   "phone": "+420...",
        //   "certificate_number": "E1/1234/XX",
        //   "authorization_number": "A1/5678/YY",
        //   "company": {
        //     "name": "Revize s.r.o.",
        //     "ico": "12345678",
        //     "dic": "CZ12345678",
        //     "address": "Ulice 1, Město",
        //     "phone": "+420...",
        //     "email": "info@revize.cz"
        //   }
        // }

        const profile: Profile = {
          id: raw.id,
          fullName: raw.full_name ?? raw.fullName ?? "",
          email: raw.email ?? undefined,
          phone: raw.phone ?? undefined,
          certificateNumber: raw.certificate_number ?? raw.certificateNumber ?? undefined,
          authorizationNumber: raw.authorization_number ?? raw.authorizationNumber ?? undefined,
        };

        const company: Company | null = raw.company
          ? {
              name: raw.company.name ?? "",
              ico: raw.company.ico ?? raw.company.icoNumber ?? undefined,
              dic: raw.company.dic ?? raw.company.taxId ?? undefined,
              address: raw.company.address ?? undefined,
              phone: raw.company.phone ?? undefined,
              email: raw.company.email ?? undefined,
            }
          : null;

        if (!cancelled) setState({ profile, company, loading: false, error: null });
      } catch (e: any) {
        if (!cancelled) setState({ profile: null, company: null, loading: false, error: e?.message || "Načtení selhalo" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(() => state, [state.profile, state.company, state.loading, state.error]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUser() {
  return useContext(Ctx);
}
