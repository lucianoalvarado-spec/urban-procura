"use client";

import { useEffect, useState } from "react";
import { useProveedor } from "@/lib/state/proveedor-context";
import type { PreferenciasProveedor, Region, Categoria, TipoProcedimiento } from "@/lib/data/types";
import { CATEGORIAS, REGIONES, TIPOS_PROCEDIMIENTO } from "@/lib/data/constants";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PlanBadge } from "@/components/ui/badge";
import { DatosGeneralesCard } from "@/components/perfil/datos-generales-card";
import { RnpCard } from "@/components/perfil/rnp-card";
import { CapacidadDeclaradaCard } from "@/components/perfil/capacidad-declarada-card";
import { ExperienciaCard } from "@/components/perfil/experiencia-card";
import { PersonalClaveCard } from "@/components/perfil/personal-clave-card";
import { EquipamientoCard } from "@/components/perfil/equipamiento-card";
import { DocumentosCard } from "@/components/perfil/documentos-card";
import type { EntidadesBuscarResultado } from "@/app/api/entidades/buscar/route";

const PALABRAS_CLAVE_SUGERIDAS = [
  "saneamiento",
  "pistas y veredas",
  "drenaje pluvial",
  "puente",
  "expediente técnico",
  "supervisión de obra",
  "mantenimiento vial",
  "agua potable",
  "alcantarillado",
  "electrificación rural",
  "institución educativa",
  "establecimiento de salud",
  "carretera",
  "defensa ribereña",
];

export function PerfilClient() {
  const { proveedor } = useProveedor();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--foreground)]">
            {proveedor.razonSocial || "Completa tu razón social"}
          </h1>
          <p className="text-sm text-slate-500">
            {proveedor.nombreComercial || "—"} · RUC {proveedor.ruc || "—"}
          </p>
        </div>
        <PlanBadge plan={proveedor.plan} />
      </div>

      <DatosGeneralesCard />
      <RnpCard />
      <CapacidadDeclaradaCard />
      <ExperienciaCard />
      <PersonalClaveCard />
      <EquipamientoCard />
      <DocumentosCard />

      <PreferenciasForm />
    </div>
  );
}

