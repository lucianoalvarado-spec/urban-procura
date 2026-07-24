"use client";

import Link from "next/link";
import type { Proceso } from "@/lib/data/types";
import { ESTADOS_OPORTUNIDAD } from "@/lib/data/types";
import { useCrm } from "@/lib/state/crm-context";
import { formatDiasRestantes, formatMonto } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/card";
import { EstadoCrmSelect } from "@/components/crm/estado-crm-select";
import { UpgradeNotice } from "@/components/plan/upgrade-notice";
import { useProveedor } from "@/lib/state/proveedor-context";
import { cumplePlan } from "@/lib/plan";

export function OportunidadesClient({ procesos }: { procesos: Proceso[] }) {
  const { estados } = useCrm();
  const { proveedor } = useProveedor();
  const total = Object.keys(estados).length;

  if (!cumplePlan(proveedor.plan, "profesional")) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Mis oportunidades</h1>
        <UpgradeNotice minimo="profesional">
          El CRM de oportunidades (seguimiento por estado) es parte del plan Profesional.
        </UpgradeNotice>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Mis oportunidades</h1>
        <p className="text-sm text-slate-500">
          {total === 0
            ? "Aún no tienes procesos en seguimiento. Marca un estado desde el explorador o la ficha del proceso."
            : `${total} proceso(s) en seguimiento — ¿en qué etapa está cada uno?`}
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {ESTADOS_OPORTUNIDAD.map((columna) => {
          const procesosColumna = procesos.filter((p) => estados[p.id] === columna.value);
          return (
            <div key={columna.value} className="w-72 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {columna.label}
                </p>
                <span className="text-xs text-slate-400">{procesosColumna.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {procesosColumna.map((proceso) => (
                  <Card key={proceso.id}>
                    <CardBody className="space-y-2">
                      <Link
                        href={`/procesos/${proceso.id}`}
                        className="line-clamp-2 text-sm font-medium text-[var(--foreground)] hover:underline"
                      >
                        {proceso.objeto}
                      </Link>
                      <p className="text-xs text-slate-500">{proceso.entidad}</p>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{formatMonto(proceso.montoReferencial)}</span>
                        <span className="font-medium text-amber-700">
                          {formatDiasRestantes(proceso.fechaLimitePresentacion)}
                        </span>
                      </div>
                      <EstadoCrmSelect procesoId={proceso.id} />
                    </CardBody>
                  </Card>
                ))}
                {procesosColumna.length === 0 && (
                  <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-center text-xs text-slate-400">
                    Vacío
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
