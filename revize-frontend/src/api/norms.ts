import api from "./axios";

export type NormScope = "EI" | "LPS";

export type Norm = {
  id: number;
  scope: NormScope;
  label: string;
  is_default: boolean;
  status?: string | null;
  issued_on?: string | null;
  canceled_on?: string | null;
};

export async function fetchNorms(scope: NormScope, q?: string): Promise<Norm[]> {
  const res = await api.get<Norm[]>("/norms", {
    params: { scope, q: q || undefined },
  });
  return res.data;
}
