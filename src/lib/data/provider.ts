import type { Proceso, Proveedor } from "@/lib/data/types";
import { procesosMock } from "@/lib/data/mock/procesos";
import { proveedorMock } from "@/lib/data/mock/proveedor";

// Capa de datos como adaptador reemplazable (ver docs/prompt-claude-code-urban-procura.md, sección 3).
//
// Hoy solo existe el modo "mock". El día que se conecte una fuente real (Portal de
// Contrataciones Abiertas del OECE, RNP, etc.) se agrega un provider "live" que
// implemente la misma interfaz, y si falla debe degradar a mock de forma VISIBLE,
// nunca en silencio. `getDataMode()` es lo que la UI usa para mostrar el banner
// de "datos de muestra".

export type DataMode = "mock" | "live";

export function getDataMode(): DataMode {
  return "mock";
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

export async function listProcesos(filter: ProcesosFilter = {}): Promise<Proceso[]> {
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

  const results = procesosMock.filter((proceso) => {
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

  return simulateLatency(results);
}

export async function getProceso(id: string): Promise<Proceso | undefined> {
  return simulateLatency(procesosMock.find((proceso) => proceso.id === id));
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
