import { listProcesos } from "@/lib/data/provider";
import { OportunidadesClient } from "@/components/oportunidades/oportunidades-client";

export const preferredRegion = "gru1";
// 45 en vez de 30: listProcesos() -> buscarProcesosLive() enriquece las primeras 15
// tarjetas con un fetch de detalle adicional cada una (en paralelo) después del fetch
// de /search — en el peor caso suma hasta 30s entre ambos pasos.
export const maxDuration = 45;

export default async function OportunidadesPage() {
  const procesos = await listProcesos();

  return <OportunidadesClient procesos={procesos} />;
}
