import type { PlanComercial } from "@/lib/data/types";

export const PLAN_ORDER: PlanComercial[] = ["free", "basico", "profesional", "premium"];

export function cumplePlan(actual: PlanComercial, minimo: PlanComercial): boolean {
  return PLAN_ORDER.indexOf(actual) >= PLAN_ORDER.indexOf(minimo);
}

export interface DefinicionPlan {
  id: PlanComercial;
  nombre: string;
  precio: string;
  resumen: string;
  incluye: string[];
}

export const PLANES: DefinicionPlan[] = [
  {
    id: "free",
    nombre: "Free",
    precio: "S/ 0",
    resumen: "Para conocer la plataforma y ver qué se publica en el SEACE.",
    incluye: [
      "Explorador de procesos (hasta 5 resultados a la vez)",
      "Dashboard básico con totales",
      "Ficha del proceso sin análisis de compatibilidad",
    ],
  },
  {
    id: "basico",
    nombre: "Básico",
    precio: "S/ 79/mes",
    resumen: "Para revisar oportunidades sin límites, sin inteligencia todavía.",
    incluye: [
      "Explorador sin límite de resultados",
      "Ficha del proceso completa (documentos, cronograma, riesgos)",
      "Dashboard con todos los plazos por vencer",
    ],
  },
  {
    id: "profesional",
    nombre: "Profesional",
    precio: "S/ 199/mes",
    resumen: "Para no perseguir procesos: que la plataforma te diga cuáles convienen.",
    incluye: [
      "Todo lo de Básico",
      "Matching inteligente con % de compatibilidad",
      "Mis oportunidades (CRM de seguimiento)",
      "Recomendaciones en el Dashboard",
      "Alertas y calendario de plazos",
      "Comparador de procesos y ranking de competidores",
    ],
  },
  {
    id: "premium",
    nombre: "Premium",
    precio: "S/ 349/mes",
    resumen: "Para preparar la oferta más rápido, con ayuda de IA.",
    incluye: [
      "Todo lo de Profesional",
      "Análisis de bases y expedientes con IA",
      "Generación asistida de ofertas",
    ],
  },
];
