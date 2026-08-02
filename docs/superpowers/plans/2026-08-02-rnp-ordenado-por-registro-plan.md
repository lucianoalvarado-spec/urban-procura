# RNP ordenado por tipo de registro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La tarjeta "RNP y capacidad de contratación" de `/perfil` pasa a mostrar 4 bloques ordenados por tipo de registro (Proveedor de Bienes / Proveedor de Servicios / Ejecutor de Obras / Consultor de Obras), poblados desde datos reales del RNP; la capacidad de contratación autodeclarada se muda a su propia tarjeta separada, claramente etiquetada como dato del proveedor, no del RNP.

**Architecture:** `EstadoRnp` suma `registros?: RegistroRnp[]`, poblado en `api/rnp/route.ts` parseando `lscIdTipReg`/`lscIdTipRegVig` (ya vienen en la respuesta real del RNP, hoy descartados) y propagado en `registro-form.tsx`. `rnp-card.tsx` se reestructura para renderizar por esos 4 tipos en orden fijo, con fallback honesto cuando `registros` es `undefined` (RNP nunca consultado). El formulario de capacidad autodeclarada se extrae a un componente nuevo, `capacidad-declarada-card.tsx`, sin cambiar su mecánica de guardado.

**Tech Stack:** Next.js 15 / React 19 / TypeScript. Sin framework de tests — verificación por `npx tsc --noEmit`, `npm run lint`, `npm run build`, y prueba manual contra el dev server local.

## Global Constraints

- Nunca hacer `git push` sin que el usuario lo pida explícitamente en ese mismo turno — solo `git commit`.
- Verificar contra el dev server local (`npm run dev` + Browser pane), no contra producción.
- No inventar datos: si `registros` es `undefined` (RNP no consultado con éxito), la tarjeta debe decirlo explícitamente, nunca mostrar los 4 bloques vacíos ni asumir "no tiene ningún registro".
- Ningún dato ingresado manualmente por el usuario (especialidades escritas a mano, capacidad máxima general) debe desaparecer de la UI si `registros` no incluye el tipo bajo el que ese dato normalmente se anida — debe mostrarse como fallback en vez de ocultarse (ver Task 2, sección "Fallback sin duplicar").
- Mapeo de código a tipo de registro (confirmado por comentario existente en `src/app/api/rnp/obras/route.ts:17-18`): `"1"` → `ejecucionObras`, `"2"` → `consultoriaObras`. `"3"`/`"4"` → `bienes`/`servicios`, asignación **no verificada con certeza** — se usa `"3"` → `bienes`, `"4"` → `servicios` como mejor estimación; Task 4 incluye el paso de verificarlo contra el perfil público del RUC de prueba antes de dar la tarea por cerrada.
- No tocar `src/lib/data/matching.ts`.
- El mecanismo de guardado de `capacidades` (self-declared) no cambia — solo se muda de tarjeta contenedora.

---

## Task 1: `EstadoRnp.registros`, parseo en `api/rnp/route.ts`, propagación en `registro-form.tsx`

**Files:**
- Modify: `src/lib/data/types.ts:170-182`
- Modify: `src/app/api/rnp/route.ts`
- Modify: `src/components/marketing/registro-form.tsx:104-109`

**Interfaces:**
- Produces: `RegistroRnp` (`{ tipo: CategoriaRnp; vigente: boolean }`), `EstadoRnp.registros?: RegistroRnp[]`, `RnpResultado.registros?: RegistroRnp[]` (exportado desde `api/rnp/route.ts`, ya consumido como tipo por `registro-form.tsx`).

- [ ] **Step 1: Agregar `RegistroRnp` y el campo `registros` a `EstadoRnp`**

En `src/lib/data/types.ts`, reemplazar:

```typescript
export type CategoriaRnp = "bienes" | "servicios" | "consultoriaObras" | "ejecucionObras";

export interface EstadoRnp {
  vigente: boolean;
  numeroPartida: string;
  especialidades: string[];
  capacidades: Record<
    CategoriaRnp,
    { habilitado: boolean; capacidadMaxima: number; capacidadLibre: number }
  >;
  /** Capacidad máxima de contratación general reportada por el RNP (sin desagregar por categoría). */
  capacidadMaximaGeneral?: number | null;
}
```

por:

