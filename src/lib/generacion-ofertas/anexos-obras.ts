import type { ExperienciaProveedor, Proveedor } from "@/lib/data/types";

// Anexos oficiales para Licitación Pública de Obras / Licitación Pública Abreviada de
// Obras, bajo la Ley N° 32069 (Ley General de Contrataciones Públicas). Texto extraído
// directamente de las "Bases Estándar" vigentes publicadas por el MEF (Dirección
// General de Abastecimiento), aprobadas por la Directiva N° 0005-2025-EF/54.01 y
// modificadas por la Resolución Directoral N° 0001-2026-EF/54.01
// (https://www.gob.pe/institucion/mef/normas-legales/7614342-001-2026-ef-54-01):
//   - https://www.mef.gob.pe/contenidos/archivos-descarga/3_Bases_estandar_de_Licitacion_publica_de_obras.docx
//   - https://www.mef.gob.pe/contenidos/archivos-descarga/4_Bases_estandar_de_Licitacion_publica_abreviada_de_obras.docx
// Confirmado con ambos documentos: la numeración y el título de los 17 anexos es
// IDÉNTICA entre la versión regular y la abreviada — no asumido, verificado extrayendo
// el texto de los dos .docx. La Ley N° 32069 reemplazó a la Ley N° 30225 (cuya
// numeración de anexos NO es la misma y no debe usarse como referencia).
//
// Del capítulo "CONTENIDO DE LAS OFERTAS" de las propias bases estándar (idéntico en
// ambos documentos), los anexos que se presentan CON LA OFERTA (no en el
// perfeccionamiento del contrato, que solo aplica si ganas la buena pro) son:
//   Obligatorios: Anexo 1, Anexo 2, Anexo 3, Anexo 4 (solo si es consorcio), Anexo 6.
//   Para acreditar Requisitos de Calificación: Anexo 11 (experiencia).
//   Facultativos/condicionales: Anexo 9 (bonificación 10%, solo obras fuera de Lima y
//   Callao ≤ S/ 900,000), Anexo 13 (exoneración IGV Amazonía).
// Los Anexos 7, 8, 10, 12, 14, 16 y 17 son "documento a presentar para el
// perfeccionamiento del contrato" — es decir, SOLO si resultas ganador de la buena
// pro, no al momento de postular — por eso no están en este generador de ofertas.
// El Anexo 5 (desafectación de impedimento por parentesco) y el 15 (reorganización
// societaria) son casos excepcionales que requieren datos que este sistema no tiene
// (parientes con cargo en la entidad, historial societario) — no se generan.

