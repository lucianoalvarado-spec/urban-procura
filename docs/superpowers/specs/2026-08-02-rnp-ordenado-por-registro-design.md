# RNP en Perfil: ordenado por tipo de registro, capacidad autodeclarada separada

Fecha: 2026-08-02
Estado: aprobado por el usuario, pendiente de implementar

## Contexto

La tarjeta "RNP y capacidad de contratación" de `/perfil` (`src/components/perfil/rnp-card.tsx`) hoy muestra una lista plana de especialidades ("Consultoría en obras de saneamiento y afines", etc.) sin agrupar, más una sección de "capacidad de contratación por categoría" que casi siempre dice "Todavía no configuraste tu capacidad de contratación por categoría" (porque nunca se puebla desde el RNP real — es 100% autodeclarada, ver más abajo). El usuario mostró capturas de la ficha real del RNP (que resultan ser del mismo RUC de prueba que ya usa este proyecto, ICCGSA 20100114187 — coincide el monto de capacidad máxima "S/ 100,000.00"), donde la información aparece ordenada en 4 bloques por tipo de registro (Proveedor de Bienes, Proveedor de Servicios, Ejecutor de Obras, Consultor de Obras), cada uno con su fecha de vigencia, y pidió que `/perfil` se vea así de ordenado, y que quede claro que la capacidad de contratación por categoría la completa el propio proveedor según su experiencia, no el RNP.

Se probó en vivo el endpoint real ya usado por la app (`GET https://eap.oece.gob.pe/perfilprov-bus/1.0/ficha/{ruc}`, el mismo de la Primera integración documentada en `CLAUDE.md`) contra el RUC de prueba y se confirmó la respuesta completa:

```json
{"proveedorT01":{"lscIdTipReg":"3 2 1 4","lscIdTipRegVig":"2 1","cmcTexto":"S/ 100,000.00","espProvT01s":[{"desEsp":"Consultoría en obras de saneamiento y afines","desCat":"A"}, ...]}}
```

**Dos límites de datos confirmados, no asumidos:**
1. **No hay fecha "Desde" por tipo de registro** en esta respuesta — las fechas de vigencia que muestra el RNP oficial (ej. "Desde 21/03/2025") no vienen en este JSON. Solo existe `lscIdTipRegVig`, que indica cuáles de los 4 tipos están vigentes *ahora* (sin fecha), no desde cuándo.
2. **No hay matriz de especialidad × categoría con círculos** (la tabla de 4 columnas — Formulación de fichas técnicas / Elaboración de expediente técnico / Supervisión de elaboración de expediente / Supervisión de ejecución de obras — que muestra la ficha oficial para Consultor de Obras). El campo `desCat` de cada especialidad es literalmente `"A"` para las 5 especialidades del RUC de prueba — no es la categoría de la matriz, es otra cosa (posiblemente un nivel/tier). Esa matriz probablemente solo existe en la constancia PDF oficial, no como dato estructurado accesible por este endpoint.

El usuario decidió (confirmado explícitamente): reorganizar con los datos reales disponibles — `lscIdTipReg`/`lscIdTipRegVig` para saber qué registros tiene el proveedor y cuáles están vigentes ahora — sin inventar fechas "Desde" ni la matriz de círculos.

## Decisión de producto

### 1. `EstadoRnp` suma `registros`, poblados desde el RNP real (no autodeclarados)

En `src/lib/data/types.ts`:

```ts
export interface RegistroRnp {
  tipo: CategoriaRnp;
  vigente: boolean;
}

export interface EstadoRnp {
  vigente: boolean;
  numeroPartida: string;
  especialidades: string[];
  capacidades: Record<CategoriaRnp, { habilitado: boolean; capacidadMaxima: number; capacidadLibre: number }>;
  capacidadMaximaGeneral?: number | null;
  registros?: RegistroRnp[]; // nuevo — solo se puebla desde el fetch real del RNP en /registro
}
```