function PreferenciasForm() {
  const { proveedor, updatePreferencias, resetPreferencias } = useProveedor();
  const [form, setForm] = useState<PreferenciasProveedor>(proveedor.preferencias);
  const [guardado, setGuardado] = useState(false);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const guardar = () => {
    updatePreferencias(form);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  };

  return (
    <Card>
      <CardHeader
        title="Preferencias"
        subtitle="Definen qué se considera un buen match — se guardan en este navegador"
        action={
          guardado && (
            <span className="text-xs font-medium text-emerald-600">Preferencias guardadas ✓</span>
          )
        }
      />
      <CardBody className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">Rubros de interés</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS.map((rubro) => (
              <Chip
                key={rubro}
                active={form.rubros.includes(rubro)}
                onClick={() =>
                  setForm((f) => ({ ...f, rubros: toggle<Categoria>(f.rubros, rubro) }))
                }
              >
                {rubro}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">Regiones objetivo</p>
          <RegionesPicker
            seleccionadas={form.regionesObjetivo}
            onChange={(regionesObjetivo) => setForm((f) => ({ ...f, regionesObjetivo }))}
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">Entidades objetivo</p>
          <EntidadesPicker
            seleccionadas={form.entidadesObjetivo}
            onChange={(entidadesObjetivo) => setForm((f) => ({ ...f, entidadesObjetivo }))}
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">Tipo de procedimiento</p>
          <div className="flex flex-wrap gap-2">
            {TIPOS_PROCEDIMIENTO.map((tipo) => (
              <Chip
                key={tipo}
                active={form.tiposProcedimiento.includes(tipo)}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    tiposProcedimiento: toggle<TipoProcedimiento>(f.tiposProcedimiento, tipo),
                  }))
                }
              >
                {tipo}
              </Chip>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Monto mínimo (S/)
            <input
              type="number"
              min={0}
              value={form.montoMinimo}
              onChange={(e) => setForm((f) => ({ ...f, montoMinimo: Number(e.target.value) }))}
              className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-sm text-[var(--foreground)] focus:border-[var(--brand-500)] focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Monto máximo (S/)
            <input
              type="number"
              min={0}
              value={form.montoMaximo}
              onChange={(e) => setForm((f) => ({ ...f, montoMaximo: Number(e.target.value) }))}
              className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-sm text-[var(--foreground)] focus:border-[var(--brand-500)] focus:outline-none"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Palabras clave — escribí las que quieras, separadas por coma
          <input
            type="text"
            value={form.palabrasClave.join(", ")}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                palabrasClave: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              }))
            }
            placeholder="ej. saneamiento, mi palabra clave propia"
            className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-sm text-[var(--foreground)] focus:border-[var(--brand-500)] focus:outline-none"
          />
        </label>
        <div className="-mt-3 flex flex-col gap-1.5">
          <p className="text-[11px] text-slate-400">
            Sugerencias rápidas — hacé clic para agregarlas, o escribí las tuyas arriba:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PALABRAS_CLAVE_SUGERIDAS.filter((p) => !form.palabrasClave.includes(p)).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, palabrasClave: [...f.palabrasClave, p] }))
                }
                className="rounded-full border border-dashed border-[var(--border)] px-2.5 py-1 text-[11px] text-slate-500 hover:border-[var(--brand-500)] hover:text-[var(--brand-700)]"
              >
                + {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-[var(--border)] pt-4">
          <button
            type="button"
            onClick={guardar}
            className="rounded-lg bg-[var(--brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-700)]"
          >
            Guardar preferencias
          </button>
          <button
            type="button"
            onClick={() => {
              resetPreferencias();
              setForm(proveedor.preferencias);
            }}
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Restablecer a valores originales
          </button>
        </div>
      </CardBody>
    </Card>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)]"
          : "border-[var(--border)] text-slate-500 hover:bg-[var(--surface-muted)]"
      }`}
    >
      {children}
    </button>
  );
}

function RegionesPicker({
  seleccionadas,
  onChange,
}: {
  seleccionadas: Region[];
  onChange: (regiones: Region[]) => void;
}) {
  const disponibles = REGIONES.filter((r) => !seleccionadas.includes(r));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {seleccionadas.length === 0 && (
          <p className="text-xs text-slate-400">Ninguna región seleccionada.</p>
        )}
        {seleccionadas.map((region) => (
          <Chip
            key={region}
            active
            onClick={() => onChange(seleccionadas.filter((r) => r !== region))}
          >
            {region} ✕
          </Chip>
        ))}
      </div>
      {disponibles.length > 0 && (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) onChange([...seleccionadas, e.target.value as Region]);
          }}
          className="w-fit rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs text-slate-600 focus:border-[var(--brand-500)] focus:outline-none"
        >
          <option value="">+ Agregar región</option>
          {disponibles.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

// A diferencia de Región (lista fija de 25), Entidad busca en vivo contra el catálogo
// completo de ~3,316 entidades del OECE (mismo endpoint que el combobox de Entidad del
// Explorador) — una lista curada de mock no alcanzaba a cubrir ministerios, programas
// adscritos ni la mayoría de municipalidades.
function EntidadesPicker({
  seleccionadas,
  onChange,
}: {
  seleccionadas: string[];
  onChange: (entidades: string[]) => void;
}) {
  const [texto, setTexto] = useState("");
  const [sugerencias, setSugerencias] = useState<{ nombre: string; departamento: string | null }[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const q = texto.trim();
    if (q.length < 2) {
      setSugerencias([]);
      return;
    }
    let cancelado = false;
    setBuscando(true);
    const timeout = setTimeout(() => {
      fetch(`/api/entidades/buscar?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data: EntidadesBuscarResultado) => {
          if (cancelado) return;
          setSugerencias(data.disponible ? data.entidades : []);
        })
        .catch(() => {
          if (!cancelado) setSugerencias([]);
        })
        .finally(() => {
          if (!cancelado) setBuscando(false);
        });
    }, 350);
    return () => {
      cancelado = true;
      clearTimeout(timeout);
      setBuscando(false);
    };
  }, [texto]);

  const agregar = (nombre: string) => {
    if (!seleccionadas.includes(nombre)) onChange([...seleccionadas, nombre]);
    setTexto("");
    setSugerencias([]);
    setAbierto(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
        {seleccionadas.length === 0 && (
          <p className="text-xs text-slate-400">Ninguna entidad seleccionada.</p>
        )}
        {seleccionadas.map((entidad) => (
          <Chip
            key={entidad}
            active
            onClick={() => onChange(seleccionadas.filter((e) => e !== entidad))}
          >
            {entidad} ✕
          </Chip>
        ))}
      </div>
      <div className="relative max-w-md">
        <input
          type="text"
          value={texto}
          onFocus={() => setAbierto(true)}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={() => setTimeout(() => setAbierto(false), 150)}
          placeholder="Buscar entidad por nombre — ej. municipalidad, ministerio"
          className="w-full rounded-lg border border-[var(--border)] px-2.5 py-2 text-xs text-[var(--foreground)] focus:border-[var(--brand-500)] focus:outline-none"
        />
        {abierto && texto.trim().length >= 2 && (
          <div className="absolute top-full left-0 z-10 mt-1 max-h-56 w-full min-w-[320px] overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg">
            {buscando && <p className="px-3 py-2 text-xs text-slate-400">Buscando…</p>}
            {!buscando && sugerencias.length === 0 && (
              <p className="px-3 py-2 text-xs text-slate-400">Sin coincidencias</p>
            )}
            {!buscando &&
              sugerencias.map((e) => (
                <button
                  key={e.nombre}
                  type="button"
                  onMouseDown={() => agregar(e.nombre)}
                  className="block w-full px-3 py-2 text-left text-xs text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                >
                  {e.nombre}
                  {e.departamento && <span className="ml-1 text-slate-400">({e.departamento})</span>}
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
