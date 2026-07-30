# Integraciones avanzadas del Portal de Contrataciones Abiertas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar 4 mejoras basadas en endpoints del Portal de Contrataciones Abiertas del OECE que hoy Urban Procura no usa: Ranking histórico completo de proveedores, región real en las primeras tarjetas del Explorador, perfil enriquecido de entidad en su Historial, e indicadores nuevos en Landing/Dashboard.

**Architecture:** Todo sigue el patrón ya establecido de la capa de datos (`src/lib/data/live/oece.ts` → `src/lib/data/provider.ts` → Server Component → Client Component), sin fallback mock para cifras institucionales reales (mismo principio que `obtenerEstadisticas`/`obtenerProcesosPorRegion`).

**Tech Stack:** Next.js 15.5.21 App Router, React 19, TypeScript, Tailwind v4 — sin dependencias nuevas, todo vía `fetch` directo a endpoints JSON del OECE ya verificados con curl.

## Global Constraints

- Spec de referencia: [`docs/superpowers/specs/2026-07-30-integraciones-oece-avanzadas-design.md`](../specs/2026-07-30-integraciones-oece-avanzadas-design.md) — cualquier duda sobre una decisión de producto, revisar ahí primero (incluye una corrección post-commit: el campo correcto para "días hasta la adjudicación" es `tenderEndToAwardDays`, no `awardToContractStartDays`).
- **Sin framework de tests en este proyecto** (no hay jest/vitest — deuda técnica pendiente a propósito). Cada tarea se verifica con `npm run build` + `npm run lint` y verificación manual contra el dev server (`npm run dev` + Browser pane), no con tests automatizados.
- Node no está en el `PATH` de shell por defecto en esta máquina: anteponer `export PATH="$PATH:/c/Program Files/nodejs"` (bash) a cualquier comando `npm`/`node` si falla con "command not found".
- **Nunca `git push`** salvo pedido explícito del usuario en ese mismo turno — cada tarea termina con `git commit` local únicamente.
- `matching.ts` no se toca en ningún task de este plan.
- Todas las funciones nuevas de cifras institucionales (`obtenerTopProveedoresHistorico`, `obtenerPerfilEntidad`, `obtenerIndicadores`, `obtenerProcedimientosTop5`) siguen el patrón **sin fallback mock** de `obtenerEstadisticas`/`obtenerProcesosPorRegion`: si la fuente falla, devuelven `null` y la sección correspondiente simplemente no se renderiza — nunca se inventa un número.
- El Ranking por categoría existente (vía `/search` + detalle, `rankingCompetidoresLive`) no se toca — la vista nueva se agrega, no reemplaza.
- El enriquecimiento de región del Explorador (Task 3) solo reemplaza el campo `region` — nunca `fechaLimitePresentacion` ni `documentos`.

---

### Task 1: Ranking histórico — capa de datos (`contractsSuppliersTop10Dashboard`)

**Files:**
- Modify: `src/lib/data/live/oece.ts` (agregar al final del archivo, después del cierre de `obtenerProcesosActivosPorRegionLive`)
- Modify: `src/lib/data/provider.ts` (agregar import + función nueva al final)

**Interfaces:**
- Produces: `TopProveedorHistorico { nombre: string; ruc: string; totalContratado: number }`, `obtenerTopProveedoresHistoricoLive(): Promise<TopProveedorHistorico[] | null>` (oece.ts), `obtenerTopProveedoresHistorico(): Promise<TopProveedorHistorico[] | null>` (provider.ts) — consumidas por Task 2.

- [ ] **Step 1: Agregar al final de `src/lib/data/live/oece.ts`**

