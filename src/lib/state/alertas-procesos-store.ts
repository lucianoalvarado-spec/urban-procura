"use client";

import { useSyncExternalStore } from "react";
import { createLocalStorageStore } from "@/lib/state/local-store";

// Procesos que el usuario marcó individualmente con la campana "Agregar alerta" en el
// Explorador — distinto de PreferenciasAlertas (alertas-store.ts), que filtra por
// rubro. Guardamos una "foto" (fechaLimitePresentacion, estado) de cuando se agregó o
// se reconoció el último cambio, para poder avisar en /alertas si la fuente publicó
// una fecha o etapa distinta. Sin backend: no hay notificación push/email real, el
// aviso solo aparece cuando el usuario visita /alertas — mismo límite que el resto de
// la plataforma (ver demo-banner.tsx).
export interface ProcesoVigilado {
  procesoId: string;
  objeto: string;
  entidad: string;
  fechaConocida: string;
  estadoConocido: string;
  agregadoEn: string;
}

type VigilanciaMap = Record<string, ProcesoVigilado>;

const vigilanciaStore = createLocalStorageStore<VigilanciaMap>("urban-procura:vigilancia", {});

export function useProcesosVigilados(): VigilanciaMap {
  return useSyncExternalStore(
    vigilanciaStore.subscribe,
    vigilanciaStore.getSnapshot,
    vigilanciaStore.getServerSnapshot
  );
}

export function estaVigilado(procesoId: string, vigilados: VigilanciaMap): boolean {
  return Boolean(vigilados[procesoId]);
}

export function agregarVigilancia(entry: {
  id: string;
  objeto: string;
  entidad: string;
  fechaLimitePresentacion: string;
  estado: string;
}) {
  const actual = vigilanciaStore.getSnapshot();
  vigilanciaStore.set({
    ...actual,
    [entry.id]: {
      procesoId: entry.id,
      objeto: entry.objeto,
      entidad: entry.entidad,
      fechaConocida: entry.fechaLimitePresentacion,
      estadoConocido: entry.estado,
      agregadoEn: new Date().toISOString(),
    },
  });
}

export function quitarVigilancia(procesoId: string) {
  const actual = vigilanciaStore.getSnapshot();
  if (!actual[procesoId]) return;
  const resto = Object.fromEntries(Object.entries(actual).filter(([id]) => id !== procesoId));
  vigilanciaStore.set(resto);
}

// Actualiza la "foto" guardada tras mostrarle el cambio al usuario, para no repetir
// el mismo aviso en cada visita — solo avisa de nuevo si vuelve a cambiar.
export function reconocerCambio(procesoId: string, fechaActual: string, estadoActual: string) {
  const actual = vigilanciaStore.getSnapshot();
  const entry = actual[procesoId];
  if (!entry) return;
  vigilanciaStore.set({
    ...actual,
    [procesoId]: { ...entry, fechaConocida: fechaActual, estadoConocido: estadoActual },
  });
}
