import { listProcesos, obtenerProcesosPorRegion } from "@/lib/data/provider";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const preferredRegion = "gru1";
// Más alto que el resto: obtenerProcesosPorRegion pagina el catálogo completo de 3,316
// entidades (1 página + hasta 3 en paralelo, 15s de timeout cada una) en paralelo con
// listProcesos — el peor caso ronda los 30s, así que 30 justo quedaría sin margen.
export const maxDuration = 45;

export default async function DashboardPage() {
  const [procesos, procesosPorRegion] = await Promise.all([
    listProcesos(),
    obtenerProcesosPorRegion(),
  ]);

  return <DashboardClient procesos={procesos} procesosPorRegion={procesosPorRegion} />;
}
