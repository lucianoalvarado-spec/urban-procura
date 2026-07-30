# Mapa de procesos activos + rediseño de Análisis de bases con IA

Fecha: 2026-07-29
Estado: aprobado por el usuario, pendiente de implementar

## Contexto

Dos pedidos del usuario en la misma sesión, brainstormeados juntos por ser ambos
cambios de Dashboard/IA de alcance moderado:

1. El mapa de "Procesos de contratación por región" del Dashboard muestra
   histórico de todos los años (dominado por Lima, ~1.19M de ~2.7M). El usuario
   quiere que muestre actividad reciente en vez de histórico acumulado.
2. El flujo de "Análisis de bases con IA" (`AnalisisBasesCard`, usado tanto en
   la Ficha del proceso como en el módulo standalone `/analisis-ia`) hoy exige
   que el usuario descargue el PDF de bases del proceso a mano y lo pegue o
   suba como `.txt` — tedioso, y redundante porque la app ya conoce la URL del
   PDF real. El usuario pidió que sea un botón que dispare el análisis solo, y
   que la IA saque explícitamente: requisitos técnicos, personal clave, ISOs,
   y un resumen de las metas físicas del proyecto — "todo lo necesario para el
   sistema de puntuación".

## Parte 1 — Mapa: procesos activos en vez de histórico

### Decisión de producto

"Activo" = procesos convocados **este año**, no procesos con plazo de
postulación genuinamente abierto ahora mismo. Se investigó la alternativa
("realmente vigentes") y no es viable de forma barata: `tender.status` casi
nunca viene poblado en las respuestas de lista de `/search`, así que
prácticamente todo se etiqueta "Convocado" a nivel resumen — para saber si un
proceso sigue realmente abierto hace falta el detalle (`enquiryPeriod`), que
es una llamada por proceso y no escala a miles de procesos por región.

### Fuente de datos

`total_processes` (usado hoy por el mapa histórico) es un contador de por vida
por entidad — no tiene desglose por año. No sirve para "este año".

**Nuevo enfoque**: tomar una muestra de `/search?year=<año actual>` (sin texto
de búsqueda), extraer el nombre de la entidad compradora de cada resultado, y
cruzarlo contra el mismo catálogo de `/api/v1/buyers` que el mapa histórico ya
trae (tiene `department` por entidad) — evita pedir el detalle de cada proceso
uno por uno.

- Tamaño de muestra: 5 páginas × `paginateBy=1000` = 5,000 procesos (de un
  total de ~42,000 este año). Elegido por balance velocidad/representatividad,
  confirmado con el usuario.
- Cache: `next: { revalidate: 21600 }` (6h), igual que el catálogo de buyers —
  no necesita frescura al segundo.
- **Limitación documentada**: es una muestra, no el conteo exacto del año.
  Regiones con poca actividad real podrían mostrar un número algo menor al
  real si esa actividad no cayó dentro de la muestra tomada. Sigue siendo una
  señal mucho más útil que el histórico dominado por Lima.

### Cambios de código

- `src/lib/data/live/oece.ts`: nueva función `obtenerProcesosActivosPorRegionLive()`
  junto a la existente `obtenerProcesosPorRegionLive()` (no se borra la
  histórica — puede quedar como opción 2 del selector de vistas que
  `peru-map-card.tsx` ya dejó preparado, `OPCIONES_VISTA`).
- Reutiliza la función de matcheo buyer→región que ya existe internamente
  para el mapa histórico (mismo `mapDepartamento`).
- `src/lib/data/provider.ts`: nueva función pública
  `obtenerProcesosActivosPorRegion()` (sin fallback mock, mismo patrón que la
  histórica — son cifras institucionales reales).
- `src/app/(app)/dashboard/page.tsx`: pasa el dataset **activo** (no el
  histórico) a `PeruMapCard` como fuente por defecto — el pedido fue
  "procesos activos **en vez del** histórico", lectura literal: reemplazo,
  no una segunda opción de vista. La función histórica
  (`obtenerProcesosPorRegionLive`/`obtenerProcesosPorRegion`) no se borra del
  código (queda disponible si se quiere retomar), pero deja de ser lo que el
  Dashboard muestra.
- `components/dashboard/peru-map-card.tsx`: actualizar subtítulo/tooltip/
  leyenda ("Histórico OECE (todos los años)...") para reflejar "procesos de
  este año" en vez de "todos los años". El selector `OPCIONES_VISTA` (hoy con
  una sola entrada, "Mapa de regiones") no cambia de estructura — sigue
  siendo el hook para una futura opción 2 (ej. ranking en lista), no para
  alternar entre histórico y activo.

## Parte 2 — Análisis de bases: botón automático + esquema extendido

### Decisiones de producto (confirmadas con el usuario)

1. **El análisis es solo informativo** — no alimenta `matching.ts`. El
   matching sigue siendo la heurística determinística y explicable de
   siempre. Esto evita mezclar un juicio de IA (que puede equivocarse) dentro
   de un cálculo hoy 100% transparente.
2. **El cuadro de pegar/subir texto se mantiene como respaldo** — para
   procesos sin documento "Bases" publicado (o cuyo PDF no tenga texto
   legible), o si el proceso es de la muestra mock (que nunca tiene URL real).
   El botón automático es el camino principal, no el único.

### Arquitectura técnica

Investigado contra la documentación actual de la API de Claude: el bloque de
contenido `type: "document"` con `source: {type: "base64", media_type:
"application/pdf", data: <base64>}` deja que Claude lea un PDF directamente
(sin beta header) — no hace falta agregar ninguna librería de extracción de
texto de PDF al proyecto (evita repetir el problema de dependencias pesadas
que ya causó una falla transitoria de compilación con `docx`/`exceljs` en una
sesión anterior).

