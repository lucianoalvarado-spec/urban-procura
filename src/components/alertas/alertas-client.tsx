"use client";

import Link from "next/link";
import type { Categoria, Proceso } from "@/lib/data/types";
import { CATEGORIAS } from "@/lib/data/constants";
import { useProveedor } from "@/lib/state/proveedor-context";
import { computeMatch } from "@/lib/data/matching";
import { usePreferenciasAlertas, setPreferenciasAlertas } from "@/lib/state/alertas-store";
import { diasRestantes, formatFecha, formatMonto } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/card";
import { MatchBadge } from "@/components/ui/badge";
import { UpgradeNotice, LockedInline } from "@/components/plan/upgrade-notice";
import { cumplePlan } from "@/lib/plan";

const VENTANA_DIAS = 30;

function urgenciaEstilo(dias: number): string {
  if (dias <= 3) return "border-l-4 border-l-red-500";
  if (dias <= 7) return "border-l-4 border-l-amber-500";
  return "border-l-4 border-l-[var(--brand-300)]";
}

export function AlertasClient({ procesos }: { procesos: Proceso[] }) {
  const { proveedor } = useProveedor();
  const prefs = usePreferenciasAlertas();
  const puedeMatch = cumplePlan(proveedor.plan, "profesional");

  if (!cumplePlan(proveedor.plan, "profesional")) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Alertas</h1>
        <UpgradeNotice minimo="profesional">
          Las alertas de vencimientos próximos son parte del plan Profesional.
        </UpgradeNotice>
      </div>
    );
  }

  const toggleRubro = (rubro: Categoria) => {
    const activo = prefs.rubrosSeguidos.includes(rubro);
    setPreferenciasAlertas({
      ...prefs,
      rubrosSeguidos: activo
        ? prefs.rubrosSeguidos.filter((r) => r !== rubro)
        : [...prefs.rubrosSeguidos, rubro],
    });
  };

  const relevantes = procesos
    .filter((p) => prefs.rubrosSeguidos.includes(p.categoria))
    .map((proceso) => ({ proceso, match: computeMatch(proceso, proveedor), dias: diasRestantes(proceso.fechaLimitePresentacion) }))
    .filter(({ dias }) => dias >= 0 && dias <= VENTANA_DIAS)
    .filter(({ match }) => !prefs.soloAltaCompatibilidad || match.nivel === "alto")
    .sort((a, b) => a.dias - b.dias);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Alertas</h1>
        <p className="text-sm text-slate-500">
          Vencimientos en los próximos {VENTANA_DIAS} días de los rubros que sigues.
        </p>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Rubros que sigo
            </p>
            <div className="flex flex-wrap gap-3">
              {CATEGORIAS.map((rubro) => (
                <label key={rubro} className="flex items-center gap-1.5 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={prefs.rubrosSeguidos.includes(rubro)}
                    onChange={() => toggleRubro(rubro)}
                    className="h-4 w-4 rounded border-[var(--border)] text-[var(--brand-600)]"
                  />
                  {rubro}
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-[var(--border)] pt-3">
            <input
              type="checkbox"
              id="solo-alta-compat"
              checked={prefs.soloAltaCompatibilidad}
              onChange={(e) =>
                setPreferenciasAlertas({ ...prefs, soloAltaCompatibilidad: e.target.checked })
              }
              disabled={!puedeMatch}
              className="h-4 w-4 rounded border-[var(--border)] text-[var(--brand-600)]"
            />
            <label htmlFor="solo-alta-compat" className="text-sm text-slate-600">
              Mostrar solo procesos de match alto
            </label>
            {!puedeMatch && <LockedInline minimo="profesional" />}
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-col gap-3">
        {relevantes.length === 0 && (
          <Card>
            <CardBody>
              <p className="text-sm text-slate-500">
                {prefs.rubrosSeguidos.length === 0
                  ? "Elige al menos un rubro para seguir arriba."
                  : `Sin vencimientos en los próximos ${VENTANA_DIAS} días para los rubros y filtros elegidos.`}
              </p>
            </CardBody>
          </Card>
        )}
        {relevantes.map(({ proceso, match, dias }) => (
          <Card key={proceso.id} className={urgenciaEstilo(dias)}>
            <CardBody className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/procesos/${proceso.id}`}
                    className="text-sm font-semibold text-[var(--foreground)] hover:underline"
                  >
                    {proceso.objeto}
                  </Link>
                  <MatchBadge nivel={match.nivel} score={match.score} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {proceso.entidad} · {proceso.categoria} · {formatMonto(proceso.montoReferencial)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={
                    dias <= 3
                      ? "text-sm font-semibold text-red-600"
                      : dias <= 7
                        ? "text-sm font-semibold text-amber-700"
                        : "text-sm font-medium text-slate-600"
                  }
                >
                  {dias === 0 ? "Vence hoy" : `Vence en ${dias} días`}
                </p>
                <p className="text-xs text-slate-400">{formatFecha(proceso.fechaLimitePresentacion)}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
