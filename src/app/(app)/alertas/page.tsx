import { listProcesos } from "@/lib/data/provider";
import { AlertasClient } from "@/components/alertas/alertas-client";

export const preferredRegion = "gru1";
export const maxDuration = 30;

export default async function AlertasPage() {
  const procesos = await listProcesos();

  return <AlertasClient procesos={procesos} />;
}
