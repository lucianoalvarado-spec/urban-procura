import type { Categoria } from "@/lib/data/types";

// Datos de MUESTRA para Ranking de competidores e Historial de la entidad — se usan
// solo cuando la fuente en vivo del OECE no responde o no encuentra adjudicaciones
// (ver lib/data/live/oece.ts, rankingCompetidoresLive / historialEntidadLive). No
// representan proveedores ni adjudicaciones reales.

export interface AdjudicacionMock {
  procesoId: string;
  entidad: string;
  objeto: string;
  categoria: Categoria;
  tipoProcedimiento: string;
  fecha: string;
  proveedorGanador: string;
  montoAdjudicado: number;
}

export const adjudicacionesMock: AdjudicacionMock[] = [
  {
    procesoId: "OP-2025-3301",
    entidad: "Municipalidad Provincial de Trujillo",
    objeto: "Mejoramiento de pistas y veredas del sector Buenos Aires",
    categoria: "Obra",
    tipoProcedimiento: "Licitación Pública",
    fecha: "2025-11-04",
    proveedorGanador: "Constructora Andes del Norte S.A.C.",
    montoAdjudicado: 6_800_000,
  },
  {
    procesoId: "OP-2025-3298",
    entidad: "Gobierno Regional de La Libertad",
    objeto: "Rehabilitación de la carretera Huamachuco - Cajabamba",
    categoria: "Obra",
    tipoProcedimiento: "Licitación Pública",
    fecha: "2025-09-22",
    proveedorGanador: "Consorcio Vial Sierra Norte",
    montoAdjudicado: 14_200_000,
  },
  {
    procesoId: "OP-2025-3255",
    entidad: "Municipalidad Distrital de Laredo",
    objeto: "Mejoramiento del sistema de agua potable - sector San Isidro",
    categoria: "Obra",
    tipoProcedimiento: "Adjudicación Simplificada",
    fecha: "2025-08-14",
    proveedorGanador: "Constructora Andes del Norte S.A.C.",
    montoAdjudicado: 2_100_000,
  },
  {
    procesoId: "OP-2025-3190",
    entidad: "SEDALIB S.A.",
    objeto: "Supervisión de obra - renovación de colectores primarios",
    categoria: "Consultoría de Obras",
    tipoProcedimiento: "Concurso Público",
    fecha: "2025-07-02",
    proveedorGanador: "Ingeniería y Supervisión del Perú S.A.",
    montoAdjudicado: 780_000,
  },
  {
    procesoId: "OP-2025-3104",
    entidad: "Gobierno Regional de Piura",
    objeto: "Elaboración del expediente técnico - defensa ribereña río Piura",
    categoria: "Consultoría de Obras",
    tipoProcedimiento: "Concurso Público",
    fecha: "2025-05-19",
    proveedorGanador: "Consultores Asociados del Norte S.A.C.",
    montoAdjudicado: 540_000,
  },
  {
    procesoId: "OP-2025-3050",
    entidad: "Municipalidad Provincial de Trujillo",
    objeto: "Servicio de mantenimiento periódico de vías urbanas",
    categoria: "Servicios",
    tipoProcedimiento: "Adjudicación Simplificada",
    fecha: "2025-04-30",
    proveedorGanador: "Vial Norte Servicios Generales E.I.R.L.",
    montoAdjudicado: 540_000,
  },
  {
    procesoId: "OP-2025-2988",
    entidad: "EsSalud - Red Asistencial Piura",
    objeto: "Suministro de equipos biomédicos para el Hospital II Sullana",
    categoria: "Bienes",
    tipoProcedimiento: "Subasta Inversa Electrónica",
    fecha: "2025-03-11",
    proveedorGanador: "Distribuidora Médica del Pacífico S.A.C.",
    montoAdjudicado: 980_000,
  },
  {
    procesoId: "OP-2025-2940",
    entidad: "Municipalidad Distrital de Independencia",
    objeto: "Construcción de puente vehicular sobre el río Moche",
    categoria: "Obra",
    tipoProcedimiento: "Licitación Pública",
    fecha: "2025-02-08",
    proveedorGanador: "Consorcio Vial Sierra Norte",
    montoAdjudicado: 9_800_000,
  },
];
