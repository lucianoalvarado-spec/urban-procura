@AGENTS.md

# Urban Procura

Visión completa del producto: [docs/prompt-claude-code-urban-procura.md](docs/prompt-claude-code-urban-procura.md). Léelo antes de tomar decisiones de alcance — este archivo solo resume el estado actual y las decisiones de arquitectura ya tomadas.

## Estado actual

Fase 1: **interfaz inicial, sin base de datos ni autenticación real.** Los procesos y el perfil demo siguen siendo 100% mock y están marcados como tal (banner "modo demo" en `components/layout/demo-banner.tsx`). La única excepción es `/registro`: consulta en vivo el RNP real del OSCE por RUC (ver sección "Integración RNP" más abajo) — es la primera fuente de datos real conectada del proyecto, tal como preveía la sección 3 del doc de visión.

Stack: Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind v4. `npm run dev` / `npm run build` / `npm run lint`.

Node no está en el `PATH` de shell por defecto en esta máquina: si un comando `node`/`npm` falla con "command not found", antepón `export PATH="$PATH:/c/Program Files/nodejs"` (bash) o `$env:Path += ";C:\Program Files\nodejs"` (PowerShell) al comando.

## Decisiones de arquitectura

- **Capa de datos como adaptador reemplazable** (`src/lib/data/provider.ts`): toda la UI llama a `listProcesos`, `getProceso`, `getProveedor`, nunca importa los fixtures directamente. `getDataMode()` devuelve `"mock"` hoy; el día que exista un provider `live` (ver sección 3 del doc de visión) debe implementar la misma interfaz y degradar a mock **visiblemente** si falla, nunca en silencio.
- **Fixtures** en `src/lib/data/mock/` (`procesos.ts`, `proveedor.ts`) — 14 procesos y 1 proveedor demo con datos peruanos realistas pero ficticios.
- **Matching** (`src/lib/data/matching.ts`): heurística explicable por pesos (región, rubro, monto, entidad, palabra clave, tipo de procedimiento, experiencia mínima). Devuelve score + nivel + listas de coincidencias/faltantes explícitas, no solo un número.
- **Estado del lado del cliente** vive en `src/lib/state/`, respaldado por un store minimalista sobre `localStorage` (`local-store.ts`, `createLocalStorageStore`) leído con `useSyncExternalStore` (evita el error de lint `react-hooks/set-state-in-effect` y es hydration-safe: el snapshot de servidor es siempre el default).
  - `proveedor-context.tsx` (`ProveedorProvider`/`useProveedor`): combina `proveedorMock` + `datosEmpresa` (store) + `preferencias` (store) + `plan` (store) en un único `proveedor`. El orden del spread importa: `{...proveedorMock, ...datosEmpresa, preferencias, plan}` — cualquier campo presente en `datosEmpresa` reemplaza al mock; los campos ausentes siguen mostrando el demo (Vientos del Sur) para no romper la experiencia de "solo estoy explorando" sin haberse registrado.
  - `empresa-store.ts` (`useDatosEmpresa`/`setDatosEmpresa`/`updateDatosEmpresa`): `Partial<Proveedor>` persistido, poblado por `/registro` (RUC, razón social, RNP, correo, teléfono, y arrays de experiencia/personal clave/equipamiento/documentos **vacíos explícitamente**, para no heredar los datos de muestra) y editado luego desde `/perfil` vía `actualizarDatosEmpresa` (expuesto por `useProveedor()`).
  - `plan-store.ts` (`usePlan`/`setPlan`): independiente de `ProveedorProvider` a propósito, porque `/registro` vive fuera del grupo `(app)` y necesita escribir el plan sin montar ese contexto.
  - `crm-context.tsx`: estado de seguimiento (`EstadoOportunidad`) por proceso, usado en Explorador, Ficha y `/oportunidades`.
  - Sin backend todavía: esto es persistencia local del navegador, no multiusuario. Cuando exista backend, estos stores deben pasar a leer/escribir vía API en lugar de `localStorage`.
