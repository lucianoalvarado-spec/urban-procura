import { NextRequest } from "next/server";
import { clienteIp, rateLimit, respuestaLimiteExcedido } from "@/lib/rate-limit";

// Análisis de bases con IA — vía la API de Claude (Anthropic Messages API), llamada
// server-to-server porque necesita ANTHROPIC_API_KEY (nunca debe llegar al navegador).
// Si la clave no está configurada en este entorno, o el modelo no responde, se degrada
// visiblemente (disponible: false + mensaje), nunca en silencio — mismo patrón que el
// resto de integraciones del OECE/RNP.
//
// Dos modos: `docUrl` (descarga el PDF real de bases y se lo pasa a Claude como
// documento nativo — sin librería de parseo de PDF) o `texto` (pegado/subido a mano,
// respaldo para procesos sin documento real o de la muestra mock, que nunca tiene URL
// real).
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
const MAX_PDF_BYTES = 15 * 1024 * 1024;
// Los documentos reales de bases siempre vienen de este dominio (ver oece.ts) — el
// docUrl lo manda el cliente, así que sin este allowlist cualquiera podría usar esta
// ruta para hacer que nuestro servidor descargue una URL arbitraria (SSRF).
const DOMINIOS_PERMITIDOS = ["seace.gob.pe"];

