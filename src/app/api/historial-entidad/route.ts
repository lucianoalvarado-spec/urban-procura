import { NextRequest } from "next/server";
import { obtenerHistorialEntidad } from "@/lib/data/provider";
import { clienteIp, rateLimit, respuestaLimiteExcedido } from "@/lib/rate-limit";

export const preferredRegion = "gru1";
export const maxDuration = 30;

// Cada request dispara hasta 20 fetches de detalle en paralelo al OECE (ver
// LIMITE_CANDIDATOS_ADJUDICACION en lib/data/live/oece.ts).
const LIMITE = 20;
const VENTANA_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const limite = rateLimit(`historial-entidad:${clienteIp(request)}`, LIMITE, VENTANA_MS);
  if (!limite.ok) return respuestaLimiteExcedido(limite);

  const entidad = request.nextUrl.searchParams.get("entidad")?.trim() ?? "";
  if (!entidad) {
    return Response.json({ fuente: "mock", adjudicaciones: [] });
  }

  const resultado = await obtenerHistorialEntidad(entidad);
  return Response.json(resultado);
}
