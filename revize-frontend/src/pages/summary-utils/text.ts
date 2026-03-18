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

/** HTML -> plain text with preserved paragraphs and list bullets. */
export function htmlToBulletText(html?: string) {
  const raw = String(html || "").trim();
  if (!raw) return "";
  if (!/<[a-z][\s\S]*>/i.test(raw)) return raw;

  const root = document.createElement("div");
  root.innerHTML = raw;

  const lines: string[] = [];
  const push = (line: string) => {
    const normalized = line.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trimEnd();
    if (normalized.trim().length || (lines.length && lines[lines.length - 1] !== "")) {
      lines.push(normalized);
    }
  };

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  while (walker.nextNode()) {
    const el = walker.currentNode as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === "li") {
      let depth = 0;
      let p = el.parentElement;
      while (p) {
        const pt = p.tagName.toLowerCase();
        if (pt === "ul" || pt === "ol") depth += 1;
        p = p.parentElement;
      }
      const listParent = el.parentElement?.tagName.toLowerCase();
      const marker =
        listParent === "ol"
          ? `${Array.from(el.parentElement?.children || []).filter((n) => (n as HTMLElement).tagName?.toLowerCase() === "li").indexOf(el) + 1}.`
          : "•";
      const clone = el.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("ul,ol").forEach((n) => n.remove());
      const text = (clone.textContent || "").trim();
      if (text) push(`${"  ".repeat(Math.max(0, depth - 1))}${marker} ${text}`);
      continue;
    }

    if ((tag === "p" || tag === "div") && !el.querySelector("li")) {
      const text = (el.textContent || "").trim();
      if (text) push(text);
      continue;
    }

    if (tag === "br") {
      lines.push("");
    }
  }

  const out = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return out || stripHtml(raw);
}