```ts

export interface TopProveedorHistorico {
  nombre: string;
  ruc: string;
  totalContratado: number;
}

interface OceTop10Item {
  amount?: number;
  value?: string;
  name?: string;
}

interface OceTop10Response {
  data?: OceTop10Item[];
}

// El Tablero de Contratos del propio portal usa este endpoint para su "Top 10
// proveedores adjudicados con contratos con mayor monto contratado" — confirmado con
// curl que hace la agregación por monto server-side (PLUSPETROL NORTE, PETROPERU,
// BPZ EXPLORACIÓN encabezan la lista real, consistente con ser las mayores
// multinacionales de petróleo/telecomunicaciones del país por monto contratado). Se
// prefiere sobre paginar /api/v1/suppliers y ordenar client-side: se probó esa
// alternativa y el orden por defecto de /suppliers no tiene relación con el monto (ni
// con ni sin order_total_contracts=desc, que se ignora en silencio igual que
// category=), así que una página arbitraria de 1000 sobre 497,783 no garantizaría
// capturar el verdadero top 10. Sin año: "histórico completo", que es el valor de esta
// vista frente al ranking por categoría existente (que sí es reciente pero solo
// muestra ~20 candidatos).
export async function obtenerTopProveedoresHistoricoLive(): Promise<
  TopProveedorHistorico[] | null
> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${BASE_URL}/contractsSuppliersTop10Dashboard?format=json`, {
      headers: oeceHeaders(),
      signal: controller.signal,
      next: { revalidate: 21600 },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = (await res.json()) as OceTop10Response;
    const items = (data.data ?? [])
      .filter(
        (item): item is Required<Pick<OceTop10Item, "name" | "value" | "amount">> =>
          Boolean(item.name && item.value && typeof item.amount === "number")
      )
      .map((item) => ({
        nombre: item.name,
        ruc: item.value.replace(/^PE-RUC-/, ""),
        totalContratado: item.amount,
      }));

    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Agregar el import y la función en `src/lib/data/provider.ts`**

Reemplaza el bloque de import (líneas 5-16) por:

```ts
import {
  buscarProcesosLive,
  esIdProcesoLive,
  historialEntidadLive,
  obtenerEstadisticasLive,
  obtenerProcesoLive,
  obtenerProcesosActivosPorRegionLive,
  obtenerProcesosPorRegionLive,
  obtenerTopProveedoresHistoricoLive,
  rankingCompetidoresLive,
  type AdjudicacionResumen,
  type EstadisticasOece,
  type TopProveedorHistorico,
} from "@/lib/data/live/oece";

export type { TopProveedorHistorico };
```

Y agrega al final del archivo (después del cierre de `obtenerHistorialEntidad`):

```ts

// Igual patrón sin fallback mock que obtenerProcesosPorRegion/obtenerEstadisticas: es
// una cifra institucional real (top histórico de proveedores por monto contratado
// acumulado, calculado por el propio portal), no procesos de muestra — si la fuente
// falla, la vista "Top histórico" del Ranking simplemente no se renderiza.
export async function obtenerTopProveedoresHistorico(): Promise<TopProveedorHistorico[] | null> {
  return obtenerTopProveedoresHistoricoLive();
}
```

- [ ] **Step 3: Verificar tipos y build**

```bash
export PATH="$PATH:/c/Program Files/nodejs" && npm run build
```

Expected: compila sin errores.

- [ ] **Step 4: Verificación manual con curl**

```bash
curl -s "https://contratacionesabiertas.oece.gob.pe/api/v1/contractsSuppliersTop10Dashboard?format=json" | head -c 300
```

Expected: JSON con `data` no vacío, cada item con `name`/`value`/`amount`.

- [ ] **Step 5: Commit**

```bash
git add "src/lib/data/live/oece.ts" "src/lib/data/provider.ts"
git commit -m "Add obtenerTopProveedoresHistorico: top real de proveedores por monto contratado"
```

---

### Task 2: Ranking — vista "Top histórico" en la UI

**Files:**
- Modify: `src/app/(app)/ranking/page.tsx` (archivo completo, 11 líneas)
- Modify: `src/components/ranking/ranking-client.tsx` (archivo completo, 147 líneas)

**Interfaces:**
- Consumes: `obtenerTopProveedoresHistorico()`, `TopProveedorHistorico` (Task 1).
- No cambia la firma pública de `RankingClient` de forma incompatible — gana una prop nueva (`topHistorico`), la existente (`inicial`) no cambia.

- [ ] **Step 1: Reemplazar `src/app/(app)/ranking/page.tsx`**

```tsx
import { obtenerRankingCompetidores, obtenerTopProveedoresHistorico } from "@/lib/data/provider";
import { RankingClient } from "@/components/ranking/ranking-client";

export const preferredRegion = "gru1";
export const maxDuration = 30;

export default async function RankingPage() {
  const [inicial, topHistorico] = await Promise.all([
    obtenerRankingCompetidores(),
    obtenerTopProveedoresHistorico(),
  ]);

  return <RankingClient inicial={inicial} topHistorico={topHistorico} />;
}
```

- [ ] **Step 2: Reemplazar `src/components/ranking/ranking-client.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { Categoria } from "@/lib/data/types";
import type { AdjudicacionesResultado, TopProveedorHistorico } from "@/lib/data/provider";
import { CATEGORIAS } from "@/lib/data/constants";
import { formatMonto } from "@/lib/format";
import { useProveedor } from "@/lib/state/proveedor-context";
import { cumplePlan } from "@/lib/plan";
import { Card, CardBody } from "@/components/ui/card";
import { UpgradeNotice } from "@/components/plan/upgrade-notice";

interface FilaRanking {
  proveedor: string;
  cantidad: number;
  montoTotal: number;
}

function agregar(resultado: AdjudicacionesResultado): FilaRanking[] {
  const mapa = new Map<string, FilaRanking>();
  for (const a of resultado.adjudicaciones) {
    const actual = mapa.get(a.proveedorGanador) ?? {
      proveedor: a.proveedorGanador,
      cantidad: 0,
      montoTotal: 0,
    };
    actual.cantidad += 1;
    actual.montoTotal += a.montoAdjudicado ?? 0;
    mapa.set(a.proveedorGanador, actual);
  }
  return Array.from(mapa.values()).sort((a, b) => b.montoTotal - a.montoTotal);
}

const VISTAS = ["Por categoría (muestra reciente)", "Histórico completo"] as const;
type Vista = (typeof VISTAS)[number];

export function RankingClient({
  inicial,
  topHistorico,
}: {
  inicial: AdjudicacionesResultado;
  topHistorico: TopProveedorHistorico[] | null;
}) {
  const { proveedor } = useProveedor();
  const [vista, setVista] = useState<Vista>("Por categoría (muestra reciente)");
  const [categoria, setCategoria] = useState<Categoria | "">("");
  const [resultado, setResultado] = useState<AdjudicacionesResultado>(inicial);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (vista !== "Por categoría (muestra reciente)") return;
    let cancelado = false;
    setCargando(true);
    const params = categoria ? `?categoria=${encodeURIComponent(categoria)}` : "";
    fetch(`/api/ranking${params}`)
      .then((r) => r.json())
      .then((data: AdjudicacionesResultado) => {
        if (!cancelado) setResultado(data);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [categoria, vista]);

  const filas = useMemo(() => agregar(resultado), [resultado]);

  if (!cumplePlan(proveedor.plan, "profesional")) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Ranking de competidores</h1>
        <UpgradeNotice minimo="profesional">
          El ranking de competidores por categoría es parte del plan Profesional.
        </UpgradeNotice>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Ranking de competidores</h1>
        <p className="text-sm text-slate-500">¿Quién me está ganando y en qué categorías?</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {VISTAS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVista(v)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              vista === v
                ? "border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)]"
                : "border-[var(--border)] text-slate-500 hover:bg-[var(--surface-muted)]"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {vista === "Por categoría (muestra reciente)" ? (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoria("")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                categoria === ""
                  ? "bg-[var(--brand-600)] text-white"
                  : "border border-[var(--border)] text-slate-600"
              }`}
            >
              Todas
            </button>
            {CATEGORIAS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoria(c)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  categoria === c
                    ? "bg-[var(--brand-600)] text-white"
                    : "border border-[var(--border)] text-slate-600"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {resultado.fuente === "live" ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Adjudicaciones reales del Portal de Contrataciones Abiertas del OECE.
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No pudimos obtener adjudicaciones reales para este filtro — estás viendo datos de
              muestra.
            </div>
          )}

          <Card>
            <CardBody className="p-0">
              {cargando ? (
                <p className="px-5 py-6 text-center text-sm text-slate-400">Cargando…</p>
              ) : filas.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-slate-400">
                  Sin adjudicaciones para este filtro.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">#</th>
                      <th className="px-5 py-3">Empresa</th>
                      <th className="px-5 py-3 text-right">Procesos ganados</th>
                      <th className="px-5 py-3 text-right">Monto acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((fila, i) => (
                      <tr key={fila.proveedor} className="border-b border-[var(--border)] last:border-b-0">
                        <td className="px-5 py-3 text-slate-400">{i + 1}</td>
                        <td className="px-5 py-3 font-medium text-[var(--foreground)]">{fila.proveedor}</td>
                        <td className="px-5 py-3 text-right text-slate-600">{fila.cantidad}</td>
                        <td className="px-5 py-3 text-right text-slate-600">{formatMonto(fila.montoTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </>
      ) : (
        <>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            Ranking histórico completo — todas las categorías y años, sin filtrar. Calculado
            directamente por el Portal de Contrataciones Abiertas del OECE sobre el monto total
            contratado.
          </div>

          <Card>
            <CardBody className="p-0">
              {!topHistorico || topHistorico.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-slate-400">
                  No pudimos traer el ranking histórico ahora mismo. Intenta más tarde.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">#</th>
                      <th className="px-5 py-3">Empresa</th>
                      <th className="px-5 py-3">RUC</th>
                      <th className="px-5 py-3 text-right">Monto contratado histórico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topHistorico.map((fila, i) => (
                      <tr key={fila.ruc} className="border-b border-[var(--border)] last:border-b-0">
                        <td className="px-5 py-3 text-slate-400">{i + 1}</td>
                        <td className="px-5 py-3 font-medium text-[var(--foreground)]">{fila.nombre}</td>
                        <td className="px-5 py-3 text-slate-500">{fila.ruc}</td>
                        <td className="px-5 py-3 text-right text-slate-600">{formatMonto(fila.totalContratado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verificar tipos, lint y build**

```bash
export PATH="$PATH:/c/Program Files/nodejs" && npm run lint && npm run build
```

Expected: ambos sin errores.

- [ ] **Step 4: Verificación manual en el dev server**

Con `npm run dev` corriendo y el plan cambiado a Profesional o superior (selector del Topbar), abre `/ranking`. Confirma:
- Aparecen 2 botones de vista: "Por categoría (muestra reciente)" (activo por defecto) y "Histórico completo".
- La vista por categoría se ve exactamente igual que antes (filtros de categoría, tabla).
- Al hacer click en "Histórico completo": desaparecen los filtros de categoría, aparece el aviso verde de "Ranking histórico completo...", y la tabla muestra empresas reales con RUC y monto (ej. debería aparecer PLUSPETROL NORTE S.A. o similar entre las primeras filas).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/ranking/page.tsx" "src/components/ranking/ranking-client.tsx"
git commit -m "Ranking: agregar vista Top historico completo de proveedores"
```

---

### Task 3: Explorador — región real en las primeras 15 tarjetas

**Files:**
- Modify: `src/lib/data/live/oece.ts:362-392` (función `buscarProcesosLive`)
- Modify: `src/app/(app)/explorador/page.tsx` (archivo completo, 15 líneas)
- Modify: `src/app/api/procesos/buscar/route.ts` (archivo completo, 51 líneas)

**Interfaces:**
- No cambia ninguna firma pública — `buscarProcesosLive` sigue devolviendo `Promise<Proceso[] | null>`, solo el contenido de los primeros elementos cambia (región real en vez de "Otro" cuando el enriquecimiento tiene éxito).

- [ ] **Step 1: Modificar `buscarProcesosLive` en `src/lib/data/live/oece.ts`**

Reemplaza las líneas 362-392 (la función completa `buscarProcesosLive`) por:

```ts
// Cuántas de las primeras tarjetas de cada lote se enriquecen con la región real
// (pidiendo el detalle completo, /record/{ocid}, la misma función que ya usa la
// Ficha) — el resumen de /search no trae dirección estructurada. Acotado a 15 porque
// pedir el detalle de las 60 tarjetas del lote sería lento y pesado; 15 cubre de sobra
// el límite de 5 del plan Free y la porción de pantalla sin scroll del resto de
// planes. Se decidió NO enriquecer también fechaLimitePresentacion/documentos en el
// mismo paso: mezclar una fecha límite precisa en las primeras 15 tarjetas con la
// fecha-proxy en el resto de la misma lista sería inconsistente y confuso — solo se
// reemplaza `region`.
const LIMITE_ENRIQUECIMIENTO_REGION = 15;

export async function buscarProcesosLive(params: BusquedaLiveParams = {}): Promise<Proceso[] | null> {
  try {
    const url = new URL(`${BASE_URL}/search`);
    url.searchParams.set("page", "1");
    url.searchParams.set("paginateBy", String(params.paginateBy ?? 60));
    url.searchParams.set("format", "json");
    url.searchParams.set("year", String(params.anio ?? new Date().getFullYear()));
    if (params.query) url.searchParams.set("search", params.query);
    const catOcds = params.categoria ? CATEGORIA_A_OCDS[params.categoria] : undefined;
    if (catOcds) url.searchParams.set("category", catOcds);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url.toString(), {
      headers: oeceHeaders(),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = (await res.json()) as OceBusquedaResponse;
    const procesos = (data.results ?? [])
      .map(resumenAProceso)
      .filter((p): p is Proceso => p !== null);

    if (procesos.length === 0) return null;

    const aEnriquecer = procesos.slice(0, LIMITE_ENRIQUECIMIENTO_REGION);
    const detalles = await Promise.allSettled(aEnriquecer.map((p) => obtenerProcesoLive(p.id)));
    detalles.forEach((detalle, i) => {
      if (detalle.status === "fulfilled" && detalle.value) {
        aEnriquecer[i].region = detalle.value.region;
      }
    });

    return procesos;
  } catch {
    return null;
  }
}
```

Nota: `obtenerProcesoLive` está definida más abajo en el mismo archivo (línea 398 antes de este cambio) — funciona igual porque `export async function` se hoistea dentro del módulo, el orden de declaración no importa para llamarla desde una función definida antes.

- [ ] **Step 2: Reemplazar `src/app/(app)/explorador/page.tsx`**

```tsx
import { listProcesos } from "@/lib/data/provider";
import { ExploradorClient } from "@/components/explorador/explorador-client";

// gru1 (São Paulo) es la región de Vercel más cercana a Perú disponible — reduce la
// latencia hacia el Portal de Contrataciones Abiertas del OECE frente a la región
// default (Washington D.C.), que en producción venía agotando el timeout del fetch.
export const preferredRegion = "gru1";
// 45 en vez de 30: buscarProcesosLive ahora enriquece las primeras 15 tarjetas con un
// fetch de detalle adicional cada una (en paralelo) después del fetch de /search — en
// el peor caso (ambos fetches cerca de su timeout de 15s) suma hasta 30s, así que 30
// justo quedaría sin margen.
export const maxDuration = 45;

export default async function ExploradorPage() {
  const procesos = await listProcesos();

  return <ExploradorClient procesos={procesos} />;
}
```

- [ ] **Step 3: Reemplazar `src/app/api/procesos/buscar/route.ts`**

```ts
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
```

- [ ] **Step 4: Verificar tipos, lint y build**

```bash
export PATH="$PATH:/c/Program Files/nodejs" && npm run lint && npm run build
```

Expected: ambos sin errores.

- [ ] **Step 5: Verificación manual en el dev server**

Abre `/explorador` y confirma con `read_page`/`get_page_text` que al menos algunas de las primeras tarjetas visibles muestran una región real (ej. "Lima", "Cusco") en vez de "Otro". Prueba también una búsqueda por texto (ej. "PROVIAS") y confirma lo mismo en los resultados. Revisa la consola del navegador por errores.

- [ ] **Step 6: Commit**

```bash
git add "src/lib/data/live/oece.ts" "src/app/(app)/explorador/page.tsx" "src/app/api/procesos/buscar/route.ts"
git commit -m "Explorador: region real en las primeras 15 tarjetas de cada lote"
```

---

### Task 4: Historial de la Entidad — capa de datos y ruta

**Files:**
- Modify: `src/lib/data/live/oece.ts` (interfaces `OceBuyerParty`/`OceBuyerResumen`/`OceBuyersResponse`, buscarlas por nombre — **no uses un número de línea fijo**: Task 3, que se ejecuta antes, inserta código más arriba en este mismo archivo y corre las líneas) y agregar función nueva al final del archivo
- Modify: `src/lib/data/provider.ts` (import + función nueva al final)
- Modify: `src/app/api/historial-entidad/route.ts` (archivo completo, 25 líneas)

**Interfaces:**
- Produces: `PerfilEntidadOece { totalContratado: number; ultimoProceso: string | null; telefono: string | null; web: string | null; direccion: string | null }`, `obtenerPerfilEntidadLive(entidad: string): Promise<PerfilEntidadOece | null>` (oece.ts), `obtenerPerfilEntidad(entidad: string): Promise<PerfilEntidadOece | null>` (provider.ts) — consumidas por Task 5.
- El `GET /api/historial-entidad` ahora devuelve `{ fuente, adjudicaciones, perfilEntidad }` en vez de solo `{ fuente, adjudicaciones }` — consumido por Task 5.

- [ ] **Step 1: Extender las interfaces de `/buyers` en `src/lib/data/live/oece.ts`**

Busca en el archivo el bloque con las interfaces `OceBuyerParty`, `OceBuyerResumen` y `OceBuyersResponse` (aparecen juntas, justo antes de la función `fetchBuyersPage` — su número de línea exacto depende de cuánto haya crecido el archivo con la Task 3, no lo asumas fijo) y reemplázalo por:

```ts
interface OceBuyerParty {
  name?: string;
  address?: { department?: string; streetAddress?: string; locality?: string };
  contactPoint?: { telephone?: string; url?: string };
}

interface OceBuyerResumen {
  party?: OceBuyerParty;
  total_processes?: number;
  total_contracts?: number;
  last_process?: string;
}

interface OceBuyersResponse {
  results?: OceBuyerResumen[];
  pagination?: { num_pages?: number };
}
```

- [ ] **Step 2: Agregar al final de `src/lib/data/live/oece.ts`** (después del cierre de `obtenerTopProveedoresHistoricoLive`, agregado en Task 1)

```ts

export interface PerfilEntidadOece {
  totalContratado: number;
  ultimoProceso: string | null;
  telefono: string | null;
  web: string | null;
  direccion: string | null;
}

// Mismo endpoint que ya usa el mapa del Dashboard (/buyers), con el param `buyer=`
// (búsqueda por nombre, ya confirmado funcionando — ver Quinta integración en
// CLAUDE.md) para traer el registro de una sola entidad. Los campos total_contracts,
// last_process y party.contactPoint ya viajaban en esa misma respuesta y se
// descartaban al mapear para el mapa — no hace falta ningún endpoint nuevo.
export async function obtenerPerfilEntidadLive(entidad: string): Promise<PerfilEntidadOece | null> {
  try {
    const url = new URL(`${BASE_URL}/buyers`);
    url.searchParams.set("buyer", entidad);
    url.searchParams.set("paginateBy", "1");
    url.searchParams.set("format", "json");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url.toString(), {
      headers: oeceHeaders(),
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = (await res.json()) as OceBuyersResponse;
    const buyer = data.results?.[0];
    if (!buyer) return null;

    const direccionPartes = [buyer.party?.address?.streetAddress, buyer.party?.address?.locality]
      .filter((parte): parte is string => Boolean(parte))
      .join(", ");

    return {
      totalContratado: buyer.total_contracts ?? 0,
      ultimoProceso: buyer.last_process ?? null,
      telefono: buyer.party?.contactPoint?.telephone ?? null,
      web: buyer.party?.contactPoint?.url ?? null,
      direccion: direccionPartes.length > 0 ? direccionPartes : null,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Wiring en `src/lib/data/provider.ts`**

Reemplaza el bloque de import (ya extendido en Task 1) por:

```ts
import {
  buscarProcesosLive,
  esIdProcesoLive,
  historialEntidadLive,
  obtenerEstadisticasLive,
  obtenerPerfilEntidadLive,
  obtenerProcesoLive,
  obtenerProcesosActivosPorRegionLive,
  obtenerProcesosPorRegionLive,
  obtenerTopProveedoresHistoricoLive,
  rankingCompetidoresLive,
  type AdjudicacionResumen,
  type EstadisticasOece,
  type PerfilEntidadOece,
  type TopProveedorHistorico,
} from "@/lib/data/live/oece";

export type { PerfilEntidadOece, TopProveedorHistorico };
```

Y agrega al final del archivo (después del cierre de `obtenerTopProveedoresHistorico`, agregado en Task 1):

```ts

// Igual patrón sin fallback mock: es una cifra institucional real (perfil de la
// entidad — monto histórico contratado, último proceso, contacto), no procesos de
// muestra — si la fuente falla, la tarjeta de perfil simplemente no se renderiza.
export async function obtenerPerfilEntidad(entidad: string): Promise<PerfilEntidadOece | null> {
  return obtenerPerfilEntidadLive(entidad);
}
```

- [ ] **Step 4: Reemplazar `src/app/api/historial-entidad/route.ts`**

```ts
import { NextRequest } from "next/server";
import { obtenerHistorialEntidad, obtenerPerfilEntidad } from "@/lib/data/provider";
import { clienteIp, rateLimit, respuestaLimiteExcedido } from "@/lib/rate-limit";

export const preferredRegion = "gru1";
export const maxDuration = 30;

// Cada request dispara hasta 20 fetches de detalle en paralelo al OECE (ver
// LIMITE_CANDIDATOS_ADJUDICACION en lib/data/live/oece.ts).
const LIMITE = 20;
const VENTANA_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const limite = rateLimit(`historial-entidad:${clienteIp(request)}`, LIMITE, VENTANA_MS);
  if (!limite.ok) return respuestaLimiteExcedido(limite);

  const entidad = request.nextUrl.searchParams.get("entidad")?.trim() ?? "";
  if (!entidad) {
    return Response.json({ fuente: "mock", adjudicaciones: [], perfilEntidad: null });
  }

  const [resultado, perfilEntidad] = await Promise.all([
    obtenerHistorialEntidad(entidad),
    obtenerPerfilEntidad(entidad),
  ]);
  return Response.json({ ...resultado, perfilEntidad });
}
```

- [ ] **Step 5: Verificar tipos y build**

```bash
export PATH="$PATH:/c/Program Files/nodejs" && npm run build
```

Expected: compila sin errores.

- [ ] **Step 6: Verificación manual con curl**

```bash
curl -s "https://contratacionesabiertas.oece.gob.pe/api/v1/buyers?buyer=SEGURO%20SOCIAL%20DE%20SALUD&paginateBy=1&format=json" | head -c 500
```

Expected: JSON con `results[0].total_contracts`, `.last_process`, `.party.contactPoint` (aunque sea parcial).

- [ ] **Step 7: Commit**

```bash
git add "src/lib/data/live/oece.ts" "src/lib/data/provider.ts" "src/app/api/historial-entidad/route.ts"
git commit -m "Historial de la entidad: agregar perfil (monto historico, ultimo proceso, contacto)"
```

---

### Task 5: Historial de la Entidad — tarjeta de perfil en la UI

**Files:**
- Modify: `src/components/historial-entidad/historial-entidad-client.tsx` (archivo completo, 129 líneas)

**Interfaces:**
- Consumes: `PerfilEntidadOece` (Task 4), respuesta extendida de `/api/historial-entidad` (`{ fuente, adjudicaciones, perfilEntidad }`).
- No cambia la firma pública `HistorialEntidadClient()` (sin props).

- [ ] **Step 1: Reemplazar `src/components/historial-entidad/historial-entidad-client.tsx` completo**

```tsx
"use client";

import { useEffect, useState } from "react";
import type { AdjudicacionesResultado, PerfilEntidadOece } from "@/lib/data/provider";
import { formatFecha, formatMonto } from "@/lib/format";
import { useProveedor } from "@/lib/state/proveedor-context";
import { cumplePlan } from "@/lib/plan";
import { Card, CardBody } from "@/components/ui/card";
import { UpgradeNotice } from "@/components/plan/upgrade-notice";
import { EntitySelect } from "@/components/shared/entity-select";

interface HistorialEntidadResponse extends AdjudicacionesResultado {
  perfilEntidad: PerfilEntidadOece | null;
}

export function HistorialEntidadClient() {
  const { proveedor } = useProveedor();
  const [entidad, setEntidad] = useState("");
  const [resultado, setResultado] = useState<HistorialEntidadResponse | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!entidad) {
      setResultado(null);
      return;
    }
    let cancelado = false;
    setCargando(true);
    fetch(`/api/historial-entidad?entidad=${encodeURIComponent(entidad)}`)
      .then((r) => r.json())
      .then((data: HistorialEntidadResponse) => {
        if (!cancelado) setResultado(data);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [entidad]);

  if (!cumplePlan(proveedor.plan, "profesional")) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Historial de la entidad</h1>
        <UpgradeNotice minimo="profesional">
          El historial de adjudicaciones por entidad es parte del plan Profesional.
        </UpgradeNotice>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Historial de la entidad</h1>
        <p className="text-sm text-slate-500">¿Cómo compra esta entidad normalmente?</p>
      </div>

      <Card>
        <CardBody>
          <EntitySelect
            label="Entidad contratante"
            value={entidad}
            onChange={setEntidad}
            placeholder="Escribe para buscar una entidad (ej. municipalidad, ministerio)"
          />
        </CardBody>
      </Card>

      {!entidad && (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">Elige una entidad para ver su historial.</p>
          </CardBody>
        </Card>
      )}

      {entidad && resultado?.perfilEntidad && (
        <Card>
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Monto histórico contratado
              </p>
              <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                {formatMonto(resultado.perfilEntidad.totalContratado)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Último proceso publicado
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {resultado.perfilEntidad.ultimoProceso
                  ? formatFecha(resultado.perfilEntidad.ultimoProceso)
                  : "No disponible"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contacto</p>
              <p className="mt-1 text-sm text-slate-600">
                {resultado.perfilEntidad.telefono ?? "Teléfono no publicado"}
              </p>
              {resultado.perfilEntidad.web && (
                <a
                  href={
                    resultado.perfilEntidad.web.startsWith("http")
                      ? resultado.perfilEntidad.web
                      : `https://${resultado.perfilEntidad.web}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block text-xs text-[var(--brand-600)] underline"
                >
                  {resultado.perfilEntidad.web}
                </a>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {entidad && resultado && (
        <>
          {resultado.fuente === "live" ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Adjudicaciones reales del Portal de Contrataciones Abiertas del OECE para{" "}
              <strong>{entidad}</strong>.
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No pudimos obtener adjudicaciones reales para esta entidad — estás viendo datos de
              muestra{resultado.adjudicaciones.length === 0 ? " (tampoco hay para esta entidad en la muestra)" : ""}.
            </div>
          )}

          <div className="flex flex-col gap-2">
            {cargando ? (
              <Card>
                <CardBody>
                  <p className="text-sm text-slate-400">Buscando…</p>
                </CardBody>
              </Card>
            ) : resultado.adjudicaciones.length === 0 ? (
              <Card>
                <CardBody>
                  <p className="text-sm text-slate-500">
                    No encontramos adjudicaciones registradas para esta entidad.
                  </p>
                </CardBody>
              </Card>
            ) : (
              resultado.adjudicaciones.map((a) => (
                <Card key={a.procesoId}>
                  <CardBody className="flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-[var(--foreground)]">{a.objeto}</p>
                      <span className="shrink-0 text-xs font-medium text-slate-400">
                        {formatFecha(a.fecha)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Ganador: <span className="font-medium text-slate-700">{a.proveedorGanador}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatMonto(a.montoAdjudicado)} · {a.categoria} · {a.tipoProcedimiento}
                    </p>
                  </CardBody>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos, lint y build**

```bash
export PATH="$PATH:/c/Program Files/nodejs" && npm run lint && npm run build
```

Expected: ambos sin errores.

- [ ] **Step 3: Verificación manual en el dev server**

Con el plan en Profesional o superior, abre `/historial-entidad`, busca una entidad real conocida (ej. "SEGURO SOCIAL DE SALUD") y selecciónala. Confirma que aparece la tarjeta "Monto histórico contratado" / "Último proceso publicado" / "Contacto" con datos reales (o "no publicado"/"no disponible" si la entidad no los tiene, nunca un valor inventado) antes de la lista de adjudicaciones.

- [ ] **Step 4: Commit**

```bash
git add "src/components/historial-entidad/historial-entidad-client.tsx"
git commit -m "Historial de la entidad: mostrar tarjeta de perfil enriquecido"
```

---

### Task 6: Landing — 2 indicadores nuevos

**Files:**
- Modify: `src/lib/data/live/oece.ts` (agregar al final del archivo, después del cierre de `obtenerPerfilEntidadLive` de Task 4)
- Modify: `src/lib/data/provider.ts` (import + función nueva al final)
- Modify: `src/app/(marketing)/page.tsx` (archivo completo, 157 líneas)

**Interfaces:**
- Produces: `IndicadoresOece { diasPromedioAdjudicacion: number; ofertasPromedioParaGanar: number }`, `obtenerIndicadoresLive(anio: number): Promise<IndicadoresOece | null>` (oece.ts), `obtenerIndicadores(): Promise<IndicadoresOece | null>` (provider.ts) — consumidas por `(marketing)/page.tsx`.

- [ ] **Step 1: Agregar al final de `src/lib/data/live/oece.ts`**

```ts

export interface IndicadoresOece {
  diasPromedioAdjudicacion: number;
  ofertasPromedioParaGanar: number;
}

interface OceIndicadorDuracion {
  data?: { tenderEndToAwardDays?: number };
}

interface OceIndicadorProveedores {
  data?: { tenderersAVG?: number };
}

// Ambos endpoints alimentan el Tablero de Indicadores del propio portal y aceptan
// year= igual que el resto de la familia de endpoints de tableros (confirmado con
// curl: indicatorProcessDurationAVG?year=2026 e indicatorCountSuppliersOneMultiple?year=2026
// devuelven valores distintos entre sí y respecto al histórico total). Se usa
// tenderEndToAwardDays, NO awardToContractStartDays: ese segundo campo mide de
// adjudicación a inicio de contrato, una etapa posterior a "hasta la adjudicación"
// (error encontrado y corregido durante el diseño — ver spec).
export async function obtenerIndicadoresLive(anio: number): Promise<IndicadoresOece | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const [resDuracion, resProveedores] = await Promise.all([
      fetch(`${BASE_URL}/indicatorProcessDurationAVG?year=${anio}&format=json`, {
        headers: oeceHeaders(),
        signal: controller.signal,
        next: { revalidate: 21600 },
      }),
      fetch(`${BASE_URL}/indicatorCountSuppliersOneMultiple?year=${anio}&format=json`, {
        headers: oeceHeaders(),
        signal: controller.signal,
        next: { revalidate: 21600 },
      }),
    ]);
    clearTimeout(timeout);
    if (!resDuracion.ok || !resProveedores.ok) return null;

    const dataDuracion = (await resDuracion.json()) as OceIndicadorDuracion;
    const dataProveedores = (await resProveedores.json()) as OceIndicadorProveedores;
    const dias = dataDuracion.data?.tenderEndToAwardDays;
    const ofertas = dataProveedores.data?.tenderersAVG;
    if (typeof dias !== "number" || typeof ofertas !== "number") return null;

    return {
      diasPromedioAdjudicacion: Math.round(dias),
      ofertasPromedioParaGanar: Math.round(ofertas * 10) / 10,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Wiring en `src/lib/data/provider.ts`**

Reemplaza el bloque de import (ya extendido en Tasks 1 y 4) por:

```ts
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
```

Y agrega al final del archivo (después del cierre de `obtenerPerfilEntidad`, agregado en Task 4):

```ts

// Igual patrón sin fallback mock: son cifras institucionales reales del año en curso
// (días promedio hasta la adjudicación, ofertas promedio para ganar) — si la fuente
// falla, la sección de indicadores del Landing simplemente no se renderiza.
export async function obtenerIndicadores(): Promise<IndicadoresOece | null> {
  return obtenerIndicadoresLive(new Date().getFullYear());
}
```

- [ ] **Step 3: Reemplazar `src/app/(marketing)/page.tsx` completo**

```tsx
import Link from "next/link";
import { PLANES } from "@/lib/plan";
import { obtenerEstadisticas, obtenerIndicadores } from "@/lib/data/provider";

export const preferredRegion = "gru1";
export const maxDuration = 30;

const FEATURES = [
  {
    titulo: "Explorador inteligente",
    texto: "Filtra por región, entidad, rubro, monto y tipo de procedimiento. Todo lo publicado, en un solo lugar.",
  },
  {
    titulo: "Matching automático",
    texto: "Cada proceso se compara con tu perfil: qué coincide, qué falta, y qué tan bueno es el match — no solo un número.",
  },
  {
    titulo: "Ficha inteligente del proceso",
    texto: "¿Me conviene participar? Requisitos, documentos, cronograma y riesgos, en una sola pantalla.",
  },
  {
    titulo: "CRM de oportunidades",
    texto: "De \"por revisar\" a \"buena pro\": haz seguimiento de cada proceso sin depender de una hoja de cálculo.",
  },
];

export default async function LandingPage() {
  const [estadisticas, indicadores] = await Promise.all([
    obtenerEstadisticas(),
    obtenerIndicadores(),
  ]);

  const stats: { valor: number; etiqueta: string; sufijo?: string }[] = [];
  if (estadisticas) {
    stats.push(
      { valor: estadisticas.procesos, etiqueta: "Procesos de contratación" },
      { valor: estadisticas.entidades, etiqueta: "Entidades compradoras" },
      { valor: estadisticas.proveedores, etiqueta: "Proveedores adjudicados" },
      { valor: estadisticas.contratos, etiqueta: "Contratos" }
    );
  }
  if (indicadores) {
    stats.push(
      {
        valor: indicadores.diasPromedioAdjudicacion,
        etiqueta: "Días promedio hasta la adjudicación",
        sufijo: " días",
      },
      {
        valor: indicadores.ofertasPromedioParaGanar,
        etiqueta: "Ofertas promedio para ganar una adjudicación",
      }
    );
  }

  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 py-16 text-center md:px-6 md:py-24">
        <span className="inline-block rounded-full bg-[var(--brand-50)] px-3 py-1 text-xs font-medium text-[var(--brand-700)]">
          Modo demo · datos de muestra
        </span>
        <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-[var(--foreground)] md:text-5xl">
          Deja de perseguir licitaciones. Encuentra las que te convienen.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-slate-600 md:text-lg">
          Urban Procura es el sistema operativo para proveedores del Estado peruano: explora
          procesos, descubre tu compatibilidad y haz seguimiento de tus oportunidades en un solo
          lugar.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/registro"
            className="w-full rounded-lg bg-[var(--brand-600)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--brand-700)] sm:w-auto"
          >
            Crear cuenta gratis
          </Link>
          <Link
            href="/login"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-medium text-slate-700 hover:bg-[var(--surface-muted)] sm:w-auto"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      {stats.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16 md:px-6">
          <div className="grid grid-cols-2 gap-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.etiqueta} className="text-center">
                <p className="text-3xl font-bold text-[var(--foreground)] md:text-4xl">
                  {stat.valor.toLocaleString("es-PE")}
                  {stat.sufijo ?? ""}
                </p>
                <p className="mt-1 text-sm text-slate-600">{stat.etiqueta}</p>
              </div>
            ))}
          </div>
          {estadisticas && (
            <p className="mt-3 text-center text-xs text-slate-400">
              Datos en vivo del{" "}
              <a
                href="https://contratacionesabiertas.oece.gob.pe/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Portal de Contrataciones Abiertas del OECE
              </a>{" "}
              (SEACE V2 y V3) en el año {estadisticas.anio}.
            </p>
          )}
        </section>
      )}

      <section className="border-y border-[var(--border)] bg-[var(--surface)] py-16">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h2 className="text-center text-xl font-semibold text-[var(--foreground)]">
            No es un buscador de licitaciones. Es tu copiloto para decidir.
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.titulo} className="rounded-xl border border-[var(--border)] p-5">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">{f.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="planes" className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Un plan para cada etapa</h2>
          <p className="mt-2 text-sm text-slate-600">
            Empieza gratis para conocer la plataforma. Sin tarjeta de crédito.
          </p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANES.map((plan) => (
            <div
              key={plan.id}
              className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <h3 className="text-sm font-semibold text-[var(--foreground)]">{plan.nombre}</h3>
              <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{plan.precio}</p>
              <p className="mt-2 text-xs text-slate-500">{plan.resumen}</p>
              <ul className="mt-4 flex-1 space-y-2 text-xs text-slate-600">
                {plan.incluye.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-[var(--brand-600)]">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/registro?plan=${plan.id}`}
                className="mt-5 rounded-lg border border-[var(--brand-500)] px-4 py-2 text-center text-xs font-medium text-[var(--brand-700)] hover:bg-[var(--brand-50)]"
              >
                {plan.id === "free" ? "Empezar gratis" : `Elegir ${plan.nombre}`}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-[var(--brand-600)] py-14">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
          <h2 className="text-xl font-semibold text-white">¿Listo para dejar de perseguir licitaciones?</h2>
          <Link
            href="/registro"
            className="mt-6 inline-block rounded-lg bg-white px-6 py-3 text-sm font-medium text-[var(--brand-700)] hover:bg-slate-50"
          >
            Crear cuenta gratis
          </Link>
        </div>
      </section>
    </div>
  );
}
```

Nota: el bloque de estadísticas ahora se renderiza si `stats.length > 0` (antes era `estadisticas &&`) — así, si `obtenerEstadisticas()` falla pero `obtenerIndicadores()` sí responde (o viceversa), la sección igual se muestra con lo que sí llegó, en vez de ocultar todo por la falla de una sola fuente. El pie de "Datos en vivo..." solo se muestra si `estadisticas` está disponible (menciona el año, que sale de ahí).

- [ ] **Step 4: Verificar tipos, lint y build**

```bash
export PATH="$PATH:/c/Program Files/nodejs" && npm run lint && npm run build
```

Expected: ambos sin errores.

- [ ] **Step 5: Verificación manual en el dev server**

Abre `/` (landing) y confirma que el grid de estadísticas ahora tiene 6 celdas (3 columnas × 2 filas en pantallas grandes): los 4 contadores de siempre más "Días promedio hasta la adjudicación" y "Ofertas promedio para ganar una adjudicación", ambos con valores numéricos reales (no 0, no vacío).

- [ ] **Step 6: Commit**

```bash
git add "src/lib/data/live/oece.ts" "src/lib/data/provider.ts" "src/app/(marketing)/page.tsx"
git commit -m "Landing: agregar indicadores de dias hasta adjudicacion y ofertas promedio"
```

---

### Task 7: Dashboard — card de procedimientos más usados este año

**Files:**
- Modify: `src/lib/data/live/oece.ts` (agregar al final del archivo, después del cierre de `obtenerIndicadoresLive` de Task 6)
- Modify: `src/lib/data/provider.ts` (import + función nueva al final)
- Modify: `src/app/(app)/dashboard/page.tsx` (archivo completo, 18 líneas)
- Modify: `src/components/dashboard/dashboard-client.tsx:1-24` (imports y firma) y agregar la card nueva después de `<PeruMapCard>` (línea 111)

**Interfaces:**
- Produces: `ProcedimientoTop { nombre: string; cantidad: number }`, `obtenerProcedimientosTop5Live(anio: number): Promise<ProcedimientoTop[] | null>` (oece.ts), `obtenerProcedimientosTop5(): Promise<ProcedimientoTop[] | null>` (provider.ts) — consumidas por `dashboard-client.tsx`.
- `DashboardClient` gana la prop `procedimientosTop5: ProcedimientoTop[] | null` — las props existentes (`procesos`, `procesosPorRegion`) no cambian.

- [ ] **Step 1: Agregar al final de `src/lib/data/live/oece.ts`**

```ts

export interface ProcedimientoTop {
  nombre: string;
  cantidad: number;
}

interface OceProcedimientoTop10Item {
  count?: number;
  name?: string;
}

interface OceProcedimientoTop10Response {
  data?: OceProcedimientoTop10Item[];
}

// Mismo endpoint que ya usa internamente el Tablero de Procesos de Contratación del
// propio portal para su "Top 10 cantidad de procesos de contratación por tipo de
// procedimiento" — se queda solo con los primeros 5, acotado por año.
export async function obtenerProcedimientosTop5Live(anio: number): Promise<ProcedimientoTop[] | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(
      `${BASE_URL}/recordsProcurementTop10Dashboard?year=${anio}&format=json`,
      {
        headers: oeceHeaders(),
        signal: controller.signal,
        next: { revalidate: 21600 },
      }
    );
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = (await res.json()) as OceProcedimientoTop10Response;
    const items = (data.data ?? [])
      .filter(
        (item): item is Required<Pick<OceProcedimientoTop10Item, "name" | "count">> =>
          Boolean(item.name && typeof item.count === "number")
      )
      .slice(0, 5)
      .map((item) => ({ nombre: item.name, cantidad: item.count }));

    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Wiring en `src/lib/data/provider.ts`**

Reemplaza el bloque de import (ya extendido en Tasks 1, 4 y 6) por:

```ts
import {
  buscarProcesosLive,
  esIdProcesoLive,
  historialEntidadLive,
  obtenerEstadisticasLive,
  obtenerIndicadoresLive,
  obtenerPerfilEntidadLive,
  obtenerProcedimientosTop5Live,
  obtenerProcesoLive,
  obtenerProcesosActivosPorRegionLive,
  obtenerProcesosPorRegionLive,
  obtenerTopProveedoresHistoricoLive,
  rankingCompetidoresLive,
  type AdjudicacionResumen,
  type EstadisticasOece,
  type IndicadoresOece,
  type PerfilEntidadOece,
  type ProcedimientoTop,
  type TopProveedorHistorico,
} from "@/lib/data/live/oece";

export type { IndicadoresOece, PerfilEntidadOece, ProcedimientoTop, TopProveedorHistorico };
```

Y agrega al final del archivo (después del cierre de `obtenerIndicadores`, agregado en Task 6):

```ts

// Igual patrón sin fallback mock: es una cifra institucional real del año en curso
// (top 5 de procedimientos más usados) — si la fuente falla, la card del Dashboard
// simplemente no se renderiza.
export async function obtenerProcedimientosTop5(): Promise<ProcedimientoTop[] | null> {
  return obtenerProcedimientosTop5Live(new Date().getFullYear());
}
```

- [ ] **Step 3: Reemplazar `src/app/(app)/dashboard/page.tsx` completo**

```tsx
import {
  listProcesos,
  obtenerProcedimientosTop5,
  obtenerProcesosActivosPorRegion,
} from "@/lib/data/provider";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const preferredRegion = "gru1";
// Más alto que el resto: obtenerProcesosActivosPorRegion pagina el catálogo completo de
// 3,316 entidades y además trae una muestra de 5,000 procesos del año en curso, en
// paralelo con listProcesos y obtenerProcedimientosTop5 (esta última es liviana, no
// cambia el peor caso) — el peor caso ronda los 30s, así que 30 justo quedaría sin
// margen.
export const maxDuration = 45;

export default async function DashboardPage() {
  const [procesos, procesosPorRegion, procedimientosTop5] = await Promise.all([
    listProcesos(),
    obtenerProcesosActivosPorRegion(),
    obtenerProcedimientosTop5(),
  ]);

  return (
    <DashboardClient
      procesos={procesos}
      procesosPorRegion={procesosPorRegion}
      procedimientosTop5={procedimientosTop5}
    />
  );
}
```

- [ ] **Step 4: Modificar `src/components/dashboard/dashboard-client.tsx`**

Reemplaza las líneas 1-24 (imports y la firma de `DashboardClient`) por:

```tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Proceso, Region } from "@/lib/data/types";
import type { ProcedimientoTop } from "@/lib/data/provider";
import { useProveedor } from "@/lib/state/proveedor-context";
import { useCrm } from "@/lib/state/crm-context";
import { computeMatch } from "@/lib/data/matching";
import { diasRestantes, formatDiasRestantes, formatFecha, formatMonto } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { MatchBadge } from "@/components/ui/badge";
import { UpgradeNotice } from "@/components/plan/upgrade-notice";
import { cumplePlan } from "@/lib/plan";
import { PeruMapCard } from "@/components/dashboard/peru-map-card";

const ESTADOS_ACTIVOS = new Set(["Convocado", "En proceso de selección"]);
const LIMITE_PLAN_FREE = 2;

export function DashboardClient({
  procesos,
  procesosPorRegion,
  procedimientosTop5,
}: {
  procesos: Proceso[];
  procesosPorRegion: Partial<Record<Region, number>> | null;
  procedimientosTop5: ProcedimientoTop[] | null;
}) {
```

Y justo después de la línea `<PeruMapCard datos={procesosPorRegion} />` (línea 111 antes de este cambio), agrega:

```tsx

      {procedimientosTop5 && procedimientosTop5.length > 0 && (
        <Card>
          <CardHeader
            title="Procedimientos más usados este año"
            subtitle="Contexto: con qué tipo de procedimiento te vas a encontrar más seguido"
          />
          <CardBody className="space-y-2">
            {procedimientosTop5.map((p) => (
              <div key={p.nombre} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-600">{p.nombre}</span>
                <span className="font-medium text-[var(--foreground)]">
                  {p.cantidad.toLocaleString("es-PE")}
                </span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
```

- [ ] **Step 5: Verificar tipos, lint y build**

```bash
export PATH="$PATH:/c/Program Files/nodejs" && npm run lint && npm run build
```

Expected: ambos sin errores.

- [ ] **Step 6: Verificación manual en el dev server**

Abre `/dashboard` y confirma que aparece la card "Procedimientos más usados este año" debajo del mapa, con hasta 5 filas de nombre + cantidad (ej. "Licitación pública abreviada" con un número de varios miles).

- [ ] **Step 7: Commit**

```bash
git add "src/lib/data/live/oece.ts" "src/lib/data/provider.ts" "src/app/(app)/dashboard/page.tsx" "src/components/dashboard/dashboard-client.tsx"
git commit -m "Dashboard: agregar card de procedimientos mas usados este ano"
```

---

### Task 8: Verificación end-to-end y actualización de CLAUDE.md

**Files:** ninguno de código — solo verificación integrada de las Tasks 1-7 y actualización de `CLAUDE.md`.

- [ ] **Step 1: Build + lint completos**

```bash
export PATH="$PATH:/c/Program Files/nodejs" && npm run lint && npm run build
```

Expected: ambos sin errores.

- [ ] **Step 2: Confirmar que `matching.ts` no cambió**

```bash
git diff --stat <commit-antes-de-task-1>..HEAD -- src/lib/data/matching.ts
```

Expected: sin salida.

- [ ] **Step 3: Recorrido manual completo en el dev server**

Con `npm run dev` corriendo, en el Browser pane (plan cambiado a Profesional o superior vía el selector del Topbar donde haga falta):
1. `/ranking` — ambas vistas funcionan (por categoría igual que antes, histórico completo con datos reales nuevos).
2. `/explorador` — al menos algunas de las primeras tarjetas muestran región real.
3. `/historial-entidad` — al elegir una entidad real conocida, aparece la tarjeta de perfil con datos reales.
4. `/` (landing) — 6 estadísticas en el grid, las 2 nuevas con valores numéricos reales.
5. `/dashboard` — card de "Procedimientos más usados este año" con datos reales.
6. Consola del navegador sin errores nuevos en ninguna de las 5 pantallas.

- [ ] **Step 4: Actualizar CLAUDE.md**

Edita la sección "Integraciones con fuentes reales del OECE" de `CLAUDE.md`: agrega una nueva subsección ("Décima integración" o similar) resumiendo las 4 mejoras de este plan — Ranking histórico vía `contractsSuppliersTop10Dashboard`, región real en las primeras 15 tarjetas del Explorador vía `/record/{ocid}`, perfil de entidad enriquecido vía campos ya presentes en `/buyers`, e indicadores de Landing/Dashboard vía `indicatorProcessDurationAVG`/`indicatorCountSuppliersOneMultiple`/`recordsProcurementTop10Dashboard`. Actualiza también "Punto de partida de la próxima sesión" para reflejar los commits nuevos de este plan, sin subir todavía (regla de siempre).

- [ ] **Step 5: Commit final de documentación**

```bash
git add CLAUDE.md
git commit -m "Actualizar CLAUDE.md: integraciones OECE avanzadas (ranking, explorador, historial, landing/dashboard)"
```

---

## Self-Review (completado por quien escribió el plan)

- **Cobertura del spec:** Parte 1 (Ranking histórico, corregido de `/suppliers` a `contractsSuppliersTop10Dashboard`) → Tasks 1-2. Parte 2 (Explorador, solo `region`, 15 tarjetas) → Task 3. Parte 3 (Historial de la Entidad) → Tasks 4-5. Parte 4 (Landing con `tenderEndToAwardDays` corregido + Dashboard) → Tasks 6-7. Riesgos/limitaciones de la sección final del spec → reflejados en el copy de cada UI (Task 2's aviso "sin filtrar", Task 5's "no publicado"/"no disponible").
- **Placeholders:** ninguno — todo el código de cada task es el contenido completo y final de cada archivo o un bloque de inserción exacto con su punto de anclaje.
- **Consistencia de tipos:** `TopProveedorHistorico`, `PerfilEntidadOece`, `IndicadoresOece`, `ProcedimientoTop` se definen una vez en `oece.ts` (Tasks 1, 4, 6, 7 respectivamente) y se re-exportan desde `provider.ts` con el mismo nombre en cada task subsiguiente que los necesita — verificado que cada `import`/`export type` de provider.ts en las Tasks 4, 6 y 7 acumula correctamente los símbolos de las tasks anteriores sin perder ninguno.
- **Orden de dependencia dentro de `oece.ts`/`provider.ts`:** cada task que agrega una función nueva la ancla "al final del archivo, después del cierre de la función de la task anterior" en vez de un número de línea fijo — sigue siendo válido aunque el archivo crezca con cada task.
