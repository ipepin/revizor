import React, { createContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";

export type ComponentModel = { id: number; name: string };
export type Manufacturer = { id: number; name: string; models: ComponentModel[] };
export type ComponentType = { id: number; name: string; manufacturers: Manufacturer[] };

interface CatalogContextValue {
  types: ComponentType[];
  reload: () => void;
}

export const CatalogContext = createContext<CatalogContextValue>({
  types: [],
  reload: () => {},
});

export const CatalogProvider = ({ children }: { children: ReactNode }) => {
  const [types, setTypes] = useState<ComponentType[]>([]);

  const load = async () => {
    const res = await axios.get<ComponentType[]>("/catalog/types");
    setTypes(res.data);
  };

  useEffect(() => { load(); }, []);

  return (
    <CatalogContext.Provider value={{ types, reload: load }}>
      {children}
    </CatalogContext.Provider>
  );
};
