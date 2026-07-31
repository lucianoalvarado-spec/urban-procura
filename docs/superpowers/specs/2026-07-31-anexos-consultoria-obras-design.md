# Anexos oficiales de licitación — extender a Consultoría de Obras

Fecha: 2026-07-31
Estado: aprobado por el usuario, pendiente de implementar

## Contexto

"Generación de ofertas" (`/automatizacion`) genera los anexos oficiales de la oferta solo para procesos de categoría `Obra`, usando el texto real de las Bases Estándar del MEF bajo la Ley N° 32069 (`src/lib/generacion-ofertas/anexos-obras.ts`, ver `CLAUDE.md`). Para cualquier otra categoría se muestra un aviso honesto de que no está implementado.

El usuario pidió revisar la página de la Resolución Directoral N° 0001-2026-EF/54.01 (`https://www.gob.pe/institucion/mef/normas-legales/7614342-001-2026-ef-54-01`) para extender la cobertura. Esa resolución aprueba una tabla de **19 tipos de bases estándar** (una por combinación de categoría y tipo de procedimiento), no solo las 2 de Obras ya implementadas. El usuario decidió acotar esta ronda a **Obras (ya cubierto) + Consultoría de Obras** — Bienes y Servicios quedan fuera de alcance por ahora.

Se descargó y extrajo el texto real (no asumido — mismo estándar de rigor que el resto de esta sección del proyecto) del documento correspondiente:
`https://www.mef.gob.pe/contenidos/archivos-descarga/7_Bases_estandar_de_Concurso_publico_de_consultorias_y_servicios_de_mantenimiento_vial.docx`

## Decisión de producto

### El documento cubre 3 objetos de contratación combinados

Este único .docx no es exclusivo de "Consultoría de Obras": su Capítulo III ("Requerimiento") tiene 3 variantes intercambiables según lo que la entidad esté contratando — Consultorías en general, **Consultoría de Obra**, o Servicio de Mantenimiento Vial — cada una con su propio sub-capítulo de requisitos de calificación. Para Urban Procura solo interesa la variante "Consultoría de Obra" (coincide con la categoría `"Consultoría de Obras"` ya existente en `Categoria` y con `especialidad === "Consultoría de obra"` en `ExperienciaProveedor`).

