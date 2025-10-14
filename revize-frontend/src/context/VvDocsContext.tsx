import React, { createContext, useContext, useMemo, useState } from "react";
import api from "../api/axios";
import type { ProtocolData } from "../components/VnejsiVlivyProtocol";

export type VvDoc = {
  id: string;
  number?: string;                 // z BE
  projectId: number;               // FE drží camelCase
  data: ProtocolData;              // FE drží camelCase
  createdAt?: string;              // z BE
  updatedAt?: string;              // z BE
};

type Ctx = {
  docs: VvDoc[];
  getById: (id: string) => VvDoc | undefined;
  add: (projectId: number | string, seed?: Partial<ProtocolData>) => Promise<VvDoc>;
  update: (id: string, patch: Partial<VvDoc>) => void;
  loadFromServer: (id: string) => Promise<VvDoc | undefined>;
  saveToServer: (id: string) => Promise<void>;
};

const VvDocsContext = createContext<Ctx | null>(null);

export function VvDocsProvider({ children }: { children: React.ReactNode }) {
  const [docs, setDocs] = useState<VvDoc[]>([]);

  const getById: Ctx["getById"] = (id) => docs.find(d => d.id === id);

  const add: Ctx["add"] = async (projectId, seed) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString().slice(0,10);

    const base: ProtocolData = {
      objectName: "",
      address: "",
      preparedBy: "",
      date: now,
      committee: [{ role: "Předseda", name: "" }],
      spaces: [{
        id: crypto.randomUUID(),
        name: "Hlavní prostor",
        note: "",
        selections: {},
        measures: "",
        intervals: "",
      }],
      ...seed,
    };

    // === DŮLEŽITÉ: schéma pro BE (snake_case) ===
    const payload = {
      id,
      project_id: Number(projectId),
      data_json: base,
    };

    const res = await api.post("/vv", payload);
    // odpověď z BE (snake_case) namapujeme do FE tvaru
    const saved: VvDoc = {
      id: res.data.id,
      number: res.data.number,
      projectId: res.data.project_id,
      data: res.data.data_json,
      createdAt: res.data.created_at,
      updatedAt: res.data.updated_at,
    };

    setDocs(prev => [...prev, saved]);
    return saved;
  };

  const update: Ctx["update"] = (id, patch) => {
    setDocs(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
  };

  const loadFromServer: Ctx["loadFromServer"] = async (id) => {
    try {
      const res = await api.get(`/vv/${id}`);
      const loaded: VvDoc = {
        id: res.data.id,
        number: res.data.number,
        projectId: res.data.project_id,
        data: res.data.data_json,
        createdAt: res.data.created_at,
        updatedAt: res.data.updated_at,
      };
      setDocs(prev => {
        const i = prev.findIndex(x => x.id === id);
        if (i === -1) return [...prev, loaded];
        const cp = [...prev]; cp[i] = loaded; return cp;
      });
      return loaded;
    } catch {
      return undefined;
    }
  };

  const saveToServer: Ctx["saveToServer"] = async (id) => {
    const doc = getById(id);
    if (!doc) return;

    // === DŮLEŽITÉ: schéma pro BE (snake_case) ===
    const payload = {
      id: doc.id,
      project_id: Number(doc.projectId),
      data_json: doc.data,
    };

    const res = await api.put(`/vv/${id}`, payload);
    // aktualizuj metadata z odpovědi (čas apod.)
    setDocs(prev => prev.map(d => d.id === id ? {
      ...d,
      number: res.data.number,
      projectId: res.data.project_id,
      data: res.data.data_json,
      createdAt: res.data.created_at,
      updatedAt: res.data.updated_at,
    } : d));
  };

  const value = useMemo(() => ({
    docs, getById, add, update, loadFromServer, saveToServer
  }), [docs]);

  return <VvDocsContext.Provider value={value}>{children}</VvDocsContext.Provider>;
}

export function useVvDocs() {
  const ctx = useContext(VvDocsContext);
  if (!ctx) throw new Error("useVvDocs must be used inside <VvDocsProvider>");
  return ctx;
}
