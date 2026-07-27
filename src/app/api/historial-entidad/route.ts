import { NextRequest } from "next/server";
import { obtenerHistorialEntidad } from "@/lib/data/provider";

export const preferredRegion = "gru1";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const entidad = request.nextUrl.searchParams.get("entidad")?.trim() ?? "";
  if (!entidad) {
    return Response.json({ fuente: "mock", adjudicaciones: [] });
  }

  const resultado = await obtenerHistorialEntidad(entidad);
  return Response.json(resultado);
}
