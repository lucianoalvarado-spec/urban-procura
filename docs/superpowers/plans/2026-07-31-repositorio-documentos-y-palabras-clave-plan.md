# Repositorio de documentos (PDF, nombre+Otros, fechas) y claridad en palabras clave — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En `/perfil`, el Repositorio de documentos frecuentes gana adjuntar un PDF por documento, un selector de nombre con lista de documentos típicos + "Otros", y fecha de emisión además de la fecha de vigencia ya existente; en Preferencias, el copy de "Palabras clave" deja explícito que el texto es libre (la lógica ya lo era).

**Architecture:** `AdjuntosField` (ya usado por Personal clave/Equipamiento) gana dos props opcionales (`accept`, `maxArchivos`) sin cambiar su comportamiento por defecto, y se reutiliza en `DocumentosCard` con `accept="application/pdf" maxArchivos={1}`. El campo "Nombre" pasa de texto libre a un `SelectField` + `TextField` condicional, inline en `documentos-card.tsx` (sin componente compartido — un solo punto de uso). `perfil-client.tsx` solo cambia copy en la sección de palabras clave.

**Tech Stack:** Next.js 15 (App Router) + React 19 + TypeScript. Sin framework de tests en este proyecto — verificación por `npx tsc --noEmit`, `npm run lint`, y prueba manual contra el dev server local.

## Global Constraints

- Nunca hacer `git push` sin que el usuario lo pida explícitamente en ese mismo turno — solo `git commit`.
- Verificar contra el dev server local (`npm run dev` + Browser pane), no contra producción.
- `fechaVigencia` en `DocumentoRepositorio` no se renombra a nivel de dato (sin migración de registros ya guardados en `localStorage`) — solo su label visible cambia a "Fecha fin de vigencia".
- `AdjuntosField` con los props nuevos (`accept`, `maxArchivos`) no debe cambiar el comportamiento donde ya se usa: `PersonalClaveCard` y `EquipamientoCard` no le pasan estos props, así que deben seguir aceptando cualquier tipo de archivo, sin límite de cantidad.
- Un solo PDF por documento del repositorio — al llegar al límite, el input de adjuntar se deshabilita hasta eliminar el existente.
- No se agrega validación de tipo MIME en el cliente más allá del `accept` del input — mismo nivel de rigor que el resto de `AdjuntosField` hoy.
- No tocar `src/lib/data/matching.ts`.
- La lista de categorías (`CATEGORIAS_DOC`) no cambia.

---

## Task 1: Extender tipos y `AdjuntosField` con `accept`/`maxArchivos`

**Files:**
- Modify: `src/lib/data/types.ts:161-166`
- Modify: `src/components/perfil/adjuntos-field.tsx`

**Interfaces:**
- Produces: `DocumentoRepositorio` con `fechaEmision?: string` y `documentos?: DocumentoAdjunto[]` agregados; `AdjuntosField` con props opcionales `accept?: string` y `maxArchivos?: number`.

- [ ] **Step 1: Agregar los campos nuevos a `DocumentoRepositorio`**

En `src/lib/data/types.ts`, reemplazar:

```typescript
export interface DocumentoRepositorio {
  id: string;
  nombre: string;
  categoria: "Legal" | "Tributario" | "RNP" | "Declaraciones" | "Cartas" | "Certificados";
  fechaVigencia?: string;
}
```

por:

```typescript
export interface DocumentoRepositorio {
  id: string;
  nombre: string;
  categoria: "Legal" | "Tributario" | "RNP" | "Declaraciones" | "Cartas" | "Certificados";
  fechaVigencia?: string;
  fechaEmision?: string;
  documentos?: DocumentoAdjunto[];
}
```

(`DocumentoAdjunto` ya está definido más arriba en el mismo archivo, línea 134 — no hace falta importarlo.)

- [ ] **Step 2: Agregar `accept`/`maxArchivos` a `AdjuntosField`**

En `src/components/perfil/adjuntos-field.tsx`, reemplazar la firma completa del componente:

