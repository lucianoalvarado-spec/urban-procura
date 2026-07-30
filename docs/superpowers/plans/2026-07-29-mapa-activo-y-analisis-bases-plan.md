# Mapa de procesos activos + Análisis de bases con IA extendido — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el mapa histórico del Dashboard por procesos convocados este año (muestra), y convertir "Análisis de bases con IA" en un botón que descarga y analiza el PDF real de Bases (con esquema de resultado extendido), manteniendo el cuadro de texto manual como respaldo.

**Architecture:** Ambas features siguen el patrón ya establecido de la capa de datos (`src/lib/data/live/oece.ts` → `src/lib/data/provider.ts` → Server Component → Client Component) y de la ruta de IA existente (`src/app/api/analisis-bases/route.ts`, llamada Anthropic Messages API server-to-server). Ninguna toca `matching.ts`.

**Tech Stack:** Next.js 15.5.21 App Router, React 19, TypeScript, Tailwind v4, Anthropic Messages API vía `fetch` directo (sin SDK), sin librería de parseo de PDF (se usa `type: "document"` con `source: base64` nativo de Claude).

## Global Constraints

- Spec de referencia: [`docs/superpowers/specs/2026-07-29-mapa-activo-y-analisis-bases-design.md`](../specs/2026-07-29-mapa-activo-y-analisis-bases-design.md) — cualquier duda sobre una decisión de producto, revisar ahí primero.
- **Sin framework de tests en este proyecto** (no hay jest/vitest/pytest configurado — confirmado, es deuda técnica pendiente a propósito). Cada tarea se verifica con `npm run build` + `npm run lint` (type-check y lint reales) y con verificación manual contra el dev server (`npm run dev` + Browser pane), no con tests automatizados. No inventar un test runner nuevo para este plan.
- Node no está en el `PATH` de shell por defecto en esta máquina: anteponer `export PATH="$PATH:/c/Program Files/nodejs"` (bash) a cualquier comando `npm`/`node` si el comando falla con "command not found".
- **Nunca `git push`** salvo pedido explícito del usuario en ese mismo turno — cada tarea termina con `git commit` local únicamente.
- `matching.ts` no se toca en ningún task de este plan — el análisis de IA es puramente informativo (ver spec, Parte 2).
- El modelo de IA sigue siendo `claude-sonnet-5` (ya usado en la ruta) — no cambiar de modelo.
- `obtenerProcesosActivosPorRegion` sigue el mismo patrón **sin fallback mock** que `obtenerProcesosPorRegion`/`obtenerEstadisticas` (son cifras institucionales reales, nunca procesos de muestra) — si la fuente falla, la sección correspondiente no se renderiza, nunca se inventa un número.
- La función histórica (`obtenerProcesosPorRegionLive`/`obtenerProcesosPorRegion`) NO se borra — queda disponible en el código, solo deja de ser lo que el Dashboard muestra por defecto.

---

### Task 1: Refactorizar el fetch del catálogo de entidades a un helper compartido

**Contexto:** Tanto el mapa histórico (ya existe) como el nuevo mapa activo (Task 2) necesitan el catálogo completo de `/api/v1/buyers` (3,316 entidades, 4 páginas de 1000) para cruzar entidad→departamento. Antes de agregar la segunda función, extraer la paginación a un helper compartido evita duplicar la lógica de "traer página 1, leer `num_pages`, traer el resto en paralelo".

**Files:**
- Modify: `src/lib/data/live/oece.ts:579-613`

**Interfaces:**
- Produces: `fetchTodosBuyers(): Promise<OceBuyerResumen[] | null>` — usada por Task 2.
- Consumes: tipos ya existentes en el archivo (`OceBuyersResponse`, `OceBuyerResumen`, `mapDepartamento`, `oeceHeaders`, `BASE_URL`) — nada nuevo.

- [ ] **Step 1: Reemplazar el bloque `fetchBuyersPage` + `obtenerProcesosPorRegionLive`**

Reemplaza las líneas 579-613 de `src/lib/data/live/oece.ts` (desde el comentario `// No existe un endpoint oficial...` hasta el cierre de `obtenerProcesosPorRegionLive`) por:

```ts
// No existe un endpoint oficial "procesos por región" (revisamos el tablero de
// Procesos de Contratación del propio portal — sus filtros son entidad/año/mes/
// sistema/categoría/procedimiento/etapa, sin región). Lo calculamos nosotros: cada
// entidad en /api/v1/buyers trae `total_processes` (histórico, todos los años) y
// `party.address.department` — sumamos el primero agrupado por el segundo. Confirmado
// con curl que el campo coincide con la columna "Procesos" que el propio portal
// muestra en /entidades para esa misma entidad.
// El catálogo completo son 3,316 entidades; con paginateBy=1000 son solo 4 páginas.
// Es una llamada pesada para pedirla en cada carga del Dashboard, así que se cachea
// (revalidate) en vez de no-store como el resto de este archivo — estos totales no
// cambian de un minuto a otro.
function fetchBuyersPage(page: number): Promise<OceBuyersResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  return fetch(`${BASE_URL}/buyers?page=${page}&paginateBy=1000&format=json`, {
    headers: oeceHeaders(),
    signal: controller.signal,
    next: { revalidate: 21600 },
  })
    .then((r) => (r.ok ? (r.json() as Promise<OceBuyersResponse>) : null))
    .finally(() => clearTimeout(timeout));
}

// Catálogo completo de entidades (3,316, en 4 páginas de 1000) — compartido por el
// mapa histórico (obtenerProcesosPorRegionLive) y el mapa activo
// (obtenerProcesosActivosPorRegionLive, ver más abajo), ambos necesitan el mismo cruce
// entidad→departamento y no tiene sentido pedirlo dos veces por separado.
async function fetchTodosBuyers(): Promise<OceBuyerResumen[] | null> {
  const dataPrimera = await fetchBuyersPage(1);
  if (!dataPrimera) return null;
  const totalPaginas = dataPrimera.pagination?.num_pages ?? 1;

  const resto = await Promise.all(
    Array.from({ length: totalPaginas - 1 }, (_, i) => fetchBuyersPage(i + 2))
  );

  return [dataPrimera, ...resto].flatMap((pagina) => pagina?.results ?? []);
}

export async function obtenerProcesosPorRegionLive(): Promise<Partial<Record<Region, number>> | null> {
  try {
    const buyers = await fetchTodosBuyers();
    if (!buyers) return null;

    const acumulado: Partial<Record<Region, number>> = {};
    for (const buyer of buyers) {
      const region = mapDepartamento(buyer.party?.address?.department);
      if (region === "Otro") continue;
      acumulado[region] = (acumulado[region] ?? 0) + (buyer.total_processes ?? 0);
    }
    return Object.keys(acumulado).length > 0 ? acumulado : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Verificar tipos y build**

```bash
export PATH="$PATH:/c/Program Files/nodejs" && npm run build
```

Expected: build compila sin errores (mismo resultado que antes del refactor — el comportamiento de `obtenerProcesosPorRegionLive` no cambió, solo se extrajo `fetchTodosBuyers`).

- [ ] **Step 3: Verificación manual — el mapa histórico se sigue viendo igual**

```bash
export PATH="$PATH:/c/Program Files/nodejs" && npm run dev
```

Abre `http://localhost:3000/dashboard` en el Browser pane, espera a que cargue el mapa de "Procesos de contratación por región" y confirma que sigue mostrando números (Lima como el más alto) — sin cambios visibles todavía, esto es un refactor puro.

