# Integraciones avanzadas del Portal de Contrataciones Abiertas (Ranking, Explorador, Historial, Landing/Dashboard)

Fecha: 2026-07-30
Estado: aprobado por el usuario, pendiente de implementar

## Contexto

Se hizo una auditoría completa del Portal de Contrataciones Abiertas del OECE (`https://contratacionesabiertas.oece.gob.pe/`) — landing, los 3 tableros (Procesos de Contratación, Contratos, Indicadores), la documentación oficial de la API (Swagger OAS 3.0), descargas masivas, políticas, y las páginas públicas de Entidades/Proveedores — buscando endpoints o campos que Urban Procura no esté usando todavía.

Del resultado de esa auditoría, el usuario aprobó avanzar con 3 mejoras concretas más una decisión de dónde ubicar datos de los tableros (landing pública vs. Dashboard autenticado). Antes de diseñar se verificaron por curl los límites reales de cada endpoint nuevo — varios supuestos iniciales no se sostuvieron y el alcance se ajustó en consecuencia (ver cada sección).

## Parte 1 — Ranking de competidores: agregar vista "Top histórico"

### Decisión de producto

El Ranking de competidores hoy filtra por categoría (Bienes/Obra/Servicios/Consultoría de Obras) usando el método ya existente: una muestra de ~20 candidatos vía `/search` + detalle de cada uno (`rankingCompetidoresLive`, `LIMITE_CANDIDATOS_ADJUDICACION = 20` en `oece.ts`).

Se investigó `/api/v1/suppliers` — un catálogo público de 497,783 proveedores adjudicados históricos, cada uno con `total_processes`, `total_contracts` (monto acumulado) y RUC — como reemplazo. **Verificado con curl que este endpoint no soporta ningún filtro**: se probaron `category=works`, `mainProcurementCategory=works` y `year=2026` contra la baseline sin filtro, y los tres devuelven exactamente los mismos 497,783 resultados y el mismo top-3 — los parámetros se ignoran en silencio. Solo `supplier=<nombre>` filtra de verdad (confirmado, igual que `buyer=` en `/buyers`).

**Corrección importante encontrada durante el diseño:** la idea inicial era pedir una página grande de `/suppliers` y ordenar por `total_contracts` client-side. Se descartó tras verificar con curl que **el orden por defecto de `/suppliers` no tiene relación con el monto** (la primera página, con o sin `order_total_contracts=desc` — que tampoco filtra, se ignora igual que `category=` — devuelve proveedores con `total_contracts: 0`, evidentemente no los de mayor monto). Ordenar client-side una página arbitraria de 1000 sobre 497,783 no garantiza capturar el verdadero top 10. La fuente correcta para esto ya existe y está pensada exactamente para este propósito: `/api/v1/contractsSuppliersTop10Dashboard`, el mismo endpoint que alimenta el Tablero de Contratos del propio portal — hace la agregación por monto contratado server-side y devuelve directamente el top 10 real (verificado con curl: los primeros resultados son PLUSPETROL NORTE, PETROPERU, BPZ EXPLORACIÓN — multinacionales de petróleo/telecomunicaciones, consistente con ser los mayores montos contratados reales del país). Soporta `year=` igual que el resto de la familia de endpoints de tableros.

Dado que ni `/suppliers` ni el endpoint correcto (`contractsSuppliersTop10Dashboard`) pueden replicar el filtro por categoría que la vista actual sí tiene, el usuario decidió **mantener ambos mecanismos** en vez de reemplazar uno por el otro:

- La vista actual (por categoría, muestra de 20 vía `/search`) se queda exactamente como está.
- Se agrega una segunda vista, **"Top histórico"**, sin filtro de categoría, basada en `contractsSuppliersTop10Dashboard` — completa y real (agregación server-side sobre todo el histórico, no una muestra de 20), pero necesariamente sin ese filtro.

### Cambios de código

- `src/lib/data/live/oece.ts`: nueva función `obtenerTopProveedoresHistoricoLive(anio?: number): Promise<TopProveedorHistorico[] | null>` que llama `GET /api/v1/contractsSuppliersTop10Dashboard?format=json` (con `year=<anio>` cuando se pase; sin año, trae el histórico total de todos los años, igual que hoy hace el Tablero de Contratos por defecto) y mapea la respuesta (`{ name, value, amount }[]`) a `{ nombre, ruc, totalContratado }[]` — `value` viene como `PE-RUC-<numero>`, se extrae el RUC quitando el prefijo. Es un solo request liviano (10 resultados agregados server-side), nada de paginar ni ordenar client-side.
- `src/lib/data/provider.ts`: nueva función pública `obtenerTopProveedoresHistorico()` — mismo patrón sin fallback mock que `obtenerEstadisticas`/`obtenerProcesosPorRegion` (son cifras institucionales reales, no procesos de muestra): si la fuente falla, la sección no se renderiza.
- `src/app/(app)/ranking/page.tsx`: además de `obtenerRankingCompetidores()`, ahora también llama `obtenerTopProveedoresHistorico()` en paralelo y pasa ambos al client component.
- `src/components/ranking/ranking-client.tsx`: gana un selector de vista de dos opciones ("Por categoría (muestra reciente)" / "Histórico completo"), mismo patrón visual que `OPCIONES_VISTA` en `peru-map-card.tsx`. La vista histórica no tiene selector de categoría (no aplica) y muestra una nota explícita: "Ranking histórico completo — todas las categorías y años, sin filtrar."

