"use client";

import { useState } from "react";
import { useProveedor } from "@/lib/state/proveedor-context";
import type { DocumentoRepositorio } from "@/lib/data/types";
import { generarId } from "@/lib/id";
import { formatFecha, diasRestantes } from "@/lib/format";
import { estiloVigencia, etiquetaVigencia, textoVigencia } from "@/lib/data/documentos";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TextField, SelectField } from "@/components/perfil/field";
import { AdjuntosField } from "@/components/perfil/adjuntos-field";

const UMBRAL_AVISO_DIAS = 30;

const CATEGORIAS_DOC: DocumentoRepositorio["categoria"][] = [
  "Legal",
  "Tributario",
  "RNP",
  "Declaraciones",
  "Cartas",
  "Certificados",
];

const NOMBRES_DOC_FRECUENTES = [
  "Vigencia de poder",
  "Certificado RNP",
  "Constancia de no estar inhabilitado para contratar con el Estado",
  "DNI del representante legal",
  "RUC (ficha SUNAT)",
  "Certificado de habilidad del colegio profesional",
  "Carta fianza modelo",
  "Declaración jurada antisoborno",
];

const OTROS = "Otros";
const OPCIONES_NOMBRE = [...NOMBRES_DOC_FRECUENTES, OTROS];

const vacio = () => ({
  nombreSeleccionado: NOMBRES_DOC_FRECUENTES[0],
  nombreLibre: "",
  categoria: "Legal" as DocumentoRepositorio["categoria"],
  fechaEmision: "",
  fechaVigencia: "",
  documentos: [] as NonNullable<DocumentoRepositorio["documentos"]>,
});

export function DocumentosCard() {
  const { proveedor, actualizarDatosEmpresa } = useProveedor();
  const [agregando, setAgregando] = useState(false);
  const [form, setForm] = useState(vacio());

  const eliminar = (id: string) => {
    actualizarDatosEmpresa({
      documentosRepositorio: proveedor.documentosRepositorio.filter((d) => d.id !== id),
    });
  };

  const nombreFinal = form.nombreSeleccionado === OTROS ? form.nombreLibre.trim() : form.nombreSeleccionado;

  const agregar = () => {
    if (!nombreFinal) return;
    const nuevo: DocumentoRepositorio = {
      id: generarId("doc"),
      nombre: nombreFinal,
      categoria: form.categoria,
      fechaEmision: form.fechaEmision || undefined,
      fechaVigencia: form.fechaVigencia || undefined,
      documentos: form.documentos.length > 0 ? form.documentos : undefined,
    };
    actualizarDatosEmpresa({ documentosRepositorio: [...proveedor.documentosRepositorio, nuevo] });
    setForm(vacio());
    setAgregando(false);
  };

  return (
    <Card>
      <CardHeader
        title="Repositorio de documentos frecuentes"
        subtitle="Reutilizables al preparar ofertas"
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
      <CardBody className="space-y-3">
        {agregando && (
          <div className="space-y-3 rounded-lg border border-[var(--border)] p-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <SelectField
                label="Nombre"
                value={form.nombreSeleccionado}
                onChange={(v) => setForm((f) => ({ ...f, nombreSeleccionado: v }))}
                options={OPCIONES_NOMBRE}
                className="sm:col-span-2"
              />
              <SelectField
                label="Categoría"
                value={form.categoria}
                onChange={(v) =>
                  setForm((f) => ({ ...f, categoria: v as DocumentoRepositorio["categoria"] }))
                }
                options={CATEGORIAS_DOC}
              />
              {form.nombreSeleccionado === OTROS && (
                <TextField
                  label="Nombre específico"
                  value={form.nombreLibre}
                  onChange={(v) => setForm((f) => ({ ...f, nombreLibre: v }))}
                  placeholder="ej. Certificado ISO 9001"
                  className="sm:col-span-3"
                />
              )}
              <TextField
                label="Fecha de emisión (opcional)"
                type="date"
                value={form.fechaEmision}
                onChange={(v) => setForm((f) => ({ ...f, fechaEmision: v }))}
              />
              <TextField
                label="Fecha fin de vigencia (opcional)"
                type="date"
                value={form.fechaVigencia}
                onChange={(v) => setForm((f) => ({ ...f, fechaVigencia: v }))}
              />
            </div>
            <AdjuntosField
              label="PDF del documento"
              documentos={form.documentos}
              onChange={(documentos) => setForm((f) => ({ ...f, documentos }))}
              accept="application/pdf"
              maxArchivos={1}
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={agregar}
                disabled={!nombreFinal}
                className="rounded-lg bg-[var(--brand-600)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => {
                  setAgregando(false);
                  setForm(vacio());
                }}
                className="text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {proveedor.documentosRepositorio.length === 0 ? (
          <p className="text-sm text-slate-400">Aún no agregaste documentos.</p>
        ) : (
          proveedor.documentosRepositorio.map((doc) => {
            const dias = doc.fechaVigencia ? diasRestantes(doc.fechaVigencia) : null;
            const porVencer = dias !== null && dias <= UMBRAL_AVISO_DIAS;
            const pdf = doc.documentos?.[0];
            return (
              <div
                key={doc.id}
                className={`flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm ${porVencer ? estiloVigencia(dias) : ""}`}
              >
                <div>
                  <span className="text-slate-700">{doc.nombre}</span>
                  <span className="ml-2 text-xs text-slate-400">{doc.categoria}</span>
                </div>
                <div className="flex items-center gap-3">
                  {doc.fechaEmision && (
                    <span className="text-xs text-slate-400">
                      Emisión: {formatFecha(doc.fechaEmision)}
                    </span>
                  )}
                  {doc.fechaVigencia && (
                    <span className={`text-xs ${porVencer ? `font-medium ${textoVigencia(dias)}` : "text-slate-400"}`}>
                      Vigencia: {formatFecha(doc.fechaVigencia)}
                      {porVencer && ` · ${etiquetaVigencia(dias)}`}
                    </span>
                  )}
                  {pdf && (
                    <a
                      href={pdf.dataUrl}
                      download={pdf.nombre}
                      aria-label={`Descargar PDF de ${doc.nombre}`}
                      className="text-xs font-medium text-[var(--brand-600)] hover:underline"
                    >
                      Descargar PDF
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => eliminar(doc.id)}
                    className="text-xs font-medium text-slate-400 hover:text-red-600"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </CardBody>
    </Card>
  );
}
