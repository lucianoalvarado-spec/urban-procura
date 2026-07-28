"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Proceso, Region } from "@/lib/data/types";
import { useProveedor } from "@/lib/state/proveedor-context";
import { useCrm } from "@/lib/state/crm-context";
import { computeMatch } from "@/lib/data/matching";
import { diasRestantes, formatDiasRestantes, formatFecha, formatMonto } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { MatchBadge } from "@/components/ui/badge";
import { UpgradeNotice } from "@/components/plan/upgrade-notice";
import { cumplePlan } from "@/lib/plan";
import { PeruMapCard } from "@/components/dashboard/peru-map-card";

const ESTADOS_ACTIVOS = new Set(["Convocado", "En proceso de selección"]);
const LIMITE_PLAN_FREE = 2;

export function DashboardClient({
  procesos,
  procesosPorRegion,
}: {
  procesos: Proceso[];
  procesosPorRegion: Partial<Record<Region, number>> | null;
}) {
  const { proveedor } = useProveedor();
  const { estados } = useCrm();
  const puedeMatchCrm = cumplePlan(proveedor.plan, "profesional");
  const limitadoPorPlan = proveedor.plan === "free";

  const matches = useMemo(
    () =>
      procesos
        .map((proceso) => ({ proceso, match: computeMatch(proceso, proveedor) }))
        .sort((a, b) => b.match.score - a.match.score),
    [procesos, proveedor]
  );

  const activos = procesos.filter((p) => ESTADOS_ACTIVOS.has(p.estado));

  const porVencer = activos
    .filter((p) => {
      const dias = diasRestantes(p.fechaLimitePresentacion);
      return dias >= 0 && dias <= 7;
    })
    .sort(
      (a, b) =>
        diasRestantes(a.fechaLimitePresentacion) - diasRestantes(b.fechaLimitePresentacion)
    );

  const guardados = Object.keys(estados).length;
  const mejorMatch = matches[0];

  const recomendados = matches
    .filter(
      ({ proceso, match }) =>
        ESTADOS_ACTIVOS.has(proceso.estado) &&
        match.nivel !== "bajo" &&
        diasRestantes(proceso.fechaLimitePresentacion) >= 0
    )
    .slice(0, 5);

  const primerNombre = proveedor.representanteLegal.split(" ")[0];

  const seguimientoUrgente = Object.entries(estados)
    .map(([procesoId, estado]) => ({
      proceso: procesos.find((p) => p.id === procesoId),
      estado,
    }))
    .filter(
      (item): item is { proceso: Proceso; estado: (typeof estados)[string] } =>
        Boolean(item.proceso) &&
        (item.estado === "interesado" || item.estado === "preparando_oferta") &&
        diasRestantes(item.proceso!.fechaLimitePresentacion) >= 0 &&
        diasRestantes(item.proceso!.fechaLimitePresentacion) <= 10
    )
    .sort(
      (a, b) =>
        diasRestantes(a.proceso.fechaLimitePresentacion) -
        diasRestantes(b.proceso.fechaLimitePresentacion)
    );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Hola, {primerNombre}</h1>
        <p className="text-sm text-slate-500">
          Esto es lo que vale la pena mirar hoy, {formatFecha(new Date().toISOString().slice(0, 10))}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Procesos activos" value={String(activos.length)} hint="Convocados o en selección" />
        <Kpi
          label="Mejor match del momento"
          value={puedeMatchCrm ? (mejorMatch ? `${mejorMatch.match.score}%` : "—") : "🔒"}
          hint={puedeMatchCrm ? (mejorMatch ? mejorMatch.proceso.entidad : "Sin datos") : "Plan Profesional+"}
        />
        <Kpi
          label="Por vencer (≤7 días)"
          value={String(porVencer.length)}
          hint="Presentación de ofertas"
        />
        <Kpi
          label="Guardados en CRM"
          value={puedeMatchCrm ? String(guardados) : "🔒"}
          hint={puedeMatchCrm ? "En seguimiento activo" : "Plan Profesional+"}
        />
      </div>

      <PeruMapCard datos={procesosPorRegion} />

      {puedeMatchCrm ? (
        <Card>
          <CardHeader
            title="¿Qué deberías hacer hoy?"
            subtitle="Acciones priorizadas según tus preferencias y tu seguimiento"
          />
          <CardBody className="space-y-3">
            {seguimientoUrgente.length === 0 && recomendados.length === 0 && (
              <p className="text-sm text-slate-500">
                No hay urgencias por ahora. Explora el{" "}
                <Link href="/explorador" className="text-[var(--brand-600)] underline">
                  explorador
                </Link>{" "}
                para encontrar nuevas oportunidades.
              </p>
            )}
            {seguimientoUrgente.map(({ proceso, estado }) => (
              <AccionItem
                key={proceso.id}
                tono="urgente"
                texto={
                  <>
                    Tienes <strong>{proceso.id}</strong> marcado como &ldquo;
                    {estado === "interesado" ? "interesado" : "preparando oferta"}&rdquo; y{" "}
                    {formatDiasRestantes(proceso.fechaLimitePresentacion).toLowerCase()}.
                  </>
                }
                href={`/procesos/${proceso.id}`}
              />
            ))}
            {recomendados.slice(0, 3).map(({ proceso, match }) => (
              <AccionItem
                key={proceso.id}
                tono="oportunidad"
                texto={
                  <>
                    <strong>{proceso.id}</strong> tiene {match.score}% de compatibilidad con tu
                    perfil y {formatDiasRestantes(proceso.fechaLimitePresentacion).toLowerCase()}.
                  </>
                }
                href={`/procesos/${proceso.id}`}
              />
            ))}
          </CardBody>
        </Card>
      ) : (
        <UpgradeNotice minimo="profesional">
          El resumen de &ldquo;qué hacer hoy&rdquo; usa matching inteligente para priorizar tus
          acciones.
        </UpgradeNotice>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recomendados para ti" subtitle="Mejor match según tus preferencias" />
          <CardBody className="space-y-3">
            {!puedeMatchCrm && (
              <UpgradeNotice minimo="profesional">
                Las recomendaciones por compatibilidad son parte del plan Profesional.
              </UpgradeNotice>
            )}
            {puedeMatchCrm && recomendados.length === 0 && (
              <p className="text-sm text-slate-500">
                Ajusta tus{" "}
                <Link href="/perfil" className="text-[var(--brand-600)] underline">
                  preferencias
                </Link>{" "}
                para ver recomendaciones aquí.
              </p>
            )}
            {puedeMatchCrm &&
              recomendados.map(({ proceso, match }) => (
                <Link
                  key={proceso.id}
                  href={`/procesos/${proceso.id}`}
                  className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-muted)]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{proceso.objeto}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {proceso.entidad} · {formatMonto(proceso.montoReferencial)}
                    </p>
                  </div>
                  <MatchBadge nivel={match.nivel} score={match.score} />
                </Link>
              ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Procesos por vencer" subtitle="Presentación de ofertas en los próximos 7 días" />
          <CardBody className="space-y-3">
            {porVencer.length === 0 && (
              <p className="text-sm text-slate-500">No hay plazos críticos esta semana.</p>
            )}
            {(limitadoPorPlan ? porVencer.slice(0, LIMITE_PLAN_FREE) : porVencer).map((proceso) => (
              <Link
                key={proceso.id}
                href={`/procesos/${proceso.id}`}
                className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-muted)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{proceso.objeto}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{proceso.entidad}</p>
                </div>
                <span className="shrink-0 text-xs font-medium text-amber-700">
                  {formatDiasRestantes(proceso.fechaLimitePresentacion)}
                </span>
              </Link>
            ))}
            {limitadoPorPlan && porVencer.length > LIMITE_PLAN_FREE && (
              <UpgradeNotice minimo="basico">
                Hay {porVencer.length - LIMITE_PLAN_FREE} plazo(s) más que no se muestran en el
                plan Free.
              </UpgradeNotice>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{value}</p>
        <p className="mt-0.5 truncate text-xs text-slate-400">{hint}</p>
      </CardBody>
    </Card>
  );
}

function AccionItem({
  texto,
  href,
  tono,
}: {
  texto: React.ReactNode;
  href: string;
  tono: "urgente" | "oportunidad";
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-[var(--border)] p-3 text-sm transition-colors hover:bg-[var(--surface-muted)]"
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${
          tono === "urgente" ? "bg-red-500" : "bg-[var(--brand-500)]"
        }`}
      />
      <span className="text-slate-700">{texto}</span>
    </Link>
  );
}
