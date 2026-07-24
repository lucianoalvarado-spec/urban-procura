import { listProcesos } from "@/lib/data/provider";
import { OportunidadesClient } from "@/components/oportunidades/oportunidades-client";

export default async function OportunidadesPage() {
  const procesos = await listProcesos();

  return <OportunidadesClient procesos={procesos} />;
}
