"use client";

import { useEffect, useState } from "react";
import type { BorradorOferta } from "@/app/api/generar-oferta/route";

// Vista de solo impresión para "exportar a PDF" sin agregar una librería de generación
// de PDF: se apoya en el diálogo nativo del navegador (Ctrl/Cmd+P → "Guardar como PDF").
// Vive fuera de (app)/(marketing) a propósito para no heredar el sidebar del dashboard
// (ver layout.tsx raíz — sin grupo de rutas, solo <html>/<body>). El borrador viaja por
// sessionStorage porque esta pestaña se abre nueva desde /automatizacion.
interface PayloadImpresion {
  borrador: BorradorOferta;
  proceso: {
    objeto: string;
    entidad: string;
    categoria: string;
    tipoProcedimiento: string;
    montoReferencial: number | null;
  };
  proveedor: { razonSocial: string; ruc: string };
}

export default function ImprimirOfertaPage() {
  const [datos, setDatos] = useState<PayloadImpresion | null>(null);

  useEffect(() => {
    const raw = window.sessionStorage.getItem("urban-procura:oferta-borrador");
    if (raw) {
      try {
        setDatos(JSON.parse(raw));
      } catch {
        setDatos(null);
      }
    }
  }, []);

  if (!datos) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10 text-sm text-slate-500">
        No encontramos un borrador para mostrar. Vuelve a{" "}
        <a href="/automatizacion" className="underline">
          Generación de ofertas
        </a>{" "}
        y genera uno primero.
      </div>
    );
  }

  const { borrador, proceso, proveedor } = datos;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 text-slate-800">
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <p className="text-xs text-slate-500">
          Usa Ctrl/Cmd+P y elige &quot;Guardar como PDF&quot; para exportar esta vista.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-[var(--brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-700)]"
        >
          Imprimir / Guardar como PDF
        </button>
      </div>

      <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
        BORRADOR GENERADO AUTOMÁTICAMENTE — REQUIERE REVISIÓN HUMANA ANTES DE PRESENTARSE
      </div>

      <h1 className="text-2xl font-semibold">Propuesta técnica</h1>
      <h2 className="mt-1 text-lg font-medium text-slate-700">{proceso.objeto}</h2>
      <p className="mt-1 text-sm text-slate-500">
        {proceso.entidad} · {proceso.categoria} / {proceso.tipoProcedimiento} ·{" "}
        {proceso.montoReferencial !== null
          ? `S/ ${proceso.montoReferencial.toLocaleString("es-PE")}`
          : "monto referencial no publicado por la entidad"}
      </p>
      <p className="text-sm text-slate-500">
        Presentado por: {proveedor.razonSocial} (RUC {proveedor.ruc})
      </p>

      <Seccion titulo="1. Presentación de la empresa">
        <p>{borrador.presentacionEmpresa}</p>
      </Seccion>

      <Seccion titulo="2. Experiencia relevante">
        <Lista items={borrador.experienciaRelevante} vacio="Sin experiencia registrada." />
      </Seccion>

      <Seccion titulo="3. Personal clave propuesto">
        <Lista items={borrador.personalPropuesto} vacio="Sin personal clave registrado." />
      </Seccion>

      <Seccion titulo="4. Equipamiento propuesto">
        <Lista items={borrador.equipamientoPropuesto} vacio="Sin equipamiento registrado." />
      </Seccion>

      <Seccion titulo="5. Propuesta técnica y metodología">
        <p className="whitespace-pre-line">{borrador.propuestaTecnica}</p>
      </Seccion>

      <Seccion titulo="6. Cronograma tentativo">
        <p className="whitespace-pre-line">{borrador.cronogramaTentativo}</p>
      </Seccion>

      <p className="mt-8 text-xs italic text-slate-400">
        {borrador.generadoConIA
          ? "Propuesta técnica y cronograma redactados con asistencia de IA (Claude) a partir del perfil del proveedor y el análisis de bases. Revísalo y complétalo con tu equipo técnico antes de presentarlo a la entidad."
          : "Este borrador se armó con una plantilla básica a partir de tu perfil, sin asistencia de IA. Complétalo con tu equipo técnico antes de presentarlo a la entidad."}
      </p>
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="text-base font-semibold text-slate-800">{titulo}</h3>
      <div className="mt-1 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function Lista({ items, vacio }: { items: string[]; vacio: string }) {
  if (items.length === 0) return <p className="italic text-slate-400">{vacio}</p>;
  return (
    <ul className="list-inside list-disc space-y-1">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
