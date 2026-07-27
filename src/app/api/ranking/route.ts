import { NextRequest } from "next/server";
import { obtenerRankingCompetidores } from "@/lib/data/provider";
import type { Categoria } from "@/lib/data/types";

export const preferredRegion = "gru1";
export const maxDuration = 30;

const CATEGORIAS_VALIDAS: Categoria[] = ["Obra", "Bienes", "Servicios", "Consultoría de Obras"];

export async function GET(request: NextRequest) {
  const categoriaParam = request.nextUrl.searchParams.get("categoria");
  const categoria = CATEGORIAS_VALIDAS.find((c) => c === categoriaParam);

  const resultado = await obtenerRankingCompetidores(categoria);
  return Response.json(resultado);
}
