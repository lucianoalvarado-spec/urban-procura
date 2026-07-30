import { listProcesos } from "@/lib/data/provider";
import { CalendarioClient } from "@/components/calendario/calendario-client";

export const preferredRegion = "gru1";
// 45 en vez de 30: listProcesos() -> buscarProcesosLive() enriquece las primeras 15
// tarjetas con un fetch de detalle adicional cada una (en paralelo) después del fetch
// de /search — en el peor caso suma hasta 30s entre ambos pasos.
export const maxDuration = 45;

export default async function CalendarioPage() {
  const procesos = await listProcesos();

  return <CalendarioClient procesos={procesos} />;
}