`registros` es `undefined` para cualquier proveedor que no haya pasado por un fetch exitoso del RNP (registro manual, o RNP caído en ese momento) — la tarjeta debe distinguir "no consultado" de "consultado y no tiene ese registro", igual que el resto de la app nunca inventa datos.

### 2. `api/rnp/route.ts` parsea `lscIdTipReg`/`lscIdTipRegVig`

Mapeo de código a `CategoriaRnp`, confirmado por el comentario ya existente en `src/app/api/rnp/obras/route.ts:17-18`: `1` → `ejecucionObras`, `2` → `consultoriaObras`. Los códigos `3`/`4` corresponden a `bienes`/`servicios` pero ese comentario no especifica cuál es cuál — **no verificado con certeza en esta sesión** (se intentó cruzar contra las capturas del usuario, que muestran los 4 tipos con fecha para el mismo RUC, pero el orden de aparición en la ficha impresa no permite inferir la asociación con certeza matemática). Se asigna `3` → `bienes`, `4` → `servicios` como mejor estimación, y la implementación debe verificarlo contra `https://apps.osce.gob.pe/perfilprov-ui` (o el buscador público del RNP) para el RUC de prueba antes de darlo por bueno — si están invertidos, es un cambio de una línea (swap de las dos claves en el mapa), sin impacto en ningún otro dato.

`lscIdTipReg: "3 2 1 4"` → `["3","2","1","4"]` → `tipo` por cada uno. `lscIdTipRegVig: "2 1"` → set de códigos vigentes → `vigente: codigo in set`. Un tipo que aparece en `lscIdTipReg` pero no en `lscIdTipRegVig` se muestra igual (el proveedor tiene ese registro) pero con `vigente: false`.

`RnpResultado` (el tipo exportado que ya consume `registro-form.tsx`) suma `registros: RegistroRnp[]`.

### 3. `registro-form.tsx` puebla `registros` en el fetch real

Mismo punto donde hoy se pueblan `especialidades`/`capacidadMaximaGeneral`/`vigente` desde un hit real del RNP (`src/components/marketing/registro-form.tsx:104-108`) — se agrega `registros` al `rnpEstado` construido ahí. Si el RNP no respondió (fuera de línea) o el usuario completa el formulario manual, `registros` queda `undefined`.

### 4. Tarjeta "RNP" reordenada por tipo de registro

`rnp-card.tsx`, modo vista: en vez de la lista plana de especialidades + `capacidadMaximaGeneral` suelto arriba, se renderizan 4 bloques en orden fijo — Proveedor de Bienes, Proveedor de Servicios, Ejecutor de Obras, Consultor de Obras — pero **solo los que están presentes en `registros`** (si el proveedor no tiene un tipo, esa sección no aparece, no se muestra vacía). Cada bloque:
- Badge "Vigente" (verde) o "No vigente" (gris), según `registro.vigente`.
- **Ejecutor de Obras**: además muestra `capacidadMaximaGeneral` ahí adentro (en la ficha real aparece anidado bajo ese registro, no como dato suelto de toda la página).
- **Consultor de Obras**: además lista `especialidades` ahí adentro (hoy es una lista plana a nivel de toda la tarjeta; pasa a vivir específicamente bajo este registro, que es lo que representan según la ficha real).

Si `registros` es `undefined` (RNP nunca consultado con éxito), la tarjeta muestra el aviso honesto ya usado en el resto de la app ("No se pudo consultar tu ficha del RNP — completa tus datos manualmente" o similar, según el copy que ya exista para este caso en `registro-form.tsx`) en vez de esta sección de 4 bloques.

### 5. Nueva tarjeta separada: "Capacidad de contratación (declarada por ti)"

