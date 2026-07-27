"use client";

import { useState } from "react";
import type { Proceso } from "@/lib/data/types";
import type { BorradorOferta } from "@/app/api/generar-oferta/route";
import { useProveedor } from "@/lib/state/proveedor-context";
import { useAnalisisGuardados } from "@/lib/state/analisis-store";
import { cumplePlan } from "@/lib/plan";
import { formatMonto } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { UpgradeNotice } from "@/components/plan/upgrade-notice";
import { ProcesoSearchBox } from "@/components/shared/proceso-search-box";

export function AutomatizacionClient({ procesosSugeridos }: { procesosSugeridos: Proceso[] }) {
  const { proveedor } = useProveedor();
  const analisisGuardados = useAnalisisGuardados();
  const [proceso, setProceso] = useState<Proceso | null>(null);
  const [borrador, setBorrador] = useState<BorradorOferta | null>(null);
  const [cargando, setCargando] = useState(false);
  const [descargando, setDescargando] = useState(false);

  if (!cumplePlan(proveedor.plan, "premium")) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Generación de ofertas</h1>
        <UpgradeNotice minimo="premium">
          La generación asistida de ofertas es parte del plan Premium.
        </UpgradeNotice>
      </div>
    );
  }

  const analisis = proceso ? analisisGuardados[proceso.id] : undefined;

  const generar = async () => {
    if (!proceso) return;
    setCargando(true);
    setBorrador(null);
    try {
      const res = await fetch("/api/generar-oferta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proceso: {
            objeto: proceso.objeto,
            entidad: proceso.entidad,
            categoria: proceso.categoria,
            tipoProcedimiento: proceso.tipoProcedimiento,
            montoReferencial: proceso.montoReferencial,
            descripcion: proceso.descripcion,
          },
          proveedor: {
            razonSocial: proveedor.razonSocial,
            nombreComercial: proveedor.nombreComercial,
            ruc: proveedor.ruc,
            experiencia: proveedor.experiencia.map((e) => ({
              cliente: e.cliente,
              objeto: e.objeto,
              monto: e.monto,
              fecha: e.fecha,
              especialidad: e.especialidad,
            })),
            personalClave: proveedor.personalClave.map((p) => ({ nombre: p.nombre, cargo: p.cargo })),
            equipamiento: proveedor.equipamiento.map((e) => ({
              tipo: e.tipo,
              descripcion: e.descripcion,
              cantidad: e.cantidad,
            })),
          },
          analisis,
        }),
      });
      const data = (await res.json()) as BorradorOferta;
      setBorrador(data);
    } finally {
      setCargando(false);
    }
  };

  const descargarWord = async () => {
    if (!proceso || !borrador) return;
    setDescargando(true);
    try {
      const res = await fetch("/api/generar-oferta/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          borrador,
          proceso: {
            objeto: proceso.objeto,
            entidad: proceso.entidad,
            categoria: proceso.categoria,
            tipoProcedimiento: proceso.tipoProcedimiento,
            montoReferencial: proceso.montoReferencial,
          },
          proveedor: { razonSocial: proveedor.razonSocial, ruc: proveedor.ruc },
        }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Borrador oferta - ${proceso.objeto.slice(0, 60)}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDescargando(false);
    }
  };

  const verComoPdf = () => {
    if (!proceso || !borrador) return;
    window.sessionStorage.setItem(
      "urban-procura:oferta-borrador",
      JSON.stringify({
        borrador,
        proceso: {
          objeto: proceso.objeto,
          entidad: proceso.entidad,
          categoria: proceso.categoria,
          tipoProcedimiento: proceso.tipoProcedimiento,
          montoReferencial: proceso.montoReferencial,
        },
        proveedor: { razonSocial: proveedor.razonSocial, ruc: proveedor.ruc },
      })
    );
    window.open("/imprimir-oferta", "_blank");
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Generación de ofertas</h1>
        <p className="text-sm text-slate-500">
          Borrador de oferta técnica a partir de tu perfil, tu experiencia y el análisis de bases.
        </p>
      </div>

      {!proceso ? (
        <Card>
          <CardBody className="space-y-3">
            <ProcesoSearchBox onSelect={setProceso} />
            {procesosSugeridos.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-3">
                <span className="text-xs text-slate-400">O elige uno del lote actual:</span>
                {procesosSugeridos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setProceso(p)}
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
                  >
                    <span className="font-medium text-[var(--foreground)]">{p.objeto}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      {p.entidad} · {formatMonto(p.montoReferencial)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">{proceso.entidad}</p>
              <p className="text-sm font-semibold text-[var(--foreground)]">{proceso.objeto}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setProceso(null);
                setBorrador(null);
              }}
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Cambiar proceso
            </button>
          </div>

          <Card>
            <CardBody className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {analisis?.disponible
                  ? "Se usará el análisis de bases ya generado para este proceso."
                  : "Sin análisis de bases para este proceso — puedes generarlo desde la ficha del proceso o el borrador saldrá sin ese contexto."}
              </p>
              <button
                type="button"
                onClick={generar}
                disabled={cargando}
                className="rounded-lg bg-[var(--brand-600)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {cargando ? "Generando…" : borrador ? "Regenerar borrador" : "Generar borrador de oferta"}
              </button>
            </CardBody>
          </Card>

          {borrador && (
            <>
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                Borrador generado automáticamente — requiere revisión humana antes de presentarse
              </div>

              {borrador.mensajeIA && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {borrador.mensajeIA}
                </p>
              )}

              <Card>
                <CardHeader
                  title="Propuesta técnica"
                  action={
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={verComoPdf}
                        className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-[var(--surface-muted)]"
                      >
                        Vista previa / PDF
                      </button>
                      <button
                        type="button"
                        onClick={descargarWord}
                        disabled={descargando}
                        className="rounded-lg bg-[var(--brand-600)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--brand-700)] disabled:opacity-40"
                      >
                        {descargando ? "Generando…" : "Descargar Word (.docx)"}
                      </button>
                    </div>
                  }
                />
                <CardBody className="space-y-4">
                  <Seccion titulo="1. Presentación de la empresa">
                    <p className="text-sm text-slate-700">{borrador.presentacionEmpresa}</p>
                  </Seccion>
                  <Seccion titulo="2. Experiencia relevante">
                    <ListaTexto items={borrador.experienciaRelevante} />
                  </Seccion>
                  <Seccion titulo="3. Personal clave propuesto">
                    <ListaTexto items={borrador.personalPropuesto} />
                  </Seccion>
                  <Seccion titulo="4. Equipamiento propuesto">
                    <ListaTexto items={borrador.equipamientoPropuesto} />
                  </Seccion>
                  <Seccion titulo="5. Propuesta técnica y metodología">
                    <p className="whitespace-pre-line text-sm text-slate-700">{borrador.propuestaTecnica}</p>
                  </Seccion>
                  <Seccion titulo="6. Cronograma tentativo">
                    <p className="whitespace-pre-line text-sm text-slate-700">{borrador.cronogramaTentativo}</p>
                  </Seccion>
                </CardBody>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
      {children}
    </div>
  );
}

function ListaTexto({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-slate-400">Sin información registrada.</p>;
  return (
    <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
