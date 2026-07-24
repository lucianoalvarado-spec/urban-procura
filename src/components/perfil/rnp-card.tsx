"use client";

import { useState } from "react";
import { useProveedor } from "@/lib/state/proveedor-context";
import type { CategoriaRnp, EstadoRnp } from "@/lib/data/types";
import { formatMonto } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TextField, NumberField, CheckboxField } from "@/components/perfil/field";

const CATEGORIA_RNP_LABEL: Record<CategoriaRnp, string> = {
  bienes: "Bienes",
  servicios: "Servicios",
  consultoriaObras: "Consultoría de obras",
  ejecucionObras: "Ejecución de obras",
};

export function RnpCard() {
  const { proveedor, actualizarDatosEmpresa } = useProveedor();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<EstadoRnp>(proveedor.rnp);
  const [especialidadesTexto, setEspecialidadesTexto] = useState(
    proveedor.rnp.especialidades.join(", ")
  );

  const categoriasHabilitadas = Object.entries(proveedor.rnp.capacidades).filter(
    ([, cap]) => cap.habilitado
  );

  const abrirEdicion = () => {
    setForm(proveedor.rnp);
    setEspecialidadesTexto(proveedor.rnp.especialidades.join(", "));
    setEditando(true);
  };

  const guardar = () => {
    actualizarDatosEmpresa({
      rnp: {
        ...form,
        especialidades: especialidadesTexto
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
    });
    setEditando(false);
  };

  const setCapacidad = (
    categoria: CategoriaRnp,
    patch: Partial<{ habilitado: boolean; capacidadMaxima: number; capacidadLibre: number }>
  ) => {
    setForm((f) => ({
      ...f,
      capacidades: {
        ...f.capacidades,
        [categoria]: { ...f.capacidades[categoria], ...patch },
      },
    }));
  };

  if (editando) {
    return (
      <Card>
        <CardHeader title="RNP y capacidad de contratación" />
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="N° de partida RNP"
              value={form.numeroPartida}
              onChange={(v) => setForm((f) => ({ ...f, numeroPartida: v }))}
            />
            <NumberField
              label="Capacidad máxima de contratación general (S/)"
              value={form.capacidadMaximaGeneral ?? 0}
              onChange={(v) => setForm((f) => ({ ...f, capacidadMaximaGeneral: v }))}
            />
          </div>
          <CheckboxField
            label="RNP vigente"
            checked={form.vigente}
            onChange={(v) => setForm((f) => ({ ...f, vigente: v }))}
          />
          <TextField
            label="Especialidades (separadas por coma)"
            value={especialidadesTexto}
            onChange={setEspecialidadesTexto}
          />
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-500">Capacidad por categoría</p>
            {(Object.keys(CATEGORIA_RNP_LABEL) as CategoriaRnp[]).map((categoria) => {
              const cap = form.capacidades[categoria];
              return (
                <div key={categoria} className="rounded-lg border border-[var(--border)] p-3">
                  <CheckboxField
                    label={CATEGORIA_RNP_LABEL[categoria]}
                    checked={cap.habilitado}
                    onChange={(v) => setCapacidad(categoria, { habilitado: v })}
                  />
                  {cap.habilitado && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <NumberField
                        label="Capacidad máxima"
                        value={cap.capacidadMaxima}
                        onChange={(v) => setCapacidad(categoria, { capacidadMaxima: v })}
                      />
                      <NumberField
                        label="Capacidad libre"
                        value={cap.capacidadLibre}
                        onChange={(v) => setCapacidad(categoria, { capacidadLibre: v })}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={guardar}
              className="rounded-lg bg-[var(--brand-600)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--brand-700)]"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setEditando(false)}
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="RNP y capacidad de contratación"
        subtitle={proveedor.rnp.vigente ? "Vigente" : "No vigente"}
        action={
          <button
            type="button"
            onClick={abrirEdicion}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-[var(--surface-muted)]"
          >
            Editar
          </button>
        }
      />
      <CardBody className="space-y-4">
        {proveedor.rnp.numeroPartida && (
          <p className="text-xs text-slate-500">Partida N° {proveedor.rnp.numeroPartida}</p>
        )}
        {typeof proveedor.rnp.capacidadMaximaGeneral === "number" && (
          <p className="text-xs text-slate-500">
            Capacidad máxima de contratación (RNP): {formatMonto(proveedor.rnp.capacidadMaximaGeneral)}
          </p>
        )}
        {proveedor.rnp.especialidades.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {proveedor.rnp.especialidades.map((esp) => (
              <span
                key={esp}
                className="rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs text-slate-600"
              >
                {esp}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Aún no registraste especialidades RNP.</p>
        )}
        {categoriasHabilitadas.length > 0 ? (
          <div className="space-y-3">
            {categoriasHabilitadas.map(([categoria, cap]) => {
              const pct = cap.capacidadMaxima
                ? Math.round((cap.capacidadLibre / cap.capacidadMaxima) * 100)
                : 0;
              return (
                <div key={categoria}>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{CATEGORIA_RNP_LABEL[categoria as CategoriaRnp] ?? categoria}</span>
                    <span>
                      {formatMonto(cap.capacidadLibre)} libre de {formatMonto(cap.capacidadMaxima)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--brand-500)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Todavía no configuraste tu capacidad de contratación por categoría.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
