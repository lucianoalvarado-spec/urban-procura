import type { PlanComercial } from "@/lib/data/types";

export interface NavItem {
  href: string;
  label: string;
  plan: PlanComercial;
  proximamente?: boolean;
  pregunta: string; // la pregunta concreta que responde la pantalla
}

export interface NavGroup {
  titulo: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    titulo: "Principal",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        plan: "free",
        pregunta: "¿Qué debería hacer hoy?",
      },
      {
        href: "/explorador",
        label: "Explorador inteligente",
        plan: "free",
        pregunta: "¿Qué procesos hay y cuáles me convienen?",
      },
      {
        href: "/oportunidades",
        label: "Mis oportunidades",
        plan: "profesional",
        pregunta: "¿En qué etapa está cada proceso que sigo?",
      },
      {
        href: "/perfil",
        label: "Perfil del proveedor",
        plan: "free",
        pregunta: "¿Qué sabe la plataforma sobre mi empresa?",
      },
    ],
  },
  {
    titulo: "Inteligencia",
    items: [
      {
        href: "/alertas",
        label: "Alertas",
        plan: "profesional",
        proximamente: true,
        pregunta: "¿Qué cambió que debería saber ahora mismo?",
      },
      {
        href: "/comparador",
        label: "Comparador de procesos",
        plan: "profesional",
        proximamente: true,
        pregunta: "De estas opciones, ¿cuál conviene más?",
      },
      {
        href: "/calendario",
        label: "Calendario de plazos",
        plan: "profesional",
        proximamente: true,
        pregunta: "¿Qué vence esta semana y el próximo mes?",
      },
      {
        href: "/analisis-ia",
        label: "Análisis de bases con IA",
        plan: "premium",
        proximamente: true,
        pregunta: "¿Puedo participar y qué me falta?",
      },
    ],
  },
  {
    titulo: "Mercado",
    items: [
      {
        href: "/ranking",
        label: "Ranking de competidores",
        plan: "profesional",
        proximamente: true,
        pregunta: "¿Quién me está ganando y en qué categorías?",
      },
      {
        href: "/historial-entidad",
        label: "Historial de la entidad",
        plan: "profesional",
        proximamente: true,
        pregunta: "¿Cómo compra esta entidad normalmente?",
      },
    ],
  },
  {
    titulo: "Automatización",
    items: [
      {
        href: "/automatizacion",
        label: "Generación de ofertas",
        plan: "premium",
        proximamente: true,
        pregunta: "¿Cómo armo la oferta más rápido?",
      },
    ],
  },
];

export const PLAN_LABEL: Record<PlanComercial, string> = {
  free: "Free",
  basico: "Básico",
  profesional: "Profesional",
  premium: "Premium",
};