- [ ] **Step 4: Commit**

```bash
git add "src/lib/data/live/oece.ts"
git commit -m "Refactor: extraer fetchTodosBuyers como helper compartido del catálogo de entidades"
```

---

### Task 2: Agregar `obtenerProcesosActivosPorRegionLive` + wiring en el provider

**Files:**
- Modify: `src/lib/data/live/oece.ts` (agregar después del bloque de Task 1)
- Modify: `src/lib/data/provider.ts:5-15` (imports) y después de `src/lib/data/provider.ts:127` (nueva función)

**Interfaces:**
- Consumes: `fetchTodosBuyers()` (Task 1), `mapDepartamento`, `quitarAcentos`, `BASE_URL`, `oeceHeaders`, tipos `OceBusquedaResponse`/`OceResultadoBusqueda` (ya existen en el archivo).
- Produces: `obtenerProcesosActivosPorRegionLive(): Promise<Partial<Record<Region, number>> | null>` (oece.ts) y `obtenerProcesosActivosPorRegion(): Promise<Partial<Record<Region, number>> | null>` (provider.ts) — consumidas por Task 3.

- [ ] **Step 1: Agregar la función al final de `src/lib/data/live/oece.ts`**

Después del cierre de `obtenerProcesosPorRegionLive` (el que quedó en Task 1), agrega:

```ts
function normalizarNombreEntidad(nombre: string): string {
  return quitarAcentos(nombre).trim().toUpperCase();
}

function fetchMuestraActivaPage(page: number, anio: number): Promise<OceBusquedaResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const url = new URL(`${BASE_URL}/search`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("paginateBy", "1000");
  url.searchParams.set("format", "json");
  url.searchParams.set("year", String(anio));
  return fetch(url.toString(), {
    headers: oeceHeaders(),
    signal: controller.signal,
    next: { revalidate: 21600 },
  })
    .then((r) => (r.ok ? (r.json() as Promise<OceBusquedaResponse>) : null))
    .finally(() => clearTimeout(timeout));
}

// "Activo" = procesos convocados este año, no "con plazo genuinamente abierto ahora
// mismo" (esa alternativa no es viable barata: tender.status casi nunca viene poblado
// en /search — ver spec docs/superpowers/specs/2026-07-29-...). No existe un endpoint
// que dé "procesos por región de este año" directo, así que tomamos una muestra de
// /search?year=<actual> (5 páginas × paginateBy=1000 = 5,000 de un total de ~42,000 ese
// año — balance velocidad/representatividad) y cruzamos el nombre de la entidad
// compradora de cada resultado contra el mismo catálogo de /buyers que ya usa el mapa
// histórico (fetchTodosBuyers). Es una muestra, no el conteo exacto — se documenta en
// el tooltip/subtítulo del mapa (ver peru-map-card.tsx).
const PAGINAS_MUESTRA_ACTIVA = 5;

export async function obtenerProcesosActivosPorRegionLive(): Promise<
  Partial<Record<Region, number>> | null
> {
  try {
    const anio = new Date().getFullYear();
    const [buyers, ...paginasMuestra] = await Promise.all([
      fetchTodosBuyers(),
      ...Array.from({ length: PAGINAS_MUESTRA_ACTIVA }, (_, i) =>
        fetchMuestraActivaPage(i + 1, anio)
      ),
    ]);
    if (!buyers) return null;

    const regionPorEntidad = new Map<string, Region>();
    for (const buyer of buyers) {
      const nombre = buyer.party?.name;
      const region = mapDepartamento(buyer.party?.address?.department);
      if (!nombre || region === "Otro") continue;
      regionPorEntidad.set(normalizarNombreEntidad(nombre), region);
    }

    const acumulado: Partial<Record<Region, number>> = {};
    for (const pagina of paginasMuestra) {
      for (const item of pagina?.results ?? []) {
        const nombreEntidad =
          item.compiledRelease?.buyer?.name || item.compiledRelease?.tender?.procuringEntity?.name;
        if (!nombreEntidad) continue;
        const region = regionPorEntidad.get(normalizarNombreEntidad(nombreEntidad));
        if (!region) continue;
        acumulado[region] = (acumulado[region] ?? 0) + 1;
      }
    }
    return Object.keys(acumulado).length > 0 ? acumulado : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Wiring en `src/lib/data/provider.ts`**

Reemplaza el bloque de import (líneas 5-15):

```ts
import {
  buscarProcesosLive,
  esIdProcesoLive,
  historialEntidadLive,
  obtenerEstadisticasLive,
  obtenerProcesoLive,
  obtenerProcesosActivosPorRegionLive,
  obtenerProcesosPorRegionLive,
  rankingCompetidoresLive,
  type AdjudicacionResumen,
  type EstadisticasOece,
} from "@/lib/data/live/oece";
```

Y después de la función `obtenerProcesosPorRegion` (línea 127), agrega:

```ts

