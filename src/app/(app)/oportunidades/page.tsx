import { listProcesos } from "@/lib/data/provider";
import { OportunidadesClient } from "@/components/oportunidades/oportunidades-client";

export const preferredRegion = "gru1";
export const maxDuration = 30;

export default async function OportunidadesPage() {
  const procesos = await listProcesos();

  return <OportunidadesClient procesos={procesos} />;
}
