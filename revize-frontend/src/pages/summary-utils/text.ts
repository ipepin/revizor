// src/pages/summary-utils/text.ts

/** Když je hodnota prázdná/undefined/null → "—" */
export function dash(v?: any) {
  const s = v == null ? "" : String(v);
  return s.trim().length ? s : "—";
}

/** "a, b, c" nebo "—" */
export function listOrDash(arr?: string[]) {
  if (!arr || arr.length === 0) return "—";
  return arr.join(", ");
}

/** Odstraní HTML tagy – vhodné při generování do DOCX */
export function stripHtml(html: string) {
  if (!html) return "";
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}