// "Activo" = procesos convocados este año (muestra) — reemplaza al histórico como
// dataset por defecto del mapa del Dashboard (ver dashboard/page.tsx). Mismo patrón sin
// fallback mock que obtenerProcesosPorRegion/obtenerEstadisticas: son cifras
// institucionales reales, no procesos de muestra — si la fuente falla, el mapa lo
// indica en vez de inventar un número.
export async function obtenerProcesosActivosPorRegion(): Promise<Partial<Record<Region, number>> | null> {
  return obtenerProcesosActivosPorRegionLive();
}
```

- [ ] **Step 3: Verificar tipos y build**

```bash
export PATH="$PATH:/c/Program Files/nodejs" && npm run build
```

Expected: compila sin errores. Si TypeScript se queja de `OceResultadoBusqueda`/`OceBusquedaResponse` no exportados o de forma distinta, revisa que los nombres coincidan exactamente con los ya definidos más arriba en `oece.ts` (no son tipos nuevos, se reutilizan).

- [ ] **Step 4: Verificación manual con curl directo (dev, sin relay — el bloqueo del OECE es solo contra la red de Vercel)**

```bash
curl -s "https://contratacionesabiertas.oece.gob.pe/api/v1/search?page=1&paginateBy=5&format=json&year=$(date +%Y)" | head -c 500
```

Expected: JSON con `results` no vacío — confirma que el endpoint y el año actual devuelven datos antes de probarlo desde la app.

- [ ] **Step 5: Commit**

```bash
git add "src/lib/data/live/oece.ts" "src/lib/data/provider.ts"
git commit -m "Add obtenerProcesosActivosPorRegion: muestra de procesos convocados este año por región"
```

---

### Task 3: Reemplazar el dataset del Dashboard (histórico → activo) y actualizar copy del mapa

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx` (archivo completo, 17 líneas)
- Modify: `src/components/dashboard/peru-map-card.tsx` (archivo completo, 149 líneas)

**Interfaces:**
- Consumes: `obtenerProcesosActivosPorRegion()` (Task 2).
- No cambia la firma de `PeruMapCard({ datos })` ni de `DashboardClient` — solo qué dataset se le pasa y el copy que lo describe.

- [ ] **Step 1: Reemplazar `src/app/(app)/dashboard/page.tsx`**

```tsx
import { listProcesos, obtenerProcesosActivosPorRegion } from "@/lib/data/provider";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const preferredRegion = "gru1";
// Más alto que el resto: obtenerProcesosActivosPorRegion pagina el catálogo completo de
// 3,316 entidades y además trae una muestra de 5,000 procesos del año en curso, en
// paralelo con listProcesos — el peor caso ronda los 30s, así que 30 justo quedaría sin
// margen.
export const maxDuration = 45;

export default async function DashboardPage() {
  const [procesos, procesosPorRegion] = await Promise.all([
    listProcesos(),
    obtenerProcesosActivosPorRegion(),
  ]);

  return <DashboardClient procesos={procesos} procesosPorRegion={procesosPorRegion} />;
}
```

- [ ] **Step 2: Reemplazar `src/components/dashboard/peru-map-card.tsx`**

