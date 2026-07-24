import type { Categoria, EstadoProceso, Region, Subcategoria, TipoProcedimiento } from "@/lib/data/types";

export const REGIONES: Region[] = [
  "Amazonas",
  "Áncash",
  "Apurímac",
  "Arequipa",
  "Ayacucho",
  "Cajamarca",
  "Callao",
  "Cusco",
  "Huancavelica",
  "Huánuco",
  "Ica",
  "Junín",
  "La Libertad",
  "Lambayeque",
  "Lima",
  "Loreto",
  "Madre de Dios",
  "Moquegua",
  "Pasco",
  "Piura",
  "Puno",
  "San Martín",
  "Tacna",
  "Tumbes",
  "Ucayali",
];

export const CATEGORIAS: Categoria[] = ["Obra", "Bienes", "Servicios", "Consultoría de Obras"];

export const SUBCATEGORIAS: Subcategoria[] = [
  "Elaboración de expediente técnico",
  "Supervisión de expediente técnico",
  "Supervisión de obra",
  "Consultoría de obra",
  "Ejecución de obra",
  "Suministro de bienes",
  "Servicio general",
];

export const TIPOS_PROCEDIMIENTO: TipoProcedimiento[] = [
  "Licitación Pública",
  "Concurso Público",
  "Adjudicación Simplificada",
  "Selección de Consultores Individuales",
  "Comparación de Precios",
  "Subasta Inversa Electrónica",
];

export const ESTADOS_PROCESO: EstadoProceso[] = [
  "Convocado",
  "En proceso de selección",
  "Buena pro otorgada",
  "Nulo",
  "Desierto",
];
