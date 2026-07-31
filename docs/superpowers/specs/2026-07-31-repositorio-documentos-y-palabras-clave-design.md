# Repositorio de documentos frecuentes: PDF, nombre con lista + Otros, fechas; Preferencias: claridad en palabras clave

Fecha: 2026-07-31
Estado: aprobado por el usuario, pendiente de implementar

## Contexto

El usuario probó `/perfil` y pidió dos mejoras puntuales:

1. **Repositorio de documentos frecuentes** (`src/components/perfil/documentos-card.tsx`): hoy el formulario tiene "Nombre" (texto libre), "Categoría" (select) y "Vigencia (opcional)" (una sola fecha) — sin forma de adjuntar el PDF real del documento.
2. **Preferencias → Palabras clave** (dentro de `src/components/perfil/perfil-client.tsx`): el usuario percibió que solo se podían usar las palabras sugeridas (los chips "+ drenaje pluvial", etc.).

Se revisó el código antes de diseñar: el campo de texto de palabras clave (`perfil-client.tsx`, dentro de `PreferenciasForm`) ya acepta cualquier texto separado por coma sin filtrar contra la lista de sugerencias — confirmado con el propio usuario que es un problema de percepción de la UI, no una limitación real de código.

## Decisión de producto

### Parte 1 — Repositorio de documentos frecuentes

**Tipo `DocumentoRepositorio`** (`src/lib/data/types.ts:161-166`) suma dos campos, ambos opcionales:
```ts
export interface DocumentoRepositorio {
  id: string;
  nombre: string;
  categoria: "Legal" | "Tributario" | "RNP" | "Declaraciones" | "Cartas" | "Certificados";
  fechaVigencia?: string;       // se mantiene tal cual — sin migración de datos existentes
  fechaEmision?: string;        // nuevo
  documentos?: DocumentoAdjunto[]; // nuevo — mismo tipo que ya usan PersonalClave/Equipo
}
```
`fechaVigencia` no se renombra a nivel de dato (evita migrar registros ya guardados en localStorage) — solo cambia su label visible en la UI, de "Vigencia (opcional)" a "Fecha fin de vigencia".

**Campo "Nombre" → select + Otros.** Nueva constante en `documentos-card.tsx`:
```ts
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
```
El formulario gana un `<select>` con esa lista + una opción final `"Otros"`. Al elegir "Otros" aparece un `TextField` para el nombre específico (mismo patrón condicional que ya usa el formulario para mostrar/ocultar secciones — no existe un componente "select + otro" reutilizable en el proyecto todavía, y con un solo punto de uso no se justifica extraer uno: se implementa inline en `documentos-card.tsx`, no como componente compartido). Al guardar, `nombre` = la opción elegida, o el texto libre si se eligió "Otros".

**Adjuntar PDF.** `AdjuntosField` (`src/components/perfil/adjuntos-field.tsx`) gana dos props opcionales, con default que preserva el comportamiento actual donde ya se usa (Personal clave, Equipamiento — ninguno de los dos pasa estos props, así que no cambian):
```ts
{
  accept?: string;       // pasado tal cual al <input type="file">; sin default = cualquier tipo
  maxArchivos?: number;  // si se alcanza, el input se deshabilita hasta eliminar uno; sin default = sin límite
}
```
En `documentos-card.tsx` se usa `<AdjuntosField accept="application/pdf" maxArchivos={1} documentos={form.documentos ?? []} onChange={...} />`. Igual que ya hace `AdjuntosField`, la validación de tamaño (3 MB, por el límite de `localStorage`) y el guardado como `dataUrl` se mantienen sin cambios — no se agrega validación de tipo MIME en el cliente más allá del `accept` del input (mismo nivel de rigor que el resto del componente, que hoy tampoco valida tipo).

**Lista de documentos guardados**: no hay edición de un documento ya guardado (el formulario solo agrega o elimina, confirmado leyendo `documentos-card.tsx` — no hace falta agregar edición, fuera de alcance). La fila de cada documento guardado suma, cuando existan: la fecha de emisión junto a la de vigencia, y — si `doc.documentos?.[0]` existe — un enlace `Ver PDF` (`<a href={doc.documentos[0].dataUrl} target="_blank" rel="noreferrer">`).

### Parte 2 — Palabras clave: aclarar que el texto es libre

Sin cambios de lógica. Cambios de copy en `perfil-client.tsx`:
- El label pasa de "Palabras clave (separadas por coma)" a algo que deje explícito que es libre, ej. "Palabras clave — escribí las que quieras, separadas por coma".
- Se agrega una línea de ayuda debajo del input aclarando que los chips de abajo son solo atajos ("Sugerencias rápidas — hacé clic para agregarlas, o escribí las tuyas arriba").
- El `placeholder` del input (si no lo tiene ya) pasa a mostrar un ejemplo que dé la idea de libertad, ej. `"ej. saneamiento, mi palabra clave propia"`.

## Cambios de código

- `src/lib/data/types.ts`: agregar `fechaEmision?: string` y `documentos?: DocumentoAdjunto[]` a `DocumentoRepositorio`.
- `src/components/perfil/adjuntos-field.tsx`: agregar props opcionales `accept?: string` y `maxArchivos?: number`, ambos sin comportamiento por defecto distinto al actual.
- `src/components/perfil/documentos-card.tsx`: 
  - reemplazar el `TextField` de "Nombre" por un `SelectField` (lista + "Otros") más un `TextField` condicional para el nombre libre;
  - relabelar "Vigencia (opcional)" a "Fecha fin de vigencia" y agregar un segundo `TextField type="date"` para "Fecha de emisión (opcional)";
  - agregar `<AdjuntosField accept="application/pdf" maxArchivos={1} .../>` al formulario;
  - en la lista de documentos guardados, mostrar fecha de emisión (si existe) y un enlace al PDF adjunto (si existe).
- `src/components/perfil/perfil-client.tsx`: solo copy/label en la sección de palabras clave de `PreferenciasForm` — sin cambios de estado ni de lógica.

## Qué NO cambia

- `matching.ts` no se toca — palabras clave y documentos del repositorio no participan en el scoring.
- El límite de 3 MB por archivo y el mecanismo de `dataUrl` en `localStorage` no cambian (sigue siendo la limitación conocida de "sin backend todavía", documentada en `CLAUDE.md`).
- `PersonalClaveCard`/`EquipamientoCard` (los otros usos de `AdjuntosField`) no cambian de comportamiento — los props nuevos son opcionales y no se les pasan.
- La lista de categorías (`CATEGORIAS_DOC`) no cambia.
- No se agrega validación de tipo MIME más allá del `accept` del input — mismo nivel de rigor que el resto de `AdjuntosField` hoy.

## Riesgos / limitaciones a comunicar en la UI

1. La lista de 8 documentos típicos es una propuesta razonable para contrataciones públicas en Perú, no viene de ninguna fuente oficial enumerada — si al usuario le falta alguno frecuente, "Otros" cubre el caso hasta que se agregue a la lista curada.
2. Un PDF de más de 3 MB sigue sin poder adjuntarse (mismo límite ya documentado que el resto de adjuntos del Perfil) — el mensaje de error ya existente de `AdjuntosField` lo comunica.