```tsx
"use client";

import { useMemo, useState } from "react";
import { PERU_REGIONES_SVG, PERU_MAPA_VIEWBOX } from "@/lib/data/peru-map";
import type { Region } from "@/lib/data/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

// Escala en 5 baldes por ranking (no por valor lineal): la actividad de contratación
// pública en Perú sigue muy concentrada en Lima, así que una escala lineal dejaría casi
// todo el mapa en blanco. Por ranking, el color siempre se reparte visiblemente sin
// importar cuán desigual sea la distribución real.
const ESCALA_COLOR = [
  "#eef2ff", // brand-50
  "#e0e7ff", // brand-100
  "#a5b4fc",
  "#4f46e5", // brand-500
  "#3730a3", // brand-700
];

function formatMiles(n: number): string {
  return n.toLocaleString("es-PE");
}

export function PeruMapCard({ datos }: { datos: Partial<Record<Region, number>> | null }) {
  // "Opción 1" de vistas del Dashboard — el switch queda armado para que agregar una
  // opción 2 (ej. lista/ranking) más adelante sea sumar una entrada aquí, no rehacer el
  // componente.
  const OPCIONES_VISTA = ["Mapa de regiones"] as const;
  const [vistaActiva, setVistaActiva] = useState<(typeof OPCIONES_VISTA)[number] | null>(
    OPCIONES_VISTA[0]
  );
  const [seleccion, setSeleccion] = useState<Region | null>(null);

  const colorDeRegion = useMemo(() => {
    if (!datos) return new Map<Region, string>();
    const entradas = Object.entries(datos) as [Region, number][];
    const ordenadas = [...entradas].sort((a, b) => a[1] - b[1]);
    const mapa = new Map<Region, string>();
    ordenadas.forEach(([region], i) => {
      const balde = Math.min(
        ESCALA_COLOR.length - 1,
        Math.floor((i / ordenadas.length) * ESCALA_COLOR.length)
      );
      mapa.set(region, ESCALA_COLOR[balde]);
    });
    return mapa;
  }, [datos]);

  return (
    <Card>
      <CardHeader
        title="Procesos de contratación por región"
        subtitle="Procesos convocados este año (muestra) por región de la entidad convocante"
        action={
          <div className="flex items-center gap-2">
            {OPCIONES_VISTA.map((opcion) => (
              <button
                key={opcion}
                type="button"
                onClick={() => setVistaActiva(vistaActiva === opcion ? null : opcion)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  vistaActiva === opcion
                    ? "border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)]"
                    : "border-[var(--border)] text-slate-500 hover:bg-[var(--surface-muted)]"
                }`}
              >
                {opcion} {vistaActiva === opcion ? "· activo" : ""}
              </button>
            ))}
          </div>
        }
      />
      {vistaActiva === "Mapa de regiones" && (
        <CardBody>
          {!datos ? (
            <p className="text-sm text-slate-500">
              No pudimos traer el desglose por región del Portal de Contrataciones Abiertas del
              OECE ahora mismo. Intenta más tarde.
            </p>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <svg
                viewBox={PERU_MAPA_VIEWBOX}
                className="h-auto w-full max-w-[280px] shrink-0"
                role="img"
                aria-label="Mapa del Perú por región"
              >
                {PERU_REGIONES_SVG.map(({ region, path }) => (
                  <path
                    key={region}
                    d={path}
                    fill={
                      seleccion === region
                        ? "var(--brand-700)"
                        : (colorDeRegion.get(region) ?? "var(--surface-muted)")
                    }
                    stroke="var(--surface)"
                    strokeWidth={1}
                    className="cursor-pointer transition-colors"
                    onMouseEnter={() => setSeleccion(region)}
                    onClick={() => setSeleccion(region)}
                  >
                    <title>
                      {`${region}${
                        datos[region] !== undefined
                          ? `: ${formatMiles(datos[region] as number)} procesos este año`
                          : ": sin datos"
                      }`}
                    </title>
                  </path>
                ))}
              </svg>

              <div className="flex-1 space-y-3">
                {seleccion ? (
                  <div className="rounded-lg border border-[var(--border)] p-3">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{seleccion}</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--brand-600)]">
                      {datos[seleccion] !== undefined ? formatMiles(datos[seleccion] as number) : "—"}
                    </p>
                    <p className="text-xs text-slate-500">procesos convocados este año (muestra)</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    Pasa el cursor o toca una región para ver su detalle.
                  </p>
                )}

                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-500">Menos → más procesos</p>
                  <div className="flex h-3 overflow-hidden rounded-full">
                    {ESCALA_COLOR.map((color) => (
                      <span key={color} className="flex-1" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  Estimado a partir de una muestra de ~5,000 procesos convocados este año en el
                  Portal de Contrataciones Abiertas del OECE, cruzados contra el catálogo de
                  ~3,316 entidades por su departamento registrado. Al ser una muestra, regiones
                  con poca actividad podrían aparecer con un número algo menor al real.
                </p>
              </div>
            </div>
          )}
        </CardBody>
      )}
    </Card>
  );
}
```

- [ ] **Step 3: Verificar tipos, lint y build**

```bash
export PATH="$PATH:/c/Program Files/nodejs" && npm run lint && npm run build
```

Expected: ambos sin errores.

- [ ] **Step 4: Verificación manual en el dev server**

```bash
export PATH="$PATH:/c/Program Files/nodejs" && npm run dev
```

Abre `http://localhost:3000/dashboard` en el Browser pane. Espera a que cargue el mapa y confirma con `read_page`/`get_page_text`:
- El subtítulo dice "Procesos convocados este año (muestra)...", no "Histórico OECE (todos los años)...".
- Al pasar el cursor sobre una región, el tooltip termina en "procesos este año".
- Al hacer click en una región, el panel de la derecha dice "procesos convocados este año (muestra)".
- El párrafo inferior menciona la muestra de ~5,000 procesos, no "sumando el histórico".

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/dashboard/page.tsx" "src/components/dashboard/peru-map-card.tsx"
git commit -m "Dashboard: reemplazar mapa histórico por procesos activos (este año) con copy actualizado"
```

---

### Task 4: Extender `/api/analisis-bases` — modo `docUrl` (PDF nativo) + esquema con 3 campos nuevos

**Files:**
- Modify: `src/app/api/analisis-bases/route.ts` (archivo completo, 177 líneas)

**Interfaces:**
- Produces: `AnalisisBasesResultado` con `requisitosTecnicos?: string[]`, `personalClaveRequerido?: string[]`, `certificacionesRequeridas?: string[]` (además de los campos existentes) — consumido por Task 5.
- Consumes: `{ docUrl?: string; texto?: string; proceso?: ProcesoResumen }` en el body — exactamente uno de `docUrl`/`texto`.
- **Seguridad:** `docUrl` viene del cliente, así que el servidor solo debe descargar URLs en dominios permitidos (`seace.gob.pe`) — sin este allowlist, esta ruta sería un SSRF que deja a cualquiera hacer que el servidor descargue una URL arbitraria.

- [ ] **Step 1: Reemplazar `src/app/api/analisis-bases/route.ts` completo**

```ts
import { NextRequest } from "next/server";
import { clienteIp, rateLimit, respuestaLimiteExcedido } from "@/lib/rate-limit";

// Análisis de bases con IA — vía la API de Claude (Anthropic Messages API), llamada
// server-to-server porque necesita ANTHROPIC_API_KEY (nunca debe llegar al navegador).
// Si la clave no está configurada en este entorno, o el modelo no responde, se degrada
// visiblemente (disponible: false + mensaje), nunca en silencio — mismo patrón que el
// resto de integraciones del OECE/RNP.
//
// Dos modos: `docUrl` (descarga el PDF real de bases y se lo pasa a Claude como
// documento nativo — sin librería de parseo de PDF) o `texto` (pegado/subido a mano,
// respaldo para procesos sin documento real o de la muestra mock, que nunca tiene URL
// real).
export const preferredRegion = "gru1";
export const maxDuration = 60;

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";
const MIN_CARACTERES = 200;
// Sin tope, alguien podría pegar textos enormes repetidamente y disparar el costo de
// la API de Claude — 50,000 caracteres alcanza de sobra para unas bases completas.
const MAX_CARACTERES = 50_000;
const LIMITE = 8;
const VENTANA_MS = 10 * 60 * 1000;
const MAX_PDF_BYTES = 15 * 1024 * 1024;
// Los documentos reales de bases siempre vienen de este dominio (ver oece.ts) — el
// docUrl lo manda el cliente, así que sin este allowlist cualquiera podría usar esta
// ruta para hacer que nuestro servidor descargue una URL arbitraria (SSRF).
const DOMINIOS_PERMITIDOS = ["seace.gob.pe"];

