# Anexos de Consultoría de Obras — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extender "Generación de ofertas" (`/automatizacion`) para que procesos de categoría `"Consultoría de Obras"` también generen anexos oficiales reales (Bases Estándar del MEF, Ley N° 32069), con el mismo alcance y honestidad que ya tiene la categoría `"Obra"`.

**Architecture:** Archivo hermano `anexos-consultoria-obras.ts` (mismo patrón que `anexos-obras.ts`, sin abstracción compartida — la numeración y el texto oficial difieren entre documentos). La UI de `automatizacion-client.tsx` se generaliza a un solo componente `AnexosCard` parametrizado (los campos de opciones — consorcio, IGV, bonificación 10%, moneda, monto, ciudad/fecha — son idénticos entre ambas categorías) en vez de duplicar ~250 líneas de JSX.

**Tech Stack:** Next.js 15 / React 19 / TypeScript. Sin framework de tests en este proyecto — verificación por `npx tsc --noEmit`, `npm run lint`, y prueba manual contra el dev server local (mismo patrón que el resto de esta sección del proyecto, ver `CLAUDE.md`).

## Global Constraints

- Nunca hacer `git push` sin que el usuario lo pida explícitamente en ese mismo turno — solo `git commit`.
- Verificar contra el dev server local (`npm run dev` + Browser pane), no contra producción.
- No inventar datos: todo campo sin dato real del Perfil queda como `[CONSIGNAR ...]`, visible tanto en la UI como en los exports.
- Alcance aprobado por el usuario: 8 anexos autogenerados (1, 2, 3, 4, 6, 11, 13, 14). El Anexo 16 (personal clave) y el Anexo 17 exclusivo de la versión abreviada (bonificación 5% MYPE) NO se autogeneran en este alcance — se documentan como pendientes.
- No tocar `src/lib/data/matching.ts`.
- No modificar `src/lib/generacion-ofertas/anexos-obras.ts` — solo se referencia como patrón.

---

## Task 1: Crear `anexos-consultoria-obras.ts`

**Files:**
- Create: `src/lib/generacion-ofertas/anexos-consultoria-obras.ts`

**Interfaces:**
- Consumes: `ExperienciaProveedor`, `Proveedor` de `@/lib/data/types`; reutiliza el tipo `AnexoGenerado` ya exportado por `@/lib/generacion-ofertas/anexos-obras` (mismo shape, no se duplica).
- Produces: `DatosOfertaConsultoriaObras` (interface), `generarAnexosConsultoriaObras(d: DatosOfertaConsultoriaObras): AnexoGenerado[]`, `ANEXOS_SOLO_PERFECCIONAMIENTO_CO`, `ANEXOS_NO_AUTOMATIZADOS_CO` — mismo shape que sus equivalentes de `anexos-obras.ts` (`{ numero: number; titulo: string }[]` y `{ numero: number; titulo: string; motivo: string }[]`).

- [ ] **Step 1: Escribir el archivo completo**

