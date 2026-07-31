"use client";

import { useState } from "react";
import type { Proceso } from "@/lib/data/types";
import type { BorradorOferta } from "@/app/api/generar-oferta/route";
import {
  generarAnexosObras,
  ANEXOS_SOLO_PERFECCIONAMIENTO,
  ANEXOS_NO_AUTOMATIZADOS,
  type AnexoGenerado,
  type DatosOfertaObras,
} from "@/lib/generacion-ofertas/anexos-obras";
import {
  generarAnexosConsultoriaObras,
  ANEXOS_SOLO_PERFECCIONAMIENTO_CO,
  ANEXOS_NO_AUTOMATIZADOS_CO,
  type DatosOfertaConsultoriaObras,
} from "@/lib/generacion-ofertas/anexos-consultoria-obras";
import { useProveedor } from "@/lib/state/proveedor-context";
import { useAnalisisGuardados } from "@/lib/state/analisis-store";
import { cumplePlan } from "@/lib/plan";
import { formatMonto } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { UpgradeNotice } from "@/components/plan/upgrade-notice";
import { ProcesoSearchBox } from "@/components/shared/proceso-search-box";

type OpcionesAnexos = Omit<DatosOfertaObras, "nomenclatura" | "entidad" | "proveedor" | "experienciaObras">;

type CategoriaConAnexos = "obra" | "consultoria-obras";

function categoriaConAnexos(categoria: Proceso["categoria"]): CategoriaConAnexos | null {
  if (categoria === "Obra") return "obra";
  if (categoria === "Consultoría de Obras") return "consultoria-obras";
  return null;
}

function opcionesIniciales(proceso: Proceso): OpcionesAnexos {
  return {
    tipoLicitacion: /abreviad/i.test(proceso.tipoProcedimiento) ? "abreviada" : "regular",
    esConsorcio: false,
    integrantesConsorcio: "",
    representanteComunConsorcio: "",
    solicitaBonificacion10: false,
    itemBonificacion: "",
    gozaExoneracionIgv: false,
    montoOfertaTotal: proceso.montoReferencial ? String(proceso.montoReferencial) : "",
    monedaOferta: proceso.monedaSimbolo || "S/",
    ciudadFecha: new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" }),
  };
}

