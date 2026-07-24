import { listProcesos } from "@/lib/data/provider";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export default async function DashboardPage() {
  const procesos = await listProcesos();

  return <DashboardClient procesos={procesos} />;
}