export interface DatosOfertaObras {
  nomenclatura: string;
  entidad: string;
  tipoLicitacion: "regular" | "abreviada";
  proveedor: Pick<Proveedor, "razonSocial" | "ruc" | "representanteLegal" | "dniRepresentante" | "correo">;
  experienciaObras: ExperienciaProveedor[];
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

export interface AnexoGenerado {
  numero: number;
  titulo: string;
  aplicable: boolean;
  motivoNoAplicable?: string;
  parrafos: string[];
  tabla?: { encabezados: string[]; filas: string[][] };
}

const CONSIGNAR = (campo: string) => `[CONSIGNAR ${campo}]`;

function encabezado(d: DatosOfertaObras): string {
  const tipo = d.tipoLicitacion === "abreviada" ? "LICITACIÓN PÚBLICA ABREVIADA DE OBRAS" : "LICITACIÓN PÚBLICA DE OBRAS";
  return `${tipo} Nº ${d.nomenclatura || CONSIGNAR("NOMENCLATURA DEL PROCEDIMIENTO DE SELECCIÓN")}`;
}

function datosPostor(d: DatosOfertaObras): string {
  const nombre = d.proveedor.representanteLegal || CONSIGNAR("NOMBRES Y APELLIDOS DEL REPRESENTANTE LEGAL");
  const razonSocial = d.proveedor.razonSocial || CONSIGNAR("RAZÓN SOCIAL");
  const dni = d.proveedor.dniRepresentante || CONSIGNAR("NÚMERO DE DOCUMENTO DE IDENTIDAD");
  return `El que se suscribe, ${nombre}, postor y/o representante legal de ${razonSocial}, identificado con Documento Nacional de Identidad N° ${dni}, con poder inscrito en la localidad de ${CONSIGNAR("LOCALIDAD")} en la Ficha Nº ${CONSIGNAR("FICHA")} Asiento Nº ${CONSIGNAR("ASIENTO")}`;
}

function anexo1(d: DatosOfertaObras): AnexoGenerado {
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
      "Autorización de notificación por correo electrónico:",
      "",
      "Autorizo que se notifiquen al correo electrónico indicado las siguientes actuaciones: solicitud de la descripción a detalle de todos los elementos constitutivos de la oferta; solicitud de negociación regulada en el numeral 167.4 del artículo 167 del Reglamento de la Ley N° 32069; solicitud de subsanación de los requisitos para perfeccionar el contrato; solicitud para presentar los documentos para perfeccionar el contrato, según orden de prelación; y respuesta a la solicitud de acceso al expediente de contratación.",
      "",
      `Correo electrónico: ${d.proveedor.correo || CONSIGNAR("CORREO ELECTRÓNICO")}`,
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

function anexo2(d: DatosOfertaObras): AnexoGenerado {
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
      "PRIMERO: Declaro, bajo juramento, que conozco los impedimentos para ser participante, postor, contratista o subcontratista establecidos en el artículo 30 de la Ley N° 32069; que los recursos que componen mi patrimonio (o el de la persona jurídica que represento) no provienen de lavado de activos, narcotráfico, minería ilegal, financiamiento del terrorismo ni de cualquier actividad ilícita; que conozco la obligación de denunciar cualquier acto de corrupción; y que conozco el alcance de la cláusula anticorrupción y antisoborno del contrato.",
      "",
      "SEGUNDO: Me comprometo a mantener una conducta proba e íntegra en todas las actividades del proceso de contratación, abstenerme de ofrecer, dar o prometer regalos, cortesías u otros beneficios a funcionarios o servidores de la entidad, y a denunciar ante las autoridades competentes cualquier acto de corrupción del que tuviera conocimiento (https://denuncias.servicios.gob.pe/).",
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

function anexo3(d: DatosOfertaObras): AnexoGenerado {
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

function anexo4(d: DatosOfertaObras): AnexoGenerado {
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
      `Los suscritos declaramos expresamente que hemos convenido en forma irrevocable, durante el lapso que dure el procedimiento de selección, para presentar una oferta conjunta a la ${encabezado(d)}.`,
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

function anexo6(d: DatosOfertaObras): AnexoGenerado {
  return {
    numero: 6,
    titulo: "Oferta económica",
    aplicable: true,
    parrafos: [
      "Señores",
      "EVALUADORES",
      encabezado(d),
      "Presente.-",
      "",
      "Es grato dirigirme a usted, para hacer de su conocimiento que, de acuerdo con las bases y demás documentos del procedimiento de la referencia, mi oferta es la siguiente:",
      "",
      `Monto total de la oferta: ${d.monedaOferta || "S/"} ${d.montoOfertaTotal || CONSIGNAR("MONTO TOTAL DE LA OFERTA")}`,
      "",
      "El precio de la oferta incluye todos los tributos, seguros, transporte, inspecciones, pruebas y, de ser el caso, los costos laborales conforme a la legislación vigente, así como cualquier otro concepto que pueda tener incidencia sobre el costo de la obra a ejecutar; excepto la de aquellos postores que gocen de alguna exoneración legal, quienes no incluirán en el precio de su oferta los tributos respectivos.",
      "",
      "Nota: la estructura detallada del presupuesto de obra (partidas, precios unitarios o suma alzada según corresponda) debe extraerse del expediente técnico de la entidad y adjuntarse conforme al formato exacto que indiquen las bases particulares de este proceso — este generador no tiene acceso a ese expediente técnico.",
      "",
      d.ciudadFecha || CONSIGNAR("CIUDAD Y FECHA"),
      "",
      "……………………………….…………………..",
      "Firma, nombres y apellidos del postor o representante legal o común, según corresponda",
    ],
    tabla: { encabezados: ["Monto total de la oferta"], filas: [[`${d.monedaOferta || "S/"} ${d.montoOfertaTotal || CONSIGNAR("MONTO")}`]] },
  };
}

function anexo9(d: DatosOfertaObras): AnexoGenerado {
  if (!d.solicitaBonificacion10) {
    return {
      numero: 9,
      titulo: "Solicitud de bonificación del 10% por obras ejecutadas fuera de Lima y Callao",
      aplicable: false,
      motivoNoAplicable: "Solo aplica si la obra se ejecuta fuera de Lima y Callao con una cuantía que no supere S/ 900,000 y el domicilio del postor está en esa provincia o una colindante.",
      parrafos: [],
    };
  }
  return {
    numero: 9,
    titulo: "Solicitud de bonificación del 10% por obras ejecutadas fuera de Lima y Callao",
    aplicable: true,
    parrafos: [
      "Señores",
      "EVALUADORES",
      encabezado(d),
      "Presente.-",
      "",
      `Mediante el presente el suscrito, postor y/o representante legal de ${d.proveedor.razonSocial || CONSIGNAR("RAZÓN SOCIAL")}, solicito la asignación de la bonificación del diez por ciento (10%) sobre el puntaje total en ${d.itemBonificacion || CONSIGNAR("ÍTEM O TRAMO")}, debido a que el domicilio de mi representada se encuentra ubicado en la provincia o provincia colindante donde se ejecuta la obra.`,
      "",
      d.ciudadFecha || CONSIGNAR("CIUDAD Y FECHA"),
      "",
      "……………………………….…………………..",
      "Firma, nombres y apellidos del postor o representante legal, según corresponda",
    ],
  };
}

function anexo11(d: DatosOfertaObras): AnexoGenerado {
  const filas = d.experienciaObras.map((e, i) => [
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
      "Mediante el presente, el suscrito detalla lo siguiente como EXPERIENCIA EN OBRAS DE LA ESPECIALIDAD (la lista completa, con cliente/comprobante/fecha, va en la tabla adjunta — solo se consideran las veinte primeras contrataciones si se presentan más):",
      "",
      d.experienciaObras.length === 0
        ? "No se registró experiencia en obras en el Perfil del proveedor — agrégala en Perfil antes de usar este anexo."
        : `${d.experienciaObras.length} contrato(s) de obra registrados en el Perfil.`,
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

function anexo13(d: DatosOfertaObras): AnexoGenerado {
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

// Anexos que solo se presentan si se resulta ganador de la buena pro (perfeccionamiento
// del contrato) — se listan para que el usuario sepa que existen y por qué no se
// generan acá, no porque falten por descuido.
export const ANEXOS_SOLO_PERFECCIONAMIENTO = [
  { numero: 7, titulo: "Autorización de retención como garantía de fiel cumplimiento del contrato (no MYPE)" },
  { numero: 8, titulo: "Declaración jurada de presentación de fideicomiso como garantía de fiel cumplimiento" },
  { numero: 10, titulo: "Elección de institución arbitral" },
  { numero: 12, titulo: "Autorización de notificaciones durante la ejecución contractual" },
  { numero: 14, titulo: "Declaración jurada actualizada de desafectación de impedimento" },
  { numero: 16, titulo: "Declaración jurada sobre inaplicación del impedimento tipo 4.D (REDAM)" },
  { numero: 17, titulo: "Elección de centro de administración de la JPRD" },
];

export const ANEXOS_NO_AUTOMATIZADOS = [
  { numero: 5, titulo: "Declaración jurada de desafectación de impedimento (por parentesco)", motivo: "Requiere datos de parientes con cargo en la entidad contratante que este sistema no tiene." },
  { numero: 15, titulo: "Declaración jurada sobre experiencia proveniente de reorganización societaria", motivo: "Caso excepcional, solo aplica si la experiencia acreditada proviene de una fusión/escisión societaria." },
];

export function generarAnexosObras(d: DatosOfertaObras): AnexoGenerado[] {
  return [anexo1(d), anexo2(d), anexo3(d), anexo4(d), anexo6(d), anexo9(d), anexo11(d), anexo13(d)];
}