```typescript
export function AdjuntosField({
  label = "Documentos adjuntos",
  documentos,
  onChange,
}: {
  label?: string;
  documentos: DocumentoAdjunto[];
  onChange: (documentos: DocumentoAdjunto[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const adjuntar = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const nuevos: DocumentoAdjunto[] = [];
    for (const file of Array.from(files)) {
      if (file.size > TAMANO_MAXIMO) {
        setError(`"${file.name}" pesa más de 3 MB — no se adjuntó.`);
        continue;
      }
      const dataUrl = await leerComoDataUrl(file);
      nuevos.push({
        id: generarId("adj"),
        nombre: file.name,
        tipo: file.type || "application/octet-stream",
        tamano: file.size,
        dataUrl,
      });
    }
    if (nuevos.length > 0) onChange([...documentos, ...nuevos]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const eliminar = (id: string) => {
    onChange(documentos.filter((d) => d.id !== id));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-[var(--surface-muted)]"
        >
          + Adjuntar archivo
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          aria-label={label}
          className="hidden"
          onChange={(e) => adjuntar(e.target.files)}
        />
      </div>
```

por:

```typescript
export function AdjuntosField({
  label = "Documentos adjuntos",
  documentos,
  onChange,
  accept,
  maxArchivos,
}: {
  label?: string;
  documentos: DocumentoAdjunto[];
  onChange: (documentos: DocumentoAdjunto[]) => void;
  accept?: string;
  maxArchivos?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const limiteAlcanzado = maxArchivos !== undefined && documentos.length >= maxArchivos;

  const adjuntar = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const nuevos: DocumentoAdjunto[] = [];
    const espacioDisponible =
      maxArchivos !== undefined ? Math.max(0, maxArchivos - documentos.length) : Infinity;
    for (const file of Array.from(files)) {
      if (nuevos.length >= espacioDisponible) {
        setError(`Solo se permite${maxArchivos === 1 ? " 1 archivo" : `n ${maxArchivos} archivos`} — "${file.name}" no se adjuntó.`);
        break;
      }
      if (file.size > TAMANO_MAXIMO) {
        setError(`"${file.name}" pesa más de 3 MB — no se adjuntó.`);
        continue;
      }
      const dataUrl = await leerComoDataUrl(file);
      nuevos.push({
        id: generarId("adj"),
        nombre: file.name,
        tipo: file.type || "application/octet-stream",
        tamano: file.size,
        dataUrl,
      });
    }
    if (nuevos.length > 0) onChange([...documentos, ...nuevos]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const eliminar = (id: string) => {
    onChange(documentos.filter((d) => d.id !== id));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={limiteAlcanzado}
          className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Adjuntar archivo
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple={maxArchivos === undefined || maxArchivos > 1}
          accept={accept}
          aria-label={label}
          className="hidden"
          onChange={(e) => adjuntar(e.target.files)}
        />
      </div>
```

El resto del componente (bloque `{error && ...}` y la lista `<ul>`) queda sin cambios.

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data/types.ts src/components/perfil/adjuntos-field.tsx
git commit -m "$(cat <<'EOF'
Extender DocumentoRepositorio (emision, adjuntos) y AdjuntosField (accept, maxArchivos)

DocumentoRepositorio suma fechaEmision y documentos (mismo tipo
DocumentoAdjunto que ya usan PersonalClave/Equipo). fechaVigencia no se
renombra a nivel de dato para no migrar registros existentes en
localStorage - solo cambia su label en la UI (proximo commit).

AdjuntosField gana accept/maxArchivos, ambos opcionales y sin
comportamiento por defecto distinto al actual - PersonalClaveCard y
EquipamientoCard no los pasan, siguen aceptando cualquier archivo sin
limite.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Reconstruir el formulario de `DocumentosCard`

**Files:**
- Modify: `src/components/perfil/documentos-card.tsx` (reescritura completa del archivo)

**Interfaces:**
- Consumes: `DocumentoRepositorio` (con `fechaEmision`/`documentos` de Task 1), `AdjuntosField` con `accept`/`maxArchivos` (Task 1).
- Produces: sin cambios en la interfaz pública del componente (`DocumentosCard()`, sin props).

- [ ] **Step 1: Reemplazar el archivo completo**

