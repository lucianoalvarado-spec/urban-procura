"use client";

import { useState } from "react";
import { useProveedor } from "@/lib/state/proveedor-context";
import type { PersonalClave } from "@/lib/data/types";
import { generarId } from "@/lib/id";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TextField, CheckboxField } from "@/components/perfil/field";

const VACIO = {
  nombre: "",
  cargo: "",
  colegiatura: "",
  cvAdjunto: false,
  certificadosTexto: "",
};

export function PersonalClaveCard() {
  const { proveedor, actualizarDatosEmpresa } = useProveedor();
  const [agregando, setAgregando] = useState(false);
  const [form, setForm] = useState(VACIO);

  const eliminar = (id: string) => {
    actualizarDatosEmpresa({ personalClave: proveedor.personalClave.filter((p) => p.id !== id) });
  };

  const agregar = () => {
    if (!form.nombre.trim() || !form.cargo.trim()) return;
    const nuevo: PersonalClave = {
      id: generarId("pc"),
      nombre: form.nombre,
      cargo: form.cargo,
      colegiatura: form.colegiatura,
      cvAdjunto: form.cvAdjunto,
      certificados: form.certificadosTexto
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    actualizarDatosEmpresa({ personalClave: [...proveedor.personalClave, nuevo] });
    setForm(VACIO);
    setAgregando(false);
  };

  return (
    <Card>
      <CardHeader
        title="Personal clave"
        action={
          !agregando && (
            <button
              type="button"
              onClick={() => setAgregando(true)}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-[var(--surface-muted)]"
            >
              + Agregar
            </button>
          )
        }
      />
      <CardBody className="space-y-4">
        {agregando && (
          <div className="space-y-3 rounded-lg border border-[var(--border)] p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Nombre"
                value={form.nombre}
                onChange={(v) => setForm((f) => ({ ...f, nombre: v }))}
              />
              <TextField
                label="Cargo"
                value={form.cargo}
                onChange={(v) => setForm((f) => ({ ...f, cargo: v }))}
              />
              <TextField
                label="Colegiatura"
                value={form.colegiatura}
                onChange={(v) => setForm((f) => ({ ...f, colegiatura: v }))}
              />
              <TextField
                label="Certificados (separados por coma)"
                value={form.certificadosTexto}
                onChange={(v) => setForm((f) => ({ ...f, certificadosTexto: v }))}
              />
            </div>
            <CheckboxField
              label="CV adjunto"
              checked={form.cvAdjunto}
              onChange={(v) => setForm((f) => ({ ...f, cvAdjunto: v }))}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={agregar}
                className="rounded-lg bg-[var(--brand-600)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--brand-700)]"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => {
                  setAgregando(false);
                  setForm(VACIO);
                }}
                className="text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {proveedor.personalClave.length === 0 ? (
          <p className="text-sm text-slate-400">Aún no registraste personal clave.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {proveedor.personalClave.map((persona) => (
              <div key={persona.id} className="rounded-lg border border-[var(--border)] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700">{persona.nombre}</p>
                  <button
                    type="button"
                    onClick={() => eliminar(persona.id)}
                    className="text-xs font-medium text-slate-400 hover:text-red-600"
                  >
                    Eliminar
                  </button>
                </div>
                <p className="text-xs text-slate-500">{persona.cargo}</p>
                {persona.colegiatura && (
                  <p className="mt-1 text-xs text-slate-400">Colegiatura {persona.colegiatura}</p>
                )}
                <p className="mt-1 text-xs">
                  <span className={persona.cvAdjunto ? "text-emerald-600" : "text-amber-600"}>
                    {persona.cvAdjunto ? "CV adjunto" : "CV pendiente"}
                  </span>
                </p>
                {persona.certificados.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {persona.certificados.map((cert) => (
                      <span
                        key={cert}
                        className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] text-slate-500"
                      >
                        {cert}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
