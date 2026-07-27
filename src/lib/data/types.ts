// Tipos de dominio de Urban Procura.
// Estos tipos son el contrato entre la capa de datos (mock hoy, live a futuro)
// y la UI. No deben depender de si el dato viene de fixtures o de una API real.

export type Categoria = "Obra" | "Bienes" | "Servicios" | "Consultoría de Obras";

export type Subcategoria =
  | "Elaboración de expediente técnico"
  | "Supervisión de expediente técnico"
  | "Supervisión de obra"
  | "Consultoría de obra"
  | "Ejecución de obra"
  | "Suministro de bienes"
  | "Servicio general";

// Opciones curadas para preferencias/filtros. Los procesos reales del OECE traen
// su propio texto libre de procedimiento (ver Proceso.tipoProcedimiento) que no
// siempre calza exacto con esta lista — es normal, son de épocas/normas distintas.
export type TipoProcedimiento =
  | "Licitación Pública"
  | "Concurso Público"
  | "Adjudicación Simplificada"
  | "Selección de Consultores Individuales"
  | "Comparación de Precios"
  | "Subasta Inversa Electrónica";

export type EstadoProceso =
  | "Convocado"
  | "En proceso de selección"
  | "Buena pro otorgada"
  | "Nulo"
  | "Desierto";

export type Region =
  | "Amazonas"
  | "Áncash"
  | "Apurímac"
  | "Arequipa"
  | "Ayacucho"
  | "Cajamarca"
  | "Callao"
  | "Cusco"
  | "Huancavelica"
  | "Huánuco"
  | "Ica"
  | "Junín"
  | "La Libertad"
  | "Lambayeque"
  | "Lima"
  | "Loreto"
  | "Madre de Dios"
  | "Moquegua"
  | "Pasco"
  | "Piura"
  | "Puno"
  | "San Martín"
  | "Tacna"
  | "Tumbes"
  | "Ucayali"
  | "Otro";

export interface DocumentoProceso {
  tipo: string;
  disponible: boolean;
  url: string;
}

export interface EtapaCronograma {
  etapa: string;
  fecha: string; // ISO date
}

export interface Proceso {
  id: string;
  entidad: string;
  region: Region;
  objeto: string;
  descripcion: string;
  categoria: Categoria;
  subcategoria: Subcategoria;
  /** Texto libre: en datos reales viene tal cual lo publica la entidad, no siempre calza con TipoProcedimiento. */
  tipoProcedimiento: string;
  estado: EstadoProceso;
  monedaSimbolo: "S/";
  montoReferencial: number;
  fechaPublicacion: string; // ISO date
  fechaLimitePresentacion: string; // ISO date
  experienciaMinimaRequerida: number; // monto mínimo facturado acumulado exigido; 0 = no especificado en la fuente
  especialistasRequeridos: string[];
  documentos: DocumentoProceso[];
  cronograma: EtapaCronograma[];
  riesgos: string[];
  /** Si viene del Portal de Contrataciones Abiertas del OECE en vivo, o es dato de muestra. */
  fuente?: "mock" | "live";
  /** Link al proceso original en el Portal de Contrataciones Abiertas (solo si fuente === "live"). */
  fuenteUrl?: string;
  /** Solo si el proceso ya tiene buena pro otorgada y la fuente publicó al ganador. */
  adjudicacion?: {
    proveedorGanador: string;
    montoAdjudicado: number;
  };
}

export interface DocumentoExperiencia {
  nombre: string;
  url: string;
}

export interface ExperienciaProveedor {
  id: string;
  cliente: string;
  objeto: string;
  especialidad: Categoria;
  monto: number;
  fecha: string; // ISO date
  consorcio: boolean;
  porcentajeParticipacion?: number; // solo si consorcio
  contratoAdjunto: boolean;
  conformidadAdjunta: boolean;
  /** Documentos reales (PDF) cuando la experiencia se importó del SEACE. */
  documentos?: DocumentoExperiencia[];
  fuente?: "manual" | "seace" | "rnp";
}

