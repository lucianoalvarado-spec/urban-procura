import { listProcesos } from "@/lib/data/provider";
import { ComparadorClient } from "@/components/comparador/comparador-client";

export const preferredRegion = "gru1";
export const maxDuration = 30;

export default async function ComparadorPage() {
  const procesos = await listProcesos();

  return <ComparadorClient procesosIniciales={procesos} />;
}
