import { listProcesos, obtenerProcesosPorRegion } from "@/lib/data/provider";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const preferredRegion = "gru1";

export default async function DashboardPage() {
  const [procesos, procesosPorRegion] = await Promise.all([
    listProcesos(),
    obtenerProcesosPorRegion(),
  ]);

  return <DashboardClient procesos={procesos} procesosPorRegion={procesosPorRegion} />;
}