```typescript
"use client";

import { useState } from "react";
import { useProveedor } from "@/lib/state/proveedor-context";
import type { DocumentoRepositorio } from "@/lib/data/types";
import { generarId } from "@/lib/id";
import { formatFecha, diasRestantes } from "@/lib/format";
import { estiloVigencia, etiquetaVigencia, textoVigencia } from "@/lib/data/documentos";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TextField, SelectField } from "@/components/perfil/field";
import { AdjuntosField } from "@/components/perfil/adjuntos-field";

const UMBRAL_AVISO_DIAS = 30;

const CATEGORIAS_DOC: DocumentoRepositorio["categoria"][] = [
  "Legal",
  "Tributario",
  "RNP",
  "Declaraciones",
  "Cartas",
  "Certificados",
];

const NOMBRES_DOC_FRECUENTES = [
  "Vigencia de poder",
  "Certificado RNP",
  "Constancia de no estar inhabilitado para contratar con el Estado",
  "DNI del representante legal",
  "RUC (ficha SUNAT)",
  "Certificado de habilidad del colegio profesional",
  "Carta fianza modelo",
  "Declaración jurada antisoborno",
];

const OTROS = "Otros";
const OPCIONES_NOMBRE = [...NOMBRES_DOC_FRECUENTES, OTROS];

const VACIO = {
  nombreSeleccionado: NOMBRES_DOC_FRECUENTES[0],
  nombreLibre: "",
  categoria: "Legal" as DocumentoRepositorio["categoria"],
  fechaEmision: "",
  fechaVigencia: "",
  documentos: [] as NonNullable<DocumentoRepositorio["documentos"]>,
};

export function DocumentosCard() {
  const { proveedor, actualizarDatosEmpresa } = useProveedor();
  const [agregando, setAgregando] = useState(false);
  const [form, setForm] = useState(VACIO);

  const eliminar = (id: string) => {
    actualizarDatosEmpresa({
      documentosRepositorio: proveedor.documentosRepositorio.filter((d) => d.id !== id),
    });
  };

  const nombreFinal = form.nombreSeleccionado === OTROS ? form.nombreLibre.trim() : form.nombreSeleccionado;

  const agregar = () => {
    if (!nombreFinal) return;
    const nuevo: DocumentoRepositorio = {
      id: generarId("doc"),
      nombre: nombreFinal,
      categoria: form.categoria,
      fechaEmision: form.fechaEmision || undefined,
      fechaVigencia: form.fechaVigencia || undefined,
      documentos: form.documentos.length > 0 ? form.documentos : undefined,
    };
    actualizarDatosEmpresa({ documentosRepositorio: [...proveedor.documentosRepositorio, nuevo] });
    setForm(VACIO);
    setAgregando(false);
  };

  return (
    <Card>
      <CardHeader
        title="Repositorio de documentos frecuentes"
        subtitle="Reutilizables al preparar ofertas"
        action={
          !agregando && (
            <button
              type="button"
              onClick={() => setAgregando(true)}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-[var(--surface-muted)]"
            >
              + Agregar
            </button>
          )
        }
      />
      <CardBody className="space-y-3">
        {agregando && (
          <div className="space-y-3 rounded-lg border border-[var(--border)] p-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <SelectField
                label="Nombre"
                value={form.nombreSeleccionado}
                onChange={(v) => setForm((f) => ({ ...f, nombreSeleccionado: v }))}
                options={OPCIONES_NOMBRE}
                className="sm:col-span-2"
              />
              <SelectField
                label="Categoría"
                value={form.categoria}
                onChange={(v) =>
                  setForm((f) => ({ ...f, categoria: v as DocumentoRepositorio["categoria"] }))
                }
                options={CATEGORIAS_DOC}
              />
              {form.nombreSeleccionado === OTROS && (
                <TextField
                  label="Nombre específico"
                  value={form.nombreLibre}
                  onChange={(v) => setForm((f) => ({ ...f, nombreLibre: v }))}
                  placeholder="ej. Certificado ISO 9001"
                  className="sm:col-span-3"
                />
              )}
              <TextField
                label="Fecha de emisión (opcional)"
                type="date"
                value={form.fechaEmision}
                onChange={(v) => setForm((f) => ({ ...f, fechaEmision: v }))}
              />
              <TextField
                label="Fecha fin de vigencia (opcional)"
                type="date"
                value={form.fechaVigencia}
                onChange={(v) => setForm((f) => ({ ...f, fechaVigencia: v }))}
              />
            </div>
            <AdjuntosField
              label="PDF del documento"
              documentos={form.documentos}
              onChange={(documentos) => setForm((f) => ({ ...f, documentos }))}
              accept="application/pdf"
              maxArchivos={1}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={agregar}
                className="rounded-lg bg-[var(--brand-600)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--brand-700)]"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => {
                  setAgregando(false);
                  setForm(VACIO);
                }}
                className="text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {proveedor.documentosRepositorio.length === 0 ? (
          <p className="text-sm text-slate-400">Aún no agregaste documentos.</p>
        ) : (
          proveedor.documentosRepositorio.map((doc) => {
            const dias = doc.fechaVigencia ? diasRestantes(doc.fechaVigencia) : null;
            const porVencer = dias !== null && dias <= UMBRAL_AVISO_DIAS;
            const pdf = doc.documentos?.[0];
            return (
              <div
                key={doc.id}
                className={`flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm ${porVencer ? estiloVigencia(dias) : ""}`}
              >
                <div>
                  <span className="text-slate-700">{doc.nombre}</span>
                  <span className="ml-2 text-xs text-slate-400">{doc.categoria}</span>
                </div>
                <div className="flex items-center gap-3">
                  {doc.fechaEmision && (
                    <span className="text-xs text-slate-400">
                      Emisión: {formatFecha(doc.fechaEmision)}
                    </span>
                  )}
                  {doc.fechaVigencia && (
                    <span className={`text-xs ${porVencer ? `font-medium ${textoVigencia(dias)}` : "text-slate-400"}`}>
                      Vigencia: {formatFecha(doc.fechaVigencia)}
                      {porVencer && ` · ${etiquetaVigencia(dias)}`}
                    </span>
                  )}
                  {pdf && (
                    <a
                      href={pdf.dataUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-[var(--brand-600)] hover:underline"
                    >
                      Ver PDF
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => eliminar(doc.id)}
                    className="text-xs font-medium text-slate-400 hover:text-red-600"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </CardBody>
    </Card>
  );
}
```

