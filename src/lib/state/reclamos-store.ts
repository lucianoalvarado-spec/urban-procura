"use client";

import { useSyncExternalStore } from "react";
import { createLocalStorageStore } from "@/lib/state/local-store";

// Libro de Reclamaciones: obligatorio para negocios que atienden consumidores en Perú
// (Código de Protección y Defensa del Consumidor). Sin backend todavía, así que los
// reclamos quedan en localStorage — igual que el resto del perfil/CRM en esta etapa.
// Cuando exista backend real, esto debe pasar a persistirse en servidor y a notificar
// por correo al área correspondiente, no solo guardarse en el navegador del reclamante.

export type TipoReclamo = "reclamo" | "queja";

export interface Reclamo {
  id: string;
  numero: number;
  fecha: string; // ISO
  tipo: TipoReclamo;
  consumidor: {
    nombre: string;
    tipoDocumento: "DNI" | "CE" | "RUC" | "Pasaporte";
    numeroDocumento: string;
    domicilio: string;
    telefono: string;
    correo: string;
  };
  bienContratado: string;
  detalle: string;
  pedido: string;
}

interface ReclamosState {
  ultimoNumero: number;
  reclamos: Reclamo[];
}

const DEFAULT_STATE: ReclamosState = { ultimoNumero: 0, reclamos: [] };

const reclamosStore = createLocalStorageStore<ReclamosState>(
  "urban-procura:libro-reclamaciones",
  DEFAULT_STATE
);

export function useReclamos(): ReclamosState {
  return useSyncExternalStore(
    reclamosStore.subscribe,
    reclamosStore.getSnapshot,
    reclamosStore.getServerSnapshot
  );
}

export function registrarReclamo(datos: Omit<Reclamo, "id" | "numero" | "fecha">): Reclamo {
  const actual = reclamosStore.getSnapshot();
  const numero = actual.ultimoNumero + 1;
  const nuevo: Reclamo = {
    ...datos,
    id: `RQ-${String(numero).padStart(6, "0")}`,
    numero,
    fecha: new Date().toISOString(),
  };
  reclamosStore.set({ ultimoNumero: numero, reclamos: [...actual.reclamos, nuevo] });
  return nuevo;
}
