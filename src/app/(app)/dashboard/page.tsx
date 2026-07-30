import {
  listProcesos,
  obtenerProcedimientosTop5,
  obtenerProcesosActivosPorRegion,
} from "@/lib/data/provider";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const preferredRegion = "gru1";
// Más alto que el resto: obtenerProcesosActivosPorRegion pagina el catálogo completo de
// 3,316 entidades y además trae una muestra de 5,000 procesos del año en curso, en
// paralelo con listProcesos y obtenerProcedimientosTop5 (esta última es liviana, no
// cambia el peor caso) — el peor caso ronda los 30s, así que 30 justo quedaría sin
// margen.
export const maxDuration = 45;

export default async function DashboardPage() {
  const [procesos, procesosPorRegion, procedimientosTop5] = await Promise.all([
    listProcesos(),
    obtenerProcesosActivosPorRegion(),
    obtenerProcedimientosTop5(),
  ]);

  return (
    <DashboardClient
      procesos={procesos}
      procesosPorRegion={procesosPorRegion}
      procedimientosTop5={procedimientosTop5}
    />
  );
}
