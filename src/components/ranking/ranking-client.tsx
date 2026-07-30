"use client";

import { useEffect, useMemo, useState } from "react";
import type { Categoria } from "@/lib/data/types";
import type { AdjudicacionesResultado, TopProveedorHistorico } from "@/lib/data/provider";
import { CATEGORIAS } from "@/lib/data/constants";
import { formatMonto } from "@/lib/format";
import { useProveedor } from "@/lib/state/proveedor-context";
import { cumplePlan } from "@/lib/plan";
import { Card, CardBody } from "@/components/ui/card";
import { UpgradeNotice } from "@/components/plan/upgrade-notice";

interface FilaRanking {
  proveedor: string;
  cantidad: number;
  montoTotal: number;
}

function agregar(resultado: AdjudicacionesResultado): FilaRanking[] {
  const mapa = new Map<string, FilaRanking>();
  for (const a of resultado.adjudicaciones) {
    const actual = mapa.get(a.proveedorGanador) ?? {
      proveedor: a.proveedorGanador,
      cantidad: 0,
      montoTotal: 0,
    };
    actual.cantidad += 1;
    actual.montoTotal += a.montoAdjudicado ?? 0;
    mapa.set(a.proveedorGanador, actual);
  }
  return Array.from(mapa.values()).sort((a, b) => b.montoTotal - a.montoTotal);
}

const VISTAS = ["Por categoría (muestra reciente)", "Histórico completo"] as const;
type Vista = (typeof VISTAS)[number];

export function RankingClient({
  inicial,
  topHistorico,
}: {
  inicial: AdjudicacionesResultado;
  topHistorico: TopProveedorHistorico[] | null;
}) {
  const { proveedor } = useProveedor();
  const [vista, setVista] = useState<Vista>("Por categoría (muestra reciente)");
  const [categoria, setCategoria] = useState<Categoria | "">("");
  const [resultado, setResultado] = useState<AdjudicacionesResultado>(inicial);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (vista !== "Por categoría (muestra reciente)") return;
    let cancelado = false;
    setCargando(true);
    const params = categoria ? `?categoria=${encodeURIComponent(categoria)}` : "";
    fetch(`/api/ranking${params}`)
      .then((r) => r.json())
      .then((data: AdjudicacionesResultado) => {
        if (!cancelado) setResultado(data);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [categoria, vista]);

  const filas = useMemo(() => agregar(resultado), [resultado]);

  if (!cumplePlan(proveedor.plan, "profesional")) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Ranking de competidores</h1>
        <UpgradeNotice minimo="profesional">
          El ranking de competidores por categoría es parte del plan Profesional.
        </UpgradeNotice>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Ranking de competidores</h1>
        <p className="text-sm text-slate-500">¿Quién me está ganando y en qué categorías?</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {VISTAS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVista(v)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              vista === v
                ? "border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)]"
                : "border-[var(--border)] text-slate-500 hover:bg-[var(--surface-muted)]"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {vista === "Por categoría (muestra reciente)" ? (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoria("")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                categoria === ""
                  ? "bg-[var(--brand-600)] text-white"
                  : "border border-[var(--border)] text-slate-600"
              }`}
            >
              Todas
            </button>
            {CATEGORIAS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoria(c)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                  categoria === c
                    ? "bg-[var(--brand-600)] text-white"
                    : "border border-[var(--border)] text-slate-600"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {resultado.fuente === "live" ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Adjudicaciones reales del Portal de Contrataciones Abiertas del OECE.
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              No pudimos obtener adjudicaciones reales para este filtro — estás viendo datos de
              muestra.
            </div>
          )}

          <Card>
            <CardBody className="p-0">
              {cargando ? (
                <p className="px-5 py-6 text-center text-sm text-slate-400">Cargando…</p>
              ) : filas.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-slate-400">
                  Sin adjudicaciones para este filtro.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">#</th>
                      <th className="px-5 py-3">Empresa</th>
                      <th className="px-5 py-3 text-right">Procesos ganados</th>
                      <th className="px-5 py-3 text-right">Monto acumulado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((fila, i) => (
                      <tr key={fila.proveedor} className="border-b border-[var(--border)] last:border-b-0">
                        <td className="px-5 py-3 text-slate-400">{i + 1}</td>
                        <td className="px-5 py-3 font-medium text-[var(--foreground)]">{fila.proveedor}</td>
                        <td className="px-5 py-3 text-right text-slate-600">{fila.cantidad}</td>
                        <td className="px-5 py-3 text-right text-slate-600">{formatMonto(fila.montoTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </>
      ) : (
        <>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            Ranking histórico completo — todas las categorías y años, sin filtrar. Calculado
            directamente por el Portal de Contrataciones Abiertas del OECE sobre el monto total
            contratado.
          </div>

          <Card>
            <CardBody className="p-0">
              {!topHistorico || topHistorico.length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-slate-400">
                  No pudimos traer el ranking histórico ahora mismo. Intenta más tarde.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">#</th>
                      <th className="px-5 py-3">Empresa</th>
                      <th className="px-5 py-3">RUC</th>
                      <th className="px-5 py-3 text-right">Monto contratado histórico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topHistorico.map((fila, i) => (
                      <tr key={fila.ruc} className="border-b border-[var(--border)] last:border-b-0">
                        <td className="px-5 py-3 text-slate-400">{i + 1}</td>
                        <td className="px-5 py-3 font-medium text-[var(--foreground)]">{fila.nombre}</td>
                        <td className="px-5 py-3 text-slate-500">{fila.ruc}</td>
                        <td className="px-5 py-3 text-right text-slate-600">{formatMonto(fila.totalContratado)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