```typescript
import type { ExperienciaProveedor, Proveedor } from "@/lib/data/types";
import type { AnexoGenerado } from "./anexos-obras";

// Anexos oficiales para Concurso Público de Consultorías y Servicios de Mantenimiento
// Vial, bajo la Ley N° 32069 (Ley General de Contrataciones Públicas) — específicamente
// la variante "Consultoría de Obra" de ese documento, que cubre supervisión de obra,
// elaboración/supervisión de expediente técnico. Texto extraído directamente del .docx
// real publicado por el MEF (Dirección General de Abastecimiento), aprobado por la
// Directiva N° 0005-2025-EF/54.01 y modificado por la Resolución Directoral N°
// 0001-2026-EF/54.01 (https://www.gob.pe/institucion/mef/normas-legales/7614342-001-2026-ef-54-01):
//   - https://www.mef.gob.pe/contenidos/archivos-descarga/7_Bases_estandar_de_Concurso_publico_de_consultorias_y_servicios_de_mantenimiento_vial.docx
//   - https://www.mef.gob.pe/contenidos/archivos-descarga/8_Bases_estandar_de_Concurso_publico_abreviado_para_consultorias_y_servicios_de_mantenimiento_vial.docx
//
// A diferencia de Obras (donde la numeración es idéntica entre regular y abreviada),
// aquí SÍ hay una diferencia real, confirmada extrayendo el texto de ambos documentos:
// la versión abreviada tiene un Anexo 17 adicional (bonificación del 5% por condición
// de MYPE) que la regular no tiene, y por eso el REDAM queda como Anexo 18 en vez de 17.
// Los anexos 1 a 14 (los únicos que interesan a este generador) SÍ tienen numeración y
// título idénticos entre ambos documentos — verificado, no asumido.
//
// Del capítulo "CONTENIDO DE LAS OFERTAS" (SECCIÓN GENERAL, común a los 3 objetos que
// cubre este documento — Consultorías, Consultoría de Obra, Mantenimiento Vial), los
// anexos que se presentan CON LA OFERTA son:
//   Obligatorios: Anexo 1, Anexo 2, Anexo 3, Anexo 6.
//   Anexo 4 (promesa de consorcio) — solo si es consorcio.
//   Para acreditar Requisitos de Calificación: Anexo 11 (experiencia).
//   Facultativos/condicionales: Anexo 13 (exoneración IGV Amazonía), Anexo 14
//   (bonificación 10% fuera de Lima y Callao).
// Numeración de IGV/bonificación DISTINTA a la de Obras (ahí es Anexo 13/Anexo 9) — cada
// documento tiene su propia numeración oficial, no se reutiliza la de Obras.
//
// Los Anexos 7, 8, 9, 10, 15, 17 (18 en la abreviada) son "documento a presentar para el
// perfeccionamiento del contrato" — solo si ganas la buena pro — no se generan acá.
// El Anexo 5 (desafectación de impedimento por parentesco) y el 12 (declaración jurada
// de reorganización societaria) son casos excepcionales que requieren datos que este
// sistema no tiene — no se generan. El Anexo 16 (compromiso de personal clave) tiene
// estatus ambiguo en el propio documento (solo aplica "con la oferta" si la entidad lo
// definió como factor de evaluación; su encabezado además dice "CONCURSO PÚBLICO
// ABREVIADO" por error de copiado del MEF, siendo este el documento regular) — no se
// autogenera. El Anexo 17 de la versión abreviada (bonificación 5% MYPE) tampoco, por
// estar fuera del alcance aprobado de 8 anexos.

export interface DatosOfertaConsultoriaObras {
  nomenclatura: string;
  entidad: string;
  tipoLicitacion: "regular" | "abreviada";
  proveedor: Pick<Proveedor, "razonSocial" | "ruc" | "representanteLegal" | "dniRepresentante" | "correo">;
  experienciaConsultoriaObras: ExperienciaProveedor[];
  esConsorcio: boolean;
  integrantesConsorcio: string;
  representanteComunConsorcio: string;
  solicitaBonificacion10: boolean;
  itemBonificacion: string;
  gozaExoneracionIgv: boolean;
  montoOfertaTotal: string;
  monedaOferta: string;
  ciudadFecha: string;
}

const CONSIGNAR = (campo: string) => `[CONSIGNAR ${campo}]`;

function encabezado(d: DatosOfertaConsultoriaObras): string {
  const tipo =
    d.tipoLicitacion === "abreviada" ? "CONCURSO PÚBLICO ABREVIADO PARA CONSULTORÍA DE OBRA" : "CONCURSO PÚBLICO PARA CONSULTORÍA DE OBRA";
  return `${tipo} Nº ${d.nomenclatura || CONSIGNAR("NOMENCLATURA DEL PROCEDIMIENTO DE SELECCIÓN")}`;
}

function datosPostor(d: DatosOfertaConsultoriaObras): string {
  const nombre = d.proveedor.representanteLegal || CONSIGNAR("NOMBRES Y APELLIDOS DEL REPRESENTANTE LEGAL");
  const razonSocial = d.proveedor.razonSocial || CONSIGNAR("RAZÓN SOCIAL");
  const dni = d.proveedor.dniRepresentante || CONSIGNAR("NÚMERO DE DOCUMENTO DE IDENTIDAD");
  return `El que se suscribe, ${nombre}, postor y/o representante legal de ${razonSocial}, identificado con Documento Nacional de Identidad N° ${dni}, con poder inscrito en la localidad de ${CONSIGNAR("LOCALIDAD")} en la Ficha Nº ${CONSIGNAR("FICHA")} Asiento Nº ${CONSIGNAR("ASIENTO")}`;
}

function anexo1(d: DatosOfertaConsultoriaObras): AnexoGenerado {
  return {
    numero: 1,
    titulo: "Declaración jurada de datos del postor y autorización de notificación por correo electrónico",
    aplicable: true,
    parrafos: [
      "Señores",
      "EVALUADORES",
      encabezado(d),
      "Presente.-",
      "",
      `${datosPostor(d)}, DECLARO BAJO JURAMENTO que la siguiente información se sujeta a la verdad:`,
      "",
      `Nombre, Denominación o Razón Social: ${d.proveedor.razonSocial || CONSIGNAR("RAZÓN SOCIAL")}`,
      `RUC: ${d.proveedor.ruc || CONSIGNAR("RUC")}`,
      `Correo electrónico: ${d.proveedor.correo || CONSIGNAR("CORREO ELECTRÓNICO")}`,
      "",
      "Autorización de notificación por correo electrónico:",
      "",
      "Autorizo que se notifiquen al correo electrónico indicado las siguientes actuaciones: solicitud de información sobre la oferta; solicitud de negociación regulada en el artículo 132 del Reglamento; solicitud de subsanación de los requisitos para perfeccionar el contrato; solicitud para presentar los documentos para perfeccionar el contrato según orden de prelación; respuesta a la solicitud de acceso al expediente de contratación; y notificación de la orden de servicio, de ser el caso.",
      "",
      "Asimismo, me comprometo a remitir la confirmación de recepción del correo electrónico, en el plazo máximo de dos días hábiles de recibida la comunicación.",
      "",
      d.ciudadFecha || CONSIGNAR("CIUDAD Y FECHA"),
      "",
      "……………………………….…………………..",
      "Firma, nombres y apellidos del postor o representante legal, según corresponda",
    ],
  };
}

function anexo2(d: DatosOfertaConsultoriaObras): AnexoGenerado {
  return {
    numero: 2,
    titulo: "Pacto de integridad",
    aplicable: true,
    parrafos: [
      "Señores",
      "EVALUADORES",
      encabezado(d),
      "Presente.-",
      "",
      `${datosPostor(d)}, en su calidad de proveedor en el ámbito de aplicación de la normativa de contratación pública, suscribo el presente Pacto de Integridad bajo los siguientes términos y condiciones:`,
      "",
      "PRIMERO: Declaro, bajo juramento, que conozco los impedimentos para ser participante, postor, contratista o subcontratista establecidos en el artículo 30 de la Ley N° 32069; que los recursos que componen mi patrimonio (o el de la persona jurídica que represento) no provienen de lavado de activos, narcotráfico, minería ilegal, financiamiento del terrorismo ni de cualquier actividad ilícita; que conozco la obligación de denunciar cualquier acto de corrupción y las medidas de protección al denunciante; que conozco el alcance de la Ley N° 28024 (gestión de intereses) y la Ley N° 31564 (prevención de conflicto de intereses); y que conozco el alcance de la cláusula anticorrupción y antisoborno del contrato.",
      "",
      "SEGUNDO: Me comprometo a mantener una conducta proba e íntegra en todas las actividades del proceso de contratación, a respetar la libre concurrencia y las condiciones de competencia efectiva, a abstenerme de ofrecer, dar o prometer regalos, cortesías u otros beneficios a funcionarios o servidores de la entidad, y a denunciar ante las autoridades competentes cualquier acto de corrupción del que tuviera conocimiento (https://denuncias.servicios.gob.pe/).",
      "",
      "TERCERO: Este pacto de integridad tiene vigencia desde su suscripción hasta la culminación de la fase de selección; y, en caso de resultar adjudicado con la buena pro, mantiene su vigencia hasta la culminación del contrato.",
      "",
      "CUARTO: Me someto a las acciones de debida diligencia, supervisión, fiscalización posterior e iniciativas de veeduría que correspondan, así como a las responsabilidades administrativas, civiles y/o penales derivadas de un eventual incumplimiento.",
      "",
      "En señal de conformidad, suscribo el presente pacto de integridad.",
      "",
      d.ciudadFecha || CONSIGNAR("CIUDAD Y FECHA"),
      "",
      "……………………………….…………………..",
      "Firma, nombres y apellidos del postor o representante legal, según corresponda",
    ],
  };
}

function anexo3(d: DatosOfertaConsultoriaObras): AnexoGenerado {
  return {
    numero: 3,
    titulo: "Declaración jurada (veracidad y no impedimento)",
    aplicable: true,
    parrafos: [
      "Señores",
      "EVALUADORES",
      encabezado(d),
      "Presente.-",
      "",
      `Mediante el presente el suscrito, postor y/o representante legal de ${d.proveedor.razonSocial || CONSIGNAR("RAZÓN SOCIAL")}, declaro bajo juramento:`,
      "",
      "• No tener impedimento para postular en el procedimiento de selección ni para contratar con el Estado, conforme al artículo 30 de la Ley N° 32069.",
      "• Conocer las sanciones contenidas en la Ley N° 32069 y su Reglamento, así como las disposiciones aplicables de la Ley N° 27444.",
      "• Participar en el presente proceso de contratación en forma independiente, sin mediar consulta, comunicación, acuerdo o convenio con ningún proveedor; y conocer las disposiciones del Decreto Legislativo Nº 1034.",
      "• Conocer, aceptar y someterme a las bases, condiciones y reglas del procedimiento de selección.",
      "• Ser responsable de la veracidad de los documentos e información que presento.",
      "• Comprometerme a mantener la oferta presentada durante el procedimiento de selección y a perfeccionar el contrato, en caso de resultar favorecido con la buena pro.",
      "",
      d.ciudadFecha || CONSIGNAR("CIUDAD Y FECHA"),
      "",
      "……………………………….…………………..",
      "Firma, nombres y apellidos del postor o representante legal, según corresponda",
    ],
  };
}

function anexo4(d: DatosOfertaConsultoriaObras): AnexoGenerado {
  if (!d.esConsorcio) {
    return {
      numero: 4,
      titulo: "Promesa de consorcio",
      aplicable: false,
      motivoNoAplicable: "Solo se presenta si el postor participa como consorcio.",
      parrafos: [],
    };
  }
  return {
    numero: 4,
    titulo: "Promesa de consorcio",
    aplicable: true,
    parrafos: [
      "Señores",
      "EVALUADORES",
      encabezado(d),
      "Presente.-",
      "",
      `Los suscritos declaramos expresamente que hemos convenido en forma irrevocable, durante el lapso que dure el procedimiento de selección, para presentar una oferta conjunta al ${encabezado(d)}.`,
      "",
      "Asimismo, en caso de obtener la buena pro, nos comprometemos a formalizar el contrato de consorcio, de conformidad con los artículos 88 y 89 del Reglamento de la Ley N° 32069, bajo las siguientes condiciones:",
      "",
      `Integrantes del consorcio: ${d.integrantesConsorcio || CONSIGNAR("NOMBRE, DENOMINACIÓN O RAZÓN SOCIAL DE CADA CONSORCIADO")}`,
      "",
      `Designamos a ${d.representanteComunConsorcio || CONSIGNAR("NOMBRES Y APELLIDOS DEL REPRESENTANTE COMÚN")} como representante común del consorcio para efectos de participar en todos los actos referidos al procedimiento de selección, suscripción y ejecución del contrato con ${d.entidad || CONSIGNAR("NOMBRE DE LA ENTIDAD")}.`,
      "",
      "Declaramos que el representante común del consorcio no se encuentra impedido, inhabilitado ni suspendido para contratar con el Estado.",
      "",
      `Domicilio legal común: ${CONSIGNAR("DOMICILIO LEGAL COMÚN")}. Correo electrónico común: ${CONSIGNAR("CORREO ELECTRÓNICO COMÚN")}.`,
      "",
      `Obligaciones de cada integrante: ${CONSIGNAR("OBLIGACIONES Y PORCENTAJE DE PARTICIPACIÓN DE CADA INTEGRANTE")}.`,
      "",
      d.ciudadFecha || CONSIGNAR("CIUDAD Y FECHA"),
    ],
  };
}

function anexo6(d: DatosOfertaConsultoriaObras): AnexoGenerado {
  return {
    numero: 6,
    titulo: "Precio de la oferta",
    aplicable: true,
    parrafos: [
      "Señores",
      "EVALUADORES",
      encabezado(d),
      "Presente.-",
      "",
      "Es grato dirigirme a usted, para hacer de su conocimiento que, de acuerdo con las bases, mi oferta es la siguiente (estructura de costo directo / gastos generales / utilidad / IGV / presupuesto ofertado, propia de consultoría de obras):",
      "",
      `Monto total de la oferta (presupuesto ofertado, incluye IGV): ${d.monedaOferta || "S/"} ${d.montoOfertaTotal || CONSIGNAR("MONTO TOTAL DE LA OFERTA")}`,
      "",
      "El precio de la oferta incluye todos los impuestos, seguros, transporte, inspecciones, pruebas y, de ser el caso, los costos laborales conforme a la legislación vigente, así como cualquier otro concepto que pueda tener incidencia sobre el costo de la contratación.",
      "",
      "Nota: la estructura detallada de costos (costo directo, gastos generales, utilidad, IGV desagregados) debe adjuntarse conforme al formato exacto que indiquen las bases particulares de este proceso — este generador no tiene acceso a esa estructura de costos de la entidad.",
      "",
      d.ciudadFecha || CONSIGNAR("CIUDAD Y FECHA"),
      "",
      "……………………………….…………………..",
      "Firma, nombres y apellidos del postor o representante legal o común, según corresponda",
    ],
    tabla: { encabezados: ["Monto total de la oferta"], filas: [[`${d.monedaOferta || "S/"} ${d.montoOfertaTotal || CONSIGNAR("MONTO")}`]] },
  };
}

const LIMITE_EXPERIENCIA_TABLA = 20;

function anexo11(d: DatosOfertaConsultoriaObras): AnexoGenerado {
  const filas = d.experienciaConsultoriaObras.slice(0, LIMITE_EXPERIENCIA_TABLA).map((e, i) => [
    String(i + 1),
    e.cliente,
    e.especialidad,
    e.consorcio ? `Consorcio (${e.porcentajeParticipacion ?? "?"}%)` : "Directa",
    e.fecha,
    e.monto.toLocaleString("es-PE"),
  ]);
  return {
    numero: 11,
    titulo: "Experiencia del postor en la especialidad",
    aplicable: true,
    parrafos: [
      "Señores",
      "EVALUADORES",
      encabezado(d),
      "Presente.-",
      "",
      "Mediante el presente, el suscrito detalla lo siguiente como EXPERIENCIA EN CONSULTORÍA DE OBRAS EN LA ESPECIALIDAD (la lista completa, con cliente/comprobante/fecha, va en la tabla adjunta — solo se consideran las veinte primeras contrataciones si se presentan más):",
      "",
      d.experienciaConsultoriaObras.length === 0
        ? "No se registró experiencia en consultoría de obras en el Perfil del proveedor — agrégala en Perfil antes de usar este anexo."
        : `${d.experienciaConsultoriaObras.length} contrato(s) de consultoría de obras registrados en el Perfil.`,
      "",
      d.ciudadFecha || CONSIGNAR("CIUDAD Y FECHA"),
      "",
      "……………………………….…………………..",
      "Firma, nombres y apellidos del postor o representante legal o común, según corresponda",
    ],
    tabla: {
      encabezados: ["N°", "Cliente", "Especialidad", "Consorcio", "Fecha", "Monto facturado (S/)"],
      filas,
    },
  };
}

function anexo13(d: DatosOfertaConsultoriaObras): AnexoGenerado {
  if (!d.gozaExoneracionIgv) {
    return {
      numero: 13,
      titulo: "Declaración jurada de cumplimiento de condiciones para la exoneración del IGV",
      aplicable: false,
      motivoNoAplicable: "Solo aplica a empresas con domicilio fiscal en la Amazonía que gozan de la exoneración del IGV bajo la Ley N° 27037.",
      parrafos: [],
    };
  }
  return {
    numero: 13,
    titulo: "Declaración jurada de cumplimiento de condiciones para la exoneración del IGV",
    aplicable: true,
    parrafos: [
      "Señores",
      "EVALUADORES",
      encabezado(d),
      "Presente.-",
      "",
      `Mediante el presente el suscrito, postor y/o representante legal de ${d.proveedor.razonSocial || CONSIGNAR("RAZÓN SOCIAL")}, declaro bajo juramento que gozo del beneficio de la exoneración del IGV previsto en la Ley Nº 27037, Ley de Promoción de la Inversión en la Amazonía, dado que cumplo con las condiciones siguientes:`,
      "",
      "1. Que el domicilio fiscal de la empresa se encuentra ubicado en la Amazonía y coincide con el lugar establecido como sede central.",
      "2. Que la empresa se encuentra inscrita en las Oficinas Registrales de la Amazonía.",
      "3. Que al menos el setenta por ciento (70%) de los activos fijos de la empresa se encuentran en la Amazonía.",
      "4. Que la empresa no tiene producción fuera de la Amazonía.",
      "",
      d.ciudadFecha || CONSIGNAR("CIUDAD Y FECHA"),
      "",
      "……………………………….…………………..",
      "Firma, nombres y apellidos del postor o representante legal, según corresponda",
    ],
  };
}

function anexo14(d: DatosOfertaConsultoriaObras): AnexoGenerado {
  if (!d.solicitaBonificacion10) {
    return {
      numero: 14,
      titulo: "Solicitud de bonificación del 10% por servicios prestados fuera de Lima y Callao",
      aplicable: false,
      motivoNoAplicable: "Solo aplica si la prestación se ejecuta fuera de Lima y Callao con una cuantía que no supere S/ 200,000 y el domicilio del postor (según el RNP) está en esa provincia o una colindante.",
      parrafos: [],
    };
  }
  return {
    numero: 14,
    titulo: "Solicitud de bonificación del 10% por servicios prestados fuera de Lima y Callao",
    aplicable: true,
    parrafos: [
      "Señores",
      "EVALUADORES",
      encabezado(d),
      "Presente.-",
      "",
      `Mediante el presente el suscrito, postor y/o representante legal de ${d.proveedor.razonSocial || CONSIGNAR("RAZÓN SOCIAL")}, solicito la asignación de la bonificación del diez por ciento (10%) sobre el puntaje total en ${d.itemBonificacion || CONSIGNAR("ÍTEM O ÍTEMS")}, debido a que el domicilio de mi representada se encuentra ubicado en la provincia o provincia colindante donde se ejecuta la prestación.`,
      "",
      d.ciudadFecha || CONSIGNAR("CIUDAD Y FECHA"),
      "",
      "……………………………….…………………..",
      "Firma, nombres y apellidos del postor o representante legal, según corresponda",
    ],
  };
}

// Anexos que solo se presentan si se resulta ganador de la buena pro (perfeccionamiento
// del contrato) — se listan para que el usuario sepa que existen y por qué no se
// generan acá, no porque falten por descuido. Numeración del documento regular (#7);
// en la versión abreviada (#8) el REDAM es Anexo 18, no 17 (ver comentario de cabecera).
export const ANEXOS_SOLO_PERFECCIONAMIENTO_CO = [
  { numero: 7, titulo: "Autorización de retención como garantía de fiel cumplimiento del contrato (no MYPE)" },
  { numero: 8, titulo: "Declaración jurada de presentación de fideicomiso como garantía de fiel cumplimiento" },
  { numero: 9, titulo: "Autorización de notificaciones durante la ejecución contractual" },
  { numero: 10, titulo: "Elección de institución arbitral" },
  { numero: 15, titulo: "Declaración jurada actualizada de desafectación de impedimento" },
  { numero: 17, titulo: "Declaración jurada sobre inaplicación del impedimento tipo 4.D (REDAM) — Anexo 18 en la versión abreviada" },
];

export const ANEXOS_NO_AUTOMATIZADOS_CO = [
  { numero: 5, titulo: "Declaración jurada de desafectación de impedimento (por parentesco)", motivo: "Requiere datos de parientes con cargo en la entidad contratante que este sistema no tiene." },
  { numero: 12, titulo: "Declaración jurada sobre experiencia proveniente de reorganización societaria", motivo: "Caso excepcional, solo aplica si la experiencia acreditada proviene de una fusión/escisión societaria." },
  { numero: 16, titulo: "Calificaciones y experiencia del personal clave (compromiso individual)", motivo: "Solo se presenta con la oferta si la entidad definió el personal clave como factor de evaluación — de lo contrario se presenta al perfeccionar el contrato. El propio documento del MEF tiene un error de copiado en este anexo (encabezado de la versión abreviada), por lo que no se automatiza." },
  { numero: 17, titulo: "Solicitud de bonificación del 5% por condición de MYPE (solo versión abreviada)", motivo: "Fuera del alcance aprobado de 8 anexos; solo existe en el documento abreviado, no en el regular." },
];

export function generarAnexosConsultoriaObras(d: DatosOfertaConsultoriaObras): AnexoGenerado[] {
  return [anexo1(d), anexo2(d), anexo3(d), anexo4(d), anexo6(d), anexo11(d), anexo13(d), anexo14(d)];
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos relacionados a este archivo (puede haber preexistentes en el proyecto — solo verificar que no se agregan nuevos).

- [ ] **Step 3: Commit**

```bash
git add src/lib/generacion-ofertas/anexos-consultoria-obras.ts
git commit -m "$(cat <<'EOF'
Add anexos oficiales de Concurso Publico para Consultoria de Obras

