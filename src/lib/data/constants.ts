import type { Categoria, EstadoProceso, Subcategoria, TipoProcedimiento } from "@/lib/data/types";

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
