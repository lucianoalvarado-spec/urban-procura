"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Proceso } from "@/lib/data/types";
import { useProveedor } from "@/lib/state/proveedor-context";
import { computeMatch } from "@/lib/data/matching";
import { CATEGORIAS, ESTADOS_PROCESO, REGIONES } from "@/lib/data/constants";
import { formatDiasRestantes, formatMonto } from "@/lib/format";
import { Card, CardBody } from "@/components/ui/card";
import { MatchBadge } from "@/components/ui/badge";
import { EstadoCrmSelect } from "@/components/crm/estado-crm-select";
import { UpgradeNotice, LockedInline } from "@/components/plan/upgrade-notice";
import { cumplePlan } from "@/lib/plan";
import { EntitySelect } from "@/components/shared/entity-select";
import { cn } from "@/lib/cn";
import {
  agregarVigilancia,
  estaVigilado,
  quitarVigilancia,
  useProcesosVigilados,
} from "@/lib/state/alertas-procesos-store";
import {
  MAX_COMPARADOS,
  agregarAComparador,
  estaEnComparador,
  quitarDeComparador,
  useComparadorSeleccion,
} from "@/lib/state/comparador-store";

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

export function ExploradorClient({ procesos }: { procesos: Proceso[] }) {
  const { proveedor } = useProveedor();
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES);
  const [orden, setOrden] = useState<Orden>("match");
  const puedeMatchCrm = cumplePlan(proveedor.plan, "profesional");
  const limitadoPorPlan = proveedor.plan === "free";
  const ordenEfectivo = orden === "match" && !puedeMatchCrm ? "plazo" : orden;

  // Campana "agregar alerta" (seguimiento individual, distinto de los rubros de
  // /alertas) y "+" para el Comparador — ambas requieren plan Profesional, igual que
  // las pantallas a las que alimentan.
  const puedeAlertasYComparador = cumplePlan(proveedor.plan, "profesional");
  const vigilados = useProcesosVigilados();
  const comparadorSeleccion = useComparadorSeleccion();

  // Búsqueda en vivo: el lote inicial (`procesos`, prop) es fijo y nunca va a contener
  // todas las entidades del portal (~2.7M de registros históricos). Cuando el usuario
  // escribe algo, en vez de filtrar solo ese lote le pedimos a la API real ese texto
  // (matchea también contra el nombre de la entidad compradora, ej. "PROVIAS",
  // "SEDAPAL") y usamos esos resultados como set activo mientras dure la búsqueda.
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Proceso[] | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [busquedaFallo, setBusquedaFallo] = useState(false);

  // El texto libre manda; si está vacío pero hay una entidad elegida (del catálogo
  // completo de ~3,316 entidades, no del lote local), usamos su nombre como término de
  // búsqueda para traer procesos reales de esa entidad específica.
  const terminoBusquedaLive = filtros.query.trim() || filtros.entidad.trim();

  useEffect(() => {
    if (!terminoBusquedaLive) {
      setResultadosBusqueda(null);
      setBusquedaFallo(false);
      return;
    }
    let cancelado = false;
    setBuscando(true);
    const timeout = setTimeout(() => {
      const params = new URLSearchParams({ search: terminoBusquedaLive, paginateBy: "100" });
      if (filtros.categoria) params.set("categoria", filtros.categoria);
      fetch(`/api/procesos/buscar?${params.toString()}`)
        .then((r) => r.json())
        .then((data: { disponible: boolean; procesos: Proceso[] }) => {
          if (cancelado) return;
          setResultadosBusqueda(data.disponible ? data.procesos : []);
          setBusquedaFallo(!data.disponible);
        })
        .catch(() => {
          if (cancelado) return;
          setResultadosBusqueda([]);
          setBusquedaFallo(true);
        })
        .finally(() => {
          if (!cancelado) setBuscando(false);
        });
    }, 400);
    return () => {
      cancelado = true;
      clearTimeout(timeout);
      setBuscando(false);
    };
  }, [terminoBusquedaLive, filtros.categoria]);

  const procesosActivos = resultadosBusqueda ?? procesos;
  const entidadesActivas = useMemo(
    () => Array.from(new Set(procesosActivos.map((p) => p.entidad))).sort(),
    [procesosActivos]
  );

  const subcategoriasDisponibles = useMemo(() => {
    const fuente = filtros.categoria
      ? procesosActivos.filter((p) => p.categoria === filtros.categoria)
      : procesosActivos;
    return Array.from(new Set(fuente.map((p) => p.subcategoria))).sort();
  }, [procesosActivos, filtros.categoria]);

  const tiposProcedimientoDisponibles = useMemo(
    () => Array.from(new Set(procesosActivos.map((p) => p.tipoProcedimiento))).sort(),
    [procesosActivos]
  );

  const fuenteDatos = procesosActivos[0]?.fuente ?? procesos[0]?.fuente ?? "mock";

  const resultados = useMemo(() => {
    const montoMin = filtros.montoMin ? Number(filtros.montoMin) : undefined;
    const montoMax = filtros.montoMax ? Number(filtros.montoMax) : undefined;

    const filtrados = procesosActivos.filter((p) => {
      if (filtros.region && p.region !== filtros.region) return false;
      if (filtros.entidad && p.entidad !== filtros.entidad) return false;
      if (filtros.categoria && p.categoria !== filtros.categoria) return false;
      if (filtros.subcategoria && p.subcategoria !== filtros.subcategoria) return false;
      if (filtros.tipoProcedimiento && p.tipoProcedimiento !== filtros.tipoProcedimiento)
        return false;
      if (filtros.estado && p.estado !== filtros.estado) return false;
      if (typeof montoMin === "number" && p.montoReferencial !== null && p.montoReferencial < montoMin)
        return false;
      if (typeof montoMax === "number" && p.montoReferencial !== null && p.montoReferencial > montoMax)
        return false;
      return true;
    });

    const conMatch = filtrados.map((proceso) => ({
      proceso,
      match: computeMatch(proceso, proveedor),
    }));

    conMatch.sort((a, b) => {
      if (ordenEfectivo === "match") return b.match.score - a.match.score;
      if (ordenEfectivo === "monto")
        return (b.proceso.montoReferencial ?? 0) - (a.proceso.montoReferencial ?? 0);
      return (
        new Date(a.proceso.fechaLimitePresentacion).getTime() -
        new Date(b.proceso.fechaLimitePresentacion).getTime()
      );
    });

    return conMatch;
  }, [procesosActivos, filtros, ordenEfectivo, proveedor]);

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
          {resultadosVisibles.length} de {procesosActivos.length} procesos · ¿cuáles me convienen?
        </p>
      </div>

      {fuenteDatos === "live" ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Procesos reales del{" "}
          <a
            href="https://contratacionesabiertas.oece.gob.pe/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Portal de Contrataciones Abiertas del OECE
          </a>
          . Nota: en esta vista la región no siempre viene detallada por la fuente — se completa
          al abrir la ficha del proceso.
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          No pudimos conectarnos con el Portal de Contrataciones Abiertas del OECE en este
          momento — estás viendo datos de muestra.
        </div>
      )}

      <Card>
        <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-full flex flex-col gap-1">
            <input
              type="text"
              placeholder="Buscar por objeto, entidad o descripción — ej. PROVIAS, SEDAPAL, PNSR"
              value={filtros.query}
              onChange={(e) => updateFiltro("query", e.target.value)}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--brand-500)] focus:outline-none"
            />
            {terminoBusquedaLive && (
              <p className="text-xs text-slate-400">
                {buscando
                  ? "Buscando en el Portal de Contrataciones Abiertas…"
                  : busquedaFallo
                    ? "No pudimos conectarnos con el Portal en este momento — mostrando el lote inicial."
                    : `${resultadosBusqueda?.length ?? 0} resultado(s) en vivo para "${terminoBusquedaLive}".`}
              </p>
            )}
          </div>
          <Select
            label="Región"
            value={filtros.region}
            onChange={(v) => updateFiltro("region", v)}
            options={REGIONES}
          />
          <EntitySelect
            label="Entidad"
            value={filtros.entidad}
            onChange={(v) => updateFiltro("entidad", v)}
            placeholder="Todas — escribe para buscar (ej. ministerio, municipalidad)"
            sugerenciasLocales={entidadesActivas}
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
            options={tiposProcedimientoDisponibles}
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
                <AlertaBellButton
                  proceso={proceso}
                  vigilado={estaVigilado(proceso.id, vigilados)}
                  habilitado={puedeAlertasYComparador}
                />
                <ComparadorPlusButton
                  proceso={proceso}
                  seleccionado={estaEnComparador(proceso.id, comparadorSeleccion)}
                  lleno={comparadorSeleccion.length >= MAX_COMPARADOS}
                  habilitado={puedeAlertasYComparador}
                />
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