Mismo alcance que Obras (8 anexos autogenerados: 1,2,3,4,6,11,13,14), texto
extraido directamente del .docx real del MEF (documento #7, confirmado que
cubre la variante Consultoria de Obra). Numeracion de IGV/bonificacion
distinta a la de Obras (13/14 aca vs 13/9 en Obras) - verificado, no
asumido. Anexo 16 (personal clave) y el Anexo 17 exclusivo de la version
abreviada (bonificacion 5% MYPE) quedan fuera de este alcance por
ambiguedad/scope, documentados en ANEXOS_NO_AUTOMATIZADOS_CO.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Generalizar la UI de `automatizacion-client.tsx`

**Files:**
- Modify: `src/components/automatizacion/automatizacion-client.tsx`

**Interfaces:**
- Consumes: `generarAnexosConsultoriaObras`, `DatosOfertaConsultoriaObras`, `ANEXOS_SOLO_PERFECCIONAMIENTO_CO`, `ANEXOS_NO_AUTOMATIZADOS_CO` de Task 1; sigue consumiendo `generarAnexosObras`, `DatosOfertaObras`, `ANEXOS_SOLO_PERFECCIONAMIENTO`, `ANEXOS_NO_AUTOMATIZADOS` de `anexos-obras.ts` (sin cambios en ese archivo).
- Produces: sin cambios en la interfaz pública del componente (`AutomatizacionClient({ procesosSugeridos })`).

