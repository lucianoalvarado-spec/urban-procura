"use client";

import { useMemo, useState } from "react";
import { PERU_REGIONES_SVG, PERU_MAPA_VIEWBOX } from "@/lib/data/peru-map";
import type { Region } from "@/lib/data/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

// Escala en 5 baldes por ranking (no por valor lineal): Lima concentra ~1.19M de los
// ~2.7M de procesos históricos del país, así que una escala lineal dejaría casi todo el
// mapa en blanco. Por ranking, el color siempre se reparte visiblemente sin importar
// cuán desigual sea la distribución real.
const ESCALA_COLOR = [
  "#eef2ff", // brand-50
  "#e0e7ff", // brand-100
  "#a5b4fc",
  "#4f46e5", // brand-500
  "#3730a3", // brand-700
];

function formatMiles(n: number): string {
  return n.toLocaleString("es-PE");
}

export function PeruMapCard({ datos }: { datos: Partial<Record<Region, number>> | null }) {
  // "Opción 1" de vistas del Dashboard — el switch queda armado para que agregar una
  // opción 2 (ej. lista/ranking) más adelante sea sumar una entrada aquí, no rehacer el
  // componente.
  const OPCIONES_VISTA = ["Mapa de regiones"] as const;
  const [vistaActiva, setVistaActiva] = useState<(typeof OPCIONES_VISTA)[number] | null>(
    OPCIONES_VISTA[0]
  );
  const [seleccion, setSeleccion] = useState<Region | null>(null);

  const colorDeRegion = useMemo(() => {
    if (!datos) return new Map<Region, string>();
    const entradas = Object.entries(datos) as [Region, number][];
    const ordenadas = [...entradas].sort((a, b) => a[1] - b[1]);
    const mapa = new Map<Region, string>();
    ordenadas.forEach(([region], i) => {
      const balde = Math.min(
        ESCALA_COLOR.length - 1,
        Math.floor((i / ordenadas.length) * ESCALA_COLOR.length)
      );
      mapa.set(region, ESCALA_COLOR[balde]);
    });
    return mapa;
  }, [datos]);

  return (
    <Card>
      <CardHeader
        title="Procesos de contratación por región"
        subtitle="Histórico OECE (todos los años) por región de la entidad convocante"
        action={
          <div className="flex items-center gap-2">
            {OPCIONES_VISTA.map((opcion) => (
              <button
                key={opcion}
                type="button"
                onClick={() => setVistaActiva(vistaActiva === opcion ? null : opcion)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  vistaActiva === opcion
                    ? "border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)]"
                    : "border-[var(--border)] text-slate-500 hover:bg-[var(--surface-muted)]"
                }`}
              >
                {opcion} {vistaActiva === opcion ? "· activo" : ""}
              </button>
            ))}
          </div>
        }
      />
      {vistaActiva === "Mapa de regiones" && (
        <CardBody>
          {!datos ? (
            <p className="text-sm text-slate-500">
              No pudimos traer el desglose por región del Portal de Contrataciones Abiertas del
              OECE ahora mismo. Intenta más tarde.
            </p>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <svg
                viewBox={PERU_MAPA_VIEWBOX}
                className="h-auto w-full max-w-[280px] shrink-0"
                role="img"
                aria-label="Mapa del Perú por región"
              >
                {PERU_REGIONES_SVG.map(({ region, path }) => (
                  <path
                    key={region}
                    d={path}
                    fill={
                      seleccion === region
                        ? "var(--brand-700)"
                        : (colorDeRegion.get(region) ?? "var(--surface-muted)")
                    }
                    stroke="var(--surface)"
                    strokeWidth={1}
                    className="cursor-pointer transition-colors"
                    onMouseEnter={() => setSeleccion(region)}
                    onClick={() => setSeleccion(region)}
                  >
                    <title>
                      {`${region}${
                        datos[region] !== undefined
                          ? `: ${formatMiles(datos[region] as number)} procesos`
                          : ": sin datos"
                      }`}
                    </title>
                  </path>
                ))}
              </svg>

              <div className="flex-1 space-y-3">
                {seleccion ? (
                  <div className="rounded-lg border border-[var(--border)] p-3">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{seleccion}</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--brand-600)]">
                      {datos[seleccion] !== undefined ? formatMiles(datos[seleccion] as number) : "—"}
                    </p>
                    <p className="text-xs text-slate-500">procesos de contratación históricos</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    Pasa el cursor o toca una región para ver su detalle.
                  </p>
                )}

                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-500">Menos → más procesos</p>
                  <div className="flex h-3 overflow-hidden rounded-full">
                    {ESCALA_COLOR.map((color) => (
                      <span key={color} className="flex-1" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  Calculado sumando el histórico de procesos por entidad (catálogo de ~3,316
                  entidades del OECE), agrupado por el departamento registrado de cada una.
                </p>
              </div>
            </div>
          )}
        </CardBody>
      )}
    </Card>
  );
}
