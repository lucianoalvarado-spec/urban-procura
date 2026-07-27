import { listProcesos } from "@/lib/data/provider";
import { CalendarioClient } from "@/components/calendario/calendario-client";

export const preferredRegion = "gru1";
export const maxDuration = 30;

export default async function CalendarioPage() {
  const procesos = await listProcesos();

  return <CalendarioClient procesos={procesos} />;
}
