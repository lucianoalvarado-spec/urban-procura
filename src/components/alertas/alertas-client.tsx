"use client";

import Link from "next/link";
import type { Categoria, Proceso } from "@/lib/data/types";
import { CATEGORIAS } from "@/lib/data/constants";
import { useProveedor } from "@/lib/state/proveedor-context";
import { computeMatch } from "@/lib/data/matching";
import { usePreferenciasAlertas, setPreferenciasAlertas } from "@/lib/state/alertas-store";
import {
  reconocerCambio,
  quitarVigilancia,
  useProcesosVigilados,
} from "@/lib/state/alertas-procesos-store";
import { diasRestantes, formatFecha, formatMonto } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/card";
import { MatchBadge } from "@/components/ui/badge";
import { UpgradeNotice, LockedInline } from "@/components/plan/upgrade-notice";
import { cumplePlan } from "@/lib/plan";

const VENTANA_DIAS = 30;
const UMBRAL_URGENTE_DIAS = 2;

function urgenciaEstilo(dias: number): string {
  if (dias <= 3) return "border-l-4 border-l-red-500";
  if (dias <= 7) return "border-l-4 border-l-amber-500";
  return "border-l-4 border-l-[var(--brand-300)]";
}

export function AlertasClient({ procesos }: { procesos: Proceso[] }) {
  const { proveedor } = useProveedor();
  const prefs = usePreferenciasAlertas();
  const vigilados = useProcesosVigilados();
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

  // Procesos marcados con la campana en el Explorador (seguimiento individual, no por
  // rubro). Solo podemos comparar contra el lote de procesos ya cargado en esta
  // página — si el proceso vigilado no está en ese lote, mostramos igual la última
  // foto conocida en vez de fallar en silencio.
  const vigilanciasOrdenadas = Object.values(vigilados).sort(
    (a, b) => new Date(b.agregadoEn).getTime() - new Date(a.agregadoEn).getTime()
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Alertas</h1>
        <p className="text-sm text-slate-500">
          Vencimientos en los próximos {VENTANA_DIAS} días de los rubros que sigues.
        </p>
      </div>

      {vigilanciasOrdenadas.length > 0 && (
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">
              Procesos que sigo individualmente
            </h2>
            <p className="text-xs text-slate-500">
              Marcados con la campana 🔔 desde el Explorador. Sin envío de correo ni
              notificación push (no hay backend todavía) — el aviso aparece aquí la próxima
              vez que abras esta página.
            </p>
          </div>
          {vigilanciasOrdenadas.map((v) => {
            const actual = procesos.find((p) => p.id === v.procesoId);
            if (!actual) {
              return (
                <Card key={v.procesoId}>
                  <CardBody className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/procesos/${v.procesoId}`}
                        className="text-sm font-medium text-[var(--foreground)] hover:underline"
                      >
                        {v.objeto}
                      </Link>
                      <p className="text-xs text-slate-500">{v.entidad}</p>
                      <p className="text-xs text-amber-700">
                        No está en el lote actual del Explorador — abre la ficha para confirmar
                        su estado más reciente.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => quitarVigilancia(v.procesoId)}
                      className="shrink-0 text-xs font-medium text-slate-500 hover:text-slate-700"
                    >
                      Dejar de seguir
                    </button>
                  </CardBody>
                </Card>
              );
            }

            const dias = diasRestantes(actual.fechaLimitePresentacion);
            const cambioFecha = actual.fechaLimitePresentacion !== v.fechaConocida;
            const cambioEstado = actual.estado !== v.estadoConocido;
            const urgente = dias >= 0 && dias <= UMBRAL_URGENTE_DIAS;

            return (
              <Card
                key={v.procesoId}
                className={urgente ? "border-l-4 border-l-red-500" : undefined}
              >
                <CardBody className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/procesos/${actual.id}`}
                      className="text-sm font-semibold text-[var(--foreground)] hover:underline"
                    >
                      {actual.objeto}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {actual.entidad} · {actual.estado}
                    </p>
                    {(cambioFecha || cambioEstado) && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          {cambioFecha && cambioEstado
                            ? "Cambió la fecha y la etapa"
                            : cambioFecha
                              ? "Cambió la fecha límite"
                              : "Cambió de etapa"}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            reconocerCambio(actual.id, actual.fechaLimitePresentacion, actual.estado)
                          }
                          className="text-xs font-medium text-slate-500 hover:text-slate-700"
                        >
                          Marcar como visto
                        </button>
                      </div>
                    )}
                    {urgente && (
                      <p className="mt-1 text-xs font-semibold text-red-600">
                        {dias === 0 ? "Vence hoy" : `Faltan ${dias} día(s)`} — plazo por vencer
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-right">
                    <p className="text-xs text-slate-400">
                      {formatFecha(actual.fechaLimitePresentacion)}
                    </p>
                    <button
                      type="button"
                      onClick={() => quitarVigilancia(v.procesoId)}
                      title="Dejar de seguir"
                      className="text-slate-400 hover:text-red-600"
                    >
                      🔔
                    </button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

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