Tiene un documento hermano "abreviado" (`8_Bases_estandar_de_Concurso_publico_abreviado_para_consultorias_y_servicios_de_mantenimiento_vial.docx`), igual que Obras tuvo el par regular/abreviada (docs #3/#4). **Falta confirmar durante la implementación** (extrayendo el texto del #8, no asumiendo) si la numeración de los 17 anexos es idéntica entre ambos — para Obras sí lo fue, pero no se puede dar por sentado sin verificar este documento específico.

### Los 8 anexos a autogenerar (mismo alcance que Obras)

De la sección "CONTENIDO DE LAS OFERTAS" del documento #7 (SECCIÓN GENERAL, común a los 3 objetos), los anexos presentados **con la oferta** son:

- Obligatorios siempre: Anexo 1 (declaración jurada de datos del postor), Anexo 2 (pacto de integridad), Anexo 3 (declaración jurada de veracidad/no impedimento), Anexo 6 (precio de la oferta).
- Anexo 4 (promesa de consorcio) — solo si es consorcio.
- Anexo 11 (experiencia del postor en la especialidad) — para acreditar requisitos de calificación, con la tabla de contratos (cliente/objeto/monto/fecha), tomado de `proveedor.experiencia.filter(e => e.especialidad === "Consultoría de obra")`.
- Anexo 13 (exoneración IGV Amazonía) y Anexo 14 (bonificación 10% fuera de Lima/Callao) — facultativos, mismo patrón de checkbox que Obras.

**Numeración distinta a Obras, confirmada por texto, no asumida**: en el documento de Obras, IGV es el Anexo 13 y bonificación 10% es el Anexo 9; en este documento son Anexo 13 (IGV) y Anexo 14 (bonificación). Cada documento tiene su propia numeración oficial — no se reutiliza la de Obras.

### Anexo 16 (personal clave) — no se autogenera

El documento incluye un Anexo 16 ("compromiso de personal clave") cuyo estatus es ambiguo: el propio texto (línea del Capítulo II) dice que la acreditación de personal clave se presenta con la oferta *solo si* la entidad la definió como factor de evaluación — si no, se presenta recién al perfeccionar el contrato. Además, el encabezado del Anexo 16 en el .docx dice "CONCURSO PÚBLICO ABREVIADO" (título del documento #8, no del #7 donde aparece) — un error de copiado del propio MEF. Por la ambigüedad de cuándo aplica y el error detectado, **no se autogenera** — se lista junto con los demás no automatizados, igual que ya se hace con casos ambiguos de Obras (Anexo 5, parentesco).

### Anexos que no cambian de tratamiento

- **Anexo 5** (desafectación de impedimento por parentesco) y **Anexo 12** (declaración jurada de reorganización societaria) de este documento — casos excepcionales que requieren datos que el sistema no tiene (igual que el 5/15 de Obras) — se listan, no se generan.
- **Anexos 7, 8, 9, 10, 15, 17** — "documento a presentar para el perfeccionamiento del contrato" (solo si ganas la buena pro) — se listan, no se generan, igual que el tratamiento ya existente para los equivalentes de Obras.

## Cambios de código

- **Nuevo archivo `src/lib/generacion-ofertas/anexos-consultoria-obras.ts`**, hermano de `anexos-obras.ts` y con la misma forma (mismo patrón `AnexoGenerado`, mismo helper `CONSIGNAR`, mismas funciones `anexoN()` una por anexo) — no se generaliza en un módulo compartido: el texto oficial y la numeración difieren entre documentos, e intentar unificarlos ahora sería abstraer sobre una muestra de 2. Exporta `DatosOfertaConsultoriaObras`, `generarAnexosConsultoriaObras()`, `ANEXOS_SOLO_PERFECCIONAMIENTO_CO`, `ANEXOS_NO_AUTOMATIZADOS_CO`.
- **`src/components/automatizacion/automatizacion-client.tsx`**: el gate `proceso.categoria !== "Obra"` se cambia a una función `anexosDisponibles(categoria)` que devuelve `"obra" | "consultoria-obras" | null`, y renderiza `AnexosObrasCard` o una nueva `AnexosConsultoriaObrasCard` (o el mismo componente parametrizado, a decidir en el plan según cuánto se parezcan los campos de opciones — consorcio/IGV/bonificación10/moneda/monto/ciudad-fecha son casi idénticos entre ambos, tipo de procedimiento y experiencia difieren) según corresponda. Cuando la categoría no es ninguna de las dos, se mantiene el aviso honesto actual, actualizado para mencionar que Bienes y Servicios siguen sin cobertura.
- **`src/app/api/generar-oferta/anexos-docx/route.ts`**: el texto fijo "...a partir de las Bases Estándar de Licitación Pública de Obras..." pasa a depender de la categoría del proceso recibido (Obras vs. Consultoría de Obras), no queda hardcodeado a Obras.
- **`src/app/api/generar-oferta/excel/route.ts`**: mismo ajuste si tiene un texto equivalente hardcodeado (a confirmar en el plan revisando el archivo).

## Qué NO cambia

- `matching.ts` no se toca.
- Bienes y Servicios quedan fuera de este alcance — siguen mostrando el aviso de "no implementado".
- El generador de Obras (`anexos-obras.ts`) no se modifica, solo se referencia como patrón.
- No se generan los Anexos 5, 7, 8, 9, 10, 12, 15, 16, 17 de este documento — se listan como ya se hace con sus equivalentes de Obras.

## Riesgos / limitaciones a comunicar en la UI

1. La numeración y el texto de los anexos "abreviada" (documento #8) se asumen iguales a los del documento #7 hasta que se confirme extrayendo su texto durante la implementación — si difieren, el selector "tipo de procedimiento" (regular/abreviada) de la UI necesitaría lógica condicional adicional, igual que ya existe para Obras pero verificada para este documento específico antes de dar por buena la generación en modo abreviada.
2. El Anexo 16 (personal clave) no se genera pese a que el Perfil ya tiene datos de personal clave — se documenta como próximo paso posible, no como limitación oculta.
3. Igual que con Obras, los campos que no se puedan completar con datos del Perfil quedan como `[CONSIGNAR ...]` visibles, nunca se inventa un valor.
