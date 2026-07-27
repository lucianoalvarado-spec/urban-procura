"use client";

import Link from "next/link";
import type { Proceso } from "@/lib/data/types";
import { useProveedor } from "@/lib/state/proveedor-context";
import { computeMatch } from "@/lib/data/matching";
import { formatDiasRestantes, formatFecha, formatMonto } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/card";
import { MatchBadge } from "@/components/ui/badge";
import { UpgradeNotice, LockedInline } from "@/components/plan/upgrade-notice";
import { cumplePlan } from "@/lib/plan";
import { ProcesoSearchBox } from "@/components/shared/proceso-search-box";
import {
  MAX_COMPARADOS,
  agregarAComparador,
  quitarDeComparador,
  useComparadorSeleccion,
} from "@/lib/state/comparador-store";

export function ComparadorClient({ procesosIniciales }: { procesosIniciales: Proceso[] }) {
  const { proveedor } = useProveedor();
  // Compartido con el botón "+" del Explorador (comparador-store, persistido en
  // localStorage) — antes era useState local y un proceso agregado desde el
  // Explorador se perdía al navegar a esta página.
  const seleccionados = useComparadorSeleccion();
  const puedeMatch = cumplePlan(proveedor.plan, "profesional");

  if (!cumplePlan(proveedor.plan, "profesional")) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Comparador de procesos</h1>
        <UpgradeNotice minimo="profesional">
          Comparar procesos lado a lado es parte del plan Profesional.
        </UpgradeNotice>
      </div>
    );
  }

  const agregar = agregarAComparador;
  const quitar = quitarDeComparador;
  const lleno = seleccionados.length >= MAX_COMPARADOS;

  const filas: { label: string; render: (proceso: Proceso) => React.ReactNode }[] = [
    { label: "Entidad", render: (p) => p.entidad },
    { label: "Región", render: (p) => p.region },
    { label: "Categoría", render: (p) => `${p.categoria} / ${p.subcategoria}` },
    { label: "Valor referencial", render: (p) => formatMonto(p.montoReferencial) },
    {
      label: "Plazo",
      render: (p) => (
        <>
          {formatFecha(p.fechaLimitePresentacion)}
          <br />
          <span className="text-xs text-slate-400">
            {formatDiasRestantes(p.fechaLimitePresentacion)}
          </span>
        </>
      ),
    },
    { label: "Etapa", render: (p) => p.estado },
    { label: "Tipo de procedimiento", render: (p) => p.tipoProcedimiento },
    {
      label: "Compatibilidad",
      render: (p) =>
        puedeMatch ? (
          <MatchBadge {...computeMatch(p, proveedor)} />
        ) : (
          <LockedInline minimo="profesional" />
        ),
    },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Comparador de procesos</h1>
        <p className="text-sm text-slate-500">
          Elige hasta {MAX_COMPARADOS} procesos para verlos lado a lado.
        </p>
      </div>

      <Card>
        <CardBody className="space-y-2">
          {lleno ? (
            <p className="text-sm text-amber-700">
              Ya elegiste {MAX_COMPARADOS} procesos — quita alguno para agregar otro.
            </p>
          ) : (
            <ProcesoSearchBox
              onSelect={agregar}
              excludeIds={seleccionados.map((p) => p.id)}
              placeholder="Buscar un proceso para agregar a la comparación…"
            />
          )}
          {!lleno && procesosIniciales.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs text-slate-400">O agrega del lote actual:</span>
              {procesosIniciales
                .filter((p) => !seleccionados.some((s) => s.id === p.id))
                .slice(0, 6)
                .map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => agregar(p)}
                    className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs text-slate-600 hover:bg-[var(--surface-muted)]"
                  >
                    + {p.objeto.slice(0, 40)}
                    {p.objeto.length > 40 ? "…" : ""}
                  </button>
                ))}
            </div>
          )}
        </CardBody>
      </Card>

      {seleccionados.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">
              Todavía no elegiste ningún proceso para comparar.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-40 border-b border-[var(--border)] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  &nbsp;
                </th>
                {seleccionados.map((p) => (
                  <th
                    key={p.id}
                    className="min-w-[220px] border-b border-l border-[var(--border)] px-4 py-3 text-left align-top"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/procesos/${p.id}`}
                        className="line-clamp-2 text-sm font-semibold text-[var(--foreground)] hover:underline"
                      >
                        {p.objeto}
                      </Link>
                      <button
                        type="button"
                        onClick={() => quitar(p.id)}
                        title="Quitar de la comparación"
                        className="shrink-0 text-slate-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.label}>
                  <td className="border-b border-[var(--border)] px-4 py-3 text-xs font-medium text-slate-500">
                    {fila.label}
                  </td>
                  {seleccionados.map((p) => (
                    <td
                      key={p.id}
                      className="border-b border-l border-[var(--border)] px-4 py-3 text-slate-700"
                    >
                      {fila.render(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
