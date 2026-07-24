"use client";

import { useState } from "react";
import { useProveedor } from "@/lib/state/proveedor-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TextField } from "@/components/perfil/field";

export function DatosGeneralesCard() {
  const { proveedor, actualizarDatosEmpresa } = useProveedor();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState(proveedor);

  const abrirEdicion = () => {
    setForm(proveedor);
    setEditando(true);
  };

  const guardar = () => {
    actualizarDatosEmpresa({
      razonSocial: form.razonSocial,
      nombreComercial: form.nombreComercial,
      representanteLegal: form.representanteLegal,
      dniRepresentante: form.dniRepresentante,
      correo: form.correo,
      telefono: form.telefono,
      direccion: form.direccion,
    });
    setEditando(false);
  };

  if (editando) {
    return (
      <Card>
        <CardHeader title="Datos generales" subtitle="RUC no editable" />
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Razón social"
            value={form.razonSocial}
            onChange={(v) => setForm((f) => ({ ...f, razonSocial: v }))}
          />
          <TextField
            label="Nombre comercial"
            value={form.nombreComercial}
            onChange={(v) => setForm((f) => ({ ...f, nombreComercial: v }))}
          />
          <TextField
            label="Representante legal"
            value={form.representanteLegal}
            onChange={(v) => setForm((f) => ({ ...f, representanteLegal: v }))}
          />
          <TextField
            label="DNI representante"
            value={form.dniRepresentante}
            onChange={(v) => setForm((f) => ({ ...f, dniRepresentante: v }))}
          />
          <TextField
            label="Correo"
            type="email"
            value={form.correo}
            onChange={(v) => setForm((f) => ({ ...f, correo: v }))}
          />
          <TextField
            label="Teléfono"
            value={form.telefono}
            onChange={(v) => setForm((f) => ({ ...f, telefono: v }))}
          />
          <TextField
            label="Dirección"
            value={form.direccion}
            onChange={(v) => setForm((f) => ({ ...f, direccion: v }))}
            className="sm:col-span-2"
          />
          <div className="flex items-center gap-3 pt-1 sm:col-span-2">
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
        title="Datos generales"
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
      <CardBody className="grid gap-4 sm:grid-cols-2">
        <Dato label="Representante legal">{proveedor.representanteLegal || "—"}</Dato>
        <Dato label="DNI representante">{proveedor.dniRepresentante || "—"}</Dato>
        <Dato label="Correo">{proveedor.correo || "—"}</Dato>
        <Dato label="Teléfono">{proveedor.telefono || "—"}</Dato>
        <Dato label="Dirección" className="sm:col-span-2">
          {proveedor.direccion || "—"}
        </Dato>
      </CardBody>
    </Card>
  );
}

function Dato({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-700">{children}</p>
    </div>
  );
}
