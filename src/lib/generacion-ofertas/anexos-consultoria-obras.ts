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
//
// El umbral de S/ 200,000 del Anexo 14 (bonificación 10%, distinto de los S/ 900,000 de
// Obras) está confirmado por el mismo documento #7, numeral 75.6 del artículo 75 del
// Reglamento: "...no supere los doscientos mil y 00/100 soles (S/ 200 000,00) para la
// contratación de servicios en general y consultorías, y no superen los novecientos mil
// y 00/100 soles (S/ 900 000,00) en el caso de obras...".

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
