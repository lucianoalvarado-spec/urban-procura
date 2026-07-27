"use client";

import { useSyncExternalStore } from "react";
import type { Proceso } from "@/lib/data/types";
import { createLocalStorageStore } from "@/lib/state/local-store";

// Selección del Comparador de procesos, compartida entre Explorador y /comparador
// (antes vivía como useState local dentro de ComparadorClient, así que un proceso
// agregado desde el Explorador se perdía al navegar). Igual que el resto del estado
// del lado del cliente, persiste solo en localStorage.
export const MAX_COMPARADOS = 4;

type ComparadorMap = Record<string, Proceso>;

const comparadorStore = createLocalStorageStore<ComparadorMap>("urban-procura:comparador", {});

export function useComparadorSeleccion(): Proceso[] {
  const mapa = useSyncExternalStore(
    comparadorStore.subscribe,
    comparadorStore.getSnapshot,
    comparadorStore.getServerSnapshot
  );
  return Object.values(mapa);
}

export function estaEnComparador(procesoId: string, seleccion: Proceso[]): boolean {
  return seleccion.some((p) => p.id === procesoId);
}

export function agregarAComparador(proceso: Proceso) {
  const actual = comparadorStore.getSnapshot();
  if (actual[proceso.id]) return;
  if (Object.keys(actual).length >= MAX_COMPARADOS) return;
  comparadorStore.set({ ...actual, [proceso.id]: proceso });
}

export function quitarDeComparador(procesoId: string) {
  const actual = comparadorStore.getSnapshot();
  if (!actual[procesoId]) return;
  const resto = Object.fromEntries(Object.entries(actual).filter(([id]) => id !== procesoId));
  comparadorStore.set(resto);
}