```typescript
export type CategoriaRnp = "bienes" | "servicios" | "consultoriaObras" | "ejecucionObras";

/** Un tipo de registro del RNP que el proveedor tiene, con si está vigente ahora mismo.
 * Solo se puebla desde un fetch real y exitoso del RNP (ver api/rnp/route.ts) — nunca
 * autodeclarado por el usuario. */
export interface RegistroRnp {
  tipo: CategoriaRnp;
  vigente: boolean;
}

export interface EstadoRnp {
  vigente: boolean;
  numeroPartida: string;
  especialidades: string[];
  capacidades: Record<
    CategoriaRnp,
    { habilitado: boolean; capacidadMaxima: number; capacidadLibre: number }
  >;
  /** Capacidad máxima de contratación general reportada por el RNP (sin desagregar por categoría). */
  capacidadMaximaGeneral?: number | null;
  /** undefined = el RNP nunca se consultó con éxito para este proveedor. */
  registros?: RegistroRnp[];
}
```

(`crearRnpVacio()`, un poco más abajo en el mismo archivo, no necesita cambios — `registros` es opcional, queda ausente/`undefined` por defecto en el objeto que ya retorna.)

- [ ] **Step 2: Parsear `lscIdTipReg`/`lscIdTipRegVig` en `api/rnp/route.ts`**

Reemplazar la interfaz `OsceProveedor`:

```typescript
interface OsceProveedor {
  numRuc: string;
  nomRzsProv: string;
  esHabilitado: boolean;
  esAptoContratar: boolean;
  cmcTexto: string | null;
  espProvT01s: OsceEspecialidad[] | null;
}
```

por:

```typescript
interface OsceProveedor {
  numRuc: string;
  nomRzsProv: string;
  esHabilitado: boolean;
  esAptoContratar: boolean;
  cmcTexto: string | null;
  espProvT01s: OsceEspecialidad[] | null;
  lscIdTipReg: string | null;
  lscIdTipRegVig: string | null;
}
```

Agregar el import de `RegistroRnp` al inicio del archivo (junto al resto de imports):

```typescript
import type { RegistroRnp } from "@/lib/data/types";
```

Agregar esta función nueva, junto a `parseCapacidad` (antes de `const LIMITE = ...`):

```typescript
// "1" → ejecucionObras, "2" → consultoriaObras — confirmado por el comentario existente en
// src/app/api/rnp/obras/route.ts. "3"/"4" → bienes/servicios, asignación NO verificada con
// certeza (ver Global Constraints del plan) — si al probar contra un perfil real resulta
// invertida, es swap de una línea en este mapa, sin impacto en ningún otro dato.
const CODIGO_A_CATEGORIA: Record<string, CategoriaRnp> = {
  "1": "ejecucionObras",
  "2": "consultoriaObras",
  "3": "bienes",
  "4": "servicios",
};

function parseRegistros(lscIdTipReg: string | null, lscIdTipRegVig: string | null): RegistroRnp[] {
  if (!lscIdTipReg) return [];
  const codigosVigentes = new Set((lscIdTipRegVig ?? "").split(" ").filter(Boolean));
  return lscIdTipReg
    .split(" ")
    .filter(Boolean)
    .map((codigo) => ({ codigo, tipo: CODIGO_A_CATEGORIA[codigo] }))
    .filter((x): x is { codigo: string; tipo: CategoriaRnp } => Boolean(x.tipo))
    .map(({ codigo, tipo }) => ({ tipo, vigente: codigosVigentes.has(codigo) }));
}
```

Nota: la versión anterior de esta función (con `.map((tipo, i) => ...)` después de un `.filter`) tenía un bug de desalineación de índices si algún código no estuviera en `CODIGO_A_CATEGORIA` — el `i` del segundo `.map` ya no correspondía a la posición original en `lscIdTipReg`. La versión de arriba evita el problema llevando `codigo` junto a `tipo` en la misma tupla hasta el final, así el emparejamiento con `codigosVigentes` es siempre por el código real, nunca por posición.

Agregar `import type { CategoriaRnp } from "@/lib/data/types";` junto al import de `RegistroRnp` del paso anterior (puede combinarse en una sola línea: `import type { CategoriaRnp, RegistroRnp } from "@/lib/data/types";`).

Agregar `registros?: RegistroRnp[];` a la interfaz `RnpResultado`:

```typescript
export interface RnpResultado {
  disponible: boolean;
  encontrado: boolean;
  ruc: string;
  razonSocial?: string;
  habilitado?: boolean;
  aptoContratar?: boolean;
  especialidades?: string[];
  capacidadMaximaContratacion?: number | null;
  registros?: RegistroRnp[];
  mensaje: string;
}
```

Y agregar `registros: parseRegistros(proveedor.lscIdTipReg, proveedor.lscIdTipRegVig),` al objeto `resultado` que se arma cuando el proveedor se encuentra (dentro del bloque `if (proveedor) { ... }`, junto a las demás líneas que arman `resultado`).

- [ ] **Step 3: Propagar `registros` en `registro-form.tsx`**

Reemplazar:

```typescript
    const rnpEstado = crearRnpVacio();
    if (rnp?.encontrado) {
      rnpEstado.vigente = Boolean(rnp.habilitado);
      rnpEstado.especialidades = rnp.especialidades ?? [];
      rnpEstado.capacidadMaximaGeneral = rnp.capacidadMaximaContratacion ?? null;
    }
```

por:

```typescript
    const rnpEstado = crearRnpVacio();
    if (rnp?.encontrado) {
      rnpEstado.vigente = Boolean(rnp.habilitado);
      rnpEstado.especialidades = rnp.especialidades ?? [];
      rnpEstado.capacidadMaximaGeneral = rnp.capacidadMaximaContratacion ?? null;
      rnpEstado.registros = rnp.registros ?? [];
    }
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/types.ts src/app/api/rnp/route.ts src/components/marketing/registro-form.tsx
git commit -m "$(cat <<'EOF'
Agregar RegistroRnp: parsear lscIdTipReg/lscIdTipRegVig del RNP real

EstadoRnp suma registros?: RegistroRnp[] (tipo + vigente), poblado
unicamente desde un fetch real y exitoso del RNP - nunca autodeclarado.
api/rnp/route.ts parsea lscIdTipReg/lscIdTipRegVig (ya venian en la
respuesta del OSCE, antes descartados) a esa lista. Mapeo de codigo a
tipo confirmado para 1=ejecucionObras/2=consultoriaObras (comentario ya
existente en rnp/obras/route.ts); 3/4=bienes/servicios es mejor
estimacion, pendiente de verificar contra un perfil real (Task 4).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Reestructurar `rnp-card.tsx` por tipo de registro, extraer `CapacidadDeclaradaCard`

**Files:**
- Modify: `src/components/perfil/rnp-card.tsx` (reescritura completa)
- Create: `src/components/perfil/capacidad-declarada-card.tsx`
- Modify: `src/components/perfil/perfil-client.tsx`

**Interfaces:**
- Consumes: `RegistroRnp`, `EstadoRnp.registros` de Task 1.
- Produces: `CapacidadDeclaradaCard()` (componente sin props), montado en `perfil-client.tsx`.

- [ ] **Step 1: Reemplazar `rnp-card.tsx` completo**

```typescript
"use client";

import { useState } from "react";
import { useProveedor } from "@/lib/state/proveedor-context";
import type { CategoriaRnp, RegistroRnp } from "@/lib/data/types";
import { formatMonto } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TextField, NumberField, CheckboxField } from "@/components/perfil/field";

const REGISTRO_ORDEN: CategoriaRnp[] = ["bienes", "servicios", "ejecucionObras", "consultoriaObras"];

const REGISTRO_RNP_LABEL: Record<CategoriaRnp, string> = {
  bienes: "Proveedor de Bienes",
  servicios: "Proveedor de Servicios",
  ejecucionObras: "Ejecutor de Obras",
  consultoriaObras: "Consultor de Obras",
};