- **Patrón de páginas**: `app/**/page.tsx` es Server Component, hace `await listProcesos()`/etc. y pasa los datos a un Client Component (`*-client.tsx`) que consume los contexts y calcula matching. Mantener este patrón al agregar páginas nuevas.
- **Nav y mapa de módulos**: `src/lib/nav.ts` es la fuente de verdad de qué módulos existen, en qué plan comercial están (`free`/`basico`/`profesional`/`premium`) y cuáles son placeholder (`proximamente`). Los placeholders usan `components/proximamente/proximamente.tsx`.
- **Dos grupos de rutas**: `src/app/(marketing)/` es público (landing `/`, `/login`, `/registro`) con su propio layout (`components/marketing/*`, sin sidebar). `src/app/(app)/` es el dashboard interno (`/dashboard`, `/explorador`, `/procesos/[id]`, `/perfil`, `/oportunidades`, módulos "próximamente") y monta `ProveedorProvider`/`CrmProvider` en su propio `layout.tsx`. El `layout.tsx` raíz solo pone `<html>/<body>` y fuentes — no asumas que envuelve todo con el shell del dashboard.
- **Plan comercial como su propio store** (`src/lib/state/plan-store.ts`): `usePlan()`/`setPlan()` sobre el mismo patrón de `localStorage` + `useSyncExternalStore`, independiente de `ProveedorProvider` porque `/registro` (fuera del grupo `(app)`) necesita escribirlo sin montar ese contexto. `ProveedorProvider` lo lee y lo fusiona en `proveedor.plan`. El Topbar tiene un `<select>` de plan pensado solo para explorar la demo (cambia el plan al instante, no es un flujo de cuenta real).
- **Gating por plan** (`src/lib/plan.ts`, `cumplePlan`): matching (badges) y CRM requieren `profesional`+; están gateados en Explorador, Ficha, Dashboard y Oportunidades vía `components/plan/upgrade-notice.tsx` (`UpgradeNotice`/`LockedInline`). El plan `free` además limita resultados visibles (Explorador a 5, "Procesos por vencer" del Dashboard a 2). Si se agrega una función nueva que dependa del plan, seguir este mismo patrón en vez de ocultar cosas ad hoc.
- **Login/registro no validan credenciales**: la contraseña no se verifica contra ningún backend y `/login` no reconoce cuentas — ambos flujos redirigen a `/dashboard` sin autenticación real. Lo que **sí** es real en `/registro` es la búsqueda por RUC contra el RNP del OSCE (ver siguiente sección) y la verificación de correo simulada (genera un código de 6 dígitos y lo muestra en pantalla — no se envía ningún correo de verdad; está rotulado como "modo demo" para no engañar al usuario).

## Integración RNP (OSCE) — la única fuente de datos real hoy

`/registro` pide solo el RUC y llama a `GET /api/rnp?ruc=` (`src/app/api/rnp/route.ts`), que hace de proxy server-to-server hacia el RNP real del OSCE:

- Endpoint real (no documentado públicamente — se extrajo del bundle JS de `apps.osce.gob.pe/perfilprov-ui`, buscando dónde ese buscador oficial obtiene sus datos): `GET https://eap.oece.gob.pe/perfilprov-bus/1.0/ficha/{ruc}`.
- Confirmado en sesión: responde sin autenticación, sin CAPTCHA, y `robots.txt` de `apps.osce.gob.pe`/`eap.oece.gob.pe` solo bloquea `/cuaderno-obra/` y `/buscador-cuaderno-obra/` (no aplica a este endpoint). `proveedorT01: null` en la respuesta significa "RUC no encontrado", no es un error.
- La respuesta **no** trae header `Access-Control-Allow-Origin`, así que un `fetch` directo desde el navegador seguiría bloqueado por CORS (esto confirma lo que ya sospechaba la sección 3 del doc de visión) — por eso el proxy tiene que vivir en el backend de Next.js (`/api/rnp`), nunca llamarse directo desde un client component.
- `RnpResultado` (tipo exportado desde `route.ts`, importado como *type-only* en `registro-form.tsx`) siempre distingue `disponible` (¿respondió la fuente?) de `encontrado` (¿existe ese RUC?), para poder degradar visiblemente: RUC no encontrado → formulario manual de razón social; fuente caída → mismo formulario manual con mensaje distinto. Nunca se falla en silencio.