- [ ] **Step 1: Agregar el import y el helper de categoría**

En la sección de imports, agregar junto al import existente de `anexos-obras`:

```typescript
import {
  generarAnexosConsultoriaObras,
  ANEXOS_SOLO_PERFECCIONAMIENTO_CO,
  ANEXOS_NO_AUTOMATIZADOS_CO,
  type DatosOfertaConsultoriaObras,
} from "@/lib/generacion-ofertas/anexos-consultoria-obras";
```

Justo debajo de `type OpcionesAnexos = ...`, agregar:

```typescript
type CategoriaConAnexos = "obra" | "consultoria-obras";

function categoriaConAnexos(categoria: Proceso["categoria"]): CategoriaConAnexos | null {
  if (categoria === "Obra") return "obra";
  if (categoria === "Consultoría de Obras") return "consultoria-obras";
  return null;
}
```

- [ ] **Step 2: Reemplazar el gate de categoría en el render**

Reemplazar:

```typescript
          {proceso.categoria !== "Obra" ? (
            <UpgradeNoticeCategoria categoria={proceso.categoria} />
          ) : (
            opciones && (
              <AnexosObrasCard
                opciones={opciones}
                setOpciones={setOpciones}
                anexos={anexos}
                onGenerar={generarAnexos}
                onDescargar={descargarAnexos}
                descargando={descargandoAnexos}
                experienciaObrasCount={proveedor.experiencia.filter((e) => e.especialidad === "Obra").length}
              />
            )
          )}
```

