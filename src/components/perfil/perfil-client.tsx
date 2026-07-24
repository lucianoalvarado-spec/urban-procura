"use client";

import { useState } from "react";
import { useProveedor } from "@/lib/state/proveedor-context";
import type { PreferenciasProveedor, Region, Categoria, TipoProcedimiento } from "@/lib/data/types";
import { CATEGORIAS, TIPOS_PROCEDIMIENTO } from "@/lib/data/constants";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PlanBadge } from "@/components/ui/badge";
import { DatosGeneralesCard } from "@/components/perfil/datos-generales-card";
import { RnpCard } from "@/components/perfil/rnp-card";
import { ExperienciaCard } from "@/components/perfil/experiencia-card";
import { PersonalClaveCard } from "@/components/perfil/personal-clave-card";
import { EquipamientoCard } from "@/components/perfil/equipamiento-card";
import { DocumentosCard } from "@/components/perfil/documentos-card";

export function PerfilClient({
  entidadesDisponibles,
  regionesDisponibles,
}: {
  entidadesDisponibles: string[];
  regionesDisponibles: string[];
}) {
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
      <ExperienciaCard />
      <PersonalClaveCard />
      <EquipamientoCard />
      <DocumentosCard />

      <PreferenciasForm entidadesDisponibles={entidadesDisponibles} regionesDisponibles={regionesDisponibles} />
    </div>
  );
}

function PreferenciasForm({
  entidadesDisponibles,
  regionesDisponibles,
}: {
  entidadesDisponibles: string[];
  regionesDisponibles: string[];
}) {
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
          <div className="flex flex-wrap gap-2">
            {regionesDisponibles.map((region) => (
              <Chip
                key={region}
                active={form.regionesObjetivo.includes(region as Region)}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    regionesObjetivo: toggle<Region>(f.regionesObjetivo, region as Region),
                  }))
                }
              >
                {region}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">Entidades objetivo</p>
          <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
            {entidadesDisponibles.map((entidad) => (
              <Chip
                key={entidad}
                active={form.entidadesObjetivo.includes(entidad)}
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    entidadesObjetivo: toggle<string>(f.entidadesObjetivo, entidad),
                  }))
                }
              >
                {entidad}
              </Chip>
            ))}
          </div>
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
          Palabras clave (separadas por coma)
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
            className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-sm text-[var(--foreground)] focus:border-[var(--brand-500)] focus:outline-none"
          />
        </label>

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
