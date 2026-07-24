"use client";

import { useSyncExternalStore } from "react";
import type { Proveedor } from "@/lib/data/types";
import { createLocalStorageStore } from "@/lib/state/local-store";

// Datos de la empresa capturados en /registro (RUC + RNP + correo/teléfono) o editados
// después en /perfil. Empieza vacío: mientras no exista, ProveedorProvider sigue mostrando
// el perfil demo completo (proveedorMock) para no romper la experiencia de "solo estoy
// explorando". En cuanto se registra o edita algo, esos campos reemplazan al mock.
export type DatosEmpresa = Partial<Proveedor>;

const empresaStore = createLocalStorageStore<DatosEmpresa>("urban-procura:empresa", {});

export function useDatosEmpresa(): DatosEmpresa {
  return useSyncExternalStore(
    empresaStore.subscribe,
    empresaStore.getSnapshot,
    empresaStore.getServerSnapshot
  );
}

export function setDatosEmpresa(next: DatosEmpresa) {
  empresaStore.set(next);
}

export function updateDatosEmpresa(patch: DatosEmpresa) {
  empresaStore.set({ ...empresaStore.getSnapshot(), ...patch });
}

export function resetDatosEmpresa() {
  empresaStore.set({});
}