por:

```typescript
          {(() => {
            const tipo = categoriaConAnexos(proceso.categoria);
            if (!tipo) return <UpgradeNoticeCategoria categoria={proceso.categoria} />;
            if (!opciones) return null;
            const experienciaCount = proveedor.experiencia.filter(
              (e) => e.especialidad === (tipo === "obra" ? "Obra" : "Consultoría de Obras")
            ).length;
            return (
              <AnexosCard
                tituloDocumento={
                  tipo === "obra"
                    ? "Anexos de la oferta (Licitación de obras)"
                    : "Anexos de la oferta (Concurso público de Consultoría de Obra)"
                }
                subtitleDocumento={
                  tipo === "obra"
                    ? "Bases Estándar vigentes bajo la Ley N° 32069 — Directiva N° 0005-2025-EF/54.01 del MEF, modificada por la R.D. N° 0001-2026-EF/54.01"
                    : "Bases Estándar de Concurso Público para Consultorías y Servicios de Mantenimiento Vial (variante Consultoría de Obra), vigentes bajo la Ley N° 32069 — misma Directiva N° 0005-2025-EF/54.01, modificada por la R.D. N° 0001-2026-EF/54.01"
                }
                opcionesLicitacion={
                  tipo === "obra"
                    ? { regular: "Licitación pública de obras", abreviada: "Licitación pública abreviada de obras" }
                    : { regular: "Concurso público para consultoría de obra", abreviada: "Concurso público abreviado para consultoría de obra" }
                }
                opciones={opciones}
                setOpciones={setOpciones}
                anexos={anexos}
                onGenerar={() => generarAnexos(tipo)}
                onDescargar={descargarAnexos}
                descargando={descargandoAnexos}
                experienciaCount={experienciaCount}
                anexosSoloPerfeccionamiento={tipo === "obra" ? ANEXOS_SOLO_PERFECCIONAMIENTO : ANEXOS_SOLO_PERFECCIONAMIENTO_CO}
                anexosNoAutomatizados={tipo === "obra" ? ANEXOS_NO_AUTOMATIZADOS : ANEXOS_NO_AUTOMATIZADOS_CO}
              />
            );
          })()}
```

