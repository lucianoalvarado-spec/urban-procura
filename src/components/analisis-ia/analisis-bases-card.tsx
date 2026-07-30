"use client";

import { useRef, useState } from "react";
import type { Proceso } from "@/lib/data/types";
import type { AnalisisBasesResultado } from "@/app/api/analisis-bases/route";
import { useProveedor } from "@/lib/state/proveedor-context";
import { computeMatch } from "@/lib/data/matching";
import { useAnalisisGuardados, guardarAnalisis } from "@/lib/state/analisis-store";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { MatchBadge } from "@/components/ui/badge";
import { UpgradeNotice } from "@/components/plan/upgrade-notice";
import { cumplePlan } from "@/lib/plan";

const MIN_CARACTERES = 200;

export function AnalisisBasesCard({ proceso }: { proceso: Proceso }) {
  const { proveedor } = useProveedor();
  const guardados = useAnalisisGuardados();
  // Solo el label "Bases" viene de la fuente real (biddingDocuments → "Bases" en
  // oece.ts) — la muestra mock usa "Bases integradas" con url "#..." a propósito, así
  // que nunca activa el modo automático (comportamiento esperado, no un bug).
  const docBases = proceso.documentos.find(
    (d) =>
      d.tipo === "Bases" &&
      d.disponible &&
      d.url.startsWith("http") &&
      d.formato?.toLowerCase() === "pdf"
  );
  const [modo, setModo] = useState<"auto" | "manual">(docBases ? "auto" : "manual");
  const [texto, setTexto] = useState("");
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState<AnalisisBasesResultado | null>(
    guardados[proceso.id] ?? null
  );
  const inputArchivo = useRef<HTMLInputElement>(null);

  if (!cumplePlan(proveedor.plan, "premium")) {
    return (
      <Card>
        <CardHeader title="Análisis de bases con IA" subtitle="¿Puedo participar y qué me falta?" />
        <CardBody>
          <UpgradeNotice minimo="premium">
            El análisis automático de bases con IA es parte del plan Premium.
          </UpgradeNotice>
        </CardBody>
      </Card>
    );
  }

  const match = computeMatch(proceso, proveedor);
  const procesoResumen = {
    objeto: proceso.objeto,
    entidad: proceso.entidad,
    categoria: proceso.categoria,
    tipoProcedimiento: proceso.tipoProcedimiento,
    montoReferencial: proceso.montoReferencial,
  };

  const subirArchivo = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".txt")) {
      setResultado({
        disponible: false,
        mensaje: "Por ahora solo se puede subir texto plano (.txt) — o pega el texto directamente.",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setTexto(String(reader.result ?? ""));
    reader.readAsText(file);
  };

  const analizarAutomatico = async () => {
    if (!docBases) return;
    setCargando(true);
    setResultado(null);
    try {
      const res = await fetch("/api/analisis-bases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docUrl: docBases.url, proceso: procesoResumen }),
      });
      const data = (await res.json()) as AnalisisBasesResultado;
      setResultado(data);
      if (data.disponible) {
        guardarAnalisis(proceso.id, data);
      } else {
        // La descarga/lectura automática falló — cae al cuadro manual con el mensaje
        // explicando por qué, en vez de dejar al usuario sin salida (ver spec Parte 2).
        setModo("manual");
      }
    } catch {
      setResultado({
        disponible: false,
        mensaje: "No pudimos conectar con el motor de IA ahora mismo. Intenta más tarde.",
      });
      setModo("manual");
    } finally {
      setCargando(false);
    }
  };

  const analizarManual = async () => {
    setCargando(true);
    setResultado(null);
    try {
      const res = await fetch("/api/analisis-bases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, proceso: procesoResumen }),
      });
      const data = (await res.json()) as AnalisisBasesResultado;
      setResultado(data);
      if (data.disponible) guardarAnalisis(proceso.id, data);
    } catch {
      setResultado({
        disponible: false,
        mensaje: "No pudimos conectar con el motor de IA ahora mismo. Intenta más tarde.",
      });
    } finally {
      setCargando(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Análisis de bases con IA"
        subtitle={
          docBases && modo === "auto"
            ? "Descargamos y analizamos el documento oficial de bases por ti"
            : "Pega o sube el texto de las bases para un resumen estructurado"
        }
        action={<MatchBadge nivel={match.nivel} score={match.score} />}
      />
      <CardBody className="space-y-3">
        {docBases && modo === "auto" && (
          <div className="flex flex-col items-start gap-2">
            <button
              type="button"
              disabled={cargando}
              onClick={analizarAutomatico}
              className="rounded-lg bg-[var(--brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {cargando ? "Analizando…" : "Analizar bases automáticamente"}
            </button>
            <button
              type="button"
              onClick={() => setModo("manual")}
              className="text-xs font-medium text-slate-500 underline hover:text-slate-700"
            >
              o pega el texto manualmente
            </button>
          </div>
        )}

        {modo === "manual" && (
          <>
            {docBases && (
              <button
                type="button"
                onClick={() => setModo("auto")}
                className="text-xs font-medium text-slate-500 underline hover:text-slate-700"
              >
                ← usar el botón automático
              </button>
            )}
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Pega aquí el texto de las bases (o súbelo como .txt abajo)…"
              rows={6}
              className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm focus:border-[var(--brand-500)] focus:outline-none"
            />
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={inputArchivo}
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) subirArchivo(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => inputArchivo.current?.click()}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-[var(--surface-muted)]"
              >
                Subir archivo .txt
              </button>
              <span className="text-xs text-slate-400">{texto.length} caracteres</span>
              <button
                type="button"
                disabled={cargando || texto.trim().length < MIN_CARACTERES}
                onClick={analizarManual}
                className="ml-auto rounded-lg bg-[var(--brand-600)] px-4 py-1.5 text-xs font-medium text-white hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {cargando ? "Analizando…" : "Analizar con IA"}
              </button>
            </div>
          </>
        )}

        {resultado && !resultado.disponible && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {resultado.mensaje}
          </p>
        )}

        {resultado?.disponible && (
          <div className="space-y-4 border-t border-[var(--border)] pt-3">
            {resultado.resumenEjecutivo && (
              <p className="text-sm leading-relaxed text-slate-700">{resultado.resumenEjecutivo}</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Seccion titulo="Requisitos técnicos" items={resultado.requisitosTecnicos} />
              <Seccion titulo="Personal clave requerido" items={resultado.personalClaveRequerido} />
              <Seccion titulo="Certificaciones requeridas" items={resultado.certificacionesRequeridas} />
              <Seccion titulo="Documentos requeridos" items={resultado.documentosRequeridos} />
              <Seccion titulo="Requisitos de calificación" items={resultado.requisitosCalificacion} />
              <Seccion titulo="Garantías" items={resultado.garantias} />
              <Seccion titulo="Criterios de evaluación" items={resultado.criteriosEvaluacion} />
            </div>
            {resultado.plazoFormaPago && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Plazo / forma de pago
                </p>
                <p className="text-sm text-slate-600">{resultado.plazoFormaPago}</p>
              </div>
            )}
            <p className="text-xs text-slate-400">
              Generado por IA a partir del documento analizado — verifica siempre contra las bases
              oficiales antes de decidir.
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function Seccion({ titulo, items }: { titulo: string; items?: string[] }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
      {!items || items.length === 0 ? (
        <p className="text-sm text-slate-400">No especificado en el texto proporcionado.</p>
      ) : (
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
