import { getDataMode } from "@/lib/data/provider";

export function DemoBanner() {
  const mode = getDataMode();

  if (mode === "live") return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800 md:px-6">
      Estás viendo datos de muestra (modo demo). Todavía no hay conexión con fuentes reales del
      SEACE/OECE.
    </div>
  );
}