export interface AnalisisBasesResultado {
  disponible: boolean;
  mensaje?: string;
  resumenEjecutivo?: string;
  documentosRequeridos?: string[];
  requisitosCalificacion?: string[];
  requisitosTecnicos?: string[];
  personalClaveRequerido?: string[];
  certificacionesRequeridas?: string[];
  garantias?: string[];
  plazoFormaPago?: string;
  criteriosEvaluacion?: string[];
}

interface ProcesoResumen {
  objeto: string;
  entidad: string;
  categoria: string;
  tipoProcedimiento: string;
  montoReferencial: number | null;
}

const PROMPT_SISTEMA = `Eres un asistente que ayuda a proveedores del Estado peruano a entender las bases de un proceso de contratación pública (SEACE/OECE). Analiza el documento o texto de bases que te pasa el usuario y responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin texto antes o después), con esta forma exacta:
{
  "resumenEjecutivo": "string de 2-3 oraciones",
  "documentosRequeridos": ["string", ...],
  "requisitosCalificacion": ["string", ...],
  "requisitosTecnicos": ["string", ...],
  "personalClaveRequerido": ["string", ...],
  "certificacionesRequeridas": ["string", ...],
  "garantias": ["string", ...],
  "plazoFormaPago": "string",
  "criteriosEvaluacion": ["string", ...]
}
Instrucciones por campo:
- "resumenEjecutivo": describe explícitamente las metas físicas o el objeto concreto del proyecto (ej. "construcción de 2.3 km de vía asfaltada", "adquisición de 500 laptops"), no un resumen genérico del proceso administrativo.
- "requisitosTecnicos": especificaciones técnicas que debe cumplir la oferta — distinto de los requisitos de calificación del postor.
- "personalClaveRequerido": profesionales exigidos (cargo, colegiatura, experiencia mínima) tal como los detalle el documento.
- "certificacionesRequeridas": certificaciones ISO u otras que las bases exijan.
Si el texto no trae información suficiente para alguna sección, usa un array vacío o el string "No especificado en el texto proporcionado" — nunca inventes datos que no estén en el documento.`;

function extraerJson(texto: string): Record<string, unknown> | null {
  try {
    return JSON.parse(texto);
  } catch {
    const inicio = texto.indexOf("{");
    const fin = texto.lastIndexOf("}");
    if (inicio === -1 || fin === -1) return null;
    try {
      return JSON.parse(texto.slice(inicio, fin + 1));
    } catch {
      return null;
    }
  }
}

function hostPermitido(url: URL): boolean {
  return DOMINIOS_PERMITIDOS.some(
    (dominio) => url.hostname === dominio || url.hostname.endsWith(`.${dominio}`)
  );
}

type DescargaPdf =
  | { ok: true; base64: string }
  | { ok: false; motivo: "muy_pesado" | "no_disponible" };

