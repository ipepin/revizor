import { useEffect, useState, useCallback } from "react";
import {
  Snippet,
  SnippetScope,
  fetchSnippets,
  setSnippetVisibility,
  createSnippet,
  deleteSnippet,
  updateSnippet,
} from "../api/snippets";

export function useSnippets(scope: SnippetScope) {
  const [items, setItems] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSnippets(scope);
      setItems(data);
    } catch (e: any) {
      setError(e?.message || "Nepodařilo se načíst čipy");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleVisible = useCallback(
    async (id: number, visible: boolean) => {
      const current = items.find((s) => s.id === id);
      setItems((prev) => prev.map((s) => (s.id === id ? { ...s, visible } : s)));
      try {
        await setSnippetVisibility(id, { visible, order_index: current?.order_index });
      } catch (e) {
        // revert on error
        setItems((prev) => prev.map((s) => (s.id === id ? { ...s, visible: current?.visible } : s)));
        throw e;
      }
    },
    [items]
  );

  const addSnippet = useCallback(
    async (payload: { label: string; body: string }) => {
      const created = await createSnippet({ scope, ...payload });
      // nové čipy necháme viditelné
      setItems((prev) => [...prev, { ...created, visible: true }]);
      return created;
    },
    [scope]
  );

  const updateOne = useCallback(async (id: number, payload: { label?: string; body?: string }) => {
    const updated = await updateSnippet(id, payload);
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
    return updated;
  }, []);

  const remove = useCallback(async (id: number) => {
    setItems((prev) => prev.filter((s) => s.id !== id));
    try {
      await deleteSnippet(id);
    } catch (e) {
      await load();
      throw e;
    }
  }, [load]);

  return { items, loading, error, reload: load, toggleVisible, addSnippet, updateOne, remove };
}
