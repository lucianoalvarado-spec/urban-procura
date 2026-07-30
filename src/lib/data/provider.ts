import type { Categoria, Proceso, Proveedor, Region } from "@/lib/data/types";
import { procesosMock } from "@/lib/data/mock/procesos";
import { proveedorMock } from "@/lib/data/mock/proveedor";
import { adjudicacionesMock } from "@/lib/data/mock/adjudicaciones";
import {
  buscarProcesosLive,
  esIdProcesoLive,
  historialEntidadLive,
  obtenerEstadisticasLive,
  obtenerIndicadoresLive,
  obtenerPerfilEntidadLive,
  obtenerProcesoLive,
  obtenerProcesosActivosPorRegionLive,
  obtenerProcesosPorRegionLive,
  obtenerTopProveedoresHistoricoLive,
  rankingCompetidoresLive,
  type AdjudicacionResumen,
  type EstadisticasOece,
  type IndicadoresOece,
  type PerfilEntidadOece,
  type TopProveedorHistorico,
} from "@/lib/data/live/oece";

export type { IndicadoresOece, PerfilEntidadOece, TopProveedorHistorico };

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
    if (typeof montoMin === "number" && proceso.montoReferencial !== null && proceso.montoReferencial < montoMin)
      return false;
    if (typeof montoMax === "number" && proceso.montoReferencial !== null && proceso.montoReferencial > montoMax)
      return false;
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

// Sin fallback mock a propósito: son cifras institucionales del portal, no procesos —
// si la fuente no responde, la landing simplemente no muestra la sección (mejor que
// inventar un número).
export async function obtenerEstadisticas(): Promise<EstadisticasOece | null> {
  return obtenerEstadisticasLive();
}

// Igual que obtenerEstadisticas: sin fallback mock, son cifras institucionales reales
// (histórico de todos los años, agregado por región) — si la fuente no responde, el
// mapa del Dashboard debe indicarlo, no inventar números por región.
export async function obtenerProcesosPorRegion(): Promise<Partial<Record<Region, number>> | null> {
  return obtenerProcesosPorRegionLive();
}

// "Activo" = procesos convocados este año (muestra) — reemplaza al histórico como
// dataset por defecto del mapa del Dashboard (ver dashboard/page.tsx). Mismo patrón sin
// fallback mock que obtenerProcesosPorRegion/obtenerEstadisticas: son cifras
// institucionales reales, no procesos de muestra — si la fuente falla, el mapa lo
// indica en vez de inventar un número.
export async function obtenerProcesosActivosPorRegion(): Promise<Partial<Record<Region, number>> | null> {
  return obtenerProcesosActivosPorRegionLive();
}

export interface AdjudicacionesResultado {
  fuente: "live" | "mock";
  adjudicaciones: AdjudicacionResumen[];
}

function aResumenMock(categoria?: Categoria): AdjudicacionResumen[] {
  const filtradas = categoria
    ? adjudicacionesMock.filter((a) => a.categoria === categoria)
    : adjudicacionesMock;
  return filtradas.map((a) => ({ ...a, fuenteUrl: "" }));
}

// A diferencia de listProcesos/getProceso, aquí SÍ hay fallback mock (a propósito,
// distinto de obtenerEstadisticas/obtenerProcesosPorRegion): un ranking o historial
// vacío se ve como "no hay nada que mostrar" en vez de "la fuente falló", así que
// preferimos degradar a datos de muestra explícitamente etiquetados — mismo patrón
// que listProcesos con los procesos mock.
export async function obtenerRankingCompetidores(categoria?: Categoria): Promise<AdjudicacionesResultado> {
  const live = await rankingCompetidoresLive(categoria);
  if (live) return { fuente: "live", adjudicaciones: live };
  return { fuente: "mock", adjudicaciones: aResumenMock(categoria) };
}

export async function obtenerHistorialEntidad(entidad: string): Promise<AdjudicacionesResultado> {
  const live = await historialEntidadLive(entidad);
  if (live) return { fuente: "live", adjudicaciones: live };
  return {
    fuente: "mock",
    adjudicaciones: aResumenMock().filter((a) =>
      a.entidad.toUpperCase().includes(entidad.toUpperCase())
    ),
  };
}

// Igual patrón sin fallback mock que obtenerProcesosPorRegion/obtenerEstadisticas: es
// una cifra institucional real (top histórico de proveedores por monto contratado
// acumulado, calculado por el propio portal), no procesos de muestra — si la fuente
// falla, la vista "Top histórico" del Ranking simplemente no se renderiza.
export async function obtenerTopProveedoresHistorico(): Promise<TopProveedorHistorico[] | null> {
  return obtenerTopProveedoresHistoricoLive();
}

// Igual patrón sin fallback mock: es una cifra institucional real (perfil de la
// entidad — monto histórico contratado, último proceso, contacto), no procesos de
// muestra — si la fuente falla, la tarjeta de perfil simplemente no se renderiza.
export async function obtenerPerfilEntidad(entidad: string): Promise<PerfilEntidadOece | null> {
  return obtenerPerfilEntidadLive(entidad);
}

// Igual patrón sin fallback mock: son cifras institucionales reales del año en curso
// (días promedio hasta la adjudicación, ofertas promedio para ganar) — si la fuente
// falla, la sección de indicadores del Landing simplemente no se renderiza.
export async function obtenerIndicadores(): Promise<IndicadoresOece | null> {
  return obtenerIndicadoresLive(new Date().getFullYear());
}