**Segunda integración: experiencia/contratos del SEACE** (`src/app/api/rnp/experiencia/route.ts`, usada por el botón "Importar del SEACE" en `components/perfil/experiencia-card.tsx`). Replica el mismo patrón de proxy:

- Lista: `GET https://eap.oece.gob.pe/perfilprov-bus/1.0/ficha/{ruc}/contrataciones?pageSize=&pageNumber=` (hasta `LIMITE_CONTRATOS = 12`).
- Detalle por contrato (llamados en paralelo con `Promise.allSettled`, uno por candidato): `GET .../contratacion/{codContProv}/ficha` — trae `fecBaseCont` (fecha real), `provContT01s` (% de consorcio) y, cuando la entidad los publicó, **documentos PDF reales** en `docsContF01.claseDocF01s[].docT01s[].urlDoc` (dominio `eap.oece.gob.pe`, público, sin auth).
- El usuario ve la lista de contratos candidatos con sus documentos y decide cuáles importar (no se importa nada automáticamente sin confirmación); cada importación queda marcada `fuente: "seace"` en `ExperienciaProveedor` y es editable/eliminable como cualquier otro registro.
- **No se integró** la otra tarjeta de la ficha de OSCE ("Acreditada en el RNP", experiencia de obras vía `expprov-bus/1.0/experiencia/{ruc}/`): devolvió `"Error en plataforma del servicio"` de forma consistente en las pruebas con distintos parámetros — no se encontró la combinación correcta. Si se retoma, no repetir la exploración desde cero: el problema probablemente es un parámetro faltante en la query, no el endpoint en sí.
- Antes de replicar este patrón para otra fuente (RNP por nombre, SUNAT, OCDS), repetir el mismo proceso: revisar `robots.txt`, probar el endpoint real con `curl` server-to-server primero, y documentar el resultado aquí — no asumir que lo que dice el doc de visión sigue vigente sin volver a probarlo.

## Módulos construidos vs. pendientes

Construidos: Landing (`/`), Login (mock)/Registro (RUC→RNP real del OSCE, correo con verificación simulada, teléfono, selección de plan), Dashboard, Explorador inteligente, Ficha del proceso, Perfil del proveedor (**totalmente editable**: datos generales, RNP/capacidad, experiencia, personal clave, equipamiento, documentos y preferencias — cada sección con su propio componente en `components/perfil/`), Mis oportunidades (CRM) — estos últimos cinco con gating visual por plan.

Placeholder "próximamente" (nav ya existe, pantalla ya explica qué pregunta resolverá, sin lógica real): Alertas, Comparador de procesos, Calendario de plazos, Análisis de bases con IA, Ranking de competidores, Historial de la entidad, Generación de ofertas (roadmap explícito, no MVP).

## Próximos pasos naturales (no implementados)

- Backend real: Postgres + ORM, autenticación (bcrypt/argon2 + sesiones o JWT), storage de archivos. Hoy "crear cuenta" solo guarda en `localStorage` del navegador — no hay multiusuario ni persistencia entre dispositivos.
- Verificación de correo real (envío de código por email) en vez de mostrarlo en pantalla; login que valide credenciales reales.
- Investigar viabilidad de las demás fuentes reales del doc de visión (búsqueda RNP por nombre/rubro para el Explorador, OCDS del Portal de Contrataciones Abiertas, SUNAT vía proveedor de terceros) — mismo proceso de verificación que se usó para el RNP por RUC.
- Mover preferencias/CRM/plan/datos de empresa de `localStorage` a persistencia por usuario en backend.
- El gating por plan hoy es solo de UI (cualquiera puede cambiar el `<select>` del Topbar o editar `localStorage`); con backend, la fuente de verdad del plan debe venir del servidor.
