import { NextRequest } from "next/server";
import type { AnalisisBasesResultado } from "@/app/api/analisis-bases/route";

// Genera el borrador de la oferta técnica. A diferencia de /api/analisis-bases, esta
// ruta SIEMPRE devuelve un borrador usable (armado con plantilla a partir del perfil
// del proveedor) aunque no haya ANTHROPIC_API_KEY configurada — así la exportación a
// Word/PDF sigue siendo una función real y probable en cualquier entorno; la IA solo
// enriquece la propuesta técnica/metodología y el cronograma cuando está disponible.
// `generadoConIA: false` dejа explícito cuándo esas secciones son plantilla, no IA.
export const preferredRegion = "gru1";
export const maxDuration = 60;

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";

interface ProcesoResumen {
  objeto: string;
  entidad: string;
  categoria: string;
  tipoProcedimiento: string;
  montoReferencial: number | null;
  descripcion: string;
}

interface ExperienciaResumen {
  cliente: string;
  objeto: string;
  monto: number;
  fecha: string;
  especialidad: string;
}

interface PersonalResumen {
  nombre: string;
  cargo: string;
}

interface EquipoResumen {
  tipo: string;
  descripcion: string;
  cantidad: number;
}

interface ProveedorResumen {
  razonSocial: string;
  nombreComercial: string;
  ruc: string;
  experiencia: ExperienciaResumen[];
  personalClave: PersonalResumen[];
  equipamiento: EquipoResumen[];
}

export interface BorradorOferta {
  generadoConIA: boolean;
  mensajeIA?: string;
  presentacionEmpresa: string;
  experienciaRelevante: string[];
  personalPropuesto: string[];
  equipamientoPropuesto: string[];
  propuestaTecnica: string;
  cronogramaTentativo: string;
}

const PLACEHOLDER_SIN_IA =
  "Sección pendiente de redactar — la IA no está disponible en este entorno. Completa la metodología, el enfoque técnico y el cronograma manualmente antes de presentar esta oferta.";

function construirPlantilla(proceso: ProcesoResumen, proveedor: ProveedorResumen): BorradorOferta {
  const experienciaRelevante = proveedor.experiencia
    .filter((e) => e.especialidad === proceso.categoria)
    .map((e) => `${e.cliente} — ${e.objeto} (S/ ${e.monto.toLocaleString("es-PE")}, ${e.fecha.slice(0, 4)})`);

  return {
    generadoConIA: false,
    presentacionEmpresa: `${proveedor.razonSocial} (${proveedor.nombreComercial}), RUC ${proveedor.ruc}, presenta la siguiente propuesta técnica para el proceso "${proceso.objeto}", convocado por ${proceso.entidad}.`,
    experienciaRelevante:
      experienciaRelevante.length > 0
        ? experienciaRelevante
        : proveedor.experiencia.map(
            (e) => `${e.cliente} — ${e.objeto} (S/ ${e.monto.toLocaleString("es-PE")}, ${e.fecha.slice(0, 4)})`
          ),
    personalPropuesto: proveedor.personalClave.map((p) => `${p.nombre} — ${p.cargo}`),
    equipamientoPropuesto: proveedor.equipamiento.map(
      (e) => `${e.tipo} (${e.descripcion}) — cantidad: ${e.cantidad}`
    ),
    propuestaTecnica: PLACEHOLDER_SIN_IA,
    cronogramaTentativo: PLACEHOLDER_SIN_IA,
  };
}

const PROMPT_SISTEMA = `Eres un asistente que ayuda a redactar el borrador de la propuesta técnica de una oferta para un proceso de contratación pública en Perú (SEACE/OECE). Con la información del proceso, el perfil del proveedor y (si existe) el análisis de bases, redacta una propuesta técnica y una metodología de trabajo, más un cronograma tentativo de ejecución. Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin texto antes o después) con esta forma exacta:
{
  "propuestaTecnica": "string, 2-4 párrafos con la metodología/enfoque técnico propuesto",
  "cronogramaTentativo": "string, cronograma tentativo en texto (etapas y plazos aproximados)"
}
Sé concreto y realista, basándote en la experiencia y el equipo del proveedor que te paso. No inventes certificaciones o experiencia que no te haya dado.`;

function extraerJson(texto: string): Record<string, unknown> | null {
  try {
    return JSON.parse(texto);
  } catch {
    const inicio = texto.indexOf("{");
    const fin = texto.lastIndexOf("}");
    if (inicio === -1 || fin === -1) return null;
    try {
      return JSON.parse(texto.slice(inicio, fin + 1));
    } catch {
      return null;
    }
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    proceso?: ProcesoResumen;
    proveedor?: ProveedorResumen;
    analisis?: AnalisisBasesResultado;
  } | null;

  if (!body?.proceso || !body?.proveedor) {
    return Response.json({ error: "Falta el proceso o el perfil del proveedor." }, { status: 400 });
  }

  const borrador = construirPlantilla(body.proceso, body.proveedor);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    borrador.mensajeIA =
      "El análisis con IA no está configurado en este entorno (falta la clave de API de Claude) — se generó un borrador con plantilla básica, complétalo manualmente.";
    return Response.json(borrador);
  }

  try {
    const contexto = [
      `Proceso: "${body.proceso.objeto}" — ${body.proceso.entidad} — ${body.proceso.categoria} / ${body.proceso.tipoProcedimiento} — ${body.proceso.montoReferencial !== null ? `S/ ${body.proceso.montoReferencial.toLocaleString("es-PE")}` : "monto referencial no publicado por la entidad"}.`,
      `Descripción: ${body.proceso.descripcion}`,
      `Proveedor: ${body.proveedor.razonSocial} (${body.proveedor.nombreComercial}).`,
      `Experiencia relevante: ${borrador.experienciaRelevante.join("; ") || "sin experiencia registrada en este rubro"}.`,
      `Personal clave: ${borrador.personalPropuesto.join("; ") || "sin personal clave registrado"}.`,
      `Equipamiento: ${borrador.equipamientoPropuesto.join("; ") || "sin equipamiento registrado"}.`,
      body.analisis?.disponible
        ? `Análisis de bases disponible — resumen: ${body.analisis.resumenEjecutivo ?? ""}. Requisitos de calificación: ${(body.analisis.requisitosCalificacion ?? []).join("; ")}. Criterios de evaluación: ${(body.analisis.criteriosEvaluacion ?? []).join("; ")}.`
        : "No se analizaron las bases todavía.",
    ].join("\n");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: PROMPT_SISTEMA,
        messages: [{ role: "user", content: contexto }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      borrador.mensajeIA = `El motor de IA respondió con un error (${res.status}) — se generó un borrador con plantilla básica, complétalo manualmente.`;
      return Response.json(borrador);
    }

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const textoRespuesta = data.content?.find((c) => c.type === "text")?.text ?? "";
    const parsed = extraerJson(textoRespuesta);

    if (!parsed) {
      borrador.mensajeIA =
        "El motor de IA respondió en un formato inesperado — se generó un borrador con plantilla básica, complétalo manualmente.";
      return Response.json(borrador);
    }

    borrador.generadoConIA = true;
    if (typeof parsed.propuestaTecnica === "string") borrador.propuestaTecnica = parsed.propuestaTecnica;
    if (typeof parsed.cronogramaTentativo === "string")
      borrador.cronogramaTentativo = parsed.cronogramaTentativo;

    return Response.json(borrador);
  } catch {
    borrador.mensajeIA =
      "No pudimos conectar con el motor de IA ahora mismo — se generó un borrador con plantilla básica, complétalo manualmente.";
    return Response.json(borrador);
  }
}