export interface AnalisisBasesResultado {
  disponible: boolean;
  mensaje?: string;
  resumenEjecutivo?: string;
  documentosRequeridos?: string[];
  requisitosCalificacion?: string[];
  requisitosTecnicos?: string[];
  personalClaveRequerido?: string[];
  certificacionesRequeridas?: string[];
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

const PROMPT_SISTEMA = `Eres un asistente que ayuda a proveedores del Estado peruano a entender las bases de un proceso de contratación pública (SEACE/OECE). Analiza el documento o texto de bases que te pasa el usuario y responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin texto antes o después), con esta forma exacta:
{
  "resumenEjecutivo": "string de 2-3 oraciones",
  "documentosRequeridos": ["string", ...],
  "requisitosCalificacion": ["string", ...],
  "requisitosTecnicos": ["string", ...],
  "personalClaveRequerido": ["string", ...],
  "certificacionesRequeridas": ["string", ...],
  "garantias": ["string", ...],
  "plazoFormaPago": "string",
  "criteriosEvaluacion": ["string", ...]
}
Instrucciones por campo:
- "resumenEjecutivo": describe explícitamente las metas físicas o el objeto concreto del proyecto (ej. "construcción de 2.3 km de vía asfaltada", "adquisición de 500 laptops"), no un resumen genérico del proceso administrativo.
- "requisitosTecnicos": especificaciones técnicas que debe cumplir la oferta — distinto de los requisitos de calificación del postor.
- "personalClaveRequerido": profesionales exigidos (cargo, colegiatura, experiencia mínima) tal como los detalle el documento.
- "certificacionesRequeridas": certificaciones ISO u otras que las bases exijan.
Si el texto no trae información suficiente para alguna sección, usa un array vacío o el string "No especificado en el texto proporcionado" — nunca inventes datos que no estén en el documento.`;

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

function hostPermitido(url: URL): boolean {
  return DOMINIOS_PERMITIDOS.some(
    (dominio) => url.hostname === dominio || url.hostname.endsWith(`.${dominio}`)
  );
}

type DescargaPdf =
  | { ok: true; base64: string }
  | { ok: false; motivo: "muy_pesado" | "no_disponible" };

const PDF_MAGIC = Buffer.from("%PDF-");

async function descargarPdfBase64(docUrl: string): Promise<DescargaPdf> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    // redirect: "manual" — docUrl es client-supplied (validado solo contra el
    // allowlist de hostname seace.gob.pe). Si algún endpoint de *.seace.gob.pe tuviera
    // un open redirect, seguirlo automáticamente descargaría y reenviaría al cliente el
    // contenido de un host arbitrario (SSRF con canal de exfiltración). Cualquier
    // respuesta de redirección se trata igual que un fallo de descarga.
    const res = await fetch(docUrl, { signal: controller.signal, redirect: "manual" });
    if (!res.ok || (res.status >= 300 && res.status < 400) || res.type === "opaqueredirect") {
      return { ok: false, motivo: "no_disponible" };
    }
    const contentLength = res.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_PDF_BYTES) {
      return { ok: false, motivo: "muy_pesado" };
    }
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_PDF_BYTES) return { ok: false, motivo: "muy_pesado" };
    // Segunda línea de defensa además del chequeo de `format` en la UI (Fix A): verifica
    // los magic bytes reales antes de tratarlo como PDF válido — cubre también un valor
    // de `format` desactualizado o incorrecto en la fuente.
    const bytes = Buffer.from(buffer);
    if (!bytes.subarray(0, 5).equals(PDF_MAGIC)) {
      return { ok: false, motivo: "no_disponible" };
    }
    return { ok: true, base64: bytes.toString("base64") };
  } catch {
    return { ok: false, motivo: "no_disponible" };
  } finally {
    clearTimeout(timeout);
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
    | { docUrl?: string; texto?: string; proceso?: ProcesoResumen }
    | null;
  const docUrl = body?.docUrl?.trim();
  const texto = body?.texto?.trim() ?? "";

  if (docUrl && texto) {
    const resultado: AnalisisBasesResultado = {
      disponible: false,
      mensaje: "Envía solo un modo de análisis a la vez (documento o texto).",
    };
    return Response.json(resultado, { status: 400 });
  }

  if (!docUrl && texto.length < MIN_CARACTERES) {
    const resultado: AnalisisBasesResultado = {
      disponible: false,
      mensaje: `Pega o sube un texto más largo (al menos ${MIN_CARACTERES} caracteres) — parece que faltan las bases completas.`,
    };
    return Response.json(resultado, { status: 400 });
  }

  if (!docUrl && texto.length > MAX_CARACTERES) {
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

  let content: Array<Record<string, unknown>>;
  let timeoutAnthropicMs = 55000;

  if (docUrl) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(docUrl);
    } catch {
      const resultado: AnalisisBasesResultado = {
        disponible: false,
        mensaje: "La URL del documento no es válida.",
      };
      return Response.json(resultado, { status: 400 });
    }
    if (parsedUrl.protocol !== "https:" || !hostPermitido(parsedUrl)) {
      const resultado: AnalisisBasesResultado = {
        disponible: false,
        mensaje: "El documento debe venir de una fuente oficial del SEACE.",
      };
      return Response.json(resultado, { status: 400 });
    }

    const descarga = await descargarPdfBase64(parsedUrl.toString());
    if (!descarga.ok) {
      const resultado: AnalisisBasesResultado = {
        disponible: false,
        mensaje:
          descarga.motivo === "muy_pesado"
            ? "El documento de bases es muy pesado para analizarlo automáticamente (más de 15 MB) — pégalo como texto si puedes extraerlo."
            : "No pudimos descargar el documento de bases automáticamente ahora mismo — pégalo como texto si lo tienes a mano.",
      };
      return Response.json(resultado);
    }

    content = [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: descarga.base64 },
      },
      { type: "text", text: `${contextoProceso}Analiza el documento de bases adjunto.` },
    ];
    timeoutAnthropicMs = 40000;
  } else {
    content = [
      { type: "text", text: `${contextoProceso}Texto de las bases:\n\n${texto.slice(0, 40000)}` },
    ];
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutAnthropicMs);
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        system: PROMPT_SISTEMA,
        messages: [{ role: "user", content }],
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

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
      stop_reason?: string;
    };
    const textoRespuesta = data.content?.find((c) => c.type === "text")?.text ?? "";

    if (data.stop_reason === "max_tokens") {
      const resultado: AnalisisBasesResultado = {
        disponible: false,
        mensaje:
          "El análisis quedó incompleto porque el documento es muy extenso — intenta con el modo de texto manual, recortando a la sección más relevante.",
      };
      return Response.json(resultado);
    }

    const parsed = extraerJson(textoRespuesta);

    if (!parsed) {
      const resultado: AnalisisBasesResultado = {
        disponible: false,
        mensaje: "El motor de IA respondió en un formato inesperado. Intenta de nuevo.",
      };
      return Response.json(resultado);
    }

    const comoStrings = (valor: unknown): string[] =>
      Array.isArray(valor) ? valor.filter((x): x is string => typeof x === "string") : [];

    const resultado: AnalisisBasesResultado = {
      disponible: true,
      resumenEjecutivo: typeof parsed.resumenEjecutivo === "string" ? parsed.resumenEjecutivo : undefined,
      documentosRequeridos: comoStrings(parsed.documentosRequeridos),
      requisitosCalificacion: comoStrings(parsed.requisitosCalificacion),
      requisitosTecnicos: comoStrings(parsed.requisitosTecnicos),
      personalClaveRequerido: comoStrings(parsed.personalClaveRequerido),
      certificacionesRequeridas: comoStrings(parsed.certificacionesRequeridas),
      garantias: comoStrings(parsed.garantias),
      plazoFormaPago: typeof parsed.plazoFormaPago === "string" ? parsed.plazoFormaPago : undefined,
      criteriosEvaluacion: comoStrings(parsed.criteriosEvaluacion),
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