- [ ] **Step 3: Actualizar `generarAnexos` para que reciba el tipo y arme los datos correctos**

Reemplazar la función `generarAnexos` existente:

```typescript
  const generarAnexos = () => {
    if (!proceso || !opciones) return;
    const experienciaObras = proveedor.experiencia.filter((e) => e.especialidad === "Obra");
    const datos: DatosOfertaObras = {
      ...opciones,
      nomenclatura: proceso.objeto,
      entidad: proceso.entidad,
      proveedor: {
        razonSocial: proveedor.razonSocial,
        ruc: proveedor.ruc,
        representanteLegal: proveedor.representanteLegal,
        dniRepresentante: proveedor.dniRepresentante,
        correo: proveedor.correo,
      },
      experienciaObras,
    };
    setAnexos(generarAnexosObras(datos));
  };
```

por:

```typescript
  const generarAnexos = (tipo: CategoriaConAnexos) => {
    if (!proceso || !opciones) return;
    const datosBase = {
      ...opciones,
      nomenclatura: proceso.objeto,
      entidad: proceso.entidad,
      proveedor: {
        razonSocial: proveedor.razonSocial,
        ruc: proveedor.ruc,
        representanteLegal: proveedor.representanteLegal,
        dniRepresentante: proveedor.dniRepresentante,
        correo: proveedor.correo,
      },
    };
    if (tipo === "obra") {
      const datos: DatosOfertaObras = {
        ...datosBase,
        experienciaObras: proveedor.experiencia.filter((e) => e.especialidad === "Obra"),
      };
      setAnexos(generarAnexosObras(datos));
    } else {
      const datos: DatosOfertaConsultoriaObras = {
        ...datosBase,
        experienciaConsultoriaObras: proveedor.experiencia.filter((e) => e.especialidad === "Consultoría de Obras"),
      };
      setAnexos(generarAnexosConsultoriaObras(datos));
    }
  };
```

- [ ] **Step 4: Renombrar y parametrizar `AnexosObrasCard` → `AnexosCard`**

Reemplazar la firma y el `CardHeader` de `AnexosObrasCard`:

```typescript
function AnexosObrasCard({
  opciones,
  setOpciones,
  anexos,
  onGenerar,
  onDescargar,
  descargando,
  experienciaObrasCount,
}: {
  opciones: OpcionesAnexos;
  setOpciones: (o: OpcionesAnexos) => void;
  anexos: AnexoGenerado[] | null;
  onGenerar: () => void;
  onDescargar: (formato: "word" | "excel") => void;
  descargando: "word" | "excel" | null;
  experienciaObrasCount: number;
}) {
  const aplicables = anexos?.filter((a) => a.aplicable) ?? [];
  const noAplicables = anexos?.filter((a) => !a.aplicable) ?? [];

  return (
    <Card>
      <CardHeader
        title="Anexos de la oferta (Licitación de obras)"
        subtitle="Bases Estándar vigentes bajo la Ley N° 32069 — Directiva N° 0005-2025-EF/54.01 del MEF, modificada por la R.D. N° 0001-2026-EF/54.01"
      />
```

por:

```typescript
function AnexosCard({
  tituloDocumento,
  subtitleDocumento,
  opcionesLicitacion,
  opciones,
  setOpciones,
  anexos,
  onGenerar,
  onDescargar,
  descargando,
  experienciaCount,
  anexosSoloPerfeccionamiento,
  anexosNoAutomatizados,
}: {
  tituloDocumento: string;
  subtitleDocumento: string;
  opcionesLicitacion: { regular: string; abreviada: string };
  opciones: OpcionesAnexos;
  setOpciones: (o: OpcionesAnexos) => void;
  anexos: AnexoGenerado[] | null;
  onGenerar: () => void;
  onDescargar: (formato: "word" | "excel") => void;
  descargando: "word" | "excel" | null;
  experienciaCount: number;
  anexosSoloPerfeccionamiento: { numero: number; titulo: string }[];
  anexosNoAutomatizados: { numero: number; titulo: string; motivo: string }[];
}) {
  const aplicables = anexos?.filter((a) => a.aplicable) ?? [];
  const noAplicables = anexos?.filter((a) => !a.aplicable) ?? [];

  return (
    <Card>
      <CardHeader title={tituloDocumento} subtitle={subtitleDocumento} />
```

