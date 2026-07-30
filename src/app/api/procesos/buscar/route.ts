import { NextRequest } from "next/server";
import { buscarProcesosLive } from "@/lib/data/live/oece";
import { CATEGORIAS } from "@/lib/data/constants";
import { clienteIp, rateLimit, respuestaLimiteExcedido } from "@/lib/rate-limit";

// El batch inicial del Explorador (`listProcesos()`) trae un lote fijo (ver
// src/app/(app)/explorador/page.tsx) y todos los filtros de esa pantalla —incluida
// la lista de "Entidad"— se calculan client-side sobre ESE lote. Con ~2.7M de
// registros históricos en el Portal de Contrataciones Abiertas, un lote fijo nunca va
// a contener todas las entidades (PNSR, PNSU, PROVIAS, etc. pueden no aparecer si no
// publicaron nada en el tramo más reciente que trajo el batch).
//
// Esta ruta expone `buscarProcesosLive` (ya existía en lib/data/live/oece.ts, solo
// para Server Components) a un fetch desde el cliente, para que el buscador de texto
// del Explorador pueda pedirle a la API real "todo lo que mencione PROVIAS" en vez de
// filtrar el lote ya traído. Confirmado con curl que el param `search` de la API real
// SÍ matchea contra el nombre de la entidad compradora, no solo contra el título del
// proceso (ej. `search=PROVIAS` devuelve resultados de PROVIAS NACIONAL con miles de
// coincidencias totales).

// gru1 (São Paulo) + maxDuration extendido: esta ruta corre como su propia función
// serverless (llamada por fetch del cliente), no hereda la config de explorador/page.tsx —
// sin esto corría en la región default de Vercel y podía quedarse sin tiempo antes de
// que el fetch de 15s a buscarProcesosLive terminara. 45 en vez de 30: buscarProcesosLive
// ahora enriquece las primeras 15 tarjetas con un fetch de detalle adicional cada una en
// paralelo después del fetch de /search — el peor caso suma hasta 30s entre ambos pasos.
export const preferredRegion = "gru1";
export const maxDuration = 45;

// Límite generoso: uso normal es tipeo con debounce (varias requests por búsqueda).
const LIMITE = 60;
const VENTANA_MS = 60 * 1000;

export async function GET(request: NextRequest) {
  const limite = rateLimit(`procesos-buscar:${clienteIp(request)}`, LIMITE, VENTANA_MS);
  if (!limite.ok) return respuestaLimiteExcedido(limite);

  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const categoriaParam = request.nextUrl.searchParams.get("categoria");
  const categoria = CATEGORIAS.find((c) => c === categoriaParam);
  const paginateByParam = Number(request.nextUrl.searchParams.get("paginateBy"));
  const paginateBy = Number.isFinite(paginateByParam) && paginateByParam > 0
    ? Math.min(paginateByParam, 100)
    : 60;

  const procesos = await buscarProcesosLive({ query: search || undefined, categoria, paginateBy });

  if (procesos === null) {
    return Response.json({ disponible: false, procesos: [] }, { status: 200 });
  }
  return Response.json({ disponible: true, procesos });
}