Nota para quien implemente: `dias` puede ser `null` cuando no hay `fechaVigencia`; `estiloVigencia`/`etiquetaVigencia`/`textoVigencia` solo se llaman dentro de `porVencer ? ... : ...`, y `porVencer` ya es `false` cuando `dias` es `null` (mismo patrón que el archivo original, sin cambios en esa lógica).

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 3: Verificar lint**

Run: `npm run lint`
Expected: sin errores nuevos en `documentos-card.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/perfil/documentos-card.tsx
git commit -m "$(cat <<'EOF'
Repositorio de documentos: nombre con lista+Otros, fecha de emision, PDF adjunto

El campo Nombre pasa de texto libre a un select con 8 documentos tipicos
de contrataciones publicas en Peru + "Otros" (revela un campo de texto
para el nombre especifico). Se agrega Fecha de emision junto a la fecha
de vigencia ya existente (relabeled a "Fecha fin de vigencia", mismo dato
fechaVigencia sin migrar). Cada documento admite un PDF adjunto via
AdjuntosField (accept="application/pdf" maxArchivos={1}); la fila del
documento guardado muestra un enlace "Ver PDF" cuando existe.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Aclarar el copy de Palabras clave en Preferencias

**Files:**
- Modify: `src/components/perfil/perfil-client.tsx:165-195`

**Interfaces:**
- Sin cambios de tipos ni de estado — solo texto visible.

- [ ] **Step 1: Reemplazar el bloque de Palabras clave**

Reemplazar:

```typescript
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Palabras clave (separadas por coma)
          <input
            type="text"
            value={form.palabrasClave.join(", ")}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                palabrasClave: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              }))
            }
            className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-sm text-[var(--foreground)] focus:border-[var(--brand-500)] focus:outline-none"
          />
        </label>
        <div className="-mt-3 flex flex-wrap gap-1.5">
          {PALABRAS_CLAVE_SUGERIDAS.filter((p) => !form.palabrasClave.includes(p)).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() =>
                setForm((f) => ({ ...f, palabrasClave: [...f.palabrasClave, p] }))
              }
              className="rounded-full border border-dashed border-[var(--border)] px-2.5 py-1 text-[11px] text-slate-500 hover:border-[var(--brand-500)] hover:text-[var(--brand-700)]"
            >
              + {p}
            </button>
          ))}
        </div>
```

por:

```typescript
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Palabras clave — escribí las que quieras, separadas por coma
          <input
            type="text"
            value={form.palabrasClave.join(", ")}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                palabrasClave: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              }))
            }
            placeholder="ej. saneamiento, mi palabra clave propia"
            className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-sm text-[var(--foreground)] focus:border-[var(--brand-500)] focus:outline-none"
          />
        </label>
        <div className="-mt-3 flex flex-col gap-1.5">
          <p className="text-[11px] text-slate-400">
            Sugerencias rápidas — hacé clic para agregarlas, o escribí las tuyas arriba:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PALABRAS_CLAVE_SUGERIDAS.filter((p) => !form.palabrasClave.includes(p)).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, palabrasClave: [...f.palabrasClave, p] }))
                }
                className="rounded-full border border-dashed border-[var(--border)] px-2.5 py-1 text-[11px] text-slate-500 hover:border-[var(--brand-500)] hover:text-[var(--brand-700)]"
              >
                + {p}
              </button>
            ))}
          </div>
        </div>
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add src/components/perfil/perfil-client.tsx
git commit -m "$(cat <<'EOF'
Preferencias: aclarar que Palabras clave acepta texto libre

