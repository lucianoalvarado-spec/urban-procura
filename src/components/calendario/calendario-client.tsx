"use client";

import Link from "next/link";
import type { Proceso } from "@/lib/data/types";
import { useProveedor } from "@/lib/state/proveedor-context";
import { diasRestantes, formatFecha, formatMonto } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/card";
import { UpgradeNotice } from "@/components/plan/upgrade-notice";
import { cumplePlan } from "@/lib/plan";

const UMBRAL_URGENTE_DIAS = 14;

interface GrupoMes {
  clave: string;
  etiqueta: string;
  items: { proceso: Proceso; dias: number }[];
}

function agruparPorMes(procesos: { proceso: Proceso; dias: number }[]): GrupoMes[] {
  const grupos = new Map<string, GrupoMes>();
  for (const item of procesos) {
    const fecha = new Date(item.proceso.fechaLimitePresentacion);
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
    const etiqueta = fecha.toLocaleDateString("es-PE", { month: "long", year: "numeric" });
    if (!grupos.has(clave)) grupos.set(clave, { clave, etiqueta, items: [] });
    grupos.get(clave)!.items.push(item);
  }
  return Array.from(grupos.values()).sort((a, b) => a.clave.localeCompare(b.clave));
}

export function CalendarioClient({ procesos }: { procesos: Proceso[] }) {
  const { proveedor } = useProveedor();

  if (!cumplePlan(proveedor.plan, "profesional")) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Calendario de plazos</h1>
        <UpgradeNotice minimo="profesional">
          El calendario de plazos agrupado por mes es parte del plan Profesional.
        </UpgradeNotice>
      </div>
    );
  }

  const relevantes = procesos
    .filter((p) => proveedor.preferencias.rubros.includes(p.categoria))
    .map((proceso) => ({ proceso, dias: diasRestantes(proceso.fechaLimitePresentacion) }))
    .filter(({ dias }) => dias >= 0)
    .sort((a, b) => a.dias - b.dias);

  const grupos = agruparPorMes(relevantes);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Calendario de plazos</h1>
        <p className="text-sm text-slate-500">
          Fechas límite de presentación agrupadas por mes, para los rubros de tu perfil (
          {proveedor.preferencias.rubros.join(", ") || "ninguno configurado"}).
        </p>
      </div>

      {grupos.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">
              No hay plazos próximos para los rubros configurados en tus preferencias. Ajusta tus
              rubros de interés desde el Perfil del proveedor.
            </p>
          </CardBody>
        </Card>
      ) : (
        grupos.map((grupo) => (
          <div key={grupo.clave} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold capitalize text-[var(--foreground)]">
              {grupo.etiqueta}
            </h2>
            <div className="flex flex-col gap-2">
              {grupo.items.map(({ proceso, dias }) => (
                <Card
                  key={proceso.id}
                  className={dias <= UMBRAL_URGENTE_DIAS ? "border-l-4 border-l-amber-500" : undefined}
                >
                  <CardBody className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/procesos/${proceso.id}`}
                        className="text-sm font-medium text-[var(--foreground)] hover:underline"
                      >
                        {proceso.objeto}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {proceso.entidad} · {formatMonto(proceso.montoReferencial)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium text-slate-700">
                        {formatFecha(proceso.fechaLimitePresentacion)}
                      </p>
                      {dias <= UMBRAL_URGENTE_DIAS && (
                        <span className="text-xs font-semibold text-amber-700">
                          {dias === 0 ? "Vence hoy" : `En ${dias} días`} · plazo próximo
                        </span>
                      )}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
