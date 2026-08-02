import { NextRequest } from "next/server";
import { clienteIp, rateLimit, respuestaLimiteExcedido } from "@/lib/rate-limit";
import { esRucValido } from "@/lib/validation";
import type { CategoriaRnp, RegistroRnp } from "@/lib/data/types";

// Proxy server-to-server hacia el RNP del OSCE (ver docs/prompt-claude-code-urban-procura.md,
// sección 3). Confirmado en esta sesión:
// - Endpoint real (no documentado públicamente, extraído del bundle de perfilprov-ui):
//   GET https://eap.oece.gob.pe/perfilprov-bus/1.0/ficha/{ruc}
// - Server-to-server responde sin autenticación y sin bloqueo. La respuesta NO incluye
//   header Access-Control-Allow-Origin, así que un fetch directo desde el navegador
//   seguiría bloqueado por CORS — por eso este proxy vive en el backend de Next.js.
// - robots.txt de apps.osce.gob.pe / eap.oece.gob.pe solo bloquea /cuaderno-obra/, no aplica aquí.
// - `proveedorT01` es `null` cuando el RUC no está en el RNP (no es un error, es "no encontrado").

export const preferredRegion = "gru1";
export const maxDuration = 30;

const OSCE_FICHA_URL = "https://eap.oece.gob.pe/perfilprov-bus/1.0/ficha";

interface OsceEspecialidad {
  desEsp: string;
  desCat: string;
}

interface OsceProveedor {
  numRuc: string;
  nomRzsProv: string;
  esHabilitado: boolean;
  esAptoContratar: boolean;
  cmcTexto: string | null;
  espProvT01s: OsceEspecialidad[] | null;
  lscIdTipReg: string | null;
  lscIdTipRegVig: string | null;
}

interface OsceFichaResponse {
  proveedorT01: OsceProveedor | null;
}

export interface RnpResultado {
  disponible: boolean;
  encontrado: boolean;
  ruc: string;
  razonSocial?: string;
  habilitado?: boolean;
  aptoContratar?: boolean;
  especialidades?: string[];
  capacidadMaximaContratacion?: number | null;
  registros?: RegistroRnp[];
  mensaje: string;
}

function parseCapacidad(texto: string | null): number | null {
  if (!texto) return null;
  const numero = Number(texto.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numero) ? numero : null;
}

// "1" → ejecucionObras, "2" → consultoriaObras — confirmado por el comentario existente en
// src/app/api/rnp/obras/route.ts. "3"/"4" → bienes/servicios — confirmado (2026-08-02) contra
// la ficha pública del RUC de prueba 20100114187 en
// https://apps.osce.gob.pe/perfilprov-ui/ficha/20100114187, que lista "Vigentes: BIENES,
// SERVICIOS" para ese proveedor.
//
// `lscIdTipRegVig` NO significa "códigos vigentes" pese al nombre del campo — confirmado
// empíricamente (2026-08-02) con el mismo RUC: la API devuelve `lscIdTipRegVig: "2 1"`
// (Consultor de Obras, Ejecutor de Obras), pero la ficha pública dice exactamente lo
// contrario, "No vigentes: EJECUTOR DE OBRA, CONSULTOR DE OBRA". Es decir, los códigos en
// `lscIdTipRegVig` son los que NO están vigentes ahora mismo (o alguna otra clasificación no
// confirmada) — de ahí la negación `!codigosNoVigentes.has(codigo)` en parseRegistros.
const CODIGO_A_CATEGORIA: Record<string, CategoriaRnp> = {
  "1": "ejecucionObras",
  "2": "consultoriaObras",
  "3": "bienes",
  "4": "servicios",
};

function parseRegistros(lscIdTipReg: string | null, lscIdTipRegVig: string | null): RegistroRnp[] {
  if (!lscIdTipReg) return [];
  // Pese al nombre, lscIdTipRegVig lista los códigos NO vigentes (ver comentario arriba de
  // CODIGO_A_CATEGORIA) — de ahí la negación.
  const codigosNoVigentes = new Set((lscIdTipRegVig ?? "").split(" ").filter(Boolean));
  return lscIdTipReg
    .split(" ")
    .filter(Boolean)
    .map((codigo) => ({ codigo, tipo: CODIGO_A_CATEGORIA[codigo] }))
    .filter((x): x is { codigo: string; tipo: CategoriaRnp } => Boolean(x.tipo))
    .map(({ codigo, tipo }) => ({ tipo, vigente: !codigosNoVigentes.has(codigo) }));
}

const LIMITE = 20;
const VENTANA_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const limite = rateLimit(`rnp:${clienteIp(request)}`, LIMITE, VENTANA_MS);
  if (!limite.ok) return respuestaLimiteExcedido(limite);

  const ruc = request.nextUrl.searchParams.get("ruc")?.trim() ?? "";

  if (!esRucValido(ruc)) {
    const resultado: RnpResultado = {
      disponible: true,
      encontrado: false,
      ruc,
      mensaje: "El RUC debe tener 11 dígitos.",
    };
    return Response.json(resultado, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${OSCE_FICHA_URL}/${ruc}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const resultado: RnpResultado = {
        disponible: false,
        encontrado: false,
        ruc,
        mensaje: "El RNP del OSCE no respondió correctamente. Completa tus datos manualmente.",
      };
      return Response.json(resultado, { status: 200 });
    }

    const data = (await res.json()) as OsceFichaResponse;
    const proveedor = data.proveedorT01;

    if (!proveedor) {
      const resultado: RnpResultado = {
        disponible: true,
        encontrado: false,
        ruc,
        mensaje: "No encontramos ese RUC en el RNP. Puedes completar tus datos manualmente.",
      };
      return Response.json(resultado);
    }

    const resultado: RnpResultado = {
      disponible: true,
      encontrado: true,
      ruc: proveedor.numRuc,
      razonSocial: proveedor.nomRzsProv,
      habilitado: proveedor.esHabilitado,
      aptoContratar: proveedor.esAptoContratar,
      especialidades: (proveedor.espProvT01s ?? []).map((e) => e.desEsp),
      capacidadMaximaContratacion: parseCapacidad(proveedor.cmcTexto),
      registros: parseRegistros(proveedor.lscIdTipReg, proveedor.lscIdTipRegVig),
      mensaje: "Encontramos tu empresa en el RNP.",
    };
    return Response.json(resultado);
  } catch {
    const resultado: RnpResultado = {
      disponible: false,
      encontrado: false,
      ruc,
      mensaje: "No pudimos conectarnos con el RNP del OSCE ahora mismo. Completa tus datos manualmente.",
    };
    return Response.json(resultado, { status: 200 });
  }
}
