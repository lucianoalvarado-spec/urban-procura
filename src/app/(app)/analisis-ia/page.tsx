import { listProcesos } from "@/lib/data/provider";
import { AnalisisIaClient } from "@/components/analisis-ia/analisis-ia-client";

export const preferredRegion = "gru1";
export const maxDuration = 30;

export default async function AnalisisIaPage() {
  const procesos = await listProcesos();

  return <AnalisisIaClient procesosSugeridos={procesos.slice(0, 6)} />;
}
