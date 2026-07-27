import { listProcesos } from "@/lib/data/provider";
import { ExploradorClient } from "@/components/explorador/explorador-client";

// gru1 (São Paulo) es la región de Vercel más cercana a Perú disponible — reduce la
// latencia hacia el Portal de Contrataciones Abiertas del OECE frente a la región
// default (Washington D.C.), que en producción venía agotando el timeout del fetch.
export const preferredRegion = "gru1";
export const maxDuration = 30;

export default async function ExploradorPage() {
  const procesos = await listProcesos();

  return <ExploradorClient procesos={procesos} />;
}