El formulario editable de `capacidades` (montos máximo/libre por categoría, hoy parte de `rnp-card.tsx`) se extrae a su propia tarjeta nueva, ubicada inmediatamente después de la tarjeta "RNP" en `perfil-client.tsx`. Lleva:
- Título: "Capacidad de contratación (declarada por ti)".
- Subtítulo/nota: "Estos montos los administrás vos según tu experiencia — no vienen del RNP ni están verificados por OSCE."
- El resto de la mecánica (checkbox habilitado + 2 números por categoría, guardado vía `actualizarDatosEmpresa`) se mantiene igual, solo cambia de tarjeta contenedora.

Esta tarjeta no depende de `registros` ni de si el RNP respondió — sigue funcionando exactamente igual que hoy (self-declared, siempre editable).

### 6. Datos de muestra (mock)

`src/lib/data/mock/proveedor.ts` gana un `registros` de ejemplo coherente con las `capacidades` que ya tiene el mock (hoy: servicios/consultoriaObras/ejecucionObras con `habilitado: true`) — se agrega `registros: [{tipo: "servicios", vigente: true}, {tipo: "consultoriaObras", vigente: true}, {tipo: "ejecucionObras", vigente: true}]` (sin "bienes", coherente con que el mock no lo tiene habilitado en `capacidades` tampoco), para que el perfil demo se vea con la tarjeta de RNP nueva pobladas y no solo con el aviso de "no consultado".

## Cambios de código

- `src/lib/data/types.ts`: nueva interfaz `RegistroRnp`, campo `registros?: RegistroRnp[]` en `EstadoRnp`, `crearRnpVacio()` no necesita cambios (queda `registros: undefined` por defecto vía el spread/objeto literal, ya que es opcional).
- `src/app/api/rnp/route.ts`: parsear `lscIdTipReg`/`lscIdTipRegVig` de `OsceProveedor` (agregar esos dos campos a la interfaz, hoy no capturados) a `RegistroRnp[]`, agregar `registros` a `RnpResultado`.
- `src/components/marketing/registro-form.tsx`: agregar `registros` al `rnpEstado` construido desde un hit real del RNP.
- `src/components/perfil/rnp-card.tsx`: reestructurar el modo vista en 4 bloques condicionales por tipo de registro; extraer el formulario de `capacidades` a un componente nuevo.
- Nuevo archivo `src/components/perfil/capacidad-declarada-card.tsx`: la tarjeta separada de capacidad autodeclarada (formulario movido desde `rnp-card.tsx`, mismo `actualizarDatosEmpresa`).
- `src/components/perfil/perfil-client.tsx`: agregar `<CapacidadDeclaradaCard />` después de `<RnpCard />`.
- `src/lib/data/mock/proveedor.ts`: agregar `registros` de ejemplo al perfil demo.

## Qué NO cambia

- `matching.ts` no se toca — ni `registros` ni la capacidad autodeclarada participan en el scoring.
- El mecanismo de guardado de `capacidades` (self-declared) no cambia, solo su tarjeta contenedora.
- No se agrega fecha "Desde" por registro ni la matriz de especialidad × categoría — confirmado que no están disponibles como dato real.
- `numeroPartida` sigue siendo un campo editable manualmente (sin cambios), no se intenta derivar de `lscIdTipReg`.

## Riesgos / limitaciones a comunicar en la UI

1. La asignación de código `3`/`4` a `bienes`/`servicios` es la mejor estimación disponible, no verificada con certeza absoluta — a confirmar durante la implementación contra el perfil público del RUC de prueba antes de dar la tarea por cerrada. **Actualización (2026-08-02, verificación manual):** el mapeo `3`/`4`→`bienes`/`servicios` se confirmó correcto, pero se encontró la polaridad de `vigente` invertida — `lscIdTipRegVig` lista los códigos NO vigentes, no los vigentes como sugiere el nombre. Corregido en `src/app/api/rnp/route.ts` (`!codigosVigentes.has(codigo)`).
2. Sin fecha "Desde" por registro — si el usuario la espera, no está disponible en la fuente de datos actual de la app.
3. Sin la matriz de especialidad × categoría de Consultor de Obras — solo la lista de especialidades, igual que hoy (pero ahora agrupada bajo el bloque correcto).
