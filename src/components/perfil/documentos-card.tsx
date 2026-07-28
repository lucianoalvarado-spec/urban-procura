"use client";

import { useState } from "react";
import { useProveedor } from "@/lib/state/proveedor-context";
import type { DocumentoRepositorio } from "@/lib/data/types";
import { generarId } from "@/lib/id";
import { formatFecha, diasRestantes } from "@/lib/format";
import { estiloVigencia, etiquetaVigencia, textoVigencia } from "@/lib/data/documentos";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TextField, SelectField } from "@/components/perfil/field";

const UMBRAL_AVISO_DIAS = 30;

const CATEGORIAS_DOC: DocumentoRepositorio["categoria"][] = [
  "Legal",
  "Tributario",
  "RNP",
  "Declaraciones",
  "Cartas",
  "Certificados",
];

const VACIO = { nombre: "", categoria: "Legal" as DocumentoRepositorio["categoria"], fechaVigencia: "" };

export function DocumentosCard() {
  const { proveedor, actualizarDatosEmpresa } = useProveedor();
  const [agregando, setAgregando] = useState(false);
  const [form, setForm] = useState(VACIO);

  const eliminar = (id: string) => {
    actualizarDatosEmpresa({
      documentosRepositorio: proveedor.documentosRepositorio.filter((d) => d.id !== id),
    });
  };

  const agregar = () => {
    if (!form.nombre.trim()) return;
    const nuevo: DocumentoRepositorio = {
      id: generarId("doc"),
      nombre: form.nombre,
      categoria: form.categoria,
      fechaVigencia: form.fechaVigencia || undefined,
    };
    actualizarDatosEmpresa({ documentosRepositorio: [...proveedor.documentosRepositorio, nuevo] });
    setForm(VACIO);
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
              <TextField
                label="Nombre"
                value={form.nombre}
                onChange={(v) => setForm((f) => ({ ...f, nombre: v }))}
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
              <TextField
                label="Vigencia (opcional)"
                type="date"
                value={form.fechaVigencia}
                onChange={(v) => setForm((f) => ({ ...f, fechaVigencia: v }))}
              />
            </div>
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

        {proveedor.documentosRepositorio.length === 0 ? (
          <p className="text-sm text-slate-400">Aún no agregaste documentos.</p>
        ) : (
          proveedor.documentosRepositorio.map((doc) => {
            const dias = doc.fechaVigencia ? diasRestantes(doc.fechaVigencia) : null;
            const porVencer = dias !== null && dias <= UMBRAL_AVISO_DIAS;
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
                  {doc.fechaVigencia && (
                    <span className={`text-xs ${porVencer ? `font-medium ${textoVigencia(dias)}` : "text-slate-400"}`}>
                      Vigencia: {formatFecha(doc.fechaVigencia)}
                      {porVencer && ` · ${etiquetaVigencia(dias)}`}
                    </span>
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
