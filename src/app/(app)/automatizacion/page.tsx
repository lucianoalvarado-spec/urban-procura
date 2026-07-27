import { listProcesos } from "@/lib/data/provider";
import { AutomatizacionClient } from "@/components/automatizacion/automatizacion-client";

export const preferredRegion = "gru1";
export const maxDuration = 30;

export default async function AutomatizacionPage() {
  const procesos = await listProcesos();

  return <AutomatizacionClient procesosSugeridos={procesos.slice(0, 6)} />;
}
