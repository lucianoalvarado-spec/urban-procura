"use client";

import { useEffect, useState } from "react";
import type { AdjudicacionesResultado, PerfilEntidadOece } from "@/lib/data/provider";
import { formatFecha, formatMonto } from "@/lib/format";
import { useProveedor } from "@/lib/state/proveedor-context";
import { cumplePlan } from "@/lib/plan";
import { Card, CardBody } from "@/components/ui/card";
import { UpgradeNotice } from "@/components/plan/upgrade-notice";
import { EntitySelect } from "@/components/shared/entity-select";

interface HistorialEntidadResponse extends AdjudicacionesResultado {
  perfilEntidad: PerfilEntidadOece | null;
}

export function HistorialEntidadClient() {
  const { proveedor } = useProveedor();
  const [entidad, setEntidad] = useState("");
  const [resultado, setResultado] = useState<HistorialEntidadResponse | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!entidad) {
      setResultado(null);
      return;
    }
    let cancelado = false;
    setCargando(true);
    fetch(`/api/historial-entidad?entidad=${encodeURIComponent(entidad)}`)
      .then((r) => r.json())
      .then((data: HistorialEntidadResponse) => {
        if (!cancelado) setResultado(data);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [entidad]);

  if (!cumplePlan(proveedor.plan, "profesional")) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Historial de la entidad</h1>
        <UpgradeNotice minimo="profesional">
          El historial de adjudicaciones por entidad es parte del plan Profesional.
        </UpgradeNotice>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Historial de la entidad</h1>
        <p className="text-sm text-slate-500">¿Cómo compra esta entidad normalmente?</p>
      </div>

      <Card>
        <CardBody>
          <EntitySelect
            label="Entidad contratante"
            value={entidad}
            onChange={setEntidad}
            placeholder="Escribe para buscar una entidad (ej. municipalidad, ministerio)"
          />
        </CardBody>
      </Card>

      {!entidad && (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">Elige una entidad para ver su historial.</p>
          </CardBody>
        </Card>
      )}

      {entidad && resultado?.perfilEntidad && (
        <Card>
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Monto histórico contratado
              </p>
              <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                {formatMonto(resultado.perfilEntidad.totalContratado)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Último proceso publicado
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {resultado.perfilEntidad.ultimoProceso
                  ? formatFecha(resultado.perfilEntidad.ultimoProceso)
                  : "No disponible"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contacto</p>
              <p className="mt-1 text-sm text-slate-600">
                {resultado.perfilEntidad.telefono ?? "Teléfono no publicado"}
              </p>
              {resultado.perfilEntidad.web && (
                <a
                  href={
                    resultado.perfilEntidad.web.startsWith("http")
                      ? resultado.perfilEntidad.web
                      : `https://${resultado.perfilEntidad.web}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 block text-xs text-[var(--brand-600)] underline"
                >
                  {resultado.perfilEntidad.web}
                </a>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {entidad && resultado && (
        <>
          {resultado.fuente === "live" ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Adjudicaciones reales del Portal de Contrataciones Abiertas del OECE para{" "}
              <strong>{entidad}</strong>.
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No pudimos obtener adjudicaciones reales para esta entidad — estás viendo datos de
              muestra{resultado.adjudicaciones.length === 0 ? " (tampoco hay para esta entidad en la muestra)" : ""}.
            </div>
          )}

          <div className="flex flex-col gap-2">
            {cargando ? (
              <Card>
                <CardBody>
                  <p className="text-sm text-slate-400">Buscando…</p>
                </CardBody>
              </Card>
            ) : resultado.adjudicaciones.length === 0 ? (
              <Card>
                <CardBody>
                  <p className="text-sm text-slate-500">
                    No encontramos adjudicaciones registradas para esta entidad.
                  </p>
                </CardBody>
              </Card>
            ) : (
              resultado.adjudicaciones.map((a) => (
                <Card key={a.procesoId}>
                  <CardBody className="flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-[var(--foreground)]">{a.objeto}</p>
                      <span className="shrink-0 text-xs font-medium text-slate-400">
                        {formatFecha(a.fecha)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Ganador: <span className="font-medium text-slate-700">{a.proveedorGanador}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatMonto(a.montoAdjudicado)} · {a.categoria} · {a.tipoProcedimiento}
                    </p>
                  </CardBody>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
