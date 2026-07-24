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
  | "Lima"
  | "La Libertad"
  | "Piura"
  | "Arequipa"
  | "Cusco"
  | "Áncash"
  | "Junín"
  | "Lambayeque"
  | "Loreto"
  | "Puno";

export interface DocumentoProceso {
  tipo: "Bases administrativas" | "Bases integradas" | "Expediente técnico";
  disponible: boolean;
  urlMock: string;
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
  tipoProcedimiento: TipoProcedimiento;
  estado: EstadoProceso;
  monedaSimbolo: "S/";
  montoReferencial: number;
  fechaPublicacion: string; // ISO date
  fechaLimitePresentacion: string; // ISO date
  experienciaMinimaRequerida: number; // monto mínimo facturado acumulado exigido
  especialistasRequeridos: string[];
  documentos: DocumentoProceso[];
  cronograma: EtapaCronograma[];
  riesgos: string[];
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
  fuente?: "manual" | "seace";
}

export interface PersonalClave {
  id: string;
  nombre: string;
  cargo: string;
  colegiatura: string;
  cvAdjunto: boolean;
  certificados: string[];
}

export interface Equipo {
  id: string;
  tipo: string;
  descripcion: string;
  cantidad: number;
  propio: boolean;
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
