# Prompt para Claude Code — Urban Procura

Copia y pega todo este documento como instrucción inicial para Claude Code (o guárdalo como `CLAUDE.md` en la raíz del repo antes de empezar).

---

## 0. Punto de partida: todo se construye desde cero

Vas a construir **Urban Procura** de cero. Existe un documento de visión del producto (ver sección 1) que da por hechas algunas cosas — un dashboard, un explorador de procesos y una integración ya activa con las APIs del OECE. **Ignora esa parte: para este proyecto nada de eso existe todavía.** No hay backend, no hay base de datos, no hay integración real con ninguna fuente externa. Todo el documento de visión debe leerse como "esto es lo que queremos", no como "esto ya está".

También existe un prototipo de un solo archivo (`urban-procura.html`, adjunto) hecho como demo puramente frontend, sin backend, con datos simulados. **Úsalo solo como referencia de UX y de lógica de negocio ya validada** — no como código a mantener. El proyecto real necesita arquitectura propiamente separada (backend + frontend + base de datos), autenticación real, y almacenamiento de archivos real.

---

## 1. Visión del producto

Urban Procura no es un buscador de licitaciones. Es el intento de construir el **sistema operativo (tipo ERP) para los proveedores del Estado peruano** — constructoras, consultoras, supervisoras, proveedores de bienes/servicios y consorcios que participan constantemente en el SEACE.

El usuario no debería preguntarse *"¿qué procesos existen?"*. Debería preguntarse *"¿cuál me conviene?"* — y la plataforma debe responder eso automáticamente, acompañando todo el ciclo: encontrar oportunidades, saber si conviene participar, preparar la oferta, hacer seguimiento, y (a futuro) gestionar la ejecución contractual.

Cada pantalla debe responder una pregunta concreta del usuario, no solo mostrar datos.

---

## 2. Público objetivo

Empresas que participan en contrataciones públicas de obra, bienes, servicios y consultoría: constructoras, consultoras, supervisoras, proveedoras de bienes/servicios, consorcios. Especialmente las que usan el SEACE de forma recurrente.

---

## 3. Fuentes de datos externas — investiga esto primero, con honestidad

Antes de construir el explorador de procesos, investiga y documenta qué tan viable es cada fuente. Ya se hizo una primera exploración manual con estos hallazgos — verifícalos y profundiza desde el backend (donde no aplican las restricciones CORS del navegador):

- **Portal de Contrataciones Abiertas del OECE** (`contratacionesabiertas.osce.gob.pe`), que publica datos bajo el estándar **OCDS** (Open Contracting Data Standard) en CSV/XLSX/JSON. Es la fuente más prometedora para datos reales de procesos. Su `robots.txt` bloquea crawlers automatizados — respétalo; si hace falta acceso programático, busca si publican un endpoint de API o bulk-download documentado explícitamente para ese fin, en vez de scrapear el sitio.
- **Buscador del RNP** (`apps.osce.gob.pe/perfilprov-ui/`): no pide captcha para consulta directa por RUC. El endpoint aproximado es `https://apps.osce.gob.pe/perfilprov-ui/buscar?q={RUC}&pageSize=6&pageNumber=1&langTag=es`. Confirmado desde navegador: **CORS bloquea la llamada directa desde frontend**. Desde un backend (server-to-server) no debería aplicar esa restricción — pruébalo y documenta el resultado real. Este es el candidato más viable para autocompletar el perfil del proveedor con datos reales.
- **SUNAT** (`e-consultaruc.sunat.gob.pe`): no tiene API pública oficial. La búsqueda por nombre/razón social exige captcha; la búsqueda directa por RUC a veces no lo muestra en el UI, pero **no construyas nada que intente automatizar u obviar ese captcha bajo ninguna circunstancia** — es una autoridad tributaria y no es un límite técnico a "resolver", es una barrera deliberada. Si se necesita dato de SUNAT en producción, usa una API de terceros con licencia (existen varias, desde ~S/9/mes).
- **SEACE / bi.seace.gob.pe**: portal Pentaho renderizado en JS, sin API documentada para integraciones externas.

Con base en esto: **diseña la capa de datos como un adaptador reemplazable** (`DataSource` / `provider` con una interfaz común), con un modo `mock` (fixtures realistas, claramente marcados como datos de demostración) y un modo `live` que intente las fuentes de arriba. Si `live` falla o no es viable, el sistema debe degradar a `mock` visiblemente, nunca en silencio — el usuario final siempre debe saber si está viendo datos reales o de muestra.

---

## 4. Arquitectura sugerida (ajustable)

- Backend + frontend en un mismo framework full-stack (ej. Next.js) o separados (ej. API en Node/Express o Python/FastAPI + frontend en React) — el que te resulte más mantenible.
- Base de datos relacional (Postgres) con un ORM (Prisma, Drizzle, SQLAlchemy, el que corresponda al stack elegido).
- Autenticación real: contraseñas con hash (bcrypt/argon2), sesiones o JWT. Nada de login simulado como en el prototipo.
- Almacenamiento de archivos real para contratos/conformidades/documentos (empezar con disco local o un bucket tipo S3-compatible; sin el límite artificial de ~1.5 MB que tenía el prototipo).
- Diseñar la integración con IA (para lectura de bases/expedientes y generación de resúmenes/ofertas) como un servicio propio del backend que llama a la API de Claude, no expuesto directamente al frontend con la clave embebida.

---

## 5. Módulos a construir

