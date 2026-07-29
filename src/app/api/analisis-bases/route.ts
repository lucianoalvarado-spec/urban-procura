import { NextRequest } from "next/server";
import { clienteIp, rateLimit, respuestaLimiteExcedido } from "@/lib/rate-limit";

// Análisis de bases con IA — vía la API de Claude (Anthropic Messages API), llamada
// server-to-server porque necesita ANTHROPIC_API_KEY (nunca debe llegar al navegador).
// Si la clave no está configurada en este entorno, o el modelo no responde, se degrada
// visiblemente (disponible: false + mensaje), nunca en silencio — mismo patrón que el
// resto de integraciones del OECE/RNP.
export const preferredRegion = "gru1";
export const maxDuration = 60;

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5";
const MIN_CARACTERES = 200;
// Sin tope, alguien podría pegar textos enormes repetidamente y disparar el costo de
// la API de Claude — 50,000 caracteres alcanza de sobra para unas bases completas.
const MAX_CARACTERES = 50_000;
const LIMITE = 8;
const VENTANA_MS = 10 * 60 * 1000;

export interface AnalisisBasesResultado {
  disponible: boolean;
  mensaje?: string;
  resumenEjecutivo?: string;
  documentosRequeridos?: string[];
  requisitosCalificacion?: string[];
  garantias?: string[];
  plazoFormaPago?: string;
  criteriosEvaluacion?: string[];
}

interface ProcesoResumen {
  objeto: string;
  entidad: string;
  categoria: string;
  tipoProcedimiento: string;
  montoReferencial: number | null;
}

const PROMPT_SISTEMA = `Eres un asistente que ayuda a proveedores del Estado peruano a entender las bases de un proceso de contratación pública (SEACE/OECE). Analiza el texto de bases que te pasa el usuario y responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin texto antes o después), con esta forma exacta:
{
  "resumenEjecutivo": "string de 2-3 oraciones",
  "documentosRequeridos": ["string", ...],
  "requisitosCalificacion": ["string", ...],
  "garantias": ["string", ...],
  "plazoFormaPago": "string",
  "criteriosEvaluacion": ["string", ...]
}
Si el texto no trae información suficiente para alguna sección, usa un array vacío o el string "No especificado en el texto proporcionado" — nunca inventes datos que no estén en el texto.`;

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
  const limite = rateLimit(`analisis-bases:${clienteIp(request)}`, LIMITE, VENTANA_MS);
  if (!limite.ok) return respuestaLimiteExcedido(limite);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const resultado: AnalisisBasesResultado = {
      disponible: false,
      mensaje:
        "El análisis con IA no está configurado en este entorno (falta la clave de API de Claude).",
    };
    return Response.json(resultado);
  }

  const body = (await request.json().catch(() => null)) as
    | { texto?: string; proceso?: ProcesoResumen }
    | null;
  const texto = body?.texto?.trim() ?? "";

  if (texto.length < MIN_CARACTERES) {
    const resultado: AnalisisBasesResultado = {
      disponible: false,
      mensaje: `Pega o sube un texto más largo (al menos ${MIN_CARACTERES} caracteres) — parece que faltan las bases completas.`,
    };
    return Response.json(resultado, { status: 400 });
  }

  if (texto.length > MAX_CARACTERES) {
    const resultado: AnalisisBasesResultado = {
      disponible: false,
      mensaje: `El texto es demasiado largo (máximo ${MAX_CARACTERES.toLocaleString("es-PE")} caracteres) — recorta las bases antes de analizarlas.`,
    };
    return Response.json(resultado, { status: 400 });
  }

  const proceso = body?.proceso;
  const contextoProceso = proceso
    ? `Proceso: "${proceso.objeto}" — Entidad: ${proceso.entidad} — Categoría: ${proceso.categoria} — Tipo de procedimiento: ${proceso.tipoProcedimiento} — Monto referencial: ${proceso.montoReferencial !== null ? `S/ ${proceso.montoReferencial.toLocaleString("es-PE")}` : "no publicado por la entidad"}.\n\n`
    : "";

  try {
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
        messages: [
          {
            role: "user",
            content: `${contextoProceso}Texto de las bases:\n\n${texto.slice(0, 40000)}`,
          },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const resultado: AnalisisBasesResultado = {
        disponible: false,
        mensaje: `El motor de IA respondió con un error (${res.status}). Intenta más tarde.`,
      };
      return Response.json(resultado);
    }

    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const textoRespuesta = data.content?.find((c) => c.type === "text")?.text ?? "";
    const parsed = extraerJson(textoRespuesta);

    if (!parsed) {
      const resultado: AnalisisBasesResultado = {
        disponible: false,
        mensaje: "El motor de IA respondió en un formato inesperado. Intenta de nuevo.",
      };
      return Response.json(resultado);
    }

    const resultado: AnalisisBasesResultado = {
      disponible: true,
      resumenEjecutivo: typeof parsed.resumenEjecutivo === "string" ? parsed.resumenEjecutivo : undefined,
      documentosRequeridos: Array.isArray(parsed.documentosRequeridos)
        ? parsed.documentosRequeridos.filter((x): x is string => typeof x === "string")
        : [],
      requisitosCalificacion: Array.isArray(parsed.requisitosCalificacion)
        ? parsed.requisitosCalificacion.filter((x): x is string => typeof x === "string")
        : [],
      garantias: Array.isArray(parsed.garantias)
        ? parsed.garantias.filter((x): x is string => typeof x === "string")
        : [],
      plazoFormaPago: typeof parsed.plazoFormaPago === "string" ? parsed.plazoFormaPago : undefined,
      criteriosEvaluacion: Array.isArray(parsed.criteriosEvaluacion)
        ? parsed.criteriosEvaluacion.filter((x): x is string => typeof x === "string")
        : [],
    };
    return Response.json(resultado);
  } catch {
    const resultado: AnalisisBasesResultado = {
      disponible: false,
      mensaje: "No pudimos conectar con el motor de IA ahora mismo. Intenta más tarde.",
    };
    return Response.json(resultado);
  }
}