Dentro del mismo componente, reemplazar las opciones hardcodeadas del `<select>` de tipo de licitación:

```typescript
              <option value="regular">Licitación pública de obras</option>
              <option value="abreviada">Licitación pública abreviada de obras</option>
```

por:

```typescript
              <option value="regular">{opcionesLicitacion.regular}</option>
              <option value="abreviada">{opcionesLicitacion.abreviada}</option>
```

Reemplazar el texto de experiencia (usa `experienciaObrasCount`, pasa a `experienciaCount`):

```typescript
        <p className="text-xs text-slate-400">
          Experiencia en Obra registrada en tu Perfil para el Anexo N° 11: {experienciaObrasCount}{" "}
          contrato(s).
        </p>
```

por:

```typescript
        <p className="text-xs text-slate-400">
          Experiencia registrada en tu Perfil para el Anexo N° 11: {experienciaCount} contrato(s).
        </p>
```

Y, en la sección final del componente (listas de "solo perfeccionamiento" / "no automatizados"), reemplazar los usos de `ANEXOS_SOLO_PERFECCIONAMIENTO`/`ANEXOS_NO_AUTOMATIZADOS` (importados a nivel de módulo) por los props `anexosSoloPerfeccionamiento`/`anexosNoAutomatizados`:

```typescript
                {ANEXOS_SOLO_PERFECCIONAMIENTO.map((a) => (
```
→
```typescript
                {anexosSoloPerfeccionamiento.map((a) => (
```

```typescript
                {ANEXOS_NO_AUTOMATIZADOS.map((a) => (
```
→
```typescript
                {anexosNoAutomatizados.map((a) => (
```

- [ ] **Step 5: Actualizar el import de `anexos-obras` para no traer los arrays estáticos si ya no se usan directamente en el módulo**

Revisar el import existente:

```typescript
import {
  generarAnexosObras,
  ANEXOS_SOLO_PERFECCIONAMIENTO,
  ANEXOS_NO_AUTOMATIZADOS,
  type AnexoGenerado,
  type DatosOfertaObras,
} from "@/lib/generacion-ofertas/anexos-obras";
```

Se mantiene igual — `ANEXOS_SOLO_PERFECCIONAMIENTO`/`ANEXOS_NO_AUTOMATIZADOS` ahora se usan solo dentro del `(() => {...})()` del Step 2 (pasados como props), lo cual sigue siendo un uso válido del import a nivel de módulo. No quitar el import.

- [ ] **Step 6: Actualizar el texto de `UpgradeNoticeCategoria`**

Reemplazar:

```typescript
function UpgradeNoticeCategoria({ categoria }: { categoria: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-slate-600">
      Los anexos oficiales automáticos (Bases Estándar de Licitación Pública de Obras, Ley N°
      32069) solo están implementados para procesos de categoría <strong>Obra</strong> — este
      proceso es de categoría <strong>{categoria}</strong>. Las bases estándar de Bienes,
      Servicios y Consultoría todavía no están cargadas en la plataforma.
    </div>
  );
}
```

por:

```typescript
function UpgradeNoticeCategoria({ categoria }: { categoria: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-slate-600">
      Los anexos oficiales automáticos (Bases Estándar bajo la Ley N° 32069) solo están
      implementados para procesos de categoría <strong>Obra</strong> y{" "}
      <strong>Consultoría de Obras</strong> — este proceso es de categoría{" "}
      <strong>{categoria}</strong>. Las bases estándar de Bienes y Servicios todavía no están
      cargadas en la plataforma.
    </div>
  );
}
```

- [ ] **Step 7: Verificar tipos y lint**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

Run: `npm run lint`
Expected: sin errores nuevos en `automatizacion-client.tsx`.

- [ ] **Step 8: Commit**

```bash
git add src/components/automatizacion/automatizacion-client.tsx
git commit -m "$(cat <<'EOF'
Generalizar AnexosObrasCard a AnexosCard para cubrir Consultoria de Obras

AnexosObrasCard -> AnexosCard, parametrizado por titulo/subtitulo del
documento, labels de tipo de licitacion, y las listas de anexos
perfeccionamiento/no-automatizados - los campos de opciones (consorcio,
IGV, bonificacion10, moneda, monto, ciudad/fecha) eran identicos entre
Obras y Consultoria de Obras, asi que se evita duplicar ~250 lineas de
JSX. generarAnexos() ahora arma DatosOfertaObras o
DatosOfertaConsultoriaObras segun la categoria del proceso elegido.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Corregir el texto hardcodeado de "Licitación de Obras" en el export a Word

**Files:**
- Modify: `src/app/api/generar-oferta/anexos-docx/route.ts:73-78`

**Interfaces:**
- Consumes: `proceso.categoria` (ya viaja en el body, tipo `ProcesoResumen.categoria: string`, sin cambios de tipo).
- Produces: sin cambios de firma.

- [ ] **Step 1: Reemplazar el párrafo hardcodeado**

Reemplazar:

```typescript
    new Paragraph({
      children: [
        new TextRun({
          text: "Prellenado con datos del Perfil del proveedor a partir de las Bases Estándar de Licitación Pública de Obras vigentes bajo la Ley N° 32069 (Directiva N° 0005-2025-EF/54.01 del MEF, modificada por la Resolución Directoral N° 0001-2026-EF/54.01). Los campos entre corchetes [CONSIGNAR ...] no se pudieron completar automáticamente — revísalos y complétalos a mano antes de presentar la oferta.",
          italics: true,
        }),
      ],
    }),
