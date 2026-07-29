import { NextRequest } from "next/server";
import { obtenerRankingCompetidores } from "@/lib/data/provider";
import { CATEGORIAS } from "@/lib/data/constants";
import { clienteIp, rateLimit, respuestaLimiteExcedido } from "@/lib/rate-limit";

export const preferredRegion = "gru1";
export const maxDuration = 30;

// Cada request dispara hasta 20 fetches de detalle en paralelo al OECE (ver
// LIMITE_CANDIDATOS_ADJUDICACION en lib/data/live/oece.ts).
const LIMITE = 20;
const VENTANA_MS = 5 * 60 * 1000;

export async function GET(request: NextRequest) {
  const limite = rateLimit(`ranking:${clienteIp(request)}`, LIMITE, VENTANA_MS);
  if (!limite.ok) return respuestaLimiteExcedido(limite);

  const categoriaParam = request.nextUrl.searchParams.get("categoria");
  const categoria = CATEGORIAS.find((c) => c === categoriaParam);

  const resultado = await obtenerRankingCompetidores(categoria);
  return Response.json(resultado);
}