async function descargarPdfBase64(docUrl: string): Promise<DescargaPdf> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(docUrl, { signal: controller.signal });
    if (!res.ok) return { ok: false, motivo: "no_disponible" };
    const contentLength = res.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_PDF_BYTES) {
      return { ok: false, motivo: "muy_pesado" };
    }
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_PDF_BYTES) return { ok: false, motivo: "muy_pesado" };
    return { ok: true, base64: Buffer.from(buffer).toString("base64") };
  } catch {
    return { ok: false, motivo: "no_disponible" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  const limite = rateLimit(`analisis-bases:${clienteIp(request)}`, LIMITE, VENTANA_MS);
  if (!limite.ok) return respuestaLimiteExcedido(limite);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const resultado: AnalisisBasesResultado = {
      disponible: false,
      mensaje:
        "El análisis con IA no está configurado en este entorno (falta la clave de API de Claude).",
    };
    return Response.json(resultado);
  }

  const body = (await request.json().catch(() => null)) as
    | { docUrl?: string; texto?: string; proceso?: ProcesoResumen }
    | null;
  const docUrl = body?.docUrl?.trim();
  const texto = body?.texto?.trim() ?? "";

  if (docUrl && texto) {
    const resultado: AnalisisBasesResultado = {
      disponible: false,
      mensaje: "Envía solo un modo de análisis a la vez (documento o texto).",
    };
    return Response.json(resultado, { status: 400 });
  }

  if (!docUrl && texto.length < MIN_CARACTERES) {
    const resultado: AnalisisBasesResultado = {
      disponible: false,
      mensaje: `Pega o sube un texto más largo (al menos ${MIN_CARACTERES} caracteres) — parece que faltan las bases completas.`,
    };
    return Response.json(resultado, { status: 400 });
  }

  if (!docUrl && texto.length > MAX_CARACTERES) {
    const resultado: AnalisisBasesResultado = {
      disponible: false,
      mensaje: `El texto es demasiado largo (máximo ${MAX_CARACTERES.toLocaleString("es-PE")} caracteres) — recorta las bases antes de analizarlas.`,
    };
    return Response.json(resultado, { status: 400 });
  }

  const proceso = body?.proceso;
  const contextoProceso = proceso
    ? `Proceso: "${proceso.objeto}" — Entidad: ${proceso.entidad} — Categoría: ${proceso.categoria} — Tipo de procedimiento: ${proceso.tipoProcedimiento} — Monto referencial: ${proceso.montoReferencial !== null ? `S/ ${proceso.montoReferencial.toLocaleString("es-PE")}` : "no publicado por la entidad"}.\n\n`
    : "";

  let content: Array<Record<string, unknown>>;
  let timeoutAnthropicMs = 55000;

  if (docUrl) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(docUrl);
    } catch {
      const resultado: AnalisisBasesResultado = {
        disponible: false,
        mensaje: "La URL del documento no es válida.",
      };
      return Response.json(resultado, { status: 400 });
    }
    if (parsedUrl.protocol !== "https:" || !hostPermitido(parsedUrl)) {
      const resultado: AnalisisBasesResultado = {
        disponible: false,
        mensaje: "El documento debe venir de una fuente oficial del SEACE.",
      };
      return Response.json(resultado, { status: 400 });
    }

    const descarga = await descargarPdfBase64(parsedUrl.toString());
    if (!descarga.ok) {
      const resultado: AnalisisBasesResultado = {
        disponible: false,
        mensaje:
          descarga.motivo === "muy_pesado"
            ? "El documento de bases es muy pesado para analizarlo automáticamente (más de 15 MB) — pégalo como texto si puedes extraerlo."
            : "No pudimos descargar el documento de bases automáticamente ahora mismo — pégalo como texto si lo tienes a mano.",
      };
      return Response.json(resultado);
    }

    content = [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: descarga.base64 },
      },
      { type: "text", text: `${contextoProceso}Analiza el documento de bases adjunto.` },
    ];
    timeoutAnthropicMs = 40000;
  } else {
    content = [
      { type: "text", text: `${contextoProceso}Texto de las bases:\n\n${texto.slice(0, 40000)}` },
    ];
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutAnthropicMs);
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: PROMPT_SISTEMA,
        messages: [{ role: "user", content }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const resultado: AnalisisBasesResultado = {
        disponible: false,
        mensaje: `El motor de IA respondió con un error (${res.status}). Intenta más tarde.`,
      };
      return Response.json(resultado);
    }

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const textoRespuesta = data.content?.find((c) => c.type === "text")?.text ?? "";
    const parsed = extraerJson(textoRespuesta);

    if (!parsed) {
      const resultado: AnalisisBasesResultado = {
        disponible: false,
        mensaje: "El motor de IA respondió en un formato inesperado. Intenta de nuevo.",
      };
      return Response.json(resultado);
    }

    const comoStrings = (valor: unknown): string[] =>
      Array.isArray(valor) ? valor.filter((x): x is string => typeof x === "string") : [];

    const resultado: AnalisisBasesResultado = {
      disponible: true,
      resumenEjecutivo: typeof parsed.resumenEjecutivo === "string" ? parsed.resumenEjecutivo : undefined,
      documentosRequeridos: comoStrings(parsed.documentosRequeridos),
      requisitosCalificacion: comoStrings(parsed.requisitosCalificacion),
      requisitosTecnicos: comoStrings(parsed.requisitosTecnicos),
      personalClaveRequerido: comoStrings(parsed.personalClaveRequerido),
      certificacionesRequeridas: comoStrings(parsed.certificacionesRequeridas),
      garantias: comoStrings(parsed.garantias),
      plazoFormaPago: typeof parsed.plazoFormaPago === "string" ? parsed.plazoFormaPago : undefined,
      criteriosEvaluacion: comoStrings(parsed.criteriosEvaluacion),
    };
    return Response.json(resultado);
  } catch {
    const resultado: AnalisisBasesResultado = {
      disponible: false,
      mensaje: "No pudimos conectar con el motor de IA ahora mismo. Intenta más tarde.",
    };
    return Response.json(resultado);
  }
}
```

- [ ] **Step 2: Verificar tipos, lint y build**

```bash
export PATH="$PATH:/c/Program Files/nodejs" && npm run lint && npm run build
```

Expected: ambos sin errores. `Buffer` es global en el runtime Node por defecto de Next.js (esta ruta no declara `export const runtime = "edge"`), así que no hace falta importarlo.

- [ ] **Step 3: Verificación manual — rechazo de dominio no permitido (SSRF guard)**

Con el dev server corriendo (`npm run dev`), sin `ANTHROPIC_API_KEY` configurada localmente el guard de "no configurado" respondería antes de llegar a validar `docUrl` — para probar el guard de dominio específicamente, exporta una key dummy o revisa el código: confirma a simple vista que `hostPermitido` rechaza cualquier host que no termine en `seace.gob.pe`. Si tienes `ANTHROPIC_API_KEY` en `.env.local`, puedes probar con:

```bash
curl -s -X POST http://localhost:3000/api/analisis-bases -H "Content-Type: application/json" -d "{\"docUrl\":\"https://example.com/malicious.pdf\"}"
```

Expected: `{"disponible":false,"mensaje":"El documento debe venir de una fuente oficial del SEACE."}` con status 400 — nunca debe intentar descargar `example.com`.

- [ ] **Step 4: Verificación manual — modo texto sigue funcionando (sin regresión)**

```bash
curl -s -X POST http://localhost:3000/api/analisis-bases -H "Content-Type: application/json" -d "{\"texto\":\"$(node -e 'console.log("Bases del proceso de ejemplo. ".repeat(20))')\"}"
```

Expected (si `ANTHROPIC_API_KEY` está configurada): `disponible: true` con las 9 secciones del `AnalisisBasesResultado` (incluyendo las 3 nuevas, aunque vengan vacías por falta de contenido real). Si no hay key configurada localmente: `{"disponible":false,"mensaje":"El análisis con IA no está configurado en este entorno..."}` — ambos son comportamiento correcto, solo confirma que no rompió nada.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/analisis-bases/route.ts"
git commit -m "Analisis de bases: agregar modo docUrl (PDF nativo) y 3 campos nuevos al esquema"
```

---

### Task 5: `AnalisisBasesCard` — botón automático + fallback manual colapsado + 3 secciones nuevas

**Files:**
- Modify: `src/components/analisis-ia/analisis-bases-card.tsx` (archivo completo, 182 líneas)

