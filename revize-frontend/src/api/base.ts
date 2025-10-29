// src/api/base.ts
export const API_ORIGIN = import.meta.env.VITE_API_URL as string;

if (!API_ORIGIN) {
  // Pomůže odhalit chybějící env proměnnou
  // (v produkci ji nastav na URL BE, v dev např. http://localhost:8000)
  // eslint-disable-next-line no-console
  console.warn("VITE_API_URL není nastavené!");
}

export const apiUrl = (path: string) => {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_ORIGIN}${p}`;
};
