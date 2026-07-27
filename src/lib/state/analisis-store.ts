"use client";

import { useSyncExternalStore } from "react";
import type { AnalisisBasesResultado } from "@/app/api/analisis-bases/route";
import { createLocalStorageStore } from "@/lib/state/local-store";

// Guarda el último análisis de bases (con IA) por proceso, para que Generación de
// ofertas pueda reutilizarlo sin pedirle al usuario que vuelva a pegar el texto.
type AnalisisMap = Record<string, AnalisisBasesResultado>;

const analisisStore = createLocalStorageStore<AnalisisMap>("urban-procura:analisis-bases", {});

export function useAnalisisGuardados() {
  return useSyncExternalStore(
    analisisStore.subscribe,
    analisisStore.getSnapshot,
    analisisStore.getServerSnapshot
  );
}

export function guardarAnalisis(procesoId: string, resultado: AnalisisBasesResultado) {
  const actual = analisisStore.getSnapshot();
  analisisStore.set({ ...actual, [procesoId]: resultado });
}
