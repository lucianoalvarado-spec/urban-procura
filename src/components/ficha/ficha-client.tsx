"use client";

import Link from "next/link";
import type { Proceso } from "@/lib/data/types";
import { useProveedor } from "@/lib/state/proveedor-context";
import { computeMatch } from "@/lib/data/matching";
import { diasRestantes, formatDiasRestantes, formatFecha, formatMonto } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { MatchBadge } from "@/components/ui/badge";
import { EstadoCrmSelect } from "@/components/crm/estado-crm-select";
import { UpgradeNotice, LockedInline } from "@/components/plan/upgrade-notice";
import { AnalisisBasesCard } from "@/components/analisis-ia/analisis-bases-card";
import { cumplePlan } from "@/lib/plan";

export function FichaClient({ proceso }: { proceso: Proceso }) {
  const { proveedor } = useProveedor();
  const match = computeMatch(proceso, proveedor);
  const puedeMatchCrm = cumplePlan(proveedor.plan, "profesional");
  // El OCDS del OECE no expone la fecha real de cierre de "Registro de participantes"
  // (solo trae la ventana de consultas y observaciones, que abre el mismo día) — por
  // eso este tag dice "postulación", no "registro": es el mejor proxy real disponible,
  // no una cifra inventada. Ver comentario en lib/data/live/oece.ts (OceTenderDetalle).
  const enPlazoDePostulacion =
    proceso.fuente === "live" &&
    proceso.estado === "Convocado" &&
    diasRestantes(proceso.fechaLimitePresentacion) >= 0;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/explorador" className="text-xs font-medium text-slate-500 hover:text-slate-700">
          ← Volver al explorador
        </Link>
        {proceso.fuente === "live" ? (
          <a
            href={proceso.fuenteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
          >
            Proceso real — ver en el OECE ↗
          </a>
        ) : (
          <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs font-medium text-slate-500">
            Proceso de muestra
          </span>
        )}
      </div>

      <Card>
        <CardBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500">
                {proceso.id} · {proceso.entidad}
              </p>
              <h1 className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                {proceso.objeto}
              </h1>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {puedeMatchCrm ? (
                <MatchBadge nivel={match.nivel} score={match.score} />
              ) : (
                <LockedInline minimo="profesional" />
              )}
              {enPlazoDePostulacion && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  En plazo de postulación
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
            <Dato label="Región">{proceso.region}</Dato>
            <Dato label="Categoría">
              {proceso.categoria} / {proceso.subcategoria}
            </Dato>
            <Dato label="Tipo de procedimiento">{proceso.tipoProcedimiento}</Dato>
            <Dato label="Estado">{proceso.estado}</Dato>
            <Dato label="Monto referencial">{formatMonto(proceso.montoReferencial)}</Dato>
            <Dato label={proceso.fuente === "live" ? "Consultas y observaciones (hasta)" : "Presentación de ofertas"}>
              {formatFecha(proceso.fechaLimitePresentacion)} (
              {formatDiasRestantes(proceso.fechaLimitePresentacion).toLowerCase()})
            </Dato>
          </div>

          <p className="text-sm leading-relaxed text-slate-600">{proceso.descripcion}</p>

          <div className="flex items-center gap-2 border-t border-[var(--border)] pt-3">
            <span className="text-xs font-medium text-slate-500">Mi seguimiento:</span>
            {puedeMatchCrm ? (
              <EstadoCrmSelect procesoId={proceso.id} />
            ) : (
              <LockedInline minimo="profesional" />
            )}
          </div>
        </CardBody>
      </Card>

      {puedeMatchCrm ? (
        <Card>
          <CardHeader
            title="¿Me conviene participar?"
            subtitle="Compatibilidad calculada con tus preferencias y tu experiencia registrada"
          />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold text-emerald-700">Lo que coincide</p>
              <ul className="space-y-1.5 text-sm text-slate-600">
                {match.coincidencias.length === 0 && (
                  <li className="text-slate-400">Sin coincidencias con tus preferencias actuales.</li>
                )}
                {match.coincidencias.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-emerald-600">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-amber-700">Lo que falta o no coincide</p>
              <ul className="space-y-1.5 text-sm text-slate-600">
                {match.faltantes.length === 0 && (
                  <li className="text-slate-400">No se detectaron brechas.</li>
                )}
                {match.faltantes.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="text-amber-600">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>
      ) : (
        <UpgradeNotice minimo="profesional">
          El análisis de compatibilidad (qué coincide y qué falta) es parte del plan Profesional.
        </UpgradeNotice>
      )}

      <Card>
        <CardHeader title="¿Qué piden?" subtitle="Experiencia mínima y especialistas requeridos" />
        <CardBody className="space-y-3">
          <p className="text-sm text-slate-600">
            {proceso.experienciaMinimaRequerida > 0 ? (
              <>
                Experiencia mínima exigida:{" "}
                <strong>{formatMonto(proceso.experienciaMinimaRequerida)}</strong> acumulada en{" "}
                {proceso.categoria}.
              </>
            ) : (
              "La fuente de este proceso no publica un monto mínimo de experiencia."
            )}
          </p>
          {proceso.especialistasRequeridos.length > 0 ? (
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
              {proceso.especialistasRequeridos.map((especialista) => (
                <li key={especialista}>{especialista}</li>
              ))}
            </ul>
          ) : proceso.fuente === "live" ? (
            <p className="text-sm text-slate-400">
              Esta fuente no publica el personal clave requerido — revisa las bases para
              confirmarlo.
            </p>
          ) : (
            <p className="text-sm text-slate-400">No se exige personal clave específico.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Documentos del proceso"
          subtitle={
            proceso.fuente === "live"
              ? "Documentos reales publicados por la entidad en el SEACE"
              : "Documentos de muestra — en producción se descargarán desde la fuente oficial"
          }
        />
        <CardBody className="space-y-2">
          {proceso.documentos.length === 0 ? (
            <p className="text-sm text-slate-400">
              {proceso.fuente === "live"
                ? "Esta entidad aún no publicó documentos para este proceso."
                : "Sin documentos."}
            </p>
          ) : (
            proceso.documentos.map((doc) => (
              <div
                key={doc.tipo + doc.url}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2"
              >
                <span className="text-sm text-slate-700">{doc.tipo}</span>
                {doc.disponible ? (
                  <a
                    href={doc.url}
                    target={proceso.fuente === "live" ? "_blank" : undefined}
                    rel={proceso.fuente === "live" ? "noopener noreferrer" : undefined}
                    className="rounded-md bg-[var(--brand-50)] px-2.5 py-1 text-xs font-medium text-[var(--brand-700)] hover:bg-[var(--brand-100)]"
                  >
                    {proceso.fuente === "live" ? "Ver documento" : "Ver documento (demo)"}
                  </a>
                ) : (
                  <span className="text-xs font-medium text-slate-400">Aún no publicado</span>
                )}
              </div>
            ))
          )}
        </CardBody>
      </Card>

      {proceso.cronograma.length > 0 && (
        <Card>
          <CardHeader title="Cronograma" />
          <CardBody>
            <ol className="space-y-3">
              {proceso.cronograma.map((etapa) => (
                <li key={etapa.etapa} className="flex items-center gap-3 text-sm">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-500)]" />
                  <span className="text-slate-600">{etapa.etapa}</span>
                  <span className="ml-auto shrink-0 text-xs font-medium text-slate-400">
                    {formatFecha(etapa.fecha)}
                  </span>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      )}

      {proceso.riesgos.length > 0 && (
        <Card>
          <CardHeader title="Riesgos identificados" />
          <CardBody>
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
              {proceso.riesgos.map((riesgo) => (
                <li key={riesgo}>{riesgo}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <AnalisisBasesCard proceso={proceso} />
    </div>
  );
}

function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-700">{children}</p>
    </div>
  );
}
