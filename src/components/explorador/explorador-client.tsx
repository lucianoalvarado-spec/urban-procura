"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Proceso } from "@/lib/data/types";
import { useProveedor } from "@/lib/state/proveedor-context";
import { computeMatch } from "@/lib/data/matching";
import { CATEGORIAS, ESTADOS_PROCESO, TIPOS_PROCEDIMIENTO } from "@/lib/data/constants";
import { formatDiasRestantes, formatMonto } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/card";
import { MatchBadge } from "@/components/ui/badge";
import { EstadoCrmSelect } from "@/components/crm/estado-crm-select";
import { UpgradeNotice, LockedInline } from "@/components/plan/upgrade-notice";
import { cumplePlan } from "@/lib/plan";

const LIMITE_PLAN_FREE = 5;

type Orden = "match" | "plazo" | "monto";

interface Filtros {
  query: string;
  region: string;
  entidad: string;
  categoria: string;
  subcategoria: string;
  tipoProcedimiento: string;
  estado: string;
  montoMin: string;
  montoMax: string;
}

const FILTROS_INICIALES: Filtros = {
  query: "",
  region: "",
  entidad: "",
  categoria: "",
  subcategoria: "",
  tipoProcedimiento: "",
  estado: "",
  montoMin: "",
  montoMax: "",
};