## Parte 2 — Explorador: región real en las tarjetas visibles

### Decisión de producto

Hoy todo proceso que llega desde `/search` (resumen, usado por `buscarProcesosLive`) queda con `region: "Otro"` porque ese endpoint no trae dirección estructurada — la región real solo se completa al abrir la Ficha (`/record/{ocid}`, detalle completo).

Se investigó `/api/v1/records` (plural, documentado en el Swagger oficial) como posible fuente de región real a nivel de lista. **Verificado contra la documentación oficial que no tiene los parámetros necesarios**: solo acepta `page`, `order`, `sourceId`, `startDate`/`endDate`, `dataSegmentationID`, `tenderId`, `ocid`, `tenderTitle`, `mainProcurementCategory` — no hay parámetro de texto libre ni de entidad compradora. No puede reemplazar la búsqueda por texto/entidad que ya usa el Explorador (`search=` en `/search`).

La única forma real de obtener región exacta es pedir el detalle completo (`/record/{ocid}`, la misma función `obtenerProcesoLive` que ya usa la Ficha) proceso por proceso — no hay atajo de lista. Dado que hacerlo para los 60 resultados de cada búsqueda sería lento y pesado, el usuario decidió enriquecer **solo los primeros 15 resultados visibles** (cubre de sobra el límite de 5 del plan Free y la porción de pantalla sin scroll del resto de planes).

Alcance deliberadamente acotado: el enriquecimiento **solo reemplaza `region`**, no toca `fechaLimitePresentacion` ni `documentos` — mezclar una fecha límite precisa en las primeras 15 tarjetas con la fecha-proxy en el resto de la misma lista sería inconsistente y confuso para el usuario, sin que se haya pedido resolver eso en este alcance.

### Cambios de código

- `src/lib/data/live/oece.ts`, dentro de `buscarProcesosLive`: después de armar la lista de `Proceso[]` desde `/search`, tomar los primeros `LIMITE_ENRIQUECIMIENTO_REGION = 15` y pedir `obtenerProcesoLive(p.id)` para cada uno en paralelo (`Promise.allSettled`, igual patrón que `detallarAdjudicaciones`). Para los que respondan con éxito, reemplazar únicamente el campo `region` del proceso original (mantener el resto del objeto tal como vino del resumen). Los que fallen (timeout individual, 404) se quedan con `region: "Otro"` sin bloquear el resto del lote ni fallar la búsqueda completa.
- Afecta tanto la carga inicial del Explorador (`listProcesos()` → `ExploradorPage`) como las búsquedas por texto/entidad (`/api/procesos/buscar` → mismo `buscarProcesosLive`), porque ambas pasan por la misma función.
- Sin cambios de UI necesarios — `ExploradorClient` ya renderiza `proceso.region` tal cual: simplemente vendrá poblada en vez de "Otro" para los primeros 15.

## Parte 3 — Historial de la Entidad: perfil de la entidad enriquecido

### Decisión de producto

`/api/v1/buyers` (ya usado para el mapa del Dashboard) trae, además de `total_processes` y `party.address.department` (los únicos campos que hoy se usan), varios campos que se descargan y se descartan: `total_contracts` (monto histórico contratado), `last_process` (fecha del último proceso publicado), `party.contactPoint.telephone`/`.url`, y la dirección completa (`streetAddress`, `locality`). Ninguno de estos requiere una llamada nueva — ya viajan en la misma respuesta.

### Cambios de código

- `src/app/api/historial-entidad/route.ts`: además de `historialEntidadLive(entidad)`, hacer en paralelo `GET /api/v1/buyers?buyer=<entidad>&paginateBy=1` (mismo patrón de `buyer=` ya confirmado funcionando en la Quinta integración documentada en `CLAUDE.md`) y devolver un objeto `perfilEntidad` opcional junto al resultado existente: `{ totalContratado, ultimoProceso, telefono?, web?, direccion? }`. Si esta llamada falla, `perfilEntidad` es `null` y la sección correspondiente no se renderiza — mismo principio de no inventar datos.
- `src/components/historial-entidad/historial-entidad-client.tsx`: nueva tarjeta "Perfil de la entidad" entre el buscador de entidad y la lista de adjudicaciones, mostrando monto histórico contratado, fecha del último proceso, y teléfono/web si la entidad los publicó (con el mismo texto de "no publicado" que ya usa el resto de la app cuando falta un dato).

## Parte 4 — Landing pública vs. Dashboard autenticado: ubicación de datos de tableros

### Decisión de producto

Se investigaron los 3 tableros del portal. Ninguno tiene desglose por región (ya documentado). Se seleccionaron 2 adiciones, cada una con un rol distinto:

**Landing (`(marketing)/page.tsx`, visitante sin cuenta)** — el rol de esta sección ya es "generar confianza antes de registrarse" (el grid de 4 contadores existente). Se agregan 2 indicadores nuevos al mismo grid, mismo año actual, mismo patrón sin fallback mock:
- "Días promedio hasta la adjudicación" (`indicatorProcessDurationAVG.tenderEndToAwardDays` — **corrección**: se había anotado inicialmente `awardToContractStartDays`, pero ese campo mide de adjudicación a inicio de contrato, una etapa posterior; el que corresponde a "hasta la adjudicación" es `tenderEndToAwardDays`, ~27-34 días según el año, confirmado con curl)
- "Ofertas promedio para ganar una adjudicación" (`indicatorCountSuppliersOneMultiple.tenderersAVG`, ~3-5 según el año)

Verificado con curl que ambos endpoints aceptan `year=` igual que el resto de la familia `recordsXDashboard`/`indicatorX` (`indicatorProcessDurationAVG?year=2026` y `indicatorCountSuppliersOneMultiple?year=2026` devuelven valores distintos entre sí y respecto al histórico total, confirmando que el filtro aplica de verdad). Estos dos números son ganchos de marketing genuinos: le dicen a un proveedor potencial, antes de crear una cuenta, qué tan rápido se resuelve un proceso típico y qué tan reñida está la competencia.

**Dashboard (`(app)/dashboard`, usuario logueado)** — el rol de esta sección es dar contexto operativo para planificar el día, no vender la cuenta. Se agrega una card nueva y pequeña, "Procedimientos más usados este año", con el top 5 de `recordsProcurementTop10Dashboard?year=<actual>` (ya usado internamente por el tablero de Procesos de Contratación) — ayuda al usuario a entender qué tipo de procedimiento va a encontrarse más seguido este año.

**Explícitamente descartado de este alcance:** una sección nueva de "Contratos" en el Dashboard o el Landing que replique el tablero completo (montos por top10 comprador/proveedor como vista propia) — sería redundante con las mejoras de Ranking e Historial de la Entidad de las Partes 1 y 3, que ya cubren esa misma información desde el ángulo del proveedor individual. Esto no excluye usar puntualmente un endpoint de esa familia (`contractsSuppliersTop10Dashboard`) donde ya tiene sentido propio, como el "Top histórico" del Ranking (Parte 1) — lo descartado es una sección dedicada al tablero en sí, no cualquier uso de sus endpoints.

### Cambios de código

- `src/lib/data/live/oece.ts`: nuevas funciones `obtenerIndicadoresLive(anio)` (llama `indicatorProcessDurationAVG` + `indicatorCountSuppliersOneMultiple` en paralelo) y `obtenerProcedimientosTop5Live(anio)` (llama `recordsProcurementTop10Dashboard`, se queda con los primeros 5).
- `src/lib/data/provider.ts`: `obtenerIndicadores()` y `obtenerProcedimientosTop5()`, ambas sin fallback mock (mismo principio que el resto de cifras institucionales).
- `(marketing)/page.tsx`: agrega los 2 indicadores nuevos al grid existente de estadísticas (mismo `<section>`, misma cuadrícula, ahora 6 celdas en vez de 4).
- Dashboard: nueva card pequeña en `dashboard-client.tsx`/`dashboard/page.tsx`, ubicada junto a las demás cards de contexto (no reemplaza nada existente).

## Qué NO cambia

- `matching.ts` no se toca en ninguna de las 4 partes.
- El Ranking por categoría existente (Parte 1) sigue funcionando exactamente igual — la vista nueva se agrega, no reemplaza.
- `fechaLimitePresentacion` y `documentos` del Explorador (Parte 2) no se tocan — solo `region`.
- No se agrega ninguna sección dedicada al Tablero de Contratos del OECE en el Landing ni el Dashboard (Parte 4) — solo se reutiliza puntualmente uno de sus endpoints para el "Top histórico" del Ranking (Parte 1).

## Riesgos / limitaciones a comunicar en la UI

1. **Ranking histórico** (Parte 1): sin filtro de categoría — la UI lo dice explícitamente para no generar la expectativa de que se puede filtrar.
2. **Explorador** (Parte 2): solo las primeras 15 tarjetas de cada lote tendrán región real; el resto sigue mostrando "Otro" hasta que se abra la ficha — no se comunica como limitación visible porque ya es el comportamiento actual para todas las tarjetas (esto es una mejora parcial, no una regresión en ningún caso).
3. **Historial de la Entidad** (Parte 3): el perfil de la entidad puede no tener teléfono/web si la entidad no los publicó — se muestra "no publicado", nunca se inventa un valor.
4. **Indicadores de landing/Dashboard** (Parte 4): son promedios nacionales, no predicciones para un proceso puntual — se pueden acompañar de una aclaración breve ("promedio nacional, varía según el tipo de procedimiento") si el usuario lo pide al revisar el copy final.
