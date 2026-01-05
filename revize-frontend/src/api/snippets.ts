import api from "./axios";

export type SnippetScope = "EI" | "LPS";

export type Snippet = {
  id: number;
  scope: SnippetScope;
  label: string;
  body: string;
  user_id?: number | null;
  is_default: boolean;
  visible?: boolean;
  order_index?: number | null;
};

export type SnippetCreatePayload = {
  scope: SnippetScope;
  label: string;
  body: string;
};

export type SnippetUpdatePayload = Partial<SnippetCreatePayload>;

export async function fetchSnippets(scope: SnippetScope): Promise<Snippet[]> {
  const res = await api.get<Snippet[]>("/snippets", { params: { scope } });
  return res.data;
}

export async function createSnippet(payload: SnippetCreatePayload): Promise<Snippet> {
  const res = await api.post<Snippet>("/snippets", payload);
  return res.data;
}

export async function updateSnippet(id: number, payload: SnippetUpdatePayload): Promise<Snippet> {
  const res = await api.put<Snippet>(`/snippets/${id}`, payload);
  return res.data;
}

export async function deleteSnippet(id: number): Promise<void> {
  await api.delete(`/snippets/${id}`);
}

export async function setSnippetVisibility(
  id: number,
  payload: { visible: boolean; order_index?: number | null }
): Promise<Snippet> {
  const res = await api.post<Snippet>(`/snippets/${id}/visibility`, payload);
  return res.data;
}
