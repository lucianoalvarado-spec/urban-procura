"use client";

import { useState } from "react";
import { useProveedor } from "@/lib/state/proveedor-context";
import type { CategoriaRnp, RegistroRnp } from "@/lib/data/types";
import { formatMonto } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TextField, NumberField, CheckboxField } from "@/components/perfil/field";

const REGISTRO_ORDEN: CategoriaRnp[] = ["bienes", "servicios", "ejecucionObras", "consultoriaObras"];

const REGISTRO_RNP_LABEL: Record<CategoriaRnp, string> = {
  bienes: "Proveedor de Bienes",
  servicios: "Proveedor de Servicios",
  ejecucionObras: "Ejecutor de Obras",
  consultoriaObras: "Consultor de Obras",
};

export function RnpCard() {
  const { proveedor, actualizarDatosEmpresa } = useProveedor();
  const [editando, setEditando] = useState(false);
  const [numeroPartida, setNumeroPartida] = useState(proveedor.rnp.numeroPartida);
  const [capacidadMaximaGeneral, setCapacidadMaximaGeneral] = useState(
    proveedor.rnp.capacidadMaximaGeneral ?? 0
  );
  const [vigente, setVigente] = useState(proveedor.rnp.vigente);
  const [especialidadesTexto, setEspecialidadesTexto] = useState(
    proveedor.rnp.especialidades.join(", ")
  );

  const abrirEdicion = () => {
    setNumeroPartida(proveedor.rnp.numeroPartida);
    setCapacidadMaximaGeneral(proveedor.rnp.capacidadMaximaGeneral ?? 0);
    setVigente(proveedor.rnp.vigente);
    setEspecialidadesTexto(proveedor.rnp.especialidades.join(", "));
    setEditando(true);
  };

  const guardar = () => {
    actualizarDatosEmpresa({
      rnp: {
        ...proveedor.rnp,
        numeroPartida,
        capacidadMaximaGeneral,
        vigente,
        especialidades: especialidadesTexto
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
    });
    setEditando(false);
  };

  if (editando) {
    return (
      <Card>
        <CardHeader title="RNP y capacidad de contratación" />
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="N° de partida RNP" value={numeroPartida} onChange={setNumeroPartida} />
            <NumberField
              label="Capacidad máxima de contratación general (S/)"
              value={capacidadMaximaGeneral}
              onChange={setCapacidadMaximaGeneral}
            />
          </div>
          <CheckboxField label="RNP vigente" checked={vigente} onChange={setVigente} />
          <TextField
            label="Especialidades (separadas por coma)"
            value={especialidadesTexto}
            onChange={setEspecialidadesTexto}
          />
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

  const registros = proveedor.rnp.registros;
  const registroPorTipo = new Map((registros ?? []).map((r) => [r.tipo, r]));
  const tieneEjecutorObras = registroPorTipo.has("ejecucionObras");
  const tieneConsultorObras = registroPorTipo.has("consultoriaObras");

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

        {!registros && (
          <p className="text-sm text-slate-400">
            No se pudo consultar tu ficha del RNP — completa tus datos manualmente o vuelve a
            intentarlo desde Registro.
          </p>
        )}

        {registros && registros.length > 0 && (
          <div className="space-y-3">
            {REGISTRO_ORDEN.filter((tipo) => registroPorTipo.has(tipo)).map((tipo) => {
              const registro = registroPorTipo.get(tipo) as RegistroRnp;
              return (
                <div key={tipo} className="rounded-lg border border-[var(--border)] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {REGISTRO_RNP_LABEL[tipo]}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        registro.vigente
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-[var(--surface-muted)] text-slate-500"
                      }`}
                    >
                      {registro.vigente ? "Vigente" : "No vigente"}
                    </span>
                  </div>
                  {tipo === "ejecucionObras" &&
                    typeof proveedor.rnp.capacidadMaximaGeneral === "number" && (
                      <p className="mt-2 text-xs text-slate-500">
                        Capacidad máxima de contratación:{" "}
                        {formatMonto(proveedor.rnp.capacidadMaximaGeneral)}
                      </p>
                    )}
                  {tipo === "consultoriaObras" && (
                    <div className="mt-2">
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
                        <p className="text-xs text-slate-400">Sin especialidades registradas.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Fallback: nunca ocultar datos manualmente ingresados si su registro
            correspondiente no está presente (ej. registro manual sin RNP, o RNP
            consultado pero sin ese tipo específico). */}
        {!tieneEjecutorObras && typeof proveedor.rnp.capacidadMaximaGeneral === "number" && (
          <p className="text-xs text-slate-500">
            Capacidad máxima de contratación: {formatMonto(proveedor.rnp.capacidadMaximaGeneral)}
          </p>
        )}
        {!tieneConsultorObras && proveedor.rnp.especialidades.length > 0 && (
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
        )}
      </CardBody>
    </Card>
  );
}
