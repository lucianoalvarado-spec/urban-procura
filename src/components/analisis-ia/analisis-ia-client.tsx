"use client";

import { useState } from "react";
import type { Proceso } from "@/lib/data/types";
import { useProveedor } from "@/lib/state/proveedor-context";
import { cumplePlan } from "@/lib/plan";
import { Card, CardBody } from "@/components/ui/card";
import { UpgradeNotice } from "@/components/plan/upgrade-notice";
import { ProcesoSearchBox } from "@/components/shared/proceso-search-box";
import { AnalisisBasesCard } from "@/components/analisis-ia/analisis-bases-card";
import { formatMonto } from "@/lib/format";

export function AnalisisIaClient({ procesosSugeridos }: { procesosSugeridos: Proceso[] }) {
  const { proveedor } = useProveedor();
  const [proceso, setProceso] = useState<Proceso | null>(null);

  if (!cumplePlan(proveedor.plan, "premium")) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Análisis de bases con IA</h1>
        <UpgradeNotice minimo="premium">
          El análisis automático de bases con IA es parte del plan Premium.
        </UpgradeNotice>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Análisis de bases con IA</h1>
        <p className="text-sm text-slate-500">Elige un proceso para analizar sus bases.</p>
      </div>

      {!proceso ? (
        <Card>
          <CardBody className="space-y-3">
            <ProcesoSearchBox onSelect={setProceso} />
            {procesosSugeridos.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-3">
                <span className="text-xs text-slate-400">O elige uno del lote actual:</span>
                {procesosSugeridos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProceso(p)}
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
                  >
                    <span className="font-medium text-[var(--foreground)]">{p.objeto}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      {p.entidad} · {formatMonto(p.montoReferencial)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">{proceso.entidad}</p>
              <p className="text-sm font-semibold text-[var(--foreground)]">{proceso.objeto}</p>
            </div>
            <button
              type="button"
              onClick={() => setProceso(null)}
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Cambiar proceso
            </button>
          </div>
          <AnalisisBasesCard proceso={proceso} />
        </>
      )}
    </div>
  );
}