export function ExploradorClient({
  procesos,
  entidades,
  regiones,
}: {
  procesos: Proceso[];
  entidades: string[];
  regiones: string[];
}) {
  const { proveedor } = useProveedor();
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES);
  const [orden, setOrden] = useState<Orden>("match");
  const puedeMatchCrm = cumplePlan(proveedor.plan, "profesional");
  const limitadoPorPlan = proveedor.plan === "free";
  const ordenEfectivo = orden === "match" && !puedeMatchCrm ? "plazo" : orden;

  const subcategoriasDisponibles = useMemo(() => {
    const fuente = filtros.categoria
      ? procesos.filter((p) => p.categoria === filtros.categoria)
      : procesos;
    return Array.from(new Set(fuente.map((p) => p.subcategoria))).sort();
  }, [procesos, filtros.categoria]);

  const resultados = useMemo(() => {
    const montoMin = filtros.montoMin ? Number(filtros.montoMin) : undefined;
    const montoMax = filtros.montoMax ? Number(filtros.montoMax) : undefined;
    const query = filtros.query.trim().toLowerCase();

    const filtrados = procesos.filter((p) => {
      if (query) {
        const haystack = `${p.objeto} ${p.descripcion} ${p.entidad}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (filtros.region && p.region !== filtros.region) return false;
      if (filtros.entidad && p.entidad !== filtros.entidad) return false;
      if (filtros.categoria && p.categoria !== filtros.categoria) return false;
      if (filtros.subcategoria && p.subcategoria !== filtros.subcategoria) return false;
      if (filtros.tipoProcedimiento && p.tipoProcedimiento !== filtros.tipoProcedimiento)
        return false;
      if (filtros.estado && p.estado !== filtros.estado) return false;
      if (typeof montoMin === "number" && p.montoReferencial < montoMin) return false;
      if (typeof montoMax === "number" && p.montoReferencial > montoMax) return false;
      return true;
    });

    const conMatch = filtrados.map((proceso) => ({
      proceso,
      match: computeMatch(proceso, proveedor),
    }));

    conMatch.sort((a, b) => {
      if (ordenEfectivo === "match") return b.match.score - a.match.score;
      if (ordenEfectivo === "monto") return b.proceso.montoReferencial - a.proceso.montoReferencial;
      return (
        new Date(a.proceso.fechaLimitePresentacion).getTime() -
        new Date(b.proceso.fechaLimitePresentacion).getTime()
      );
    });

    return conMatch;
  }, [procesos, filtros, ordenEfectivo, proveedor]);

  const resultadosVisibles = limitadoPorPlan
    ? resultados.slice(0, LIMITE_PLAN_FREE)
    : resultados;

  const updateFiltro = <K extends keyof Filtros>(key: K, value: Filtros[K]) => {
    setFiltros((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "categoria" ? { subcategoria: "" } : {}),
    }));
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Explorador inteligente</h1>
        <p className="text-sm text-slate-500">
          {resultadosVisibles.length} de {procesos.length} procesos · ¿cuáles me convienen?
        </p>
      </div>

      <Card>
        <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            placeholder="Buscar por objeto, entidad o descripción"
            value={filtros.query}
            onChange={(e) => updateFiltro("query", e.target.value)}
            className="col-span-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--brand-500)] focus:outline-none"
          />
          <Select
            label="Región"
            value={filtros.region}
            onChange={(v) => updateFiltro("region", v)}
            options={regiones}
          />
          <Select
            label="Entidad"
            value={filtros.entidad}
            onChange={(v) => updateFiltro("entidad", v)}
            options={entidades}
          />
          <Select
            label="Categoría"
            value={filtros.categoria}
            onChange={(v) => updateFiltro("categoria", v)}
            options={CATEGORIAS}
          />
          <Select
            label="Subcategoría"
            value={filtros.subcategoria}
            onChange={(v) => updateFiltro("subcategoria", v)}
            options={subcategoriasDisponibles}
          />
          <Select
            label="Tipo de procedimiento"
            value={filtros.tipoProcedimiento}
            onChange={(v) => updateFiltro("tipoProcedimiento", v)}
            options={TIPOS_PROCEDIMIENTO}
          />
          <Select
            label="Estado"
            value={filtros.estado}
            onChange={(v) => updateFiltro("estado", v)}
            options={ESTADOS_PROCESO}
          />
          <div className="grid grid-cols-2 gap-2">
            <NumberInput
              label="Monto mín. (S/)"
              value={filtros.montoMin}
              onChange={(v) => updateFiltro("montoMin", v)}
            />
            <NumberInput
              label="Monto máx. (S/)"
              value={filtros.montoMax}
              onChange={(v) => updateFiltro("montoMax", v)}
            />
          </div>
          <div className="col-span-full flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => setFiltros(FILTROS_INICIALES)}
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Limpiar filtros
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Ordenar por</span>
              <select
                value={ordenEfectivo}
                onChange={(e) => setOrden(e.target.value as Orden)}
                className="rounded-md border border-[var(--border)] px-2 py-1 text-xs"
              >
                {puedeMatchCrm && <option value="match">Mejor match</option>}
                <option value="plazo">Plazo más próximo</option>
                <option value="monto">Monto referencial</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {limitadoPorPlan && resultados.length > LIMITE_PLAN_FREE && (
        <UpgradeNotice minimo="basico">
          Estás viendo {LIMITE_PLAN_FREE} de {resultados.length} procesos que coinciden con estos
          filtros. Mejora tu plan para ver todos.
        </UpgradeNotice>
      )}

      <div className="flex flex-col gap-3">
        {resultados.length === 0 && (
          <Card>
            <CardBody>
              <p className="text-sm text-slate-500">
                Ningún proceso coincide con estos filtros. Prueba ampliando el rango de monto o
                quitando algún filtro.
              </p>
            </CardBody>
          </Card>
        )}
        {resultadosVisibles.map(({ proceso, match }) => (
          <Card key={proceso.id}>
            <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/procesos/${proceso.id}`}
                    className="text-sm font-semibold text-[var(--foreground)] hover:underline"
                  >
                    {proceso.objeto}
                  </Link>
                  {puedeMatchCrm ? (
                    <MatchBadge nivel={match.nivel} score={match.score} />
                  ) : (
                    <LockedInline minimo="profesional" />
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {proceso.entidad} · {proceso.region} · {proceso.categoria} /{" "}
                  {proceso.subcategoria}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>{formatMonto(proceso.montoReferencial)}</span>
                  <span>{proceso.tipoProcedimiento}</span>
                  <span>{proceso.estado}</span>
                  <span className="font-medium text-amber-700">
                    {formatDiasRestantes(proceso.fechaLimitePresentacion)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {puedeMatchCrm && <EstadoCrmSelect procesoId={proceso.id} />}
                <Link
                  href={`/procesos/${proceso.id}`}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-[var(--surface-muted)]"
                >
                  Ver ficha
                </Link>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-sm text-[var(--foreground)] focus:border-[var(--brand-500)] focus:outline-none"
      >
        <option value="">Todas</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
      {label}
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-sm text-[var(--foreground)] focus:border-[var(--brand-500)] focus:outline-none"
      />
    </label>
  );
}