Flujo:

1. `AnalisisBasesCard` ya recibe `proceso.documentos: DocumentoProceso[]`
   (prop existente). Busca el documento con `tipo === "Bases"` (mapeado desde
   `biddingDocuments` en `oece.ts`) que tenga `disponible: true` y una `url`
   real (dominio `seace.gob.pe`).
2. Si existe: muestra un botón único "Analizar bases automáticamente" en vez
   del cuadro de texto (que pasa a estar colapsado/oculto detrás de un link
   "o pega el texto manualmente").
3. El botón llama a `/api/analisis-bases` con un nuevo modo:
   `{ docUrl: string, proceso: {...} }` en vez de `{ texto, proceso }`.
4. El servidor:
   - Descarga el PDF server-to-server (mismo patrón que ya usa la Ficha para
     ofrecer el link de descarga — dominio ya confirmado accesible).
   - Valida tamaño: si el PDF pesa más de ~15MB, aborta con
     `disponible: false` y mensaje explícito ("el documento es muy pesado
     para analizarlo automáticamente — pégalo como texto si podés
     extraerlo").
   - Convierte a base64 y arma un content block `document` + un content
     block `text` con el prompt de extracción (esquema abajo).
   - Llama a la API de Claude (`claude-sonnet-5`, igual que la ruta ya usa
     hoy — se mantiene el modelo actual del proyecto, no se cambia a Opus).
5. Si no hay documento "Bases", o la descarga/lectura falla (404, timeout,
   PDF sin texto legible — Claude devuelve una sección vacía o un error): la
   UI cae automáticamente al cuadro de pegar/subir texto que ya existe hoy,
   con un mensaje explicando por qué no se pudo automatizar.
6. Rate limiting: reutiliza el limiter ya agregado en esta sesión
   (`lib/rate-limit.ts`) sobre la misma ruta — 8 análisis cada 10 minutos por
   IP. Esta variante cuesta más por request (fetch de PDF + tokens de
   documento), así que el límite importa más acá, no menos.

### Esquema de resultado extendido

`AnalisisBasesResultado` (en `src/app/api/analisis-bases/route.ts`) gana 3
campos nuevos y uno se reenfoca — nada se elimina:

| Campo | Estado | Contenido |
|---|---|---|
| `resumenEjecutivo` | Reenfocado | Debe describir explícitamente las **metas físicas** del proyecto (ej. "construcción de 2.3 km de vía asfaltada"), no un resumen genérico |
| `requisitosTecnicos` | 🆕 `string[]` | Especificaciones técnicas que debe cumplir la oferta, distinto de los requisitos de calificación del postor |
| `personalClaveRequerido` | 🆕 `string[]` | Profesionales exigidos: cargo, colegiatura, experiencia mínima — pensado para comparar a simple vista contra el Perfil del proveedor, sin tocar el matching |
| `certificacionesRequeridas` | 🆕 `string[]` | ISO y otras certificaciones que las bases exijan |
| `criteriosEvaluacion` | Ya existía | El "sistema de puntuación": factores de evaluación con su puntaje, si las bases lo detallan |
| `documentosRequeridos`, `garantias`, `plazoFormaPago`, `requisitosCalificacion` | Sin cambios | Se mantienen tal cual funcionan hoy |

El prompt del sistema (`PROMPT_SISTEMA` en la ruta) se actualiza para pedir
estos campos nuevos en el JSON de respuesta, con la misma instrucción ya
existente de "nunca inventes datos que no estén en el texto".

### Cambios de código

- `src/app/api/analisis-bases/route.ts`:
  - Acepta `{ docUrl?: string; texto?: string; proceso?: ProcesoResumen }` —
    exactamente uno de `docUrl`/`texto` presente.
  - Nueva función para descargar+codificar el PDF cuando viene `docUrl`.
  - Content block `document` en vez de solo texto cuando el modo es PDF.
  - `AnalisisBasesResultado` con los 3 campos nuevos.
  - `PROMPT_SISTEMA` actualizado con las nuevas secciones pedidas.
- `src/components/analisis-ia/analisis-bases-card.tsx`:
  - Detecta si `proceso.documentos` tiene un doc "Bases" disponible.
  - Botón primario "Analizar bases automáticamente" cuando existe; cuadro de
    texto colapsado detrás de un toggle "o pega el texto manualmente".
  - Sin documento disponible: muestra directamente el cuadro de texto de
    siempre (comportamiento actual, sin regresión).
  - Renderiza las 3 secciones nuevas en el resultado (mismo patrón visual que
    las secciones existentes vía el componente `Seccion`).

### Qué NO cambia

- `matching.ts` no se toca — el análisis de IA es puramente informativo.
- El cuadro de texto manual no se elimina — sigue siendo el respaldo.
- El modelo de IA sigue siendo `claude-sonnet-5` (consistente con el resto
  del proyecto), no se sube a un modelo más caro.

## Riesgos / limitaciones a comunicar en la UI

1. **Mapa**: el conteo "activo" es una muestra, se documenta en el tooltip/
   subtítulo del mapa igual que ya se documenta la metodología del histórico.
2. **Análisis de bases**: un PDF escaneado sin capa de texto puede darle a
   Claude menos para trabajar — no hay garantía de que la extracción sea
   perfecta incluso cuando el documento se lee correctamente. El disclaimer
   ya existente ("Generado por IA... verifica siempre contra las bases
   oficiales") sigue aplicando y cubre este caso.
