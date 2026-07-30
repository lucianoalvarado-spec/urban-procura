import { listProcesos } from "@/lib/data/provider";
import { ExploradorClient } from "@/components/explorador/explorador-client";

// gru1 (São Paulo) es la región de Vercel más cercana a Perú disponible — reduce la
// latencia hacia el Portal de Contrataciones Abiertas del OECE frente a la región
// default (Washington D.C.), que en producción venía agotando el timeout del fetch.
export const preferredRegion = "gru1";
// 45 en vez de 30: buscarProcesosLive ahora enriquece las primeras 15 tarjetas con un
// fetch de detalle adicional cada una (en paralelo) después del fetch de /search — en
// el peor caso (ambos fetches cerca de su timeout de 15s) suma hasta 30s, así que 30
// justo quedaría sin margen.
export const maxDuration = 45;

export default async function ExploradorPage() {
  const procesos = await listProcesos();

  return <ExploradorClient procesos={procesos} />;
}
