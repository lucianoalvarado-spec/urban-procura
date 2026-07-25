"use client";

import { Fragment, useState } from "react";
import { useProveedor } from "@/lib/state/proveedor-context";
import type { DocumentoAdjunto, Equipo } from "@/lib/data/types";
import { generarId } from "@/lib/id";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TextField, NumberField, CheckboxField } from "@/components/perfil/field";
import { AdjuntosField } from "@/components/perfil/adjuntos-field";

const VACIO = { tipo: "", descripcion: "", cantidad: 1, propio: true, documentos: [] as DocumentoAdjunto[] };

export function EquipamientoCard() {
  const { proveedor, actualizarDatosEmpresa } = useProveedor();
  const [agregando, setAgregando] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [expandido, setExpandido] = useState<string | null>(null);

  const eliminar = (id: string) => {
    actualizarDatosEmpresa({ equipamiento: proveedor.equipamiento.filter((e) => e.id !== id) });
  };

  const actualizarDocumentos = (id: string, documentos: DocumentoAdjunto[]) => {
    actualizarDatosEmpresa({
      equipamiento: proveedor.equipamiento.map((e) => (e.id === id ? { ...e, documentos } : e)),
    });
  };

  const agregar = () => {
    if (!form.tipo.trim()) return;
    const nuevo: Equipo = { id: generarId("eq"), ...form };
    actualizarDatosEmpresa({ equipamiento: [...proveedor.equipamiento, nuevo] });
    setForm(VACIO);
    setAgregando(false);
  };

  return (
    <Card>
      <CardHeader
        title="Equipamiento"
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
                label="Tipo"
                value={form.tipo}
                onChange={(v) => setForm((f) => ({ ...f, tipo: v }))}
              />
              <TextField
                label="Descripción"
                value={form.descripcion}
                onChange={(v) => setForm((f) => ({ ...f, descripcion: v }))}
              />
              <NumberField
                label="Cantidad"
                value={form.cantidad}
                onChange={(v) => setForm((f) => ({ ...f, cantidad: v }))}
              />
            </div>
            <CheckboxField
              label="Propio (si no, alquilado)"
              checked={form.propio}
              onChange={(v) => setForm((f) => ({ ...f, propio: v }))}
            />
            <AdjuntosField
              label="Documentos (tarjeta de propiedad, contrato de alquiler, etc.)"
              documentos={form.documentos}
              onChange={(documentos) => setForm((f) => ({ ...f, documentos }))}
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

        {proveedor.equipamiento.length === 0 ? (
          <p className="text-sm text-slate-400">Aún no registraste equipamiento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="text-xs text-slate-400">
                  <th className="pb-2 pr-3 font-medium">Tipo</th>
                  <th className="pb-2 pr-3 font-medium">Descripción</th>
                  <th className="pb-2 pr-3 font-medium">Cantidad</th>
                  <th className="pb-2 pr-3 font-medium">Condición</th>
                  <th className="pb-2 pr-3 font-medium">Documentos</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {proveedor.equipamiento.map((eq) => (
                  <Fragment key={eq.id}>
                    <tr>
                      <td className="py-2 pr-3 text-slate-700">{eq.tipo}</td>
                      <td className="py-2 pr-3 text-slate-600">{eq.descripcion}</td>
                      <td className="py-2 pr-3 text-slate-600">{eq.cantidad}</td>
                      <td className="py-2 pr-3 text-slate-600">{eq.propio ? "Propio" : "Alquilado"}</td>
                      <td className="py-2 pr-3">
                        <button
                          type="button"
                          onClick={() => setExpandido(expandido === eq.id ? null : eq.id)}
                          className="text-xs font-medium text-[var(--brand-600)] hover:underline"
                        >
                          {(eq.documentos ?? []).length > 0
                            ? `${eq.documentos!.length} archivo(s)`
                            : "+ Adjuntar"}
                        </button>
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => eliminar(eq.id)}
                          className="text-xs font-medium text-slate-400 hover:text-red-600"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                    {expandido === eq.id && (
                      <tr>
                        <td colSpan={6} className="bg-[var(--surface-muted)] px-3 py-3">
                          <AdjuntosField
                            label="Documentos"
                            documentos={eq.documentos ?? []}
                            onChange={(documentos) => actualizarDocumentos(eq.id, documentos)}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
