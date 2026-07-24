"use client";

import { useSyncExternalStore } from "react";
import type { PlanComercial } from "@/lib/data/types";
import { createLocalStorageStore } from "@/lib/state/local-store";

// El plan comercial es su propio store (no requiere ProveedorProvider) porque
// tanto las páginas de marketing (registro) como el dashboard interno necesitan
// leerlo/escribirlo, y las primeras no montan el resto del contexto de proveedor.
const DEFAULT_PLAN: PlanComercial = "profesional";

const planStore = createLocalStorageStore<PlanComercial>("urban-procura:plan", DEFAULT_PLAN);

export function usePlan(): PlanComercial {
  return useSyncExternalStore(planStore.subscribe, planStore.getSnapshot, planStore.getServerSnapshot);
}

export function setPlan(plan: PlanComercial) {
  planStore.set(plan);
}
