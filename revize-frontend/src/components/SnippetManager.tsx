import React, { useState } from "react";
import type { Snippet, SnippetScope } from "../api/snippets";

type Props = {
  scope: SnippetScope;
  items: Snippet[];
  onClose: () => void;
  onToggleVisible: (id: number, visible: boolean) => Promise<void> | void;
  onCreate: (payload: { label: string; body: string }) => Promise<void> | void;
  onDelete: (id: number) => Promise<void> | void;
  onUpdate?: (id: number, payload: { label?: string; body?: string }) => Promise<void> | void;
};

export function SnippetManager({
  scope,
  items,
  onClose,
  onToggleVisible,
  onCreate,
  onDelete,
  onUpdate,
}: Props) {
  const [label, setLabel] = useState("");
  const [body, setBody] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const submitNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !body.trim()) return;
    setCreating(true);
    try {
      await onCreate({ label: label.trim(), body });
      setLabel("");
      setBody("");
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (id: number, visible: boolean) => {
    setBusyId(id);
    try {
      await onToggleVisible(id, visible);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Opravdu smazat rychlou větu?")) return;
    setBusyId(id);
    try {
      await onDelete(id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[720px] max-w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Správa rychlých vět ({scope})</div>
            <div className="text-xs text-gray-500">Zapněte/Vypněte zobrazování, přidejte vlastní rychlé věty.</div>
          </div>
          <button className="text-sm text-gray-600 hover:text-gray-900" onClick={onClose}>
            Zavřít
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left">Label</th>
                <th className="px-4 py-2 text-left">Text</th>
                <th className="px-4 py-2 text-center w-24">Zobrazit</th>
                <th className="px-4 py-2 text-center w-20">Akce</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-2 align-top">
                    <div className="font-medium">{s.label}</div>
                    <div className="text-xs text-gray-500">{s.is_default ? "Výchozí" : "Vlastní"}</div>
                  </td>
                  <td className="px-4 py-2 align-top text-gray-700 whitespace-pre-wrap">{s.body}</td>
                  <td className="px-4 py-2 text-center align-top">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        className="mr-2"
                        checked={s.visible !== false}
                        disabled={busyId === s.id}
                        onChange={(e) => toggle(s.id, e.target.checked)}
                      />
                      <span className="text-xs text-gray-600">Zobrazit</span>
                    </label>
                  </td>
                  <td className="px-4 py-2 text-center align-top">
                    {!s.is_default && (
                      <button
                        className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                        onClick={() => remove(s.id)}
                        disabled={busyId === s.id}
                      >
                        Smazat
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form onSubmit={submitNew} className="border-t p-4 space-y-3">
          <div className="text-sm font-semibold">Přidat vlastní rychlou větu</div>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="block text-xs text-gray-600 mb-1">Label</label>
              <input
                type="text"
                className="w-full rounded border px-3 py-1.5 text-sm"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-600 mb-1">Text</label>
              <textarea
                className="w-full rounded border px-3 py-2 text-sm"
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded text-sm disabled:opacity-50"
              disabled={creating}
            >
              Přidat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
