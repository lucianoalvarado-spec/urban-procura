"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import type { PreferenciasProveedor, Proveedor } from "@/lib/data/types";
import { proveedorMock } from "@/lib/data/mock/proveedor";
import { createLocalStorageStore } from "@/lib/state/local-store";
import { usePlan } from "@/lib/state/plan-store";
import { useDatosEmpresa, updateDatosEmpresa, type DatosEmpresa } from "@/lib/state/empresa-store";

const preferenciasStore = createLocalStorageStore<PreferenciasProveedor>(
  "urban-procura:preferencias",
  proveedorMock.preferencias
);

interface ProveedorContextValue {
  proveedor: Proveedor;
  updatePreferencias: (preferencias: PreferenciasProveedor) => void;
  resetPreferencias: () => void;
  actualizarDatosEmpresa: (patch: DatosEmpresa) => void;
}

const ProveedorContext = createContext<ProveedorContextValue | null>(null);

export function ProveedorProvider({ children }: { children: React.ReactNode }) {
  const preferencias = useSyncExternalStore(
    preferenciasStore.subscribe,
    preferenciasStore.getSnapshot,
    preferenciasStore.getServerSnapshot
  );
  const plan = usePlan();
  const datosEmpresa = useDatosEmpresa();

  const proveedor = useMemo<Proveedor>(
    () => ({ ...proveedorMock, ...datosEmpresa, preferencias, plan }),
    [datosEmpresa, preferencias, plan]
  );

  const value = useMemo<ProveedorContextValue>(
    () => ({
      proveedor,
      updatePreferencias: (next) => preferenciasStore.set(next),
      resetPreferencias: () => preferenciasStore.set(proveedorMock.preferencias),
      actualizarDatosEmpresa: updateDatosEmpresa,
    }),
    [proveedor]
  );

  return <ProveedorContext.Provider value={value}>{children}</ProveedorContext.Provider>;
}

export function useProveedor() {
  const ctx = useContext(ProveedorContext);
  if (!ctx) throw new Error("useProveedor debe usarse dentro de ProveedorProvider");
  return ctx;
}
