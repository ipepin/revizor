// src/api/base.ts

export type RuntimeAppConfig = {
  apiOrigin?: string;
};

declare global {
  interface Window {
    __APP_CONFIG__?: RuntimeAppConfig;
  }
}

type ResolvedApiBase = {
  baseUrl: string;
  isAbsolute: boolean;
};

type MaybeString = string | undefined | null;

const runtimeConfigOrigin =
  typeof window !== "undefined" ? window.__APP_CONFIG__?.apiOrigin : undefined;

const resolvedBase = resolveApiBase(
  import.meta.env.VITE_API_URL as MaybeString,
  runtimeConfigOrigin
);

export const API_ORIGIN = resolvedBase.baseUrl;
export const API_IS_ABSOLUTE = resolvedBase.isAbsolute;
export const API_DISPLAY_URL = getDisplayUrl(resolvedBase);

if (!resolvedBase.baseUrl && !import.meta.env.DEV) {
  // Pomůže odhalit chybějící konfiguraci v produkci.
  // eslint-disable-next-line no-console
  console.warn(
    "API origin není nastavené – používám stejné origin jako frontend. Pokud máš backend na jiné doméně, nastav VITE_API_URL nebo window.__APP_CONFIG__.apiOrigin."
  );
}

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!resolvedBase.baseUrl) {
    return normalizedPath;
  }
  return `${resolvedBase.baseUrl}${normalizedPath}`;
};

function resolveApiBase(envOrigin: MaybeString, runtimeOrigin: MaybeString): ResolvedApiBase {
  const candidates: MaybeString[] = [envOrigin, runtimeOrigin];

  for (const candidate of candidates) {
    const built = buildBase(candidate);
    if (built) {
      return built;
    }
  }

  if (import.meta.env.DEV) {
    return buildBase("http://localhost:8000")!;
  }

  // fallback: stejné origin jako frontend
  return { baseUrl: "", isAbsolute: false };
}

function buildBase(value: MaybeString): ResolvedApiBase | null {
  if (value == null) {
    return null;
  }
  const trimmed = `${value}`.trim();
  if (!trimmed) {
    return { baseUrl: "", isAbsolute: false };
  }

  let normalized = trimmed.replace(/\/+$/, "");
  if (!normalized) {
    return { baseUrl: "", isAbsolute: false };
  }

  const isAbsolute = /^https?:\/\//i.test(normalized);
  if (!isAbsolute && !normalized.startsWith("/")) {
    normalized = `/${normalized}`;
  }

  return { baseUrl: normalized, isAbsolute };
}

function getDisplayUrl(base: ResolvedApiBase): string {
  if (base.isAbsolute) {
    return base.baseUrl;
  }

  if (typeof window !== "undefined") {
    const origin = window.location.origin ?? "";
    return `${origin}${base.baseUrl}`;
  }

  return base.baseUrl;
}

export {};
