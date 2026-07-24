import type { Proceso, Proveedor } from "@/lib/data/types";
import { procesosMock } from "@/lib/data/mock/procesos";
import { proveedorMock } from "@/lib/data/mock/proveedor";
import { buscarProcesosLive, esIdProcesoLive, obtenerProcesoLive } from "@/lib/data/live/oece";

// Capa de datos como adaptador reemplazable (ver docs/prompt-claude-code-urban-procura.md, sección 3).
//
// `listProcesos`/`getProceso` intentan primero el Portal de Contrataciones Abiertas del
// OECE (real, en vivo — ver src/lib/data/live/oece.ts) y degradan a los fixtures mock si
// la fuente falla o no encuentra nada. Nunca en silencio: cada `Proceso` queda marcado con
// `fuente: "mock" | "live"` para que la UI lo muestre explícitamente (ver components/
// explorador/explorador-client.tsx y components/ficha/ficha-client.tsx).
//
// El perfil del proveedor sigue siendo 100% mock salvo lo que el propio usuario trajo desde
// el RNP/SEACE en /registro y /perfil (ver lib/state/empresa-store.ts) — esta capa no toca eso.

export type DataMode = "mock" | "live";

export function getDataMode(): DataMode {
  return "mock";
}

function tagMock(procesos: Proceso[]): Proceso[] {
  return procesos.map((p) => ({ ...p, fuente: p.fuente ?? "mock" }));
}

export interface ProcesosFilter {
  query?: string;
  region?: string;
  entidad?: string;
  categoria?: string;
  subcategoria?: string;
  tipoProcedimiento?: string;
  estado?: string;
  montoMin?: number;
  montoMax?: number;
}

async function simulateLatency<T>(value: T): Promise<T> {
  // Pequeño delay artificial para que la UI (skeletons, estados de carga)
  // se comporte igual que cuando esto sea una llamada de red real.
  await new Promise((resolve) => setTimeout(resolve, 0));
  return value;
}

function filtrarMock(filter: ProcesosFilter): Proceso[] {
  const {
    query,
    region,
    entidad,
    categoria,
    subcategoria,
    tipoProcedimiento,
    estado,
    montoMin,
    montoMax,
  } = filter;

  const normalizedQuery = query?.trim().toLowerCase();

  return procesosMock.filter((proceso) => {
    if (normalizedQuery) {
      const haystack = `${proceso.objeto} ${proceso.descripcion} ${proceso.entidad}`.toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }
    if (region && proceso.region !== region) return false;
    if (entidad && proceso.entidad !== entidad) return false;
    if (categoria && proceso.categoria !== categoria) return false;
    if (subcategoria && proceso.subcategoria !== subcategoria) return false;
    if (tipoProcedimiento && proceso.tipoProcedimiento !== tipoProcedimiento) return false;
    if (estado && proceso.estado !== estado) return false;
    if (typeof montoMin === "number" && proceso.montoReferencial < montoMin) return false;
    if (typeof montoMax === "number" && proceso.montoReferencial > montoMax) return false;
    return true;
  });
}

export async function listProcesos(filter: ProcesosFilter = {}): Promise<Proceso[]> {
  const live = await buscarProcesosLive({
    query: filter.query,
    categoria: filter.categoria as Proceso["categoria"] | undefined,
  });
  if (live) return live;

  return simulateLatency(tagMock(filtrarMock(filter)));
}

export async function getProceso(id: string): Promise<Proceso | undefined> {
  if (esIdProcesoLive(id)) {
    const live = await obtenerProcesoLive(id);
    if (live) return live;
  }
  const mock = procesosMock.find((proceso) => proceso.id === id);
  return simulateLatency(mock ? { ...mock, fuente: "mock" } : undefined);
}

export async function getProveedor(): Promise<Proveedor> {
  // Sin autenticación real todavía: siempre devuelve el único perfil demo.
  return simulateLatency(proveedorMock);
}

export function listEntidades(): string[] {
  return Array.from(new Set(procesosMock.map((p) => p.entidad))).sort();
}

export function listRegiones(): string[] {
  return Array.from(new Set(procesosMock.map((p) => p.region))).sort();
}
