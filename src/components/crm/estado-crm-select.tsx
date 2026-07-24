"use client";

import { useCrm } from "@/lib/state/crm-context";
import { ESTADOS_OPORTUNIDAD, type EstadoOportunidad } from "@/lib/data/types";

export function EstadoCrmSelect({ procesoId }: { procesoId: string }) {
  const { getEstado, setEstado } = useCrm();
  const actual = getEstado(procesoId);

  return (
    <select
      value={actual ?? ""}
      onChange={(e) => {
        const value = e.target.value as EstadoOportunidad | "";
        setEstado(procesoId, value === "" ? null : value);
      }}
      onClick={(e) => e.preventDefault()}
      className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-slate-600 focus:border-[var(--brand-500)] focus:outline-none"
    >
      <option value="">Sin seguimiento</option>
      {ESTADOS_OPORTUNIDAD.map((estado) => (
        <option key={estado.value} value={estado.value}>
          {estado.label}
        </option>
      ))}
    </select>
  );
}
