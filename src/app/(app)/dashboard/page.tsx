import { listProcesos } from "@/lib/data/provider";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const preferredRegion = "gru1";

export default async function DashboardPage() {
  const procesos = await listProcesos();

  return <DashboardClient procesos={procesos} />;
}
