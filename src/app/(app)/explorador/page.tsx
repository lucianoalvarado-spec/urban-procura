import { listProcesos } from "@/lib/data/provider";
import { ExploradorClient } from "@/components/explorador/explorador-client";

// gru1 (São Paulo) es la región de Vercel más cercana a Perú disponible — reduce la
// latencia hacia el Portal de Contrataciones Abiertas del OECE frente a la región
// default (Washington D.C.), que en producción venía agotando el timeout del fetch.
export const preferredRegion = "gru1";

export default async function ExploradorPage() {
  const procesos = await listProcesos();

  const entidades = Array.from(new Set(procesos.map((p) => p.entidad))).sort();
  const regiones = Array.from(new Set(procesos.map((p) => p.region))).sort();

  return <ExploradorClient procesos={procesos} entidades={entidades} regiones={regiones} />;
}