**Interfaces:**
- Consumes: `AnalisisBasesResultado` extendido (Task 4), `proceso.documentos: DocumentoProceso[]` (prop ya existente, tipo en `src/lib/data/types.ts:62-65`).
- No cambia la firma pública `AnalisisBasesCard({ proceso }: { proceso: Proceso })` — se sigue usando igual en `ficha-client.tsx:249` y `analisis-ia-client.tsx:74`.

- [ ] **Step 1: Reemplazar `src/components/analisis-ia/analisis-bases-card.tsx` completo**

```tsx
"use client";

import { useRef, useState } from "react";
import type { Proceso } from "@/lib/data/types";
import type { AnalisisBasesResultado } from "@/app/api/analisis-bases/route";
import { useProveedor } from "@/lib/state/proveedor-context";
import { computeMatch } from "@/lib/data/matching";
import { useAnalisisGuardados, guardarAnalisis } from "@/lib/state/analisis-store";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { MatchBadge } from "@/components/ui/badge";
import { UpgradeNotice } from "@/components/plan/upgrade-notice";
import { cumplePlan } from "@/lib/plan";

const MIN_CARACTERES = 200;

export function AnalisisBasesCard({ proceso }: { proceso: Proceso }) {
  const { proveedor } = useProveedor();
  const guardados = useAnalisisGuardados();
  // Solo el label "Bases" viene de la fuente real (biddingDocuments → "Bases" en
  // oece.ts) — la muestra mock usa "Bases integradas" con url "#..." a propósito, así
  // que nunca activa el modo automático (comportamiento esperado, no un bug).
  const docBases = proceso.documentos.find(
    (d) => d.tipo === "Bases" && d.disponible && d.url.startsWith("http")
  );
  const [modo, setModo] = useState<"auto" | "manual">(docBases ? "auto" : "manual");
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<AnalisisBasesResultado | null>(
    guardados[proceso.id] ?? null
  );
  const inputArchivo = useRef<HTMLInputElement>(null);

  if (!cumplePlan(proveedor.plan, "premium")) {
    return (
      <Card>
        <CardHeader title="Análisis de bases con IA" subtitle="¿Puedo participar y qué me falta?" />
        <CardBody>
          <UpgradeNotice minimo="premium">
            El análisis automático de bases con IA es parte del plan Premium.
          </UpgradeNotice>
        </CardBody>
      </Card>
    );
  }

  const match = computeMatch(proceso, proveedor);
  const procesoResumen = {
    objeto: proceso.objeto,
    entidad: proceso.entidad,
    categoria: proceso.categoria,
    tipoProcedimiento: proceso.tipoProcedimiento,
    montoReferencial: proceso.montoReferencial,
  };

  const subirArchivo = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setResultado({
        disponible: false,
        mensaje: "Por ahora solo se puede subir texto plano (.txt) — o pega el texto directamente.",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setTexto(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const analizarAutomatico = async () => {
    if (!docBases) return;
    setCargando(true);
    setResultado(null);
    try {
      const res = await fetch("/api/analisis-bases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docUrl: docBases.url, proceso: procesoResumen }),
      });
      const data = (await res.json()) as AnalisisBasesResultado;
      setResultado(data);
      if (data.disponible) {
        guardarAnalisis(proceso.id, data);
      } else {
        // La descarga/lectura automática falló — cae al cuadro manual con el mensaje
        // explicando por qué, en vez de dejar al usuario sin salida (ver spec Parte 2).
        setModo("manual");
      }
    } catch {
      setResultado({
        disponible: false,
        mensaje: "No pudimos conectar con el motor de IA ahora mismo. Intenta más tarde.",
      });
      setModo("manual");
    } finally {
      setCargando(false);
    }
  };

  const analizarManual = async () => {
    setCargando(true);
    setResultado(null);
    try {
      const res = await fetch("/api/analisis-bases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, proceso: procesoResumen }),
      });
      const data = (await res.json()) as AnalisisBasesResultado;
      setResultado(data);
      if (data.disponible) guardarAnalisis(proceso.id, data);
    } catch {
      setResultado({
        disponible: false,
        mensaje: "No pudimos conectar con el motor de IA ahora mismo. Intenta más tarde.",
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Análisis de bases con IA"
        subtitle={
          docBases && modo === "auto"
            ? "Descargamos y analizamos el documento oficial de bases por ti"
            : "Pega o sube el texto de las bases para un resumen estructurado"
        }
        action={<MatchBadge nivel={match.nivel} score={match.score} />}
      />
      <CardBody className="space-y-3">
        {docBases && modo === "auto" && (
          <div className="flex flex-col items-start gap-2">
            <button
              type="button"
              disabled={cargando}
              onClick={analizarAutomatico}
              className="rounded-lg bg-[var(--brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {cargando ? "Analizando…" : "Analizar bases automáticamente"}
            </button>
            <button
              type="button"
              onClick={() => setModo("manual")}
              className="text-xs font-medium text-slate-500 underline hover:text-slate-700"
            >
              o pega el texto manualmente
            </button>
          </div>
        )}

        {modo === "manual" && (
          <>
            {docBases && (
              <button
                type="button"
                onClick={() => setModo("auto")}
                className="text-xs font-medium text-slate-500 underline hover:text-slate-700"
              >
                ← usar el botón automático
              </button>
            )}
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Pega aquí el texto de las bases (o súbelo como .txt abajo)…"
              rows={6}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--brand-500)] focus:outline-none"
            />
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={inputArchivo}
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) subirArchivo(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => inputArchivo.current?.click()}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-[var(--surface-muted)]"
              >
                Subir archivo .txt
              </button>
              <span className="text-xs text-slate-400">{texto.length} caracteres</span>
              <button
                type="button"
                disabled={cargando || texto.trim().length < MIN_CARACTERES}
                onClick={analizarManual}
                className="ml-auto rounded-lg bg-[var(--brand-600)] px-4 py-1.5 text-xs font-medium text-white hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {cargando ? "Analizando…" : "Analizar con IA"}
              </button>
            </div>
          </>
        )}

        {resultado && !resultado.disponible && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {resultado.mensaje}
          </p>
        )}

        {resultado?.disponible && (
          <div className="space-y-4 border-t border-[var(--border)] pt-3">
            {resultado.resumenEjecutivo && (
              <p className="text-sm leading-relaxed text-slate-700">{resultado.resumenEjecutivo}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Seccion titulo="Requisitos técnicos" items={resultado.requisitosTecnicos} />
              <Seccion titulo="Personal clave requerido" items={resultado.personalClaveRequerido} />
              <Seccion titulo="Certificaciones requeridas" items={resultado.certificacionesRequeridas} />
              <Seccion titulo="Documentos requeridos" items={resultado.documentosRequeridos} />
              <Seccion titulo="Requisitos de calificación" items={resultado.requisitosCalificacion} />
              <Seccion titulo="Garantías" items={resultado.garantias} />
              <Seccion titulo="Criterios de evaluación" items={resultado.criteriosEvaluacion} />
            </div>
            {resultado.plazoFormaPago && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Plazo / forma de pago
                </p>
                <p className="text-sm text-slate-600">{resultado.plazoFormaPago}</p>
              </div>
            )}
            <p className="text-xs text-slate-400">
              Generado por IA a partir del documento analizado — verifica siempre contra las bases
              oficiales antes de decidir.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Seccion({ titulo, items }: { titulo: string; items?: string[] }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
      {!items || items.length === 0 ? (
        <p className="text-sm text-slate-400">No especificado en el texto proporcionado.</p>
      ) : (
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
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

- [ ] **Step 3: Verificación manual — proceso live con documento "Bases" real**

Con el dev server corriendo, abre el Explorador (`http://localhost:3000/explorador`), busca un proceso real (ej. "PROVIAS") y abre su ficha (`/procesos/[id]`). En la sección "Análisis de bases con IA":
- Si el proceso trae un documento tipo "Bases" con URL real: debe verse el botón "Analizar bases automáticamente" (no el cuadro de texto directamente) y el link "o pega el texto manualmente" debajo.
- Click en "o pega el texto manualmente" debe mostrar el cuadro de texto + botón "← usar el botón automático" para volver.
- Si tienes `ANTHROPIC_API_KEY` configurada, click en "Analizar bases automáticamente" y confirma que el resultado incluye las secciones "Requisitos técnicos", "Personal clave requerido" y "Certificaciones requeridas" (aunque vengan vacías si las bases no las detallan).