### Módulo 1 — Perfil del Proveedor (núcleo del sistema)
Registro único por empresa:
- Datos generales: RUC, razón social, nombre comercial, representante legal, DNI, correo, teléfono, dirección.
- Información legal: ficha RUC, vigencia de poder, RNP, especialidades RNP, estado del RNP (bienes / servicios / consultoría de obras / ejecución de obras).
- Experiencia: obras ejecutadas, consultorías, supervisiones, bienes, servicios — cada registro con cliente, monto, fecha, especialidad, si fue en consorcio (y % de participación), y documentos sustentatorios (contrato + conformidad).
- Personal clave: ingenieros, arquitectos, especialistas, con CV, colegiatura y certificados.
- Equipamiento: maquinaria, equipos, vehículos.
- Repositorio de documentos frecuentes (vigencia de poder, ficha RUC, RNP, declaraciones, cartas, certificados) reutilizables al generar ofertas.

### Módulo 2 — Preferencias del proveedor
Rubros de interés, entidades objetivo, regiones objetivo, monto mínimo/máximo, palabras clave, tipo de procedimiento.

### Módulo 3 — Explorador Inteligente
Búsqueda y filtros por región, entidad, palabras clave, descripción, tipo de procedimiento, estado, monto mínimo/máximo, categoría y subcategoría (ej. dentro de "Servicios": elaboración de expedientes técnicos, supervisión de expedientes, supervisión de obras, consultoría de obras).

### Módulo 4 — Matching Inteligente (diferenciador principal)
Cada proceso se compara automáticamente contra el perfil del proveedor y devuelve:
- Un porcentaje de compatibilidad.
- Qué coincide (región, rubro, monto, entidad) y qué falta (ej. experiencia específica), mostrado explícitamente, no solo el número.
- Clasificación: alto / medio / bajo match.

### Módulo 5 — Dashboard Inteligente
No solo estadísticas (presupuesto total, cantidad de procesos, distribución por categoría, ranking de entidades/regiones) — debe responder "¿qué debería hacer hoy?": oportunidades recomendadas, procesos por vencer, alertas nuevas, procesos guardados, documentos pendientes, mejor match del momento.

### Módulo 6 — CRM de oportunidades
Cada proceso se puede guardar con un estado: revisar, interesado, descartado, preparando oferta, oferta presentada, buena pro, no adjudicado.

### Módulo 7 — Ficha Inteligente del Proceso
Debe responder: ¿me conviene?, ¿puedo participar?, ¿qué experiencia piden?, ¿qué especialistas requieren?, ¿qué documentos necesito?, ¿cuál es el riesgo?, ¿cuál es el cronograma?, ¿cuándo vence? Incluye compatibilidad, match, riesgos y alertas.
Debe permitir descargar/ver los documentos del proceso: **bases administrativas y/o integradas**, y el **expediente técnico** cuando el proceso lo publique (en obras, el expediente técnico suele ser más importante que las bases).

### Módulo 8 — Análisis de documentos con IA
Lectura de bases y expedientes técnicos para generar: resumen ejecutivo, requisitos detectados, especialistas requeridos, experiencia requerida, garantías, cronograma, riesgos. Debe poder responder preguntas puntuales como "¿puedo participar?" o "¿qué me falta?".

### Módulo 9 — Ranking de competidores
Ranking de empresas ganadoras por categoría (hospitales, colegios, carreteras, saneamiento, puentes, etc.), para identificar competidores reales, no solo un ranking general.

### Módulo 10 — Historial de la entidad
Historial de adjudicaciones por entidad: empresa ganadora, monto, objeto, fecha, tipo de procedimiento.

### Módulo 11 (roadmap, no MVP) — Automatización de ofertas
Descargar bases, identificar anexos, autocompletar formularios, reutilizar documentos del repositorio, generar Word/PDF. Deja la arquitectura preparada para esto (documentos reutilizables, datos estructurados del perfil) pero no lo implementes en la primera fase.

---

## 6. Planes comerciales (diseñar el sistema de permisos pensando en esto desde ahora)

- **Básico**: dashboard, explorador, ficha del proceso, descarga de documentos públicos. Sin IA.
- **Profesional**: matching, CRM, alertas inteligentes, perfil completo, recomendaciones.
- **Premium**: IA (resumen automático, lectura de bases/expedientes), preparación de ofertas, autollenado de anexos, exportación Word/PDF.

No hace falta implementar cobros en el MVP, pero sí modelar roles/permisos por plan desde el diseño de datos.

---

## 7. Prototipo de referencia (adjunto)

`urban-procura.html` ya valida, con datos simulados, varias piezas de este alcance — replican su lógica, no su código:
- Buscador con filtros y badges de compatibilidad.
- Alertas configurables por rubro con vencimientos próximos.
- Comparador de hasta 4 procesos lado a lado.
- Calendario de plazos (registro, presentación de ofertas, buena pro).
- Perfil con búsqueda por RUC (simulada), categorías RNP, capacidad máxima/libre de contratación.
- Registro de experiencia con sustento documental (contrato + conformidad).
- Documentos del proceso descargables (bases administrativas, integradas, expediente técnico).
- Análisis de bases con IA devolviendo requisitos estructurados + % de compatibilidad.
- Generación de borrador de oferta con IA a partir del perfil + experiencia + proceso.

---

## 8. Consideraciones éticas y legales

- Respeta `robots.txt` y los términos de uso de cualquier fuente pública.
- No automatices ni intentes evadir captchas, especialmente en sistemas de SUNAT.
- Sé transparente en la interfaz sobre qué datos son reales y cuáles son de muestra — nunca presentes datos simulados como si fueran oficiales.
- Si una integración requiere convenio o autorización directa con OECE/SUNAT, indícalo claramente en vez de intentar un rodeo técnico.
