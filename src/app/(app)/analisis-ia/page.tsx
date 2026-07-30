import { listProcesos } from "@/lib/data/provider";
import { AnalisisIaClient } from "@/components/analisis-ia/analisis-ia-client";

export const preferredRegion = "gru1";
// 45 en vez de 30: listProcesos() -> buscarProcesosLive() enriquece las primeras 15
// tarjetas con un fetch de detalle adicional cada una (en paralelo) después del fetch
// de /search — en el peor caso suma hasta 30s entre ambos pasos.
export const maxDuration = 45;

export default async function AnalisisIaPage() {
  const procesos = await listProcesos();

  return <AnalisisIaClient procesosSugeridos={procesos.slice(0, 6)} />;
}
