"use client";

import { useSyncExternalStore } from "react";
import type { Categoria } from "@/lib/data/types";
import { proveedorMock } from "@/lib/data/mock/proveedor";
import { createLocalStorageStore } from "@/lib/state/local-store";

export interface PreferenciasAlertas {
  rubrosSeguidos: Categoria[];
  soloAltaCompatibilidad: boolean;
}

const DEFAULT_ALERTAS: PreferenciasAlertas = {
  rubrosSeguidos: proveedorMock.preferencias.rubros,
  soloAltaCompatibilidad: false,
};

const alertasStore = createLocalStorageStore<PreferenciasAlertas>(
  "urban-procura:alertas",
  DEFAULT_ALERTAS
);

export function usePreferenciasAlertas() {
  return useSyncExternalStore(
    alertasStore.subscribe,
    alertasStore.getSnapshot,
    alertasStore.getServerSnapshot
  );
}

export function setPreferenciasAlertas(next: PreferenciasAlertas) {
  alertasStore.set(next);
}
