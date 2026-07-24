"use client";

import { useState } from "react";
import { TextField, SelectField } from "@/components/perfil/field";
import { registrarReclamo, type Reclamo, type TipoReclamo } from "@/lib/state/reclamos-store";

const TIPOS_DOCUMENTO = ["DNI", "CE", "RUC", "Pasaporte"] as const;

const VACIO = {
  tipo: "Reclamo" as "Reclamo" | "Queja",
  nombre: "",
  tipoDocumento: "DNI" as (typeof TIPOS_DOCUMENTO)[number],
  numeroDocumento: "",
  domicilio: "",
  telefono: "",
  correo: "",
  bienContratado: "",
  detalle: "",
  pedido: "",
};

export function LibroReclamacionesForm() {
  const [form, setForm] = useState(VACIO);
  const [enviado, setEnviado] = useState<Reclamo | null>(null);

  const camposCompletos =
    form.nombre.trim() &&
    form.numeroDocumento.trim() &&
    form.domicilio.trim() &&
    form.telefono.trim() &&
    form.correo.trim() &&
    form.bienContratado.trim() &&
    form.detalle.trim() &&
    form.pedido.trim();

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!camposCompletos) return;
    const nuevo = registrarReclamo({
      tipo: form.tipo.toLowerCase() as TipoReclamo,
      consumidor: {
        nombre: form.nombre.trim(),
        tipoDocumento: form.tipoDocumento,
        numeroDocumento: form.numeroDocumento.trim(),
        domicilio: form.domicilio.trim(),
        telefono: form.telefono.trim(),
        correo: form.correo.trim(),
      },
      bienContratado: form.bienContratado.trim(),
      detalle: form.detalle.trim(),
      pedido: form.pedido.trim(),
    });
    setEnviado(nuevo);
    setForm(VACIO);
  };

  if (enviado) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-800">
        <p className="font-semibold">
          {enviado.tipo === "reclamo" ? "Reclamo" : "Queja"} registrado — N° {enviado.id}
        </p>
        <p className="mt-2 leading-relaxed">
          Registramos tu {enviado.tipo} con fecha{" "}
          {new Date(enviado.fecha).toLocaleDateString("es-PE")}. Conserva el número {enviado.id}{" "}
          para hacer seguimiento.
        </p>
        <p className="mt-3 text-xs text-emerald-700">
          Modo demo: este formulario guarda tu {enviado.tipo} en este navegador, todavía no en un
          servidor ni se notifica por correo — cuando exista backend real, esto se procesará y
          respondrá formalmente dentro del plazo legal.
        </p>
        <button
          type="button"
          onClick={() => setEnviado(null)}
          className="mt-4 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
        >
          Registrar otro reclamo o queja
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-xs font-medium text-slate-500">Tipo</p>
        <div className="flex gap-2">
          {(["Reclamo", "Queja"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm((f) => ({ ...f, tipo: t }))}
              className={`rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${
                form.tipo === t
                  ? "border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)]"
                  : "border-[var(--border)] text-slate-600 hover:bg-[var(--surface-muted)]"
              }`}
            >
              {t === "Reclamo" ? "Reclamo — disconformidad con el servicio" : "Queja — malestar con la atención"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Nombre completo"
          value={form.nombre}
          onChange={(v) => setForm((f) => ({ ...f, nombre: v }))}
        />
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            label="Tipo de documento"
            value={form.tipoDocumento}
            onChange={(v) => setForm((f) => ({ ...f, tipoDocumento: v as (typeof TIPOS_DOCUMENTO)[number] }))}
            options={[...TIPOS_DOCUMENTO]}
          />
          <TextField
            label="N° de documento"
            value={form.numeroDocumento}
            onChange={(v) => setForm((f) => ({ ...f, numeroDocumento: v }))}
          />
        </div>
        <TextField
          label="Domicilio"
          value={form.domicilio}
          onChange={(v) => setForm((f) => ({ ...f, domicilio: v }))}
          className="sm:col-span-2"
        />
        <TextField
          label="Teléfono"
          value={form.telefono}
          onChange={(v) => setForm((f) => ({ ...f, telefono: v }))}
        />
        <TextField
          label="Correo electrónico"
          type="email"
          value={form.correo}
          onChange={(v) => setForm((f) => ({ ...f, correo: v }))}
        />
      </div>

      <TextField
        label="Bien o servicio contratado (ej. plan Profesional, módulo Explorador)"
        value={form.bienContratado}
        onChange={(v) => setForm((f) => ({ ...f, bienContratado: v }))}
      />

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
        Detalle del {form.tipo.toLowerCase()}
        <textarea
          value={form.detalle}
          onChange={(e) => setForm((f) => ({ ...f, detalle: e.target.value }))}
          rows={4}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--brand-500)] focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
        ¿Qué solicitas?
        <textarea
          value={form.pedido}
          onChange={(e) => setForm((f) => ({ ...f, pedido: e.target.value }))}
          rows={2}
          className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--brand-500)] focus:outline-none"
        />
      </label>

      <button
        type="submit"
        disabled={!camposCompletos}
        className="self-start rounded-lg bg-[var(--brand-600)] px-5 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        Enviar {form.tipo.toLowerCase()}
      </button>
    </form>
  );
}