- [ ] **Step 4: Verificación manual — proceso mock (sin regresión)**

Desde `/analisis-ia`, elige un proceso de la lista sugerida (mock, plan free/demo) o cualquier proceso sin documento "Bases" real. Confirma que se muestra directamente el cuadro de texto de siempre (comportamiento actual), sin el botón automático — porque `proceso.documentos` para mock usa el tipo `"Bases integradas"`, no `"Bases"`.

- [ ] **Step 5: Commit**

```bash
git add "src/components/analisis-ia/analisis-bases-card.tsx"
git commit -m "AnalisisBasesCard: boton automatico con fallback manual y 3 secciones nuevas"
```

---

### Task 6: Verificación end-to-end y cierre

**Files:** ninguno nuevo — solo verificación integrada de las Tasks 1-5.

- [ ] **Step 1: Build + lint completos**

```bash
export PATH="$PATH:/c/Program Files/nodejs" && npm run lint && npm run build
```

Expected: ambos sin errores, sin warnings nuevos.

- [ ] **Step 2: Recorrido manual completo en el dev server**

Con `npm run dev` corriendo, en el Browser pane:
1. `/dashboard` — el mapa muestra "este año (muestra)" en subtítulo/tooltip/panel/leyenda, no "histórico".
2. `/explorador` → abrir un proceso real con documento "Bases" → ficha muestra el botón automático de análisis.
3. `/analisis-ia` → elegir un proceso mock → cuadro de texto de siempre, sin regresión.
4. Consola del navegador sin errores nuevos (`read_console_messages`).

- [ ] **Step 3: Confirmar que `matching.ts` no cambió**

```bash
git diff --stat HEAD~5 -- src/lib/data/matching.ts
```

Expected: sin salida (archivo no tocado por ninguna de las 5 tareas anteriores).

- [ ] **Step 4: Actualizar CLAUDE.md con el estado nuevo**

Edita la sección "Estado actual" de `CLAUDE.md`: marcar las dos features del spec de 2026-07-29 como implementadas (ya no "ninguna implementada todavía"), y mover el punto de partida de la próxima sesión a lo que corresponda después de esto (ej. probar en producción tras el próximo deploy, o el siguiente pendiente que el usuario priorice).

- [ ] **Step 5: Commit final de documentación**

```bash
git add CLAUDE.md
git commit -m "Actualizar CLAUDE.md: mapa activo y analisis de bases extendido ya implementados"
```

---

## Self-Review (completado por quien escribió el plan)

- **Cobertura del spec:** Parte 1 (mapa activo, reemplazo del histórico, muestra documentada) → Tasks 1-3. Parte 2 (botón automático, fallback manual, esquema extendido, rate limit reutilizado, sin tocar matching.ts) → Tasks 4-5. Riesgos/limitaciones de la sección final del spec → reflejados en el copy de Task 3 Step 2 y en el mensaje de "muy pesado"/"no disponible" de Task 4.
- **Placeholders:** ninguno — todo el código de cada task es el contenido completo y final de cada archivo.
- **Consistencia de tipos:** `AnalisisBasesResultado` (Task 4) y su consumo en `AnalisisBasesCard` (Task 5) usan los mismos nombres de campo (`requisitosTecnicos`, `personalClaveRequerido`, `certificacionesRequeridas`). `obtenerProcesosActivosPorRegionLive`/`obtenerProcesosActivosPorRegion` (Tasks 2-3) devuelven el mismo tipo `Partial<Record<Region, number>> | null` que ya consume `PeruMapCard({ datos })` sin cambiar su firma.
