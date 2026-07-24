"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import type { EstadoOportunidad } from "@/lib/data/types";
import { createLocalStorageStore } from "@/lib/state/local-store";

type CrmMap = Record<string, EstadoOportunidad>;

const crmStore = createLocalStorageStore<CrmMap>("urban-procura:crm", {});

interface CrmContextValue {
  estados: CrmMap;
  setEstado: (procesoId: string, estado: EstadoOportunidad | null) => void;
  getEstado: (procesoId: string) => EstadoOportunidad | undefined;
}

const CrmContext = createContext<CrmContextValue | null>(null);

export function CrmProvider({ children }: { children: React.ReactNode }) {
  const estados = useSyncExternalStore(
    crmStore.subscribe,
    crmStore.getSnapshot,
    crmStore.getServerSnapshot
  );

  const value = useMemo<CrmContextValue>(
    () => ({
      estados,
      setEstado: (procesoId, estado) => {
        const next = { ...estados };
        if (estado === null) {
          delete next[procesoId];
        } else {
          next[procesoId] = estado;
        }
        crmStore.set(next);
      },
      getEstado: (procesoId: string) => estados[procesoId],
    }),
    [estados]
  );

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm() {
  const ctx = useContext(CrmContext);
  if (!ctx) throw new Error("useCrm debe usarse dentro de CrmProvider");
  return ctx;
}