function AlertaBellButton({
  proceso,
  vigilado,
  habilitado,
}: {
  proceso: Proceso;
  vigilado: boolean;
  habilitado: boolean;
}) {
  const etiqueta = !habilitado
    ? "Disponible desde el plan Profesional"
    : vigilado
      ? "Quitar alerta de este proceso"
      : "Agregar alerta — te avisamos en Alertas si cambia la fecha o el plazo está por vencer";

  return (
    <button
      type="button"
      disabled={!habilitado}
      title={etiqueta}
      aria-label={etiqueta}
      onClick={() =>
        vigilado
          ? quitarVigilancia(proceso.id)
          : agregarVigilancia({
              id: proceso.id,
              objeto: proceso.objeto,
              entidad: proceso.entidad,
              fechaLimitePresentacion: proceso.fechaLimitePresentacion,
              estado: proceso.estado,
            })
      }
      className={cn(
        "rounded-lg border px-2 py-1.5 text-sm leading-none",
        vigilado
          ? "border-[var(--brand-300)] bg-[var(--brand-50)]"
          : "border-[var(--border)] text-slate-500 hover:bg-[var(--surface-muted)]",
        !habilitado && "cursor-not-allowed opacity-40"
      )}
    >
      🔔
    </button>
  );
}

function ComparadorPlusButton({
  proceso,
  seleccionado,
  lleno,
  habilitado,
}: {
  proceso: Proceso;
  seleccionado: boolean;
  lleno: boolean;
  habilitado: boolean;
}) {
  const bloqueado = !habilitado || (!seleccionado && lleno);
  const etiqueta = !habilitado
    ? "Disponible desde el plan Profesional"
    : seleccionado
      ? "Quitar del comparador"
      : lleno
        ? `Ya tienes ${MAX_COMPARADOS} procesos en el comparador`
        : "Comparar proceso";

  return (
    <button
      type="button"
      disabled={bloqueado}
      title={etiqueta}
      aria-label={etiqueta}
      onClick={() => (seleccionado ? quitarDeComparador(proceso.id) : agregarAComparador(proceso))}
      className={cn(
        "rounded-lg border px-2.5 py-1.5 text-sm font-semibold leading-none",
        seleccionado
          ? "border-[var(--brand-300)] bg-[var(--brand-50)] text-[var(--brand-600)]"
          : "border-[var(--border)] text-slate-500 hover:bg-[var(--surface-muted)]",
        bloqueado && "cursor-not-allowed opacity-40"
      )}
    >
      {seleccionado ? "✓" : "+"}
    </button>
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