```

por:

```typescript
    new Paragraph({
      children: [
        new TextRun({
          text: `Prellenado con datos del Perfil del proveedor a partir de las Bases Estándar de ${proceso.categoria === "Obra" ? "Licitación Pública de Obras" : "Concurso Público de Consultoría de Obra"} vigentes bajo la Ley N° 32069 (Directiva N° 0005-2025-EF/54.01 del MEF, modificada por la Resolución Directoral N° 0001-2026-EF/54.01). Los campos entre corchetes [CONSIGNAR ...] no se pudieron completar automáticamente — revísalos y complétalos a mano antes de presentar la oferta.`,
          italics: true,
        }),
      ],
    }),
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/generar-oferta/anexos-docx/route.ts
git commit -m "$(cat <<'EOF'
Fix: el export a Word ya no asume que todo anexo es de Licitacion de Obras

El texto introductorio del .docx exportado decia siempre "Bases Estandar
de Licitacion Publica de Obras" sin importar la categoria real del
proceso - quedo hardcodeado desde que solo existia esa categoria. Ahora
depende de proceso.categoria.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Verificación manual end-to-end y actualización de `CLAUDE.md`

**Files:**
- No se crean ni modifican archivos de código — solo verificación manual y `CLAUDE.md`.

- [ ] **Step 1: Levantar el dev server local**

Run: `npm run dev` (usar el Browser pane del harness, no `vercel deploy` — ver `CLAUDE.md`, sección Despliegue)

- [ ] **Step 2: Verificar la categoría Obra sigue funcionando (regresión)**

En `/automatizacion`, elegir un proceso de categoría `Obra` (del "lote actual" o buscándolo), generar los anexos, confirmar que la tarjeta muestra "Anexos de la oferta (Licitación de obras)" y que los 8 anexos aparecen con el mismo contenido de antes.

- [ ] **Step 3: Verificar la categoría Consultoría de Obras (nuevo)**

Elegir o buscar un proceso de categoría `Consultoría de Obras` (ej. supervisión de obra, elaboración de expediente técnico). Confirmar:
- La tarjeta muestra "Anexos de la oferta (Concurso público de Consultoría de Obra)".
- El selector de tipo de procedimiento muestra "Concurso público para consultoría de obra" / "Concurso público abreviado para consultoría de obra".
- Al generar, aparecen los 8 anexos (1,2,3,4,6,11,13,14) con numeración correcta — en particular confirmar que el Anexo 13 dice IGV y el Anexo 14 dice bonificación 10% (no al revés, que sería la numeración de Obras).
- El Anexo 11 usa la experiencia del Perfil filtrada por "Consultoría de Obras" (si el perfil demo no tiene, debe decir "No se registró experiencia... agrégala en Perfil").
- Los botones "Descargar Word" y "Descargar Excel" generan archivos sin error 500, y el .docx dice "Bases Estándar de Concurso Público de Consultoría de Obra" (no "Licitación Pública de Obras").

- [ ] **Step 4: Verificar categorías sin cobertura (Bienes/Servicios) siguen mostrando el aviso correcto**

Elegir un proceso de categoría `Bienes` o `Servicios`, confirmar que el aviso ahora dice "...están implementados para procesos de categoría Obra y Consultoría de Obras... Las bases estándar de Bienes y Servicios todavía no están cargadas."

- [ ] **Step 5: Revisar consola del navegador sin errores nuevos**

Usar `read_console_messages` (o el tab de consola del navegador) con `onlyErrors: true` en las 3 categorías probadas.

- [ ] **Step 6: Actualizar `CLAUDE.md`**

Agregar una entrada a la sección "Anexos oficiales de licitación de obras (Generación de ofertas)" (renombrar el título de la sección para reflejar que ya no es solo obras, o agregar un párrafo nuevo inmediatamente después) documentando:
- Que ahora también cubre `Consultoría de Obras`, con el mismo alcance de 8 anexos, usando el documento #7/#8 del MEF (Concurso Público de Consultorías y Servicios de Mantenimiento Vial, variante Consultoría de Obra).
- La numeración distinta de IGV/bonificación 10% respecto a Obras (13/14 acá vs 13/9 en Obras).
- Que el Anexo 16 (personal clave) y el Anexo 17 exclusivo de la abreviada (bonificación 5% MYPE) quedan pendientes, documentados en `ANEXOS_NO_AUTOMATIZADOS_CO`.
- Que Bienes y Servicios siguen sin cobertura.
- Actualizar la sección "Módulos construidos" si menciona "licitación de obras" específicamente, para que diga "licitación de obras y consultoría de obras".

- [ ] **Step 7: Commit de `CLAUDE.md`**

```bash
git add CLAUDE.md
git commit -m "$(cat <<'EOF'
Actualizar CLAUDE.md: anexos de Consultoria de Obras verificados end-to-end

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes (para quien ejecute el plan)

- **Cobertura del spec:** Task 1 cubre "8 anexos autogenerados" y "Anexo 16 no automatizado" del spec. Task 2 cubre "gate de categoría + AnexosCard parametrizado" del spec. Task 3 cubre el ajuste del export a Word mencionado en el spec. Task 4 cubre la verificación manual y el hallazgo del Anexo 17 exclusivo de la abreviada (documentado en el spec como riesgo a confirmar durante la implementación — ya confirmado en la investigación previa a este plan, ver `docs/superpowers/specs/2026-07-31-anexos-consultoria-obras-design.md`).
- **Consistencia de tipos:** `especialidad` en `ExperienciaProveedor` es del tipo `Categoria` (`"Obra" | "Bienes" | "Servicios" | "Consultoría de Obras"`, ver `src/lib/data/types.ts:5,119`) — el filtro usa `"Consultoría de Obras"` (con mayúscula y plural), no `"Consultoría de obra"` (que es un valor de `Subcategoria`, un tipo distinto). Verificar que ningún paso del plan haya mezclado ambos.
- **Excel route:** no requiere cambios — ya es genérico (confirmado, sin texto hardcodeado de "Obras").
