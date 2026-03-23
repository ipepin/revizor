export function defectNormSuffix(defect: any): string {
  const standard = String(defect?.standard || "").trim();
  const article = String(defect?.article || "").trim();

  if (standard && article) return `Porušení ${standard}, článek ${article}.`;
  if (standard) return `Porušení ${standard}.`;
  if (article) return `Porušení, článek ${article}.`;
  return "";
}

export function defectCitation(defect: any): string {
  return String(defect?.citation || "").trim();
}

export function defectFullText(defect: any): string {
  const description = String(defect?.description || "").trim();
  const suffix = defectNormSuffix(defect);
  return [description, suffix].filter(Boolean).join(" ").trim();
}