export function RnpCard() {
  const { proveedor, actualizarDatosEmpresa } = useProveedor();
  const [editando, setEditando] = useState(false);
  const [numeroPartida, setNumeroPartida] = useState(proveedor.rnp.numeroPartida);
  const [capacidadMaximaGeneral, setCapacidadMaximaGeneral] = useState(
    proveedor.rnp.capacidadMaximaGeneral ?? 0
  );
  const [vigente, setVigente] = useState(proveedor.rnp.vigente);
  const [especialidadesTexto, setEspecialidadesTexto] = useState(
    proveedor.rnp.especialidades.join(", ")
  );

  const abrirEdicion = () => {
    setNumeroPartida(proveedor.rnp.numeroPartida);
    setCapacidadMaximaGeneral(proveedor.rnp.capacidadMaximaGeneral ?? 0);
    setVigente(proveedor.rnp.vigente);
    setEspecialidadesTexto(proveedor.rnp.especialidades.join(", "));
    setEditando(true);
  };

  const guardar = () => {
    actualizarDatosEmpresa({
      rnp: {
        ...proveedor.rnp,
        numeroPartida,
        capacidadMaximaGeneral,
        vigente,
        especialidades: especialidadesTexto
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
    });
    setEditando(false);
  };

  if (editando) {
    return (
      <Card>
        <CardHeader title="RNP y capacidad de contratación" />
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="N° de partida RNP" value={numeroPartida} onChange={setNumeroPartida} />
            <NumberField
              label="Capacidad máxima de contratación general (S/)"
              value={capacidadMaximaGeneral}
              onChange={setCapacidadMaximaGeneral}
            />
          </div>
          <CheckboxField label="RNP vigente" checked={vigente} onChange={setVigente} />
          <TextField
            label="Especialidades (separadas por coma)"
            value={especialidadesTexto}
            onChange={setEspecialidadesTexto}
          />
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={guardar}
              className="rounded-lg bg-[var(--brand-600)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--brand-700)]"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </CardBody>
      </Card>
    );
  }

  const registros = proveedor.rnp.registros;
  const registroPorTipo = new Map((registros ?? []).map((r) => [r.tipo, r]));
  const tieneEjecutorObras = registroPorTipo.has("ejecucionObras");
  const tieneConsultorObras = registroPorTipo.has("consultoriaObras");

  return (
    <Card>
      <CardHeader
        title="RNP y capacidad de contratación"
        subtitle={proveedor.rnp.vigente ? "Vigente" : "No vigente"}
        action={
          <button
            type="button"
            onClick={abrirEdicion}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-[var(--surface-muted)]"
          >
            Editar
          </button>
        }
      />
      <CardBody className="space-y-4">
        {proveedor.rnp.numeroPartida && (
          <p className="text-xs text-slate-500">Partida N° {proveedor.rnp.numeroPartida}</p>
        )}

        {!registros && (
          <p className="text-sm text-slate-400">
            No se pudo consultar tu ficha del RNP — completa tus datos manualmente o vuelve a
            intentarlo desde Registro.
          </p>
        )}

        {registros && registros.length > 0 && (
          <div className="space-y-3">
            {REGISTRO_ORDEN.filter((tipo) => registroPorTipo.has(tipo)).map((tipo) => {
              const registro = registroPorTipo.get(tipo) as RegistroRnp;
              return (
                <div key={tipo} className="rounded-lg border border-[var(--border)] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {REGISTRO_RNP_LABEL[tipo]}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        registro.vigente
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-[var(--surface-muted)] text-slate-500"
                      }`}
                    >
                      {registro.vigente ? "Vigente" : "No vigente"}
                    </span>
                  </div>
                  {tipo === "ejecucionObras" &&
                    typeof proveedor.rnp.capacidadMaximaGeneral === "number" && (
                      <p className="mt-2 text-xs text-slate-500">
                        Capacidad máxima de contratación:{" "}
                        {formatMonto(proveedor.rnp.capacidadMaximaGeneral)}
                      </p>
                    )}
                  {tipo === "consultoriaObras" && (
                    <div className="mt-2">
                      {proveedor.rnp.especialidades.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {proveedor.rnp.especialidades.map((esp) => (
                            <span
                              key={esp}
                              className="rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs text-slate-600"
                            >
                              {esp}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">Sin especialidades registradas.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Fallback: nunca ocultar datos manualmente ingresados si su registro
            correspondiente no está presente (ej. registro manual sin RNP, o RNP
            consultado pero sin ese tipo específico). */}
        {!tieneEjecutorObras && typeof proveedor.rnp.capacidadMaximaGeneral === "number" && (
          <p className="text-xs text-slate-500">
            Capacidad máxima de contratación: {formatMonto(proveedor.rnp.capacidadMaximaGeneral)}
          </p>
        )}
        {!tieneConsultorObras && proveedor.rnp.especialidades.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {proveedor.rnp.especialidades.map((esp) => (
              <span
                key={esp}
                className="rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs text-slate-600"
              >
                {esp}
              </span>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
```

- [ ] **Step 2: Crear `capacidad-declarada-card.tsx`**

```typescript
"use client";

import { useState } from "react";
import { useProveedor } from "@/lib/state/proveedor-context";
import type { CategoriaRnp } from "@/lib/data/types";
import { formatMonto } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { NumberField, CheckboxField } from "@/components/perfil/field";

const CATEGORIA_RNP_LABEL: Record<CategoriaRnp, string> = {
  bienes: "Bienes",
  servicios: "Servicios",
  consultoriaObras: "Consultoría de obras",
  ejecucionObras: "Ejecución de obras",
};

export function CapacidadDeclaradaCard() {
  const { proveedor, actualizarDatosEmpresa } = useProveedor();
  const [editando, setEditando] = useState(false);
  const [capacidades, setCapacidades] = useState(proveedor.rnp.capacidades);

  const categoriasHabilitadas = Object.entries(proveedor.rnp.capacidades).filter(
    ([, cap]) => cap.habilitado
  );

  const abrirEdicion = () => {
    setCapacidades(proveedor.rnp.capacidades);
    setEditando(true);
  };

  const guardar = () => {
    actualizarDatosEmpresa({ rnp: { ...proveedor.rnp, capacidades } });
    setEditando(false);
  };

  const setCapacidad = (
    categoria: CategoriaRnp,
    patch: Partial<{ habilitado: boolean; capacidadMaxima: number; capacidadLibre: number }>
  ) => {
    setCapacidades((c) => ({
      ...c,
      [categoria]: { ...c[categoria], ...patch },
    }));
  };

  if (editando) {
    return (
      <Card>
        <CardHeader
          title="Capacidad de contratación (declarada por ti)"
          subtitle="Estos montos los administrás vos según tu experiencia — no vienen del RNP ni están verificados por OSCE."
        />
        <CardBody className="space-y-3">
          {(Object.keys(CATEGORIA_RNP_LABEL) as CategoriaRnp[]).map((categoria) => {
            const cap = capacidades[categoria];
            return (
              <div key={categoria} className="rounded-lg border border-[var(--border)] p-3">
                <CheckboxField
                  label={CATEGORIA_RNP_LABEL[categoria]}
                  checked={cap.habilitado}
                  onChange={(v) => setCapacidad(categoria, { habilitado: v })}
                />
                {cap.habilitado && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <NumberField
                      label="Capacidad máxima"
                      value={cap.capacidadMaxima}
                      onChange={(v) => setCapacidad(categoria, { capacidadMaxima: v })}
                    />
                    <NumberField
                      label="Capacidad libre"
                      value={cap.capacidadLibre}
                      onChange={(v) => setCapacidad(categoria, { capacidadLibre: v })}
                    />
                  </div>
                )}
              </div>
            );
          })}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={guardar}
              className="rounded-lg bg-[var(--brand-600)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--brand-700)]"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Capacidad de contratación (declarada por ti)"
        subtitle="Estos montos los administrás vos según tu experiencia — no vienen del RNP ni están verificados por OSCE."
        action={
          <button
            type="button"
            onClick={abrirEdicion}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-[var(--surface-muted)]"
          >
            Editar
          </button>
        }
      />
      <CardBody className="space-y-4">
        {categoriasHabilitadas.length > 0 ? (
          <div className="space-y-3">
            {categoriasHabilitadas.map(([categoria, cap]) => {
              const pct = cap.capacidadMaxima
                ? Math.round((cap.capacidadLibre / cap.capacidadMaxima) * 100)
                : 0;
              return (
                <div key={categoria}>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{CATEGORIA_RNP_LABEL[categoria as CategoriaRnp] ?? categoria}</span>
                    <span>
                      {formatMonto(cap.capacidadLibre)} libre de {formatMonto(cap.capacidadMaxima)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--brand-500)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Todavía no configuraste tu capacidad de contratación por categoría.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
```

- [ ] **Step 3: Montar `CapacidadDeclaradaCard` en `perfil-client.tsx`**

Agregar el import junto al resto de imports de tarjetas de perfil (cerca de `import { RnpCard } from "@/components/perfil/rnp-card";`):

```typescript
import { CapacidadDeclaradaCard } from "@/components/perfil/capacidad-declarada-card";
```

Reemplazar:

```typescript
      <DatosGeneralesCard />
      <RnpCard />
      <ExperienciaCard />
```

por:

```typescript
      <DatosGeneralesCard />
      <RnpCard />
      <CapacidadDeclaradaCard />
      <ExperienciaCard />
```

- [ ] **Step 4: Verificar tipos y lint**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

Run: `npm run lint`
Expected: sin errores nuevos en los 3 archivos tocados/creados.

- [ ] **Step 5: Commit**

```bash
git add src/components/perfil/rnp-card.tsx src/components/perfil/capacidad-declarada-card.tsx src/components/perfil/perfil-client.tsx
git commit -m "$(cat <<'EOF'
RNP: ordenar por tipo de registro, separar capacidad autodeclarada

rnp-card.tsx ya no muestra una lista plana de especialidades ni el
"todavia no configuraste..." confuso - ahora renderiza 4 bloques
ordenados (Proveedor de Bienes / Servicios / Ejecutor de Obras / Consultor
de Obras) solo para los tipos que el proveedor realmente tiene segun
registros, cada uno con badge Vigente/No vigente. Capacidad maxima
general se anida bajo Ejecutor de Obras y las especialidades bajo
Consultor de Obras, igual que en la ficha oficial. Si registros es
undefined (RNP nunca consultado), se muestra un aviso honesto en vez de
inventar. Ningun dato manual (especialidades escritas a mano, capacidad
general) se oculta si falta su registro correspondiente - queda un
fallback fuera de los bloques.

La capacidad de contratacion por categoria (autodeclarada) se muda a su
propia tarjeta nueva, capacidad-declarada-card.tsx, con una nota
explicita de que ese dato lo administra el proveedor, no viene del RNP.
Misma mecanica de guardado que antes, sin cambios de comportamiento.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Datos de muestra — `registros` en el perfil demo

**Files:**
- Modify: `src/lib/data/mock/proveedor.ts:16-26`

**Interfaces:**
- Consumes: `RegistroRnp` (Task 1).

- [ ] **Step 1: Agregar `registros` al bloque `rnp` del mock**

Reemplazar:

```typescript
  rnp: {
    vigente: true,
    numeroPartida: "RNP-2024-0088231",
    especialidades: ["Edificaciones", "Saneamiento", "Carreteras", "Puentes"],
    capacidades: {
      bienes: { habilitado: false, capacidadMaxima: 0, capacidadLibre: 0 },
      servicios: { habilitado: true, capacidadMaxima: 6_000_000, capacidadLibre: 4_100_000 },
      consultoriaObras: { habilitado: true, capacidadMaxima: 3_500_000, capacidadLibre: 2_200_000 },
      ejecucionObras: { habilitado: true, capacidadMaxima: 18_000_000, capacidadLibre: 9_500_000 },
    },
  },
```

por:

```typescript
  rnp: {
    vigente: true,
    numeroPartida: "RNP-2024-0088231",
    especialidades: ["Edificaciones", "Saneamiento", "Carreteras", "Puentes"],
    capacidades: {
      bienes: { habilitado: false, capacidadMaxima: 0, capacidadLibre: 0 },
      servicios: { habilitado: true, capacidadMaxima: 6_000_000, capacidadLibre: 4_100_000 },
      consultoriaObras: { habilitado: true, capacidadMaxima: 3_500_000, capacidadLibre: 2_200_000 },
      ejecucionObras: { habilitado: true, capacidadMaxima: 18_000_000, capacidadLibre: 9_500_000 },
    },
    capacidadMaximaGeneral: 18_000_000,
    registros: [
      { tipo: "servicios", vigente: true },
      { tipo: "consultoriaObras", vigente: true },
      { tipo: "ejecucionObras", vigente: true },
    ],
  },
```

(Se agrega también `capacidadMaximaGeneral` porque hoy el mock no lo tenía seteado — sin él, el bloque "Ejecutor de Obras" del demo no mostraría la línea de capacidad máxima, dejando la demo incompleta frente al nuevo diseño.)

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/mock/proveedor.ts
git commit -m "$(cat <<'EOF'
Mock: agregar registros RNP de muestra para la nueva tarjeta ordenada

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Verificación manual end-to-end (incluye confirmar el mapeo 3/4)

**Files:**
- No se crean ni modifican archivos de código — solo verificación manual.

- [ ] **Step 1: Confirmar el mapeo de código `3`/`4` a `bienes`/`servicios`**

Con el RUC de prueba (20100114187, ICCGSA), buscar su ficha en el buscador público de proveedores del OSCE (`https://apps.osce.gob.pe/perfilprov-ui` o el buscador de `www.gob.pe`/`osce.gob.pe` que lo indexe) y confirmar visualmente cuál de "Proveedor de Bienes" / "Proveedor de Servicios" aparece — si la asignación actual (`"3"` → `bienes`, `"4"` → `servicios`) resulta invertida, corregir el mapa `CODIGO_A_CATEGORIA` en `src/app/api/rnp/route.ts` (Task 1, Step 2) con un commit adicional de una línea, y actualizar el comentario que documenta la incertidumbre.

- [ ] **Step 2: Levantar el dev server local**

Run: `npm run dev` (Browser pane del harness, no `vercel deploy`)

- [ ] **Step 3: Perfil demo (mock) — verificar los 3 bloques**

En `/perfil`, confirmar que la tarjeta "RNP y capacidad de contratación" muestra 3 bloques en el orden Proveedor de Servicios, Ejecutor de Obras, Consultor de Obras (sin bloque de Bienes, ya que el mock no lo tiene en `registros`), cada uno con badge "Vigente". Confirmar que "Ejecutor de Obras" muestra la capacidad máxima de contratación, y "Consultor de Obras" muestra las 4 especialidades del mock. Confirmar que la tarjeta "Capacidad de contratación (declarada por ti)" aparece justo debajo, separada, con su nota aclaratoria, y sigue mostrando las 3 barras de progreso (servicios/consultoría de obras/ejecución de obras) igual que antes.

- [ ] **Step 4: Registro real con el RUC de prueba — verificar el fetch en vivo**

Ir a `/registro`, ingresar el RUC 20100114187, confirmar que el RNP responde y avanzar el flujo de registro completo hasta `/perfil`. Confirmar que la tarjeta "RNP y capacidad de contratación" ahora muestra los bloques reales derivados de `lscIdTipReg`/`lscIdTipRegVig` de ese RUC (4 tipos presentes, con "Consultor de Obras" y "Ejecutor de Obras" vigentes según `lscIdTipRegVig: "2 1"`, y "Proveedor de Bienes"/"Proveedor de Servicios" presentes pero no vigentes).

- [ ] **Step 5: Caso sin RNP consultado**

Simular un registro manual (RUC que el RNP no reconozca, o completar el formulario manual si `/registro` lo permite) y confirmar que la tarjeta de RNP muestra el aviso "No se pudo consultar tu ficha del RNP..." en vez de bloques vacíos o inventados.

- [ ] **Step 6: Consola sin errores**

Usar `read_console_messages` con `onlyErrors: true` en `/perfil` y `/registro` durante los pasos anteriores.

- [ ] **Step 7: `npm run build`**

Run: `npm run build`
Expected: build limpio, sin errores de tipos ni de lint bloqueantes.

- [ ] **Step 8: Actualizar `CLAUDE.md`**

Agregar una entrada breve a la sección de integraciones RNP existente (o donde corresponda) documentando: la tarjeta de RNP ahora se organiza por tipo de registro real (`lscIdTipReg`/`lscIdTipRegVig`, antes descartados), la capacidad autodeclarada vive en su propia tarjeta, y si el mapeo `3`/`4` se confirmó o corrigió en el Step 1.

- [ ] **Step 9: Commit de `CLAUDE.md`**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
Actualizar CLAUDE.md: RNP ordenado por tipo de registro, verificado end-to-end

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes (para quien ejecute el plan)

- **Cobertura del spec:** Task 1 cubre la sección 1-3 del spec (tipo, parseo, propagación). Task 2 cubre las secciones 4-5 (tarjeta reordenada + tarjeta separada). Task 3 cubre la sección 6 (mock). Task 4 cubre la verificación end-to-end y el riesgo #1 documentado en el spec (mapeo 3/4 a confirmar).
- **Consistencia de tipos:** `RegistroRnp` se define una sola vez en `types.ts` (Task 1) y se reutiliza sin redefinir en `rnp-card.tsx` (Task 2) y `api/rnp/route.ts` (Task 1) — mismo nombre de campo (`tipo`, `vigente`) en los tres lugares donde aparece.
- **Fallback sin duplicar:** el diseño de Task 2 garantiza que `capacidadMaximaGeneral`/`especialidades` se muestran exactamente una vez — anidados bajo su bloque de registro si ese tipo está presente en `registros`, o como fallback plano si no (nunca ambos a la vez, verificado por las condiciones `tipo === "ejecucionObras" && ...` dentro del loop vs. `!tieneEjecutorObras && ...` fuera de él, mutuamente excluyentes).
