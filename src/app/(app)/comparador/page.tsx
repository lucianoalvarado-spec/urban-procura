import { listProcesos } from "@/lib/data/provider";
import { ComparadorClient } from "@/components/comparador/comparador-client";

export const preferredRegion = "gru1";
// 45 en vez de 30: listProcesos() -> buscarProcesosLive() enriquece las primeras 15
// tarjetas con un fetch de detalle adicional cada una (en paralelo) después del fetch
// de /search — en el peor caso suma hasta 30s entre ambos pasos.
export const maxDuration = 45;

export default async function ComparadorPage() {
  const procesos = await listProcesos();

  return <ComparadorClient procesosIniciales={procesos} />;
}