/** Archivo real adjuntado desde el navegador (sin backend/S3 todavía, así que el
 * contenido se guarda como data URL en localStorage — funciona para archivos chicos,
 * no para adjuntar libremente PDFs pesados). */
export interface DocumentoAdjunto {
  id: string;
  nombre: string;
  tipo: string; // MIME type
  tamano: number; // bytes
  dataUrl: string;
}

export interface PersonalClave {
  id: string;
  nombre: string;
  cargo: string;
  colegiatura: string;
  cvAdjunto: boolean;
  certificados: string[];
  documentos?: DocumentoAdjunto[];
}

export interface Equipo {
  id: string;
  tipo: string;
  descripcion: string;
  cantidad: number;
  propio: boolean;
  documentos?: DocumentoAdjunto[];
}

export interface DocumentoRepositorio {
  id: string;
  nombre: string;
  categoria: "Legal" | "Tributario" | "RNP" | "Declaraciones" | "Cartas" | "Certificados";
  fechaVigencia?: string;
}

export type CategoriaRnp = "bienes" | "servicios" | "consultoriaObras" | "ejecucionObras";

export interface EstadoRnp {
  vigente: boolean;
  numeroPartida: string;
  especialidades: string[];
  capacidades: Record<
    CategoriaRnp,
    { habilitado: boolean; capacidadMaxima: number; capacidadLibre: number }
  >;
  /** Capacidad máxima de contratación general reportada por el RNP (sin desagregar por categoría). */
  capacidadMaximaGeneral?: number | null;
}

export function crearRnpVacio(): EstadoRnp {
  return {
    vigente: false,
    numeroPartida: "",
    especialidades: [],
    capacidades: {
      bienes: { habilitado: false, capacidadMaxima: 0, capacidadLibre: 0 },
      servicios: { habilitado: false, capacidadMaxima: 0, capacidadLibre: 0 },
      consultoriaObras: { habilitado: false, capacidadMaxima: 0, capacidadLibre: 0 },
      ejecucionObras: { habilitado: false, capacidadMaxima: 0, capacidadLibre: 0 },
    },
    capacidadMaximaGeneral: null,
  };
}

export type PlanComercial = "free" | "basico" | "profesional" | "premium";

export interface PreferenciasProveedor {
  rubros: Categoria[];
  entidadesObjetivo: string[];
  regionesObjetivo: Region[];
  montoMinimo: number;
  montoMaximo: number;
  palabrasClave: string[];
  tiposProcedimiento: TipoProcedimiento[];
}

export interface Proveedor {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  representanteLegal: string;
  dniRepresentante: string;
  correo: string;
  telefono: string;
  direccion: string;
  plan: PlanComercial;
  rnp: EstadoRnp;
  experiencia: ExperienciaProveedor[];
  personalClave: PersonalClave[];
  equipamiento: Equipo[];
  documentosRepositorio: DocumentoRepositorio[];
  preferencias: PreferenciasProveedor;
}

export type NivelMatch = "alto" | "medio" | "bajo";

export interface ResultadoMatch {
  score: number; // 0-100
  nivel: NivelMatch;
  coincidencias: string[];
  faltantes: string[];
}

export type EstadoOportunidad =
  | "revisar"
  | "interesado"
  | "descartado"
  | "preparando_oferta"
  | "oferta_presentada"
  | "buena_pro"
  | "no_adjudicado";

export const ESTADOS_OPORTUNIDAD: { value: EstadoOportunidad; label: string }[] = [
  { value: "revisar", label: "Por revisar" },
  { value: "interesado", label: "Interesado" },
  { value: "descartado", label: "Descartado" },
  { value: "preparando_oferta", label: "Preparando oferta" },
  { value: "oferta_presentada", label: "Oferta presentada" },
  { value: "buena_pro", label: "Buena pro" },
  { value: "no_adjudicado", label: "No adjudicado" },
];
