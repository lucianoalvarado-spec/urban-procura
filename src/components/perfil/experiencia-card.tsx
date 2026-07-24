"use client";

import { useState } from "react";
import { useProveedor } from "@/lib/state/proveedor-context";
import type { Categoria, ExperienciaProveedor } from "@/lib/data/types";
import { CATEGORIAS } from "@/lib/data/constants";
import { formatFecha, formatMonto } from "@/lib/format";
import { generarId } from "@/lib/id";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TextField, NumberField, SelectField, CheckboxField } from "@/components/perfil/field";
import type { ContratoImportable, ExperienciaOsceResultado } from "@/app/api/rnp/experiencia/route";
import type { ObraImportable, ExperienciaObrasResultado } from "@/app/api/rnp/obras/route";

const VACIO = {
  cliente: "",
  objeto: "",
  especialidad: "Obra" as Categoria,
  monto: 0,
  fecha: "",
  consorcio: false,
  porcentajeParticipacion: 100,
  contratoAdjunto: false,
  conformidadAdjunta: false,
};

function esRucValido(ruc: string): boolean {
  return /^\d{11}$/.test(ruc);
}

export function ExperienciaCard() {
  const { proveedor, actualizarDatosEmpresa } = useProveedor();
  const [agregando, setAgregando] = useState(false);
  const [form, setForm] = useState(VACIO);

  const [importando, setImportando] = useState(false);
  const [candidatos, setCandidatos] = useState<ContratoImportable[] | null>(null);
  const [mensajeImport, setMensajeImport] = useState<string | null>(null);
  const [importados, setImportados] = useState<Set<string>>(new Set());

  const [importandoObras, setImportandoObras] = useState(false);
  const [obrasCandidatas, setObrasCandidatas] = useState<ObraImportable[] | null>(null);
  const [mensajeObras, setMensajeObras] = useState<string | null>(null);
  const [obrasImportadas, setObrasImportadas] = useState<Set<string>>(new Set());

  const eliminar = (id: string) => {
    actualizarDatosEmpresa({ experiencia: proveedor.experiencia.filter((e) => e.id !== id) });
  };

  const agregar = () => {
    if (!form.cliente.trim() || !form.objeto.trim() || !form.fecha) return;
    const nueva: ExperienciaProveedor = {
      id: generarId("exp"),
      ...form,
      fuente: "manual",
    };
    actualizarDatosEmpresa({ experiencia: [...proveedor.experiencia, nueva] });
    setForm(VACIO);
    setAgregando(false);
  };

  const buscarEnSeace = async () => {
    setImportando(true);
    setCandidatos(null);
    setMensajeImport(null);
    try {
      const res = await fetch(`/api/rnp/experiencia?ruc=${proveedor.ruc}`);
      const data = (await res.json()) as ExperienciaOsceResultado;
      setCandidatos(data.contratos);
      setMensajeImport(data.mensaje);
    } catch {
      setCandidatos([]);
      setMensajeImport("No pudimos conectarnos con el SEACE ahora mismo.");
    } finally {
      setImportando(false);
    }
  };

  const importar = (contrato: ContratoImportable) => {
    const nueva: ExperienciaProveedor = {
      id: generarId("exp"),
      cliente: contrato.cliente,
      objeto: contrato.objeto,
      especialidad: contrato.categoria,
      monto: contrato.monto,
      fecha: contrato.fecha ?? "",
      consorcio: contrato.consorcio,
      porcentajeParticipacion: contrato.porcentajeParticipacion,
      contratoAdjunto: contrato.documentos.length > 0,
      conformidadAdjunta: false,
      documentos: contrato.documentos,
      fuente: "seace",
    };
    actualizarDatosEmpresa({ experiencia: [...proveedor.experiencia, nueva] });
    setImportados((prev) => new Set(prev).add(contrato.codContProv));
  };

  const buscarEnRnp = async () => {
    setImportandoObras(true);
    setObrasCandidatas(null);
    setMensajeObras(null);
    try {
      const res = await fetch(`/api/rnp/obras?ruc=${proveedor.ruc}`);
      const data = (await res.json()) as ExperienciaObrasResultado;
      setObrasCandidatas(data.obras);
      setMensajeObras(data.mensaje);
    } catch {
      setObrasCandidatas([]);
      setMensajeObras("No pudimos conectarnos con el RNP ahora mismo.");
    } finally {
      setImportandoObras(false);
    }
  };

  const importarObra = (obra: ObraImportable) => {
    const nueva: ExperienciaProveedor = {
      id: generarId("exp"),
      cliente: obra.cliente,
      objeto: obra.objeto,
      especialidad: obra.categoria,
      monto: obra.monto,
      fecha: obra.fecha ?? "",
      consorcio: obra.consorcio,
      contratoAdjunto: obra.documentos.length > 0,
      conformidadAdjunta: false,
      documentos: obra.documentos,
      fuente: "rnp",
    };
    actualizarDatosEmpresa({ experiencia: [...proveedor.experiencia, nueva] });
    setObrasImportadas((prev) => new Set(prev).add(obra.codObra));
  };

  return (
    <Card>
      <CardHeader
        title="Experiencia"
        subtitle={`${proveedor.experiencia.length} registros`}
        action={
          <div className="flex items-center gap-2">
            {esRucValido(proveedor.ruc) && (
              <button
                type="button"
                onClick={buscarEnSeace}
                disabled={importando}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-[var(--surface-muted)] disabled:opacity-50"
              >
                {importando ? "Buscando en SEACE…" : "Importar del SEACE"}
              </button>
            )}
            {esRucValido(proveedor.ruc) && (
              <button
                type="button"
                onClick={buscarEnRnp}
                disabled={importandoObras}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-[var(--surface-muted)] disabled:opacity-50"
              >
                {importandoObras ? "Buscando en el RNP…" : "Importar obras del RNP"}
              </button>
            )}
            {!agregando && (
              <button
                type="button"
                onClick={() => setAgregando(true)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-[var(--surface-muted)]"
              >
                + Agregar
              </button>
            )}
          </div>
        }
      />
      <CardBody className="space-y-4">
        {candidatos !== null && (
          <div className="space-y-2 rounded-lg border border-[var(--border)] p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">{mensajeImport}</p>
              <button
                type="button"
                onClick={() => setCandidatos(null)}
                className="text-xs font-medium text-slate-400 hover:text-slate-600"
              >
                Cerrar
              </button>
            </div>
            {candidatos.map((c) => {
              const yaImportado = importados.has(c.codContProv);
              return (
                <div
                  key={c.codContProv}
                  className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] p-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700">{c.objeto}</p>
                    <p className="text-xs text-slate-500">
                      {c.cliente} · {c.categoria} · {formatMonto(c.monto)}
                      {c.fecha ? ` · ${formatFecha(c.fecha)}` : ""}
                    </p>
                    {c.documentos.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {c.documentos.map((doc) => (
                          <a
                            key={doc.url}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[var(--brand-600)] hover:underline"
                          >
                            {doc.nombre}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={yaImportado}
                    onClick={() => importar(c)}
                    className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {yaImportado ? "Importado ✓" : "Importar"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {obrasCandidatas !== null && (
          <div className="space-y-2 rounded-lg border border-[var(--border)] p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">{mensajeObras}</p>
              <button
                type="button"
                onClick={() => setObrasCandidatas(null)}
                className="text-xs font-medium text-slate-400 hover:text-slate-600"
              >
                Cerrar
              </button>
            </div>
            {obrasCandidatas.map((o) => {
              const yaImportada = obrasImportadas.has(o.codObra);
              return (
                <div
                  key={o.codObra}
                  className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] p-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-700">{o.objeto}</p>
                    <p className="text-xs text-slate-500">
                      {o.cliente} · {o.categoria} · {formatMonto(o.monto)}
                      {o.fecha ? ` · ${formatFecha(o.fecha)}` : ""}
                    </p>
                    {o.documentos.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {o.documentos.map((doc) => (
                          <a
                            key={doc.url}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[var(--brand-600)] hover:underline"
                          >
                            {doc.nombre}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={yaImportada}
                    onClick={() => importarObra(o)}
                    className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-[var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {yaImportada ? "Importado ✓" : "Importar"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {agregando && (
          <div className="space-y-3 rounded-lg border border-[var(--border)] p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Cliente"
                value={form.cliente}
                onChange={(v) => setForm((f) => ({ ...f, cliente: v }))}
              />
              <TextField
                label="Objeto"
                value={form.objeto}
                onChange={(v) => setForm((f) => ({ ...f, objeto: v }))}
              />
              <SelectField
                label="Especialidad"
                value={form.especialidad}
                onChange={(v) => setForm((f) => ({ ...f, especialidad: v as Categoria }))}
                options={CATEGORIAS}
              />
              <NumberField
                label="Monto (S/)"
                value={form.monto}
                onChange={(v) => setForm((f) => ({ ...f, monto: v }))}
              />
              <TextField
                label="Fecha"
                type="date"
                value={form.fecha}
                onChange={(v) => setForm((f) => ({ ...f, fecha: v }))}
              />
            </div>
            <CheckboxField
              label="Ejecutado en consorcio"
              checked={form.consorcio}
              onChange={(v) => setForm((f) => ({ ...f, consorcio: v }))}
            />
            {form.consorcio && (
              <NumberField
                label="% de participación"
                value={form.porcentajeParticipacion}
                onChange={(v) => setForm((f) => ({ ...f, porcentajeParticipacion: v }))}
                className="max-w-[160px]"
              />
            )}
            <div className="flex gap-4">
              <CheckboxField
                label="Contrato adjunto"
                checked={form.contratoAdjunto}
                onChange={(v) => setForm((f) => ({ ...f, contratoAdjunto: v }))}
              />
              <CheckboxField
                label="Conformidad adjunta"
                checked={form.conformidadAdjunta}
                onChange={(v) => setForm((f) => ({ ...f, conformidadAdjunta: v }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={agregar}
                className="rounded-lg bg-[var(--brand-600)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--brand-700)]"
              >
                Guardar registro
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

        {proveedor.experiencia.length === 0 ? (
          <p className="text-sm text-slate-400">Aún no registraste experiencia.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-xs text-slate-400">
                  <th className="pb-2 pr-3 font-medium">Cliente / objeto</th>
                  <th className="pb-2 pr-3 font-medium">Especialidad</th>
                  <th className="pb-2 pr-3 font-medium">Monto</th>
                  <th className="pb-2 pr-3 font-medium">Fecha</th>
                  <th className="pb-2 pr-3 font-medium">Sustento</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {proveedor.experiencia.map((exp) => (
                  <tr key={exp.id}>
                    <td className="py-2 pr-3">
                      <p className="font-medium text-slate-700">{exp.cliente}</p>
                      <p className="text-xs text-slate-500">
                        {exp.objeto}
                        {exp.consorcio ? ` · Consorcio (${exp.porcentajeParticipacion}%)` : ""}
                        {exp.fuente === "seace" ? " · Importado del SEACE" : ""}
                        {exp.fuente === "rnp" ? " · Acreditado en el RNP" : ""}
                      </p>
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{exp.especialidad}</td>
                    <td className="py-2 pr-3 text-slate-600">{formatMonto(exp.monto)}</td>
                    <td className="py-2 pr-3 text-slate-600">
                      {exp.fecha ? formatFecha(exp.fecha) : "—"}
                    </td>
                    <td className="py-2 pr-3 text-xs">
                      {exp.documentos && exp.documentos.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {exp.documentos.map((doc) => (
                            <a
                              key={doc.url}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[var(--brand-600)] hover:underline"
                            >
                              {doc.nombre}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <>
                          <span className={exp.contratoAdjunto ? "text-emerald-600" : "text-slate-300"}>
                            Contrato
                          </span>
                          {" · "}
                          <span className={exp.conformidadAdjunta ? "text-emerald-600" : "text-slate-300"}>
                            Conformidad
                          </span>
                        </>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => eliminar(exp.id)}
                        className="text-xs font-medium text-slate-400 hover:text-red-600"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