export function AutomatizacionClient({ procesosSugeridos }: { procesosSugeridos: Proceso[] }) {
  const { proveedor } = useProveedor();
  const analisisGuardados = useAnalisisGuardados();
  const [proceso, setProceso] = useState<Proceso | null>(null);
  const [opciones, setOpciones] = useState<OpcionesAnexos | null>(null);
  const [anexos, setAnexos] = useState<AnexoGenerado[] | null>(null);
  const [descargandoAnexos, setDescargandoAnexos] = useState<"word" | "excel" | null>(null);
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

  const elegirProceso = (p: Proceso) => {
    setProceso(p);
    setOpciones(opcionesIniciales(p));
    setAnexos(null);
    setBorrador(null);
  };

  const analisis = proceso ? analisisGuardados[proceso.id] : undefined;

  const generarAnexos = (tipo: CategoriaConAnexos) => {
    if (!proceso || !opciones) return;
    const datosBase = {
      ...opciones,
      nomenclatura: proceso.objeto,
      entidad: proceso.entidad,
      proveedor: {
        razonSocial: proveedor.razonSocial,
        ruc: proveedor.ruc,
        representanteLegal: proveedor.representanteLegal,
        dniRepresentante: proveedor.dniRepresentante,
        correo: proveedor.correo,
      },
    };
    if (tipo === "obra") {
      const datos: DatosOfertaObras = {
        ...datosBase,
        experienciaObras: proveedor.experiencia.filter((e) => e.especialidad === "Obra"),
      };
      setAnexos(generarAnexosObras(datos));
    } else {
      const datos: DatosOfertaConsultoriaObras = {
        ...datosBase,
        experienciaConsultoriaObras: proveedor.experiencia.filter((e) => e.especialidad === "Consultoría de Obras"),
      };
      setAnexos(generarAnexosConsultoriaObras(datos));
    }
  };

  const descargarAnexos = async (formato: "word" | "excel") => {
    if (!proceso || !anexos) return;
    setDescargandoAnexos(formato);
    try {
      const url = formato === "word" ? "/api/generar-oferta/anexos-docx" : "/api/generar-oferta/excel";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anexos,
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
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `Anexos - ${proceso.objeto.slice(0, 60)}.${formato === "word" ? "docx" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } finally {
      setDescargandoAnexos(null);
    }
  };

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
          Anexos oficiales prellenados y borrador de propuesta técnica, a partir de tu perfil y tu
          experiencia.
        </p>
      </div>

      {!proceso ? (
        <Card>
          <CardBody className="space-y-3">
            <ProcesoSearchBox onSelect={elegirProceso} />
            {procesosSugeridos.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-3">
                <span className="text-xs text-slate-400">O elige uno del lote actual:</span>
                {procesosSugeridos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => elegirProceso(p)}
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
                setOpciones(null);
                setAnexos(null);
                setBorrador(null);
              }}
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Cambiar proceso
            </button>
          </div>

          {(() => {
            const tipo = categoriaConAnexos(proceso.categoria);
            if (!tipo) return <UpgradeNoticeCategoria categoria={proceso.categoria} />;
            if (!opciones) return null;
            const experienciaCount = proveedor.experiencia.filter(
              (e) => e.especialidad === (tipo === "obra" ? "Obra" : "Consultoría de Obras")
            ).length;
            return (
              <AnexosCard
                tituloDocumento={
                  tipo === "obra"
                    ? "Anexos de la oferta (Licitación de obras)"
                    : "Anexos de la oferta (Concurso público de Consultoría de Obra)"
                }
                subtitleDocumento={
                  tipo === "obra"
                    ? "Bases Estándar vigentes bajo la Ley N° 32069 — Directiva N° 0005-2025-EF/54.01 del MEF, modificada por la R.D. N° 0001-2026-EF/54.01"
                    : "Bases Estándar de Concurso Público para Consultorías y Servicios de Mantenimiento Vial (variante Consultoría de Obra), vigentes bajo la Ley N° 32069 — misma Directiva N° 0005-2025-EF/54.01, modificada por la R.D. N° 0001-2026-EF/54.01"
                }
                opcionesLicitacion={
                  tipo === "obra"
                    ? { regular: "Licitación pública de obras", abreviada: "Licitación pública abreviada de obras" }
                    : { regular: "Concurso público para consultoría de obra", abreviada: "Concurso público abreviado para consultoría de obra" }
                }
                labelBonificacion={
                  tipo === "obra"
                    ? "Solicito la bonificación del 10% (obra fuera de Lima y Callao, cuantía ≤ S/ 900,000)"
                    : "Solicito la bonificación del 10% (prestación fuera de Lima y Callao, cuantía ≤ S/ 200,000)"
                }
                labelExperiencia={
                  tipo === "obra"
                    ? "Experiencia en Obra registrada en tu Perfil para el Anexo N° 11"
                    : "Experiencia en Consultoría de Obras registrada en tu Perfil para el Anexo N° 11"
                }
                opciones={opciones}
                setOpciones={setOpciones}
                anexos={anexos}
                onGenerar={() => generarAnexos(tipo)}
                onDescargar={descargarAnexos}
                descargando={descargandoAnexos}
                experienciaCount={experienciaCount}
                anexosSoloPerfeccionamiento={tipo === "obra" ? ANEXOS_SOLO_PERFECCIONAMIENTO : ANEXOS_SOLO_PERFECCIONAMIENTO_CO}
                anexosNoAutomatizados={tipo === "obra" ? ANEXOS_NO_AUTOMATIZADOS : ANEXOS_NO_AUTOMATIZADOS_CO}
              />
            );
          })()}

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
                {cargando ? "Generando…" : borrador ? "Regenerar borrador" : "Generar propuesta técnica"}
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

function UpgradeNoticeCategoria({ categoria }: { categoria: string }) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-slate-600">
      Los anexos oficiales automáticos (Bases Estándar bajo la Ley N° 32069) solo están
      implementados para procesos de categoría <strong>Obra</strong> y{" "}
      <strong>Consultoría de Obras</strong> — este proceso es de categoría{" "}
      <strong>{categoria}</strong>. Las bases estándar de Bienes y Servicios todavía no están
      cargadas en la plataforma.
    </div>
  );
}

function AnexosCard({
  tituloDocumento,
  subtitleDocumento,
  opcionesLicitacion,
  labelBonificacion,
  labelExperiencia,
  opciones,
  setOpciones,
  anexos,
  onGenerar,
  onDescargar,
  descargando,
  experienciaCount,
  anexosSoloPerfeccionamiento,
  anexosNoAutomatizados,
}: {
  tituloDocumento: string;
  subtitleDocumento: string;
  opcionesLicitacion: { regular: string; abreviada: string };
  labelBonificacion: string;
  labelExperiencia: string;
  opciones: OpcionesAnexos;
  setOpciones: (o: OpcionesAnexos) => void;
  anexos: AnexoGenerado[] | null;
  onGenerar: () => void;
  onDescargar: (formato: "word" | "excel") => void;
  descargando: "word" | "excel" | null;
  experienciaCount: number;
  anexosSoloPerfeccionamiento: { numero: number; titulo: string }[];
  anexosNoAutomatizados: { numero: number; titulo: string; motivo: string }[];
}) {
  const aplicables = anexos?.filter((a) => a.aplicable) ?? [];
  const noAplicables = anexos?.filter((a) => !a.aplicable) ?? [];

  return (
    <Card>
      <CardHeader title={tituloDocumento} subtitle={subtitleDocumento} />
      <CardBody className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
            Tipo de licitación
            <select
              value={opciones.tipoLicitacion}
              onChange={(e) =>
                setOpciones({ ...opciones, tipoLicitacion: e.target.value as "regular" | "abreviada" })
              }
              className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-sm text-[var(--foreground)]"
            >
              <option value="regular">{opcionesLicitacion.regular}</option>
              <option value="abreviada">{opcionesLicitacion.abreviada}</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              Moneda
              <input
                type="text"
                value={opciones.monedaOferta}
                onChange={(e) => setOpciones({ ...opciones, monedaOferta: e.target.value })}
                className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
              Monto total de la oferta
              <input
                type="number"
                value={opciones.montoOfertaTotal}
                onChange={(e) => setOpciones({ ...opciones, montoOfertaTotal: e.target.value })}
                className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-sm"
              />
            </label>
          </div>
        </div>

        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Ciudad y fecha
          <input
            type="text"
            value={opciones.ciudadFecha}
            onChange={(e) => setOpciones({ ...opciones, ciudadFecha: e.target.value })}
            className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-sm sm:w-1/2"
          />
        </label>

        <div className="space-y-2 border-t border-[var(--border)] pt-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={opciones.esConsorcio}
              onChange={(e) => setOpciones({ ...opciones, esConsorcio: e.target.checked })}
              className="h-4 w-4 rounded border-[var(--border)] text-[var(--brand-600)]"
            />
            Postulo en consorcio (agrega el Anexo N° 4 — Promesa de consorcio)
          </label>
          {opciones.esConsorcio && (
            <div className="ml-6 grid gap-2 sm:grid-cols-2">
              <input
                type="text"
                placeholder="Integrantes del consorcio (nombres o razón social)"
                value={opciones.integrantesConsorcio}
                onChange={(e) => setOpciones({ ...opciones, integrantesConsorcio: e.target.value })}
                className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Representante común del consorcio"
                value={opciones.representanteComunConsorcio}
                onChange={(e) => setOpciones({ ...opciones, representanteComunConsorcio: e.target.value })}
                className="rounded-lg border border-[var(--border)] px-2.5 py-2 text-sm"
              />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={opciones.solicitaBonificacion10}
              onChange={(e) => setOpciones({ ...opciones, solicitaBonificacion10: e.target.checked })}
              className="h-4 w-4 rounded border-[var(--border)] text-[var(--brand-600)]"
            />
            {labelBonificacion}
          </label>
          {opciones.solicitaBonificacion10 && (
            <input
              type="text"
              placeholder="Ítem o tramo al que aplica"
              value={opciones.itemBonificacion}
              onChange={(e) => setOpciones({ ...opciones, itemBonificacion: e.target.value })}
              className="ml-6 rounded-lg border border-[var(--border)] px-2.5 py-2 text-sm sm:w-1/2"
            />
          )}

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={opciones.gozaExoneracionIgv}
              onChange={(e) => setOpciones({ ...opciones, gozaExoneracionIgv: e.target.checked })}
              className="h-4 w-4 rounded border-[var(--border)] text-[var(--brand-600)]"
            />
            Gozo de la exoneración del IGV (domicilio fiscal en la Amazonía, Ley N° 27037)
          </label>
        </div>

        <p className="text-xs text-slate-400">
          {labelExperiencia}: {experienciaCount} contrato(s).
        </p>

        <button
          type="button"
          onClick={onGenerar}
          className="rounded-lg bg-[var(--brand-600)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--brand-700)]"
        >
          {anexos ? "Regenerar anexos" : "Generar anexos"}
        </button>

        {anexos && (
          <div className="space-y-4 border-t border-[var(--border)] pt-4">
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
              Anexos generados automáticamente a partir de tu Perfil — requieren revisión humana
              antes de presentarse. Los campos entre corchetes [CONSIGNAR ...] no se pudieron
              completar automáticamente.
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onDescargar("word")}
                disabled={descargando !== null}
                className="rounded-lg bg-[var(--brand-600)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--brand-700)] disabled:opacity-40"
              >
                {descargando === "word" ? "Generando…" : "Descargar Word (.docx)"}
              </button>
              <button
                type="button"
                onClick={() => onDescargar("excel")}
                disabled={descargando !== null}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-[var(--surface-muted)] disabled:opacity-40"
              >
                {descargando === "excel" ? "Generando…" : "Descargar Excel (.xlsx)"}
              </button>
            </div>

            <div className="space-y-3">
              {aplicables.map((anexo) => (
                <details key={anexo.numero} className="rounded-lg border border-[var(--border)] px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium text-[var(--foreground)]">
                    Anexo N° {anexo.numero} — {anexo.titulo}
                  </summary>
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    {anexo.parrafos.map((p, i) => (
                      <p key={i} className={p.includes("[CONSIGNAR") ? "text-amber-700" : undefined}>
                        {p || " "}
                      </p>
                    ))}
                    {anexo.tabla && anexo.tabla.filas.length > 0 && (
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full min-w-[500px] border-collapse text-xs">
                          <thead>
                            <tr>
                              {anexo.tabla.encabezados.map((h) => (
                                <th key={h} className="border border-[var(--border)] px-2 py-1 text-left">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {anexo.tabla.filas.map((fila, i) => (
                              <tr key={i}>
                                {fila.map((v, j) => (
                                  <td key={j} className="border border-[var(--border)] px-2 py-1">
                                    {v}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>

            {noAplicables.length > 0 && (
              <div className="text-xs text-slate-400">
                <p className="mb-1 font-medium text-slate-500">No incluidos (no aplican con estas opciones):</p>
                <ul className="list-inside list-disc space-y-0.5">
                  {noAplicables.map((a) => (
                    <li key={a.numero}>
                      Anexo N° {a.numero} — {a.titulo}: {a.motivoNoAplicable}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-xs text-slate-400">
              <p className="mb-1 font-medium text-slate-500">
                Solo si ganas la buena pro (perfeccionamiento del contrato, no se generan acá):
              </p>
              <ul className="list-inside list-disc space-y-0.5">
                {anexosSoloPerfeccionamiento.map((a) => (
                  <li key={a.numero}>
                    Anexo N° {a.numero} — {a.titulo}
                  </li>
                ))}
              </ul>
              <p className="mt-2 mb-1 font-medium text-slate-500">
                Casos excepcionales, complétalos manualmente si aplican:
              </p>
              <ul className="list-inside list-disc space-y-0.5">
                {anexosNoAutomatizados.map((a) => (
                  <li key={a.numero}>
                    Anexo N° {a.numero} — {a.titulo}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
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