El campo ya aceptaba cualquier palabra separada por coma sin filtrar
contra los chips sugeridos - el usuario penso que estaba limitado a esas
sugerencias por como se veia la UI. Sin cambios de logica, solo copy:
label, placeholder, y una linea aclarando que los chips son atajos.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Verificación manual end-to-end

**Files:**
- No se crean ni modifican archivos de código — solo verificación manual.

- [ ] **Step 1: Levantar el dev server local**

Run: `npm run dev` (Browser pane del harness, no `vercel deploy`)

- [ ] **Step 2: Repositorio de documentos — flujo completo**

En `/perfil`, abrir "Repositorio de documentos frecuentes" → "+ Agregar". Confirmar:
- El select de "Nombre" muestra los 8 documentos típicos + "Otros".
- Elegir "Otros" revela el campo "Nombre específico"; escribir un nombre y confirmar que se guarda ese texto (no "Otros") en la lista.
- Elegir un documento típico (sin "Otros") y confirmar que no aparece el campo de texto libre.
- Completar "Fecha de emisión" y "Fecha fin de vigencia" con fechas distintas, guardar, y confirmar que la fila muestra ambas por separado ("Emisión: ..." y "Vigencia: ...").
- Adjuntar un PDF (< 3 MB) — confirmar que aparece en la lista de `AdjuntosField` dentro del formulario, y que tras guardar la fila muestra el enlace "Ver PDF" que abre el archivo en pestaña nueva.
- Intentar adjuntar un segundo PDF antes de guardar — confirmar que el botón "+ Adjuntar archivo" queda deshabilitado tras el primero (o, si se intenta vía input directamente, que el mensaje de error indica el límite de 1 archivo).
- Intentar seleccionar un archivo no-PDF (ej. una imagen) — confirmar que el selector de archivos del sistema operativo ya lo filtra por el `accept="application/pdf"` (comportamiento nativo del navegador, no hace falta un mensaje de error propio para este caso).

- [ ] **Step 3: Regresión — Personal clave y Equipamiento**

Abrir "Personal clave" y "Equipamiento" en `/perfil`, confirmar que `AdjuntosField` sigue aceptando cualquier tipo de archivo y múltiples archivos por entrada, sin el límite de 1 ni la restricción a PDF (los props nuevos no se les pasan).

- [ ] **Step 4: Preferencias — palabras clave**

Abrir la sección "Preferencias", confirmar que el label dice "Palabras clave — escribí las que quieras, separadas por coma", que el placeholder se ve cuando el campo está vacío, y que escribir una palabra que no está en los chips sugeridos (ej. "mi palabra rara") se guarda igual al hacer clic en "Guardar preferencias" — recargar la página y confirmar que persiste.

- [ ] **Step 5: Consola sin errores**

Usar `read_console_messages` con `onlyErrors: true` en `/perfil` durante los pasos anteriores.

- [ ] **Step 6: `npm run build`**

Run: `npm run build`
Expected: build limpio, sin errores de tipos ni de lint bloqueantes.

---

## Self-Review Notes (para quien ejecute el plan)

- **Cobertura del spec:** Task 1 cubre los cambios de tipo y `AdjuntosField`. Task 2 cubre el select+Otros, las dos fechas, y el adjunto de PDF con su enlace "Ver PDF". Task 3 cubre el copy de palabras clave. Task 4 cubre la verificación manual de ambas partes más la regresión de Personal clave/Equipamiento.
- **Consistencia de tipos:** `form.documentos` en `documentos-card.tsx` usa `NonNullable<DocumentoRepositorio["documentos"]>` (es decir, `DocumentoAdjunto[]`) para evitar declarar el tipo por separado — si `DocumentoRepositorio.documentos` cambiara de forma en el futuro, este tipo se actualiza solo.
- **`fechaVigencia` sin migrar:** confirmado que `src/lib/data/documentos.ts` (`documentosPorVencer`, usado en Alertas) sigue leyendo `documento.fechaVigencia` sin cambios — no se toca ese archivo en este plan.
